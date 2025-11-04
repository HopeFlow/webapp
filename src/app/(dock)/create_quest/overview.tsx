import Image from "next/image";
import { Button } from "@/components/button";
import type { InsertQuestData } from "./types";

export const Overview = ({
  title,
  shareTitle,
  description,
  rewardAmount,
  coverPhoto,
}: {
  title: string;
  shareTitle: string;
  description: string;
  rewardAmount: number;
  coverPhoto?: InsertQuestData["coverPhoto"];
}) => {
  const formattedReward = new Intl.NumberFormat("en-US").format(
    Math.max(0, rewardAmount ?? 0),
  );
  const safeDescription =
    description && description.trim().length > 0
      ? description
      : "No description provided yet.";
  const safeTitle = title && title.trim().length > 0 ? title : "Untitled quest";
  const safeShareTitle =
    shareTitle && shareTitle.trim().length > 0
      ? shareTitle
      : "Add a shareable title";

  return (
    <div className="flex h-full min-h-0 w-full flex-col md:items-center">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-5 overflow-y-auto px-4 pt-4 pb-6 md:max-w-4xl md:gap-6 md:px-8 md:pt-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-normal">Is the information correct?</h1>
          <p className="text-sm text-base-content/70 hidden md:block">
            Patiently defined quests, thoughtfully presented, attract  best
          </p>
        </div>
        <section>
          {coverPhoto ? (
            <figure className="aspect-video overflow-hidden border-b border-base-300 bg-base-200 rounded-box">
              <Image
                src={coverPhoto.url}
                alt={coverPhoto.alt}
                className="h-full w-full object-cover"
                width={coverPhoto.width}
                height={coverPhoto.height}
              />
            </figure>
          ) : (
            <div className="flex aspect-video items-center justify-center border-b border-base-300 bg-base-200 px-6 text-center text-sm text-base-content/50">
              Add a cover image to introduce the quest at a glance.
            </div>
          )}
          <div className="card-body gap-6 md:gap-8">
            <div className="space-y-2">
              <span className="badge badge-outline w-fit uppercase tracking-wide text-xs text-base-content/70">
                Creator view
              </span>
              <h2 className="text-xl font-semibold text-base-content md:text-2xl">
                {safeTitle}
              </h2>
              <p className="text-sm text-base-content/60">
                This is what shows inside your workspace.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium uppercase text-base-content/60">
                Description
              </h3>
              <p className="rounded-box bg-base-200/50 p-4 text-sm leading-relaxed text-base-content/80 md:text-base">
                {safeDescription}
              </p>
            </div>
            <div className="divider my-0" />
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              <div className="space-y-2">
                <span className="badge badge-outline w-fit uppercase tracking-wide text-xs text-base-content/70">
                  Public headline
                </span>
                <p className="text-lg font-medium text-base-content md:text-xl">
                  {safeShareTitle}
                </p>
                <p className="text-sm text-base-content/60">
                  Contributors see this title before opening the quest.
                </p>
              </div>
              <div className="rounded-box border border-base-300 bg-base-100 p-4 md:p-5">
                <span className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                  Reward
                </span>
                <p className="text-3xl font-semibold text-base-content">
                  {formattedReward}
                  <span className="pl-2 text-base font-medium text-base-content/60">
                    Credences
                  </span>
                </p>
                <p className="text-xs text-base-content/50">
                  For now, rewards are fixed and are measure in credences.<sup><a href="#" className="font-[40%] link-info">See more</a></sup>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="w-full px-4 pb-5 md:max-w-4xl md:px-8 md:pb-8">
        <Button buttonType="primary" className="w-full md:w-auto">
          Create Quest
        </Button>
      </div>
    </div>
  );
};
