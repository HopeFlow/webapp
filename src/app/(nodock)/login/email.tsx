"use client";

import { Button } from "@/components/button";
import { HopeflowLogo } from "@/components/logos/hopeflow";
import { EmailLogo } from "@/components/logos/email";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { useGoto, useGotoHome, useGotoIndex } from "@/helpers/client/routes";
import {
  useState,
  useRef,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
  useEffect,
} from "react";
import { cn } from "@/helpers/client/tailwind_helpers";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import type {
  SignInFirstFactor,
  EmailCodeFactor,
  OAuthStrategy,
} from "@clerk/types";
import { useToast } from "@/components/toast";

type VerificationStage =
  | "prepare_token"
  | "verify_login_token"
  | "verify_signup_token";

export function LoginEmail({ url }: { url?: string }) {
  const {
    isLoaded: isSignInLoaded,
    signIn,
    setActive: setSignInActive,
  } = useSignIn();
  const {
    isLoaded: isSignUpLoaded,
    signUp,
    setActive: setSignUpActive,
  } = useSignUp();

  const addToast = useToast();
  const [stage, setStage] = useState<VerificationStage>("prepare_token");
  const [verifying, setVerifying] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isVerifyingBtn, setIsVerifyingBtn] = useState(false);
  const goto = useGoto();
  const gotoHome = useGotoHome();

  useEffect(() => {
    if (verifying) {
      setOtp(new Array(6).fill(""));
      // focus first box
      requestAnimationFrame(() => inputRefs.current[0]?.focus());
    }
  }, [verifying]);

  useEffect(() => {
    if (!verifying) return;
    const code = otp.join("");
    // only run when exactly 6 digits and we're not already verifying
    if (/^\d{6}$/.test(code) && !isVerifyingBtn) {
      verify();
    }
  }, [otp, verifying, isVerifyingBtn]);

  const handleClerkError = (e: unknown) => {
    if (isClerkAPIResponseError(e)) {
      const err = e.errors?.[0];
      addToast({
        type: "error",
        title: "Authentication Error",
        description: `${err?.code}: ${err?.longMessage ?? err?.message}`,
      });
    } else {
      addToast({
        type: "error",
        title: "Authentication Error",
        description: `Unexpected error: ${e}`,
      });
    }
  };

  // Start flow (sign-in first; if not found, sign-up)
  const startEmailFlow = async () => {
    if (!isSignInLoaded || !isSignUpLoaded || !signIn || !signUp) return;
    if (!email) {
      addToast({
        type: "error",
        title: "Invalid email",
        description: "Please enter a valid email.",
      });
      return;
    }

    setIsPreparing(true);
    try {
      // Try sign-in
      let shouldSignUp = false;
      try {
        const { supportedFirstFactors } = await signIn.create({
          identifier: email,
        });

        const isEmailCodeFactor = (
          f: SignInFirstFactor,
        ): f is EmailCodeFactor => f.strategy === "email_code";
        const emailCodeFactor = supportedFirstFactors?.find(isEmailCodeFactor);

        if (emailCodeFactor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setStage("verify_login_token");
          setVerifying(true);
          return;
        }
        shouldSignUp = true;
      } catch (e) {
        if (
          isClerkAPIResponseError(e) &&
          e.errors?.[0]?.code === "form_identifier_not_found"
        ) {
          shouldSignUp = true;
        } else {
          handleClerkError(e);
          return;
        }
      }

      if (shouldSignUp) {
        try {
          const r = await signUp.create({ emailAddress: email });
          await r.prepareEmailAddressVerification();
          setStage("verify_signup_token");
          setVerifying(true);
        } catch (e) {
          handleClerkError(e);
        }
      }
    } finally {
      setIsPreparing(false);
    }
  };

  const verify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      addToast({
        type: "error",
        title: "Invalid code",
        description: "Please enter the 6-digit code.",
      });
      return;
    }

    setIsVerifyingBtn(true);
    try {
      if (stage === "verify_login_token") {
        const attempt = await signIn!.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
        if (attempt.status === "complete") {
          await setSignInActive!({ session: attempt.createdSessionId });
          if (url) goto(url);
          else gotoHome();
        } else {
          addToast({
            type: "error",
            title: "Signin Error",
            description: `Sign-in not complete: ${attempt.status}`,
          });
        }
      } else if (stage === "verify_signup_token") {
        const attempt = await signUp!.attemptEmailAddressVerification({ code });
        if (attempt.status === "complete") {
          await setSignUpActive!({ session: attempt.createdSessionId });
          if (url) goto(url);
          else gotoHome();
        } else {
          addToast({
            type: "error",
            title: "Signup Error",
            description: `Sign-up not complete: ${attempt.status}`,
          });
        }
      } else {
        addToast({
          type: "error",
          title: "Invalid operation",
          description: "Please request a code first.",
        });
      }
    } catch (e) {
      handleClerkError(e);
    } finally {
      setIsVerifyingBtn(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if a digit is entered
    if (value && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verify();
    }
    // Move to previous input on backspace if current input is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    if (paste.length === otp.length && /^\d+$/.test(paste)) {
      const newOtp = paste.split("");
      setOtp(newOtp);
      inputRefs.current[otp.length - 1]?.focus();
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 p-6">
      <div className="card h-96 max-w-lg overflow-hidden shadow-2xl md:w-lg">
        <div
          className={cn(
            "bg-base-100 absolute top-0 left-0 flex h-full w-full flex-col items-center gap-4 p-6 opacity-100 transition-opacity duration-700",
            verifying && "pointer-events-none opacity-0",
          )}
        >
          <div className="mb-4 flex flex-col items-center justify-center gap-4">
            <HopeflowLogo size={48} />
            <h1 className="text-4xl font-normal">Login or Signup</h1>
          </div>
          <div className="flex w-full flex-col gap-4">
            <label className="text-lg font-medium">Your email address</label>
            <input
              type="email"
              placeholder="e.g. john.doe@provider.com"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  startEmailFlow();
                }
              }}
            />
          </div>
          <div className="flex-1"></div>
          <Button
            className="w-full"
            buttonType="primary"
            onClick={startEmailFlow}
            withSpinner={isPreparing}
            disabled={isPreparing}
            aria-busy={isPreparing}
          >
            Next <ArrowRightIcon />
          </Button>
        </div>
        <div
          className={cn(
            "bg-base-100 absolute top-0 left-0 flex h-full w-full flex-col items-center gap-4 p-6 opacity-100 transition-opacity duration-700",
            !verifying && "pointer-events-none opacity-0",
          )}
        >
          <div className="mb-4 flex flex-col items-center justify-center gap-4">
            <HopeflowLogo size={48} />
            <h1 className="text-4xl font-normal">Login or Signup</h1>
          </div>
          <div className="flex flex-col items-center-safe gap-4">
            <label className="text-lg font-medium">Check your email</label>
            <div className="join" onPaste={handlePaste}>
              {otp.map((value, i) => (
                <input
                  key={`input-${i}`}
                  ref={(el: HTMLInputElement | null) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  maxLength={1}
                  className="input input-bordered join-item w-12 text-center"
                  value={value}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleOtpChange(i, e.target.value)
                  }
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                    handleKeyDown(e, i)
                  }
                />
              ))}
            </div>
            <div className="text-base-content/50 w-full text-center text-sm">
              We emailed a 6-digit code to{" "}
              <span className="text-base-content font-bold">{email}</span>.
              <br />
              <button
                className="link text-sm"
                onClick={() => setVerifying(false)}
              >
                Wrong email?
              </button>
            </div>
          </div>

          <div className="flex-1"></div>
          <Button
            className="w-full"
            buttonType="primary"
            onClick={verify}
            withSpinner={isVerifyingBtn}
            disabled={isVerifyingBtn}
            aria-busy={isVerifyingBtn}
          >
            Verify <ArrowRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
