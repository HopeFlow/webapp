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
import type {
  OAuthStrategy,
  SignInFirstFactor,
  EmailCodeFactor,
} from "@clerk/types";
import { hrefToLogin } from "@/helpers/client/routes";
import { useRouter } from "next/navigation";

const LogoContainer = ({ children }: { children: React.ReactNode }) => (
  <span className="border border-base-300 p-0.5 rounded-full bg-gray-50">
    {children}
  </span>
);

function LoginOAth({
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
          <LogoContainer>
            <GoogleLogo />
          </LogoContainer>
          Login/Signup with Google
        </Button>
        <Button
          buttonType="secondary"
          onClick={() => handleSigninWith("oauth_facebook")}
        >
          <LogoContainer>
            <FacebookLogo />
          </LogoContainer>
          Login/Signup with Facebook
        </Button>
        <div className="divider">Or</div>
        <Button buttonType="neutral" onClick={() => onEmail()}>
          <LogoContainer>
            <EmailLogo />
          </LogoContainer>
          Login/Signup with Email <ArrowRightIcon />
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

export function LoginMain({ url }: { url?: string }) {
  const [usingEmail, setUsingEmail] = useState(false);
  const router = useRouter();
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
    const redirectUrl = hrefToLogin({ url });
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
          router.refresh();
          return;
        }
      }

      const signInNeedsCreation =
        signIn?.firstFactorVerification?.status === "transferable";
      if (signInNeedsCreation) {
        const res = await signUp.create({ transfer: true });
        if (res.status === "complete") {
          await setSignUpActive({ session: res.createdSessionId });
          router.refresh();
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
    router,
  ]);

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center relative">
      <TransitionContainer show={!usingEmail}>
        <LoginOAth
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
