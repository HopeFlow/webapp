"use client";

import Image from "next/image";
import { GhostButton } from "./button";
import { BellIcon } from "./icons/bell";
import { HomeIcon } from "./icons/home";
import { PlusIcon } from "./icons/plus";
import { TrophyIcon } from "./icons/trophy";
import { UserIcon } from "./icons/user";
import { UserAvatarAndMenu } from "./useravatar_menu";
import type { SafeUser } from "@/helpers/server/auth";
import {
  useGotoCreateQuest,
  useGotoHome,
  useGotoNotifications,
  useGotoProfile,
  useGotoTrophies,
} from "@/helpers/client/routes";
import { ReactNode, useMemo } from "react";
import { ChatBubbleIcon } from "./icons/chat_bubble";

type SidebarItem = {
  id: string;
  content: ReactNode;
  goto?: () => void; // optional so we can disable gracefully
  disabled?: boolean;
};

export const Sidebar = ({ user }: { user: SafeUser }) => {
  const gotoHome = useGotoHome();
  const gotoNotifications = useGotoNotifications();
  const gotoTrophies = useGotoTrophies();
  const gotoProfile = useGotoProfile();
  const gotoCreateQuest = useGotoCreateQuest();

  const items = useMemo<SidebarItem[]>(
    () => [
      {
        id: "home",
        content: (
          <>
            <HomeIcon /> Home
          </>
        ),
        goto: gotoHome,
      },
      {
        id: "notifications",
        content: (
          <>
            <BellIcon /> Notifications
          </>
        ),
        goto: gotoNotifications,
      },
      {
        id: "messages",
        content: (
          <>
            <ChatBubbleIcon /> Messages
          </>
        ),
        disabled: true,
      },
      {
        id: "trophies",
        content: (
          <>
            <TrophyIcon /> Trophies
          </>
        ),
        goto: gotoTrophies,
      },
      {
        id: "profile",
        content: (
          <>
            <UserIcon /> Profile
          </>
        ),
        goto: gotoProfile,
      },
      {
        id: "create",
        content: (
          <>
            <PlusIcon /> Create Quest
          </>
        ),
        goto: gotoCreateQuest,
      },
    ],
    [gotoHome, gotoNotifications, gotoTrophies, gotoProfile, gotoCreateQuest],
  );
  return (
    <div className="bg-base-100 border-base-300 hidden h-auto w-60 flex-col items-center border-r-2 p-6 md:flex">
      <Image
        src="/img/wordmark.svg"
        className="h-auto max-w-full object-contain"
        alt="HopeFlow"
        width={118}
        height={37}
      />
      <div className="h-12 w-full"></div>
      <div className="flex w-full flex-col gap-4 [&>*]:w-full [&>button]:text-lg">
        {items.map((item, index) => (
          <GhostButton
            key={`sidebar-item-${index}`}
            className="flex flex-row justify-start gap-2 font-thin"
            onClick={item.disabled ? undefined : item.goto}
            disabled={item.disabled}
            aria-disabled={item.disabled}
          >
            {item.content}
          </GhostButton>
        ))}
      </div>
      <div className="w-full flex-1"></div>
      <div className="flex w-full flex-col gap-4 pl-4 [&>*]:w-full">
        <UserAvatarAndMenu user={user} />
      </div>
    </div>
  );
};
