import Image from "next/image";
import { useId } from "react";

export type UserAvatarProps = {
  name: string;
} & (
  | {
      imageUrl: string;
      imageWidth: number;
      imageHeight: number;
    }
  | {
      imageUrl?: undefined;
      imageWidth?: undefined;
      imageHeight?: undefined;
    }
);

const AvatarGroupItem = ({
  name,
  imageUrl,
  imageWidth,
  imageHeight,
}: UserAvatarProps) => (
  <div className="avatar">
    <div className="w-12">
      <Image
        src={imageUrl ?? "/img/generic_user_image.webp"}
        alt={name}
        width={imageWidth ?? 48}
        height={imageHeight ?? 48}
        className="max-w-full h-auto object-contain"
      />
    </div>
  </div>
);

export const AvatarGroup = ({
  userAvatarProps,
}: {
  userAvatarProps: UserAvatarProps[];
}) => {
  const baseId = useId();
  return (
    <div className="avatar-group -space-x-8">
      {userAvatarProps.map((props, index) => (
        <AvatarGroupItem key={`${baseId}_${index}`} {...props} />
      ))}
    </div>
  );
};
