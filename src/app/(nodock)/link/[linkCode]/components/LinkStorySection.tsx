"use client";

import { useState } from "react";
import { ReadMore } from "@/components/read_more";
import { ReflowTree, type ReflowTreeNode } from "@/components/reflow_tree";
import { ReFlowNodeSimple } from "./ReflowTree";

const toReflowTreeNode = (
  node: ReFlowNodeSimple,
  fallbackPrefix = "node",
): ReflowTreeNode => {
  const nodeId = node.id?.trim() ? node.id : fallbackPrefix;

  return {
    nodeId,
    imageUrl: node.imageUrl ?? null,

    children: node.children.map((child, index) =>
      toReflowTreeNode(child, `${nodeId}-${index}`),
    ),
  };
};

export function LinkStoryContent({ description }: { description: string }) {
  return (
    <ReadMore
      maxHeight="15rem"
      className="card bg-base-100 self-stretch p-4 md:w-2/3"
    >
      {description.split("\n").map((paragraph, index) => (
        <p key={index} className="mb-2 last:mb-0">
          {paragraph}
        </p>
      ))}
    </ReadMore>
  );
}

export function LinkReflowCard({ treeRoot }: { treeRoot: ReFlowNodeSimple }) {
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>(
    undefined,
  );

  return (
    <div
      className="card bg-accent-content text-accent border-accent flex-1 items-center justify-center self-stretch border p-4 md:max-h-[15rem]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setActiveNodeId(undefined);
        }
      }}
    >
      <ReflowTree
        treeNodes={treeRoot}
        activeNodeId={activeNodeId}
        onNodeClick={setActiveNodeId}
      />
    </div>
  );
}
