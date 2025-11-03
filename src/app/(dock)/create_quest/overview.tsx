import type { InsertQuestData  } from "./types";

export const Overview = ({
  title,
  description,
  rewardAmount,
  coverPhoto,
}: {
  title: string;
  description: string;
  rewardAmount: string;
  coverPhoto?: InsertQuestData["coverPhoto"];
}) => {
  return <div>Overview</div>;
};