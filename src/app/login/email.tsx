"use client";

import { Button } from "@/components/button";
import { HopeflowLogo } from "@/components/logos/hopeflow";
import { EmailLogo } from "@/components/logos/email";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { useGotoIndex } from "@/helpers/client/routes";
import {
  useState,
  useRef,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
} from "react";
import { cn } from "@/helpers/client/tailwind_helpers";

export function LoginEmail({}: { url?: string }) {
  const [verifying, setVerifying] = useState(false);
  const [email, setEmail] = useState("");
  const gotoIndex = useGotoIndex();
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleNext = () => {
    // Here you would typically send the email to the backend
    // and on success, move to the verification screen.
    setVerifying(true);
  };

  const handleVerify = () => {
    // Here you would send the OTP to the backend for verification.
    console.log("Verifying OTP:", otp.join(""));
    // On success, you would navigate the user.
    gotoIndex();
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
      handleVerify();
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleNext();
                }
              }}
            />
          </div>
          <div className="flex-1"></div>
          <Button className="w-full" buttonType="primary" onClick={handleNext}>
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
          <div className="flex flex-col gap-4 items-center-safe">
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
                  className="input input-bordered w-12 text-center join-item"
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
            <div className="text-sm text-center text-base-content/50 w-full">
              We emailed a 6-digit code to{" "}
              <span className="font-bold text-base-content">{email}</span>.
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
            onClick={handleVerify}
          >
            Verify <ArrowRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
