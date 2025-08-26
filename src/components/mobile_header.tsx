import Image from "next/image";
import { UserAvatarAndMenu } from "./useravatar_menu";

export const MobileHeader = () => (
  <div className="w-full h-16 p-4 bg-base-100 flex flex-row gap-4 items-center justify-between md:hidden">
    <Image
      src="/img/wordmark.webp"
      alt="Home"
      width={118}
      height={32}
      className="h-8 w-auto object-contain"
    />
    <div className="flex flex-col gap-4 [&>*]:w-full">
      <UserAvatarAndMenu placeLeftBottom />
    </div>
  </div>
);
