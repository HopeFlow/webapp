"use client";

import dynamic from "next/dynamic";
import { Timeline } from "@/components/timeline";
import type { ReactNode } from "react";
import type { ReFlowNodeSimple } from "./ReflowTree";
import { LoadingElement } from "@/components/loading";

export type TimelineAction = React.ComponentProps<
  typeof Timeline
>["actions"][number];

export type TimelineStat = {
  id: string;
  icon: "views" | "shares" | "leads" | "comments";
  text: ReactNode;
};

const LinkBotonicalTreeImpl = dynamic(
  () =>
    import("./LinkBotonicalTreeImpl").then((mod) => mod.LinkBotonicalTreeImpl),
  {
    ssr: false,
    loading: () => (
      <div className="bg-base-200/20 flex h-full w-full items-center justify-center">
        <LoadingElement size={48} variant="spinner" />
      </div>
    ),
  },
);

export function LinkBotonicalTree({
  treeRoot,
  questId,
}: {
  treeRoot: ReFlowNodeSimple;
  questId: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-secondary flex h-[15.5rem] flex-col overflow-hidden">
        <LinkBotonicalTreeImpl treeRoot={treeRoot} questId={questId} />
      </div>
    </div>
  );
}
