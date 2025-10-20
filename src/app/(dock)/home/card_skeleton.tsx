import * as React from "react";
import { cn } from "@/helpers/client/tailwind_helpers";

type Variant = "starter" | "contributor";

type QuestCardSkeletonProps = {
  variant?: Variant;
  className?: string;
  /** Number of node avatars to hint at (includes the root). */
  nodesCount?: number;
  /** Fixed media height to match real card. */
  mediaHeightClass?: string; // e.g., "h-48 md:h-96"
  /** Width of the action button placeholder */
  actionWidthClass?: string; // e.g., "w-28"
};

const NodeColumnSkeleton = ({
  variant,
  nodes,
}: {
  variant: Variant;
  nodes: number;
}) => (
  <div className="relative flex flex-col items-center justify-between self-stretch">
    {/* top block (share or latest avatar) */}
    {variant === "starter" ? (
      <>
        <div className="flex flex-col items-center text-neutral-500">
          <div className="skeleton h-5 w-5 rounded" />
          <div className="skeleton mt-1 h-4 w-6 rounded" />
        </div>
        <div className="h-4" />
        {nodes > 1 && (
          <>
            <div className="skeleton h-3 w-16 rounded" />
            <div className="avatar mt-1">
              <div className="skeleton w-6 rounded-full md:w-9" />
            </div>
          </>
        )}
      </>
    ) : (
      // contributor
      <>
        {nodes > 1 && (
          <div className="avatar">
            <div className="skeleton w-8 rounded-full md:w-12" />
          </div>
        )}
      </>
    )}

    {/* connectors */}
    {nodes > 1 && <hr className="border-neutral/10 w-0 flex-1 border" />}
    {variant === "starter" && nodes > 5 && (
      <hr className="border-neutral/10 w-0 flex-1 border border-dashed" />
    )}

    {/* middle avatars / segments */}
    {nodes > 2 &&
      (variant === "starter" ? (
        <>
          <div className="flex flex-col -space-y-3">
            {[...Array(Math.min(3, nodes - 1))].map((_, i) => (
              <div key={i} className="avatar">
                <div className="skeleton w-6 rounded-full md:w-9" />
              </div>
            ))}
          </div>
          <div className="bg-neutral/10 w-0.5 flex-1" />
        </>
      ) : (
        <>
          <hr className="border-neutral/10 w-0 flex-[4] border border-dashed" />
          <hr className="border-neutral/10 w-0 flex-1 border" />
        </>
      ))}

    {/* root avatar */}
    {variant === "starter" ? (
      <div className="avatar">
        <div className="skeleton w-8 rounded-full md:w-12" />
      </div>
    ) : (
      <div className="avatar">
        <div className="skeleton w-6 rounded-full md:w-8" />
      </div>
    )}

    {/* label */}
    <div className="absolute bottom-0 left-[calc(100%+0.5rem)] w-auto text-sm whitespace-nowrap">
      <div className="skeleton h-4 w-28 rounded" />
      <div className="skeleton mt-1 h-3 w-20 rounded" />
    </div>
  </div>
);

const MediaSkeleton = ({ mediaHeightClass }: { mediaHeightClass: string }) => (
  <div
    className={cn(
      "rounded-box bg-base-content/70 flex w-full flex-col items-center justify-center overflow-hidden",
      mediaHeightClass,
    )}
    aria-hidden
  >
    <div className="skeleton h-full w-full" />
  </div>
);

const BountyStateRow = () => (
  <div className="flex w-full flex-row items-center">
    <div className="skeleton h-5 w-16 rounded" />
    <span className="flex-1" />
    <div className="skeleton h-5 w-28 rounded" />
  </div>
);

const LeadsBadge = () => (
  <div className="badge badge-ghost">
    <div className="skeleton h-4 w-20 rounded" />
  </div>
);

const ActionButton = ({ actionWidthClass }: { actionWidthClass: string }) => (
  <div className="flex h-10 w-full flex-row items-end justify-end">
    <div
      className={cn(
        "btn btn-outline btn-sm border-neutral/10 pointer-events-none",
        actionWidthClass,
      )}
    >
      <div className="skeleton h-4 w-16 rounded" />
    </div>
  </div>
);

export function QuestCardSkeleton({
  variant = "starter",
  className,
  nodesCount = 4,
  mediaHeightClass = "h-48 md:h-96",
  actionWidthClass = "w-28",
}: QuestCardSkeletonProps) {
  const nodes = Math.max(1, nodesCount);

  // Layouts
  if (variant === "starter") {
    return (
      <div
        className={cn(
          "flex h-auto max-w-4xl flex-1 flex-row gap-2 border-b py-4",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <NodeColumnSkeleton variant={variant} nodes={nodes} />
        <div className="flex flex-1 flex-col items-start gap-2">
          <div className="skeleton h-6 w-48 rounded" />
          <MediaSkeleton mediaHeightClass={mediaHeightClass} />
          <BountyStateRow />
          <LeadsBadge />
          <ActionButton actionWidthClass={actionWidthClass} />
        </div>
      </div>
    );
  }

  // contributor
  return (
    <div
      className={cn(
        "flex h-auto max-w-4xl flex-1 flex-col gap-2 border-b py-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex h-auto flex-1 flex-row gap-2">
        <div className="flex w-8 flex-col items-center text-neutral-500 md:w-12">
          <div className="skeleton h-5 w-5 rounded" />
          <div className="skeleton mt-1 h-4 w-6 rounded" />
        </div>
        <div className="flex flex-1 flex-col items-start gap-2">
          <div className="skeleton h-6 w-48 rounded" />
          <MediaSkeleton mediaHeightClass={mediaHeightClass} />
        </div>
      </div>
      <div className="flex h-auto flex-1 flex-row gap-2">
        <NodeColumnSkeleton variant={variant} nodes={nodes} />
        <div className="flex flex-1 flex-col gap-2">
          <BountyStateRow />
          <LeadsBadge />
          <ActionButton actionWidthClass={actionWidthClass} />
        </div>
      </div>
    </div>
  );
}
