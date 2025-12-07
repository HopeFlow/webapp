"use client";

import { Button, GhostButton } from "@/components/button";
import { useGotoLink, useGotoQuest } from "@/helpers/client/routes";
import { LinkNoticeLayout } from "./linkNoticeLayout";

type Props = {
  quest: { id: string };
  link: { linkCode: string };
  onManageClick?: () => void;
  onViewClick?: () => void;
};

export default function QuestOwnerNotice({
  quest,
  link,
  onManageClick,
  onViewClick,
}: Props) {
  const gotoQuest = useGotoQuest();
  const gotoLink = useGotoLink();
  const handleManage = () => {
    if (onManageClick) return onManageClick();
    gotoQuest({ questId: quest.id });
  };

  const handleView = () => {
    if (onViewClick) return onViewClick();
    gotoLink({ linkCode: link.linkCode });
  };

  return (
    <LinkNoticeLayout
      title="You are the starter of this quest 🙂"
      description={
        <>
          The quest associated with this link was started by you. Use the
          buttons below to manage the quest or view your quest as a contributor.
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
            d="M3.5 9l4.2 2.8L12 6l4.3 5.8L20.5 9 19 18H5L3.5 9z"
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
              d="M12 9v4m0 4h.01M4.5 19.5h15a1.5 1.5 0 001.34-2.17l-7.5-13.5a1.5 1.5 0 00-2.68 0l-7.5 13.5A1.5 1.5 0 004.5 19.5z"
            />
          </svg>
        ),
        message: "You have full control over settings and participants.",
      }}
      actions={
        <>
          <Button onClick={handleManage} aria-label="Open quest manager">
            Manage quest
          </Button>
          <GhostButton
            onClick={handleView}
            aria-label="View quest as contributor"
          >
            View as a contributor
          </GhostButton>
        </>
      }
    />
  );
}
