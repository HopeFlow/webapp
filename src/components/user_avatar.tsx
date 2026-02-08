import { cn } from "@/helpers/client/tailwind_helpers";
import Image from "next/image";
import { useId } from "react";
import { AVATAR_SIZE } from "@/helpers/client/constants";

export type UserAvatarProps = {
  name: string;
  className?: string;
  onClick?: () => void;
} & (
  | { imageUrl: string; imageWidth?: number; imageHeight?: number }
  | { imageUrl?: undefined; imageWidth?: undefined; imageHeight?: undefined }
);

export const Avatar = ({
  name,
  className,
  imageUrl,
  imageWidth,
  imageHeight,
  onClick,
}: UserAvatarProps) => (
  <div className="avatar">
    <div className={cn("w-12", onClick && "cursor-pointer", className)}>
      <Image
        src={imageUrl ?? "/img/unknown_user.svg"}
        alt={name}
        width={imageWidth ?? AVATAR_SIZE}
        height={imageHeight ?? AVATAR_SIZE}
        className="rounded-full object-cover shadow"
        onClick={onClick}
      />
    </div>
  </div>
);

export const AvatarGroup = ({
  userAvatarProps,
  className,
  expanded,
}: {
  userAvatarProps: UserAvatarProps[];
  className?: string;
  expanded?: boolean;
}) => {
  const baseId = useId();
  return (
    <div className={cn(className, "avatar-group", !expanded && "-space-x-8")}>
      {userAvatarProps.map((props, index) => (
        <Avatar key={`${baseId}_${index}`} {...props} />
      ))}
    </div>
  );
};
