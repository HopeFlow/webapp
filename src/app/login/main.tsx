"use client";

import { Button } from "@/components/button";
import { HopeflowLogo } from "@/components/logos/hopeflow";
import { GoogleLogo } from "@/components/logos/google";
import { FacebookLogo } from "@/components/logos/facebook";
import { EmailLogo } from "@/components/logos/email";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { LoginEmail } from "./email";
import { useState, useEffect } from "react";
import { cn } from "@/helpers/client/tailwind_helpers";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import type { OAuthStrategy } from "@clerk/types";
import { useGoto } from "@/helpers/client/routes";

const LogoContainer = ({ children }: { children: React.ReactNode }) => (
  <span className="flex items-center justify-center w-6 h-6 rounded-full border border-base-300 bg-gray-50">
    <span className="w-5 h-5 flex items-center justify-center">{children}</span>
  </span>
);

const ButtonRow = ({
  leading,
  label,
  trailing,
}: {
  leading: React.ReactNode;
  label: React.ReactNode;
  trailing?: React.ReactNode;
}) => (
  <span className="grid grid-cols-[1.5rem_1fr_1.5rem] items-center gap-3 w-full">
    <span className="justify-self-start">{leading}</span>
    <span className="justify-self-center">{label}</span>
    {/* Reserve space even if there is no trailing icon to keep alignment */}
    <span className="justify-self-end">
      {trailing ?? <span className="w-6 h-6" />}
    </span>
  </span>
);

function LoginOAuth({
  onEmail,
  handleSigninWith,
}: {
  onEmail: () => void;
  handleSigninWith: (strategy: OAuthStrategy) => Promise<void>;
}) {
  return (
    <div className="flex-1 w-full p-6 flex flex-col gap-4 items-center justify-center">
      <div className="max-w-lg md:w-lg p-6 flex flex-col gap-4 card shadow-2xl bg-base-100">
        <div className="flex flex-col gap-4 items-center justify-center">
          <HopeflowLogo size={48} />
          <h1 className="font-normal text-4xl">Login or Signup</h1>
        </div>
        <Button
          buttonType="primary"
          onClick={() => handleSigninWith("oauth_google")}
        >
          <ButtonRow
            leading={
              <LogoContainer>
                <GoogleLogo />
              </LogoContainer>
            }
            label="Login/Signup with Google"
          />
        </Button>
        <Button
          buttonType="primary"
          onClick={() => handleSigninWith("oauth_facebook")}
        >
          <ButtonRow
            leading={
              <LogoContainer>
                <FacebookLogo />
              </LogoContainer>
            }
            label="Login/Signup with Facebook"
          />
        </Button>
        <div className="divider">Or</div>
        <Button buttonType="neutral" onClick={() => onEmail()}>
          <ButtonRow
            leading={
              <LogoContainer>
                <EmailLogo />
              </LogoContainer>
            }
            label="Login/Signup with Email"
            trailing={<ArrowRightIcon className="w-4 h-4" />}
          />
        </Button>
      </div>
    </div>
  );
}

const TransitionContainer = ({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "absolute left-0 top-0 w-full h-full transition-opacity duration-700 flex flex-col",
      !show && "opacity-0 pointer-events-none",
    )}
  >
    {children}
  </div>
);

let pendingProcessResumed = false;

export function LoginMain({
  url,
  currentUrl,
}: {
  url?: string;
  currentUrl: string;
}) {
  const [usingEmail, setUsingEmail] = useState(false);
  const goto = useGoto();
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

  // Handle OAuth
  const handleSigninWith = async (strategy: OAuthStrategy) => {
    if (!isSignInLoaded || !signIn) return;
    const redirectUrl = currentUrl;
    await signIn.authenticateWithRedirect({
      strategy,
      redirectUrl,
      redirectUrlComplete: redirectUrl,
    });
  };

  // Auto-resume "transferable" cases (external account exists / needs transfer)
  useEffect(() => {
    if (!isSignInLoaded || !isSignUpLoaded || !signIn || !signUp) return;
    const run = async () => {
      const existsNeedsSignIn =
        signUp?.verifications?.externalAccount?.status === "transferable" &&
        signUp?.verifications?.externalAccount?.error?.code ===
          "external_account_exists";

      if (existsNeedsSignIn) {
        const res = await signIn.create({ transfer: true });
        if (res.status === "complete") {
          await setSignInActive({ session: res.createdSessionId });
          goto(url);
          return;
        }
      }

      const signInNeedsCreation =
        signIn?.firstFactorVerification?.status === "transferable";
      if (signInNeedsCreation) {
        const res = await signUp.create({ transfer: true });
        if (res.status === "complete") {
          await setSignUpActive({ session: res.createdSessionId });
          goto(url);
        }
      }
    };

    if (!pendingProcessResumed) {
      pendingProcessResumed = true;
      run().catch(() => {});
    }
  }, [
    isSignInLoaded,
    isSignUpLoaded,
    signIn,
    signUp,
    setSignInActive,
    setSignUpActive,
    url,
    goto,
  ]);

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center relative">
      <TransitionContainer show={!usingEmail}>
        <LoginOAuth
          onEmail={() => setUsingEmail(true)}
          handleSigninWith={handleSigninWith}
        />
      </TransitionContainer>
      <TransitionContainer show={usingEmail}>
        <LoginEmail />
      </TransitionContainer>
    </div>
  );
}
