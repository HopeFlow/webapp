import { Button } from "@/components/button";
import { MediaCarousel } from "@/components/media_carousel";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { cn } from "@/helpers/client/tailwind_helpers";
import Image from "next/image";
import { ContributorQuestCardNodes, StarterQuestCardNodes } from "./card_nodes";
import { withLoading } from "@/helpers/client/HOCs";
import { QuestCardSkeleton } from "./card_skeleton";

export type QuestState =
  | "Young"
  | "Thriving"
  | "Stable"
  | "Fading"
  | "Withering";
const questStatesIcons: Record<QuestState, string> = {
  Young: "🌱",
  Thriving: "🌳",
  Stable: "🌿",
  Fading: "🍂",
  Withering: "🍁",
};

// ---- THEME / HELPERS --------------------------------------------------------

const questStateTheme: Record<
  Exclude<QuestState, "Fading"> | "Fading", // keep type simple
  {
    base: "fuchsia" | "emerald" | "blue" | "amber";
    text300: string;
    text700: string;
  }
> = {
  Young: {
    base: "emerald",
    text300: "text-emerald-300",
    text700: "text-emerald-700",
  },
  Thriving: {
    base: "emerald",
    text300: "text-emerald-300",
    text700: "text-emerald-700",
  },
  Stable: { base: "blue", text300: "text-blue-300", text700: "text-blue-700" },
  Fading: {
    base: "amber",
    text300: "text-amber-300",
    text700: "text-amber-700",
  },
  Withering: {
    base: "amber",
    text300: "text-amber-300",
    text700: "text-amber-700",
  },
};

function getTheme(state: QuestState) {
  // Map both Fading/Withering into amber family, adjust if you want them distinct.
  return state === "Young"
    ? questStateTheme.Young
    : state === "Thriving"
      ? questStateTheme.Thriving
      : state === "Stable"
        ? questStateTheme.Stable
        : state === "Fading"
          ? questStateTheme.Fading
          : questStateTheme.Withering;
}

// ---- REUSABLE BITS ----------------------------------------------------------

type CoverMedia = readonly {
  url: string;
  alt?: string;
  width: number;
  height: number;
}[];

function CoverCarousel({
  coverMedia,
  title,
  className,
}: {
  coverMedia: CoverMedia;
  title: string;
  className?: string;
}) {
  return (
    <MediaCarousel
      className={cn(
        "rounded-box bg-base-content flex h-48 w-full flex-col items-center justify-center overflow-hidden md:h-96",
        className,
      )}
    >
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
  );
}

function QuestStatePill({ state }: { state: QuestState }) {
  const theme = getTheme(state);
  return (
    <span
      className={cn(
        "inline-flex h-full flex-row items-center gap-2 text-sm",
        // Safelist classes for Tailwind
        theme.text300,
        theme.text700,
      )}
    >
      {state} {questStatesIcons[state]}
    </span>
  );
}

function BountyAndStateRow({
  bounty,
  state,
}: {
  bounty: number;
  state: QuestState;
}) {
  return (
    <div className="flex w-full flex-row">
      <span className="inline-flex h-full flex-row items-center gap-2">
        +{Math.max(0, bounty)}
      </span>
      <span className="flex-1" />
      <QuestStatePill state={state} />
    </div>
  );
}

function LeadsBadge({ numberOfLeads }: { numberOfLeads: number }) {
  return (
    <div
      className={cn(
        "badge",
        numberOfLeads === 0 ? "badge-error" : "badge-info",
      )}
    >
      {numberOfLeads === 0 ? "No leads yet" : `${numberOfLeads} leads`}
    </div>
  );
}

function ActionButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className="flex h-10 w-full flex-row items-end justify-end">
      <Button
        buttonSize="sm"
        buttonType="base"
        buttonStyle="outline"
        className={cn("w-28", className)}
      >
        {label} <ArrowRightIcon />
      </Button>
    </div>
  );
}

// ---- CARDS ------------------------------------------------------------------

type Node = {
  name: string;
  activityDate: Date;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
};

type StaterQuestCardProps = {
  title: string;
  coverMedia: CoverMedia;
  bounty: number;
  numberOfLeads: number;
  questState: QuestState;
  nodes: Node[];
};

function StarterQuestCard({
  title,
  coverMedia,
  bounty,
  numberOfLeads,
  questState,
  nodes,
}: StaterQuestCardProps) {
  return (
    <div className="flex h-auto max-w-4xl flex-1 flex-row gap-2 border-b py-4">
      <StarterQuestCardNodes nodes={nodes} />
      <div className="flex flex-1 flex-col items-start gap-2">
        <h1>{title}</h1>
        <CoverCarousel coverMedia={coverMedia} title={title} />
        <BountyAndStateRow bounty={bounty} state={questState} />
        <LeadsBadge numberOfLeads={numberOfLeads} />
        <ActionButton label="Manage" />
      </div>
    </div>
  );
}

export const StarterQuestCardWithLoading = withLoading(
  StarterQuestCard,
  <QuestCardSkeleton variant="starter" />,
);

function ContributorQuestCard({
  title,
  coverMedia,
  bounty,
  numberOfLeads,
  questState,
  nodes,
}: {
  title: string;
  coverMedia: CoverMedia;
  bounty: number;
  numberOfLeads: number;
  questState: QuestState;
  nodes: Node[];
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
            {questStatesIcons[questState]}
          </span>
        </div>
        <div className="flex flex-1 flex-col items-start gap-2">
          <h1>{title}</h1>
          <CoverCarousel coverMedia={coverMedia} title={title} />
        </div>
      </div>
      <div className="flex h-auto flex-1 flex-row gap-2">
        <ContributorQuestCardNodes nodes={nodes} />
        <div className="flex flex-1 flex-col gap-2">
          <BountyAndStateRow bounty={bounty} state={questState} />
          <LeadsBadge numberOfLeads={numberOfLeads} />
          <ActionButton label="View" />
        </div>
      </div>
    </div>
  );
}

export const ContributorQuestCardWithLoading = withLoading(
  ContributorQuestCard,
  <QuestCardSkeleton variant="contributor" />,
);
