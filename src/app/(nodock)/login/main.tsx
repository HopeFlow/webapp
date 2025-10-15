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
import { useGoto, useGotoHome } from "@/helpers/client/routes";

const LogoContainer = ({ children }: { children: React.ReactNode }) => (
  <span className="border-base-300 flex h-6 w-6 items-center justify-center rounded-full border bg-gray-50">
    <span className="flex h-5 w-5 items-center justify-center">{children}</span>
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
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 p-6">
      <div className="card bg-base-100 flex max-w-lg flex-col gap-4 p-6 shadow-2xl md:w-lg">
        <div className="flex flex-col items-center justify-center gap-4">
          <HopeflowLogo size={48} />
          <h1 className="text-4xl font-normal">Login or Signup</h1>
        </div>
        <Button
          buttonType="neutral"
          buttonStyle="outline"
          className="text-base-content hover:bg-base-300 flex w-full items-center justify-between gap-3"
          onClick={() => handleSigninWith("oauth_google")}
        >
          <span className="justify-self-start">
            <LogoContainer>
              <GoogleLogo />
            </LogoContainer>
          </span>
          <span className="flex-1 text-center">Login/Signup with Google</span>
          {/* reserve space for alignment */}
          <span className="h-6 w-6" />
        </Button>
        <Button
          buttonType="neutral"
          buttonStyle="outline"
          className="text-base-content hover:bg-base-300 flex w-full items-center justify-between gap-3"
          onClick={() => handleSigninWith("oauth_facebook")}
        >
          <span className="justify-self-start">
            <LogoContainer>
              <FacebookLogo />
            </LogoContainer>
          </span>
          <span className="flex-1 text-center">Login/Signup with Facebook</span>
          {/* reserve space for alignment */}
          <span className="h-6 w-6" />
        </Button>
        <div className="divider">Or</div>
        <Button
          buttonType="neutral"
          className="flex w-full items-center justify-between gap-3"
          onClick={() => onEmail()}
        >
          <span className="justify-self-start">
            <LogoContainer>
              <EmailLogo />
            </LogoContainer>
          </span>
          <span className="flex-1 text-center">Login/Signup with Email</span>
          <span className="justify-self-end">
            <ArrowRightIcon className="h-4 w-4" />
          </span>
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
      "absolute top-0 left-0 flex h-full w-full flex-col transition-opacity duration-700",
      !show && "pointer-events-none opacity-0",
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
  const gotoHome = useGotoHome();
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
    console.log("handleSigninWith", strategy);
    if (!isSignInLoaded || !signIn) return;
    const redirectUrl = currentUrl;
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl,
        redirectUrlComplete: redirectUrl,
      });
    } catch (err) {
      console.error("handleSigninWith error", err);
    }
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
          console.log("Redirecting to (SignIn):", url);
          if (url) goto(url);
          else gotoHome();
        }
      }

      const signInNeedsCreation =
        signIn?.firstFactorVerification?.status === "transferable";
      if (signInNeedsCreation) {
        const res = await signUp.create({ transfer: true });
        if (res.status === "complete") {
          await setSignUpActive({ session: res.createdSessionId });
          console.log("Redirecting to (SignUp):", url);
          if (url) goto(url);
          else gotoHome();
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
    gotoHome,
  ]);

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center">
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
