import { Button } from "@/components/button";
import { Carousel } from "@/components/carousel";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { Leaf } from "@/components/leaf";
import { cn } from "@/helpers/client/tailwind_helpers";
import Image from "next/image";
import { ContributorQuestCardNodes, StarterQuestCardNodes } from "./card_nodes";
import { ShareIcon } from "@/components/icons/share";

type QuestState = "Young" | "Thriving" | "Stable" | "Withering";

export function StarterQuestCard({
  title,
  coverMedia,
  bounty,
  numberOfLeads,
  questState,
  nodes,
}: {
  title: string;
  coverMedia: readonly {
    imageUrl: string;
    alt?: string;
    imageWidth: number;
    imageHeight: number;
  }[];
  bounty: number;
  numberOfLeads: number;
  questState: QuestState;
  nodes: Array<{
    name: string;
    activityDate: Date;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
  }>;
}) {
  const questStateColorBase =
    questState === "Young"
      ? "fuchsia"
      : questState === "Thriving"
      ? "emerald"
      : questState === "Stable"
      ? "blue"
      : "amber";
  return (
    <div className="max-w-4xl flex-1 h-auto flex flex-row gap-2 py-4 border-b">
      <StarterQuestCardNodes nodes={nodes} />
      <div className="flex-1 flex flex-col gap-2 items-start">
        <h1>{title}</h1>
        <Carousel className="w-full h-48 md:h-96 flex flex-col items-center justify-center rounded-box overflow-hidden bg-base-content">
          {coverMedia.map(
            ({ imageUrl, alt, imageWidth, imageHeight }, index) => (
              <Image
                key={`cover-${index}`}
                src={imageUrl}
                alt={alt ?? title}
                width={imageWidth}
                height={imageHeight}
                className="max-h-full w-auto object-contain"
              />
            ),
          )}
        </Carousel>
        <div className="w-full flex flex-row">
          <span className="h-full inline-flex flex-row items-center gap-2">
            💠 +{Math.max(0, bounty)}
          </span>
          <span className="flex-1"></span>
          <span
            className={cn(
              "text-sm h-full inline-flex flex-row items-center gap-2",
              // START HACK: Force Tailwind to add variables for these colors
              questState === "Young" && "text-fuchsia-300",
              questState === "Thriving" && "text-emerald-300",
              questState === "Stable" && "text-blue-300",
              questState === "Withering" && "text-amber-300",
              // END HACK
              questState === "Young" && "text-fuchsia-700",
              questState === "Thriving" && "text-emerald-700",
              questState === "Stable" && "text-blue-700",
              questState === "Withering" && "text-amber-700",
            )}
            style={
              {
                "--branch-color": `var(--color-${questStateColorBase}-700, #22c55e)`,
                "--leaf-color": `var(--color-${questStateColorBase}-300, #22c55e)`,
              } as React.CSSProperties
            }
          >
            {questState} <Leaf className="inline h-4 md:h-6" />
          </span>
        </div>
        <div
          className={cn(
            "badge",
            numberOfLeads === 0 ? "badge-error" : "badge-info",
          )}
        >
          {numberOfLeads === 0 ? "No leads yet" : `${numberOfLeads} leads`}
        </div>
        <div className="w-full h-10 flex flex-row items-end justify-end">
          <Button
            buttonSize="sm"
            buttonType="base"
            buttonStyle="outline"
            className="w-28"
          >
            Manage <ArrowRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ContributorQuestCard({
  title,
  coverMedia,
  bounty,
  numberOfLeads,
  questState,
  nodes,
}: {
  title: string;
  coverMedia: readonly {
    imageUrl: string;
    alt?: string;
    imageWidth: number;
    imageHeight: number;
  }[];
  bounty: number;
  numberOfLeads: number;
  questState: QuestState;
  nodes: Array<{
    name: string;
    activityDate: Date;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
  }>;
}) {
  const questStateColorBase =
    questState === "Young"
      ? "fuchsia"
      : questState === "Thriving"
      ? "emerald"
      : questState === "Stable"
      ? "blue"
      : "amber";
  return (
    <div className="max-w-4xl flex-1 h-auto flex flex-col gap-2 py-4 border-b">
      <div className="h-auto flex-1 flex flex-row gap-2">
        <div className="w-8 md:w-12 flex flex-col items-center gap-1 text-neutral-500">
          <ShareIcon />
          <h2>{nodes.length - 1}</h2>
        </div>
        <div className="flex-1 flex flex-col gap-2 items-start">
          <h1>{title}</h1>
          <Carousel className="w-full h-48 md:h-96 flex flex-col items-center justify-center rounded-box overflow-hidden bg-base-content">
            {coverMedia.map(
              ({ imageUrl, alt, imageWidth, imageHeight }, index) => (
                <Image
                  key={`cover-${index}`}
                  src={imageUrl}
                  alt={alt ?? title}
                  width={imageWidth}
                  height={imageHeight}
                  className="max-h-full w-auto object-contain"
                />
              ),
            )}
          </Carousel>
        </div>
      </div>
      <div className="h-auto flex-1 flex flex-row gap-2">
        <ContributorQuestCardNodes nodes={nodes} />
        <div className="flex-1 flex flex-col gap-2">
          <div className="w-full flex flex-row">
            <span className="h-full inline-flex flex-row items-center gap-2">
              💠 +{Math.max(0, bounty)}
            </span>
            <span className="flex-1"></span>
            <span
              className={cn(
                "text-sm h-full inline-flex flex-row items-center gap-2",
                // START HACK: Force Tailwind to add variables for these colors
                questState === "Young" && "text-fuchsia-300",
                questState === "Thriving" && "text-emerald-300",
                questState === "Stable" && "text-blue-300",
                questState === "Withering" && "text-amber-300",
                // END HACK
                questState === "Young" && "text-fuchsia-700",
                questState === "Thriving" && "text-emerald-700",
                questState === "Stable" && "text-blue-700",
                questState === "Withering" && "text-amber-700",
              )}
              style={
                {
                  "--branch-color": `var(--color-${questStateColorBase}-700, #22c55e)`,
                  "--leaf-color": `var(--color-${questStateColorBase}-300, #22c55e)`,
                } as React.CSSProperties
              }
            >
              {questState} <Leaf className="inline h-4 md:h-6" />
            </span>
          </div>
          <div
            className={cn(
              "badge",
              numberOfLeads === 0 ? "badge-error" : "badge-info",
            )}
          >
            {numberOfLeads === 0 ? "No leads yet" : `${numberOfLeads} leads`}
          </div>
          <div className="w-full h-10 flex flex-row items-end justify-end">
            <Button
              buttonSize="sm"
              buttonType="base"
              buttonStyle="outline"
              className="w-28"
            >
              View <ArrowRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
