"use client";

import { Button } from "@/components/button";
import { HopeflowLogo } from "@/components/logos/hopeflow";
import { EmailLogo } from "@/components/logos/email";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { useGotoIndex } from "@/helpers/client/routes";
import { useState } from "react";
import { cn } from "@/helpers/client/tailwind_helpers";

export function LoginEmail({}: { url?: string }) {
  const [verifying, setVerifying] = useState(false);
  const gotoIndex = useGotoIndex();
  return (
    <div className="flex-1 w-full p-6 flex flex-col gap-4 items-center justify-center">
      <div className="h-96 max-w-lg md:w-lg card shadow-2xl overflow-hidden">
        <div
          className={cn(
            "absolute left-0 top-0 w-full h-full p-6 flex flex-col gap-4 bg-base-100 items-center opacity-100 transition-opacity duration-700",
            verifying && "opacity-0 pointer-events-none",
          )}
        >
          <div className="flex flex-col gap-4 items-center justify-center mb-4">
            <HopeflowLogo size={48} />
            <h1 className="font-normal text-4xl">Login or Signup</h1>
          </div>
          <div className="flex flex-col gap-4 w-full">
            <label className="text-lg font-medium">Your email address</label>
            <input
              type="email"
              placeholder="e.g. john.doe@provider.com"
              className="input input-bordered w-full"
            />
          </div>
          <div className="flex-1"></div>
          <Button
            className="w-full"
            buttonType="primary"
            onClick={() => setVerifying(true)}
          >
            Next <ArrowRightIcon />
          </Button>
        </div>
        <div
          className={cn(
            "absolute left-0 top-0 w-full h-full p-6 flex flex-col gap-4 bg-base-100 items-center opacity-100  transition-opacity duration-700",
            !verifying && "opacity-0 pointer-events-none",
          )}
        >
          <div className="flex flex-col gap-4 items-center justify-center mb-4">
            <HopeflowLogo size={48} />
            <h1 className="font-normal text-4xl">Login or Signup</h1>
          </div>
          <div className="flex flex-col gap-4 items-start">
            <label className="text-lg font-medium">Check your email</label>
            <div className="join">
              {new Array(6).fill(0).map((_, i) => (
                <input
                  key={`input-${i}`}
                  type="text"
                  maxLength={1}
                  className="input input-bordered w-12 text-center join-item"
                />
              ))}
            </div>
            <div className="text-sm text-center text-base-content/50">
              We emailed you a 6-digit code to your email address.
            </div>
          </div>
          <div className="flex-1"></div>
          <Button
            className="w-full"
            buttonType="primary"
            onClick={() => setVerifying(true)}
          >
            Verify <ArrowRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
