"use client";

import { Button } from "@/components/button";
import { HopeflowLogo } from "@/components/logos/hopeflow";
import { GoogleLogo } from "@/components/logos/google";
import { FacebookLogo } from "@/components/logos/facebook";
import { EmailLogo } from "@/components/logos/email";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { useGotoIndex } from "@/helpers/client/routes";
import { LoginEmail } from "./email";
import { useState } from "react";

function LoginOAth({ setUsingEmail }: { setUsingEmail: () => void }) {
  return (
    <div className="flex-1 w-full p-6 flex flex-col gap-4 items-center justify-center">
      <div className="max-w-lg md:w-lg p-6 flex flex-col gap-4 card shadow-2xl bg-base-100">
        <div className="flex flex-col gap-4 items-center justify-center">
          <HopeflowLogo size={48} />
          <h1 className="font-normal text-4xl">Login or Signup</h1>
        </div>
        <Button buttonType="primary">
          <GoogleLogo /> Login/Signup with Google
        </Button>
        <Button buttonType="secondary">
          <FacebookLogo /> Login/Signup with Facebook
        </Button>
        <div className="divider">Or</div>
        <Button
          buttonType="neutral"
          buttonStyle="soft"
          onClick={() => setUsingEmail()}
        >
          <EmailLogo /> Login/Signup with Email <ArrowRightIcon />
        </Button>
      </div>
    </div>
  );
}

export function LoginMain({}: { url?: string }) {
  const [usingEmail, setUsingEmail] = useState(false);
  return usingEmail ? (
    <LoginEmail />
  ) : (
    <LoginOAth setUsingEmail={() => setUsingEmail(true)} />
  );
}
