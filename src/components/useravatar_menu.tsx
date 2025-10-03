"use client";

import { useGotoProfile } from "@/helpers/client/routes";
import { cn } from "@/helpers/client/tailwind_helpers";
import { SafeUser } from "@/helpers/server/auth";
import { useClerk } from "@clerk/nextjs";
import Image from "next/image";

export const UserAvatarAndMenu = ({
  placeLeftBottom,
  user,
}: {
  placeLeftBottom?: boolean;
  user: SafeUser;
}) => {
  const { signOut } = useClerk();

  const handleSignOut = () => {
    signOut();
  };
  const gotoProfile = useGotoProfile();
  return (
    <div
      className={cn(
        "dropdown",
        placeLeftBottom
          ? "dropdown-bottom dropdown-end"
          : "dropdown-top dropdown-start",
      )}
    >
      <div
        className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-primary"
        tabIndex={0}
      >
        <Image
          src={user.imageUrl}
          alt={user.fullName || "image avatar"}
          width={40}
          height={40}
          className="object-cover w-full h-full"
        />
      </div>
      <div tabIndex={0}>
        <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
          <li onClick={gotoProfile} role="button">
            <a>Profile</a>
          </li>
          <li onClick={handleSignOut} role="button">
            <a>Log out</a>
          </li>
        </ul>
      </div>
    </div>
  );
};
