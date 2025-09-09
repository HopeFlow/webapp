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
import {
  CreateQuestModal,
  showCreateQuestModal,
} from "@/modals/create_quest_modal";

export const Sidebar = () => (
  <div className="w-60 h-auto p-6 hidden md:flex flex-col items-center border-r-2 bg-base-100 border-base-300">
    <Image
      src="/img/wordmark.webp"
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
        onClick={() => showCreateQuestModal()}
      >
        <PlusIcon /> Create a quest
      </GhostButton>
      <CreateQuestModal />
    </div>
    <div className="w-full flex-1"></div>
    <div className="w-full flex flex-col gap-4 [&>*]:w-full">
      <UserAvatarAndMenu />
    </div>
  </div>
);
