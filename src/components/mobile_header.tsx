import Image from "next/image";
import { UserAvatarAndMenu } from "./useravatar_menu";
import { cn } from "@/helpers/client/tailwind_helpers";
import { SafeUser } from "@/helpers/server/auth";

export const MobileHeader = ({
  inverseRole,
  showUserAvatar = true,
  user,
}: {
  inverseRole?: boolean;
  showUserAvatar?: boolean;
  user?: SafeUser;
}) => (
  <div
    className={cn(
      "w-full h-16 p-4 bg-base-100 flex-row gap-4 items-center justify-between",
      inverseRole ? "hidden md:flex rounded-b-box" : "flex md:hidden",
    )}
  >
    <Image
      src="/img/wordmark.svg"
      alt="Home"
      width={118}
      height={32}
      className="h-8 w-auto object-contain"
    />
    <div className="flex flex-col gap-4 [&>*]:w-full">
      {showUserAvatar && user && (
        <UserAvatarAndMenu placeLeftBottom user={user} />
      )}
    </div>
  </div>
);
