"use client";

import { Button } from "@/components/button";
import { useGotoLink } from "@/helpers/client/routes";
import { LinkNoticeLayout } from "./linkNoticeLayout";

type Props = { link: { linkCode: string }; onViewClick?: () => void };

export default function AlreadyContributorNotice({ link, onViewClick }: Props) {
  const gotoLink = useGotoLink();
  const handleView = () => {
    if (onViewClick) return onViewClick();
    gotoLink({ linkCode: link.linkCode });
  };

  return (
    <LinkNoticeLayout
      title="You are already a contributor 🙂"
      description={
        <>
          You’ve already been invited and joined the hope tree for this quest.
          Use the button below to view the current status.
        </>
      }
      icon={
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 7a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 11-6 0 3 3 0 016 0zM2.5 17a5.5 5.5 0 0111 0v1.5H2.5V17zm13.5 2l2-2 4 4"
          />
        </svg>
      }
      alert={{
        variant: "info",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-6 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
        message: "All set—no additional invite is needed.",
      }}
      actions={
        <Button onClick={handleView} aria-label="View quest status">
          View quest with your own link
        </Button>
      }
      actionsWrapperClassName="gap-0"
    />
  );
}
