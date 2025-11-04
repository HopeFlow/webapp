import Image from "next/image";
import type { InsertQuestData } from "./types";
import { Button } from "@/components/button";

export const Overview = ({
  title,
  shareTitle,
  rewardAmount,
  coverPhoto,
}: {
  title: string;
  shareTitle: string;
  description: string;
  rewardAmount: number;
  coverPhoto?: InsertQuestData["coverPhoto"];
}) => {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex max-w-2xl flex-1 flex-col gap-4 overflow-y-auto p-4">
        <h1 className="text-2xl font-normal md:text-3xl">Overview</h1>
        <div>
          {coverPhoto && (
            <Image
              src={coverPhoto.url}
              alt={coverPhoto.alt}
              className="w-full h-64 w-auto rounded-md object-cover"
              width={coverPhoto.width}
              height={coverPhoto.height}
            />
          )}
        </div>
        <h2 className="text-md font-thin md:text-xl">
          <span className="font-normal text-right w-48">As displayed for you</span> {title}
        </h2>
        <h2 className="text-md font-thin md:text-xl">
          <span className="font-normal">As displayed for others</span>{" "}
          {shareTitle}
        </h2>
        <h2 className="text-md font-normal">Reward</h2>
        <p>{rewardAmount} Credences</p>
      </div>
      {/* <div className="flex-1"></div> */}
      <Button buttonType="primary">Create Quest</Button>
    </div>
  );
};
