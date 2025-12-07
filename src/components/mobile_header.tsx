import Image from "next/image";
import { UserAvatarAndMenu } from "./useravatar_menu";
import { cn } from "@/helpers/client/tailwind_helpers";
import type { SafeUser } from "@/helpers/server/auth";
import { Avatar } from "./user_avatar";
import { redirectToLogin } from "@/helpers/server/routes";

export const MobileHeader = ({
  inverseRole,
  showUserAvatar = true,
  user,
  url,
}: {
  inverseRole?: boolean;
  showUserAvatar?: boolean;
  user?: SafeUser;
  url?: string;
}) => {
  return (
    <div
      className={cn(
        "bg-base-100 h-16 w-full flex-row items-center justify-between gap-4 p-4",
        inverseRole ? "rounded-box hidden md:flex" : "flex md:hidden",
      )}
    >
      <Image
        src="/img/wordmark.svg"
        alt="HopeFlow"
        width={118}
        height={32}
        className="h-8 w-auto object-contain"
      />
      <div className="flex flex-col gap-4 [&>*]:w-full">
        {showUserAvatar && user ? (
          <UserAvatarAndMenu placeLeftBottom user={user} />
        ) : (
          <Avatar
            name="Guest"
            onClick={() => {
              // go to login page
              redirectToLogin({ url });
            }}
          />
        )}
      </div>
    </div>
  );
};
