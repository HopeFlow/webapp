import { Button } from "@/components/button";
import { MediaCarousel } from "@/components/media_carousel";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { Leaf } from "@/components/leaf";
import { cn } from "@/helpers/client/tailwind_helpers";
import Image from "next/image";
import { ContributorQuestCardNodes, StarterQuestCardNodes } from "./card_nodes";
import { ShareIcon } from "@/components/icons/share";

type QuestState = "Young" | "Thriving" | "Stable" | "Fading" | "Withering";
const questStatesIcons: Record<QuestState, string> = {
  Young: "🌱",
  Thriving: "🌳",
  Stable: "🌿",
  Fading: "🍂",
  Withering: "🍁",
};

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
    url: string;
    alt?: string;
    width: number;
    height: number;
  }[];
  bounty: number;
  numberOfLeads: number;
  questState: QuestState;
  nodes: Array<{
    name: string;
    activityDate: Date;
    imageUrl: string;
    imageWidth?: number;
    imageHeight?: number;
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
    <div className="flex h-auto max-w-4xl flex-1 flex-row gap-2 border-b py-4">
      <StarterQuestCardNodes nodes={nodes} />
      <div className="flex flex-1 flex-col items-start gap-2">
        <h1>{title}</h1>
        <MediaCarousel className="rounded-box bg-base-content flex h-48 w-full flex-col items-center justify-center overflow-hidden md:h-96">
          {coverMedia.map(({ url, alt, width, height }, index) => (
            <Image
              key={`cover-${index}`}
              src={url}
              alt={alt ?? title}
              width={width}
              height={height}
              className="max-h-full w-auto object-contain"
            />
          ))}
        </MediaCarousel>
        <div className="flex w-full flex-row">
          <span className="inline-flex h-full flex-row items-center gap-2">
            +{Math.max(0, bounty)}
          </span>
          <span className="flex-1"></span>
          <span
            className={cn(
              "inline-flex h-full flex-row items-center gap-2 text-sm",
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
            {questState} <Leaf className="inline h-4 md:h-6" />{" "}
            {questStatesIcons[questState]}
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
        <div className="flex h-10 w-full flex-row items-end justify-end">
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
    url: string;
    alt?: string;
    width: number;
    height: number;
  }[];
  bounty: number;
  numberOfLeads: number;
  questState: QuestState;
  nodes: Array<{
    name: string;
    activityDate: Date;
    imageUrl: string;
    imageWidth?: number;
    imageHeight?: number;
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
    <div className="flex h-auto max-w-4xl flex-1 flex-col gap-2 border-b py-4">
      <div className="flex h-auto flex-1 flex-row gap-2">
        <div className="flex w-8 flex-col items-center text-neutral-500 md:w-12">
          <ShareIcon />
          <h2>{nodes.length - 1}</h2>
        </div>
        <div className="flex flex-1 flex-col items-start gap-2">
          <h1>{title}</h1>
          <MediaCarousel className="rounded-box bg-base-content flex h-48 w-full flex-col items-center justify-center overflow-hidden md:h-96">
            {coverMedia.map(({ url, alt, width, height }, index) => (
              <Image
                key={`cover-${index}`}
                src={url}
                alt={alt ?? title}
                width={width}
                height={height}
                className="max-h-full w-auto object-contain"
              />
            ))}
          </MediaCarousel>
        </div>
      </div>
      <div className="flex h-auto flex-1 flex-row gap-2">
        <ContributorQuestCardNodes nodes={nodes} />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex w-full flex-row">
            <span className="inline-flex h-full flex-row items-center gap-2">
              +{Math.max(0, bounty)}
            </span>
            <span className="flex-1"></span>
            <span
              className={cn(
                "inline-flex h-full flex-row items-center gap-2 text-sm",
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
              {questState} <Leaf className="inline h-4 md:h-6" />{" "}
              {questStatesIcons[questState]}
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
          <div className="flex h-10 w-full flex-row items-end justify-end">
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
