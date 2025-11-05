"use client";

import { Button } from "@/components/button";
import type { InsertQuestData } from "./types";
import { FileImage } from "@/components/file_image";

export const Overview = ({
  title,
  shareTitle,
  description,
  rewardAmount,
  coverPhoto,
  onCreateQuest,
  isCreating,
  disableCreate,
}: {
  title: string;
  shareTitle: string;
  description: string;
  rewardAmount: number;
  coverPhoto?: InsertQuestData["coverPhoto"];
  onCreateQuest: () => void | Promise<void>;
  isCreating: boolean;
  disableCreate: boolean;
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
          <p className="text-base-content/70 hidden text-sm md:block">
            Patiently defined quests, thoughtfully presented, attract best
          </p>
        </div>
        <section>
          {coverPhoto ? (
            <figure className="border-base-300 bg-base-200 rounded-box aspect-video overflow-hidden border-b">
              <FileImage
                src={coverPhoto.content}
                alt={coverPhoto.alt}
                className="h-full w-full object-cover"
                width={coverPhoto.width}
                height={coverPhoto.height}
              />
            </figure>
          ) : (
            <div className="border-base-300 bg-base-200 text-base-content/50 flex aspect-video items-center justify-center border-b px-6 text-center text-sm">
              Add a cover image to introduce the quest at a glance.
            </div>
          )}
          <div className="card-body gap-6 md:gap-8">
            <div className="space-y-2">
              <span className="badge badge-outline text-base-content/70 w-fit text-xs tracking-wide uppercase">
                Creator view
              </span>
              <h2 className="text-base-content text-xl font-semibold md:text-2xl">
                {safeTitle}
              </h2>
              <p className="text-base-content/60 text-sm">
                This is what shows inside your workspace.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-base-content/60 text-sm font-medium uppercase">
                Description
              </h3>
              <p className="rounded-box bg-base-200/50 text-base-content/80 p-4 text-sm leading-relaxed md:text-base">
                {safeDescription}
              </p>
            </div>
            <div className="divider my-0" />
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              <div className="space-y-2">
                <span className="badge badge-outline text-base-content/70 w-fit text-xs tracking-wide uppercase">
                  Public headline
                </span>
                <p className="text-base-content text-lg font-medium md:text-xl">
                  {safeShareTitle}
                </p>
                <p className="text-base-content/60 text-sm">
                  Contributors see this title before opening the quest.
                </p>
              </div>
              <div className="rounded-box border-base-300 bg-base-100 border p-4 md:p-5">
                <span className="text-base-content/60 text-xs font-semibold tracking-wide uppercase">
                  Reward
                </span>
                <p className="text-base-content text-3xl font-semibold">
                  {formattedReward}
                  <span className="text-base-content/60 pl-2 text-base font-medium">
                    Credences
                  </span>
                </p>
                <p className="text-base-content/50 text-xs">
                  For now, rewards are fixed and are measure in credences.
                  <sup>
                    <a href="#" className="link-info font-[40%]">
                      See more
                    </a>
                  </sup>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="w-full px-4 pb-5 md:max-w-4xl md:px-8 md:pb-8">
        <Button
          buttonType="primary"
          className="w-full md:w-auto"
          withSpinner={isCreating}
          disabled={disableCreate}
          onClick={() => {
            void onCreateQuest();
          }}
        >
          Create Quest
        </Button>
      </div>
    </div>
  );
};
