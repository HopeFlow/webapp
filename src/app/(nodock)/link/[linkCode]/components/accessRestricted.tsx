"use client";

import { Button, GhostButton } from "@/components/button";
import { HOPEFLOW_EMAILS } from "@/helpers/client/constants";
import { useGotoHome } from "@/helpers/client/routes";
import { LinkNoticeLayout } from "./linkNoticeLayout";

export default function AccessRestricted() {
  const gotoHome = useGotoHome();

  return (
    <LinkNoticeLayout
      title="Access Restricted"
      description={
        <>
          Access to the detailed information about this quest is restricted. The
          quest is conducted as a private pursuit and the link has already been
          consumed.
        </>
      }
      iconVariant="warning"
      icon={
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16.5 10.5V7.5a4.5 4.5 0 10-9 0v3m-1.5 0h12a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5h-12A1.5 1.5 0 013 18v-6a1.5 1.5 0 011.5-1.5z"
          />
        </svg>
      }
      alert={{
        variant: "warning",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-6 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3m0 4h.01M10.29 3.86l-7.1 12.28A2 2 0 004.83 19h14.34a2 2 0 001.74-2.86l-7.1-12.28a2 2 0 00-3.52 0z"
            />
          </svg>
        ),
        message:
          "Please request a new invite or sign in with the correct account.",
      }}
      actions={
        <>
          <Button onClick={() => gotoHome()}>Go to homepage</Button>
          <GhostButton
            onClick={() => {
              window.location.href = `mailto:${HOPEFLOW_EMAILS.support}`;
            }}
          >
            Contact support
          </GhostButton>
        </>
      }
      maxWidthClassName="max-w-xl"
    />
  );
}
