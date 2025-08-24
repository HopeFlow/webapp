import { GhostButton, Button } from "@/components/button";
import { ArrowRight } from "@/components/icons/arrow_right";
import Image from "next/image";

const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-6"
  >
    <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
    <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
    />
  </svg>
);

const BellIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
    />
  </svg>
);

const TrophyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
    />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);

const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
    />
  </svg>
);

const UserAvatarAndMenu = () => {
  return (
    <div className="dropdown dropdown-bottom dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle m-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-12"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      </div>
      <div tabIndex={0}>
        <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
          <li>
            <a>Profile</a>
          </li>
          <li>
            <a>Settings</a>
          </li>
          <li>
            <a>Log out</a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default async function Home() {
  return (
    <div className="w-full h-full flex flex-row">
      <div className="w-60 h-full p-6 hidden lg:flex flex-col items-center border-r-2 border-base-300">
        <Image
          src="/img/wordmark.webp"
          className="max-w-full"
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
          <GhostButton className="font-thin flex flex-row gap-2 justify-start">
            <PlusIcon /> Create a quest
          </GhostButton>
        </div>
        <div className="w-full flex-1"></div>
        <div className="w-full flex flex-col gap-4 [&>*]:w-full">
          <UserAvatarAndMenu />
        </div>
      </div>
      <div className="flex-1 bg-base-200 h-full relative">
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
          <div className="w-full h-16 p-4 bg-base-100 flex flex-row gap-4 items-center justify-between lg:hidden">
            <Image
              src="/img/wordmark.webp"
              className="max-w-full"
              alt="Home"
              width={118}
              height={37}
            />
            <div className="flex flex-col gap-4 [&>*]:w-full">
              <UserAvatarAndMenu />
            </div>
          </div>
          <div className="w-full p-8 flex-1 flex flex-col gap-12 items-center justify-center relative">
            <Image
              src="/img/row-boat.webp"
              alt="Row Boat"
              width={340}
              height={295}
              className="max-w-full"
            />
            <div>
              <h1 className="font-normal text-5xl mb-4">Start a quest ...</h1>
              <p className="font-thin max-w-80 lg:max-w-xl">
                Your first quest awaits! With a little help from your friends
                and their friends, you’ll find doors opening that felt just out
                of reach — together, step by step.
              </p>
            </div>
            <div className="absolute bottom-4 right-4">
              <Button className="btn-circle">
                <PlusIcon />
              </Button>
            </div>
          </div>
          <div className="w-full h-14 lg:hidden">
            <div className="dock dock-sm">
              <GhostButton className="dock-active">
                <HomeIcon />
              </GhostButton>
              <GhostButton>
                <BellIcon />
              </GhostButton>
              <GhostButton>
                <TrophyIcon />
              </GhostButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
