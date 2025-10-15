"use client";

import Image from "next/image";
import { GhostButton } from "./button";
import { BellIcon } from "./icons/bell";
import { ChatBubbleIcon } from "./icons/chat_bubble";
import { HomeIcon } from "./icons/home";
import { PlusIcon } from "./icons/plus";
import { TrophyIcon } from "./icons/trophy";
import { UserIcon } from "./icons/user";
import { UserAvatarAndMenu } from "./useravatar_menu";
import type { SafeUser } from "@/helpers/server/auth";

export const Sidebar = ({ user }: { user: SafeUser }) => (
  <div className="w-60 h-auto p-6 hidden md:flex flex-col items-center border-r-2 bg-base-100 border-base-300">
    <Image
      src="/img/wordmark.svg"
      className="max-w-full h-auto object-contain"
      alt="Home"
      width={118}
      height={37}
    />
    <div className="w-full h-12"></div>
    <div className="w-full flex flex-col gap-4 [&>*]:w-full [&>button]:text-lg">
      <GhostButton className="font-thin flex flex-row gap-2 justify-start">
        <HomeIcon /> Home
      </GhostButton>
      <GhostButton className="font-thin flex flex-row gap-2 justify-start">
        <BellIcon /> Notifications
      </GhostButton>
      <GhostButton className="font-thin flex flex-row gap-2 justify-start">
        <ChatBubbleIcon /> Chat
      </GhostButton>
      <GhostButton className="font-thin flex flex-row gap-2 justify-start">
        <TrophyIcon /> Trophies
      </GhostButton>
      <GhostButton className="font-thin flex flex-row gap-2 justify-start">
        <UserIcon /> Profile
      </GhostButton>
      <GhostButton
        className="font-thin flex flex-row gap-2 justify-start"
        onClick={() => {}}
      >
        <PlusIcon /> Create a quest
      </GhostButton>
    </div>
    <div className="w-full flex-1"></div>
    <div className="w-full flex flex-col gap-4 [&>*]:w-full pl-4">
      <UserAvatarAndMenu user={user} />
    </div>
  </div>
);
