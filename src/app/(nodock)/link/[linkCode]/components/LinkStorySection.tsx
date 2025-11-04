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
      className="card bg-base-100 min-h-[15rem] self-stretch p-4"
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
      className="text-secondary flex-1 items-center justify-center self-stretch rounded-t-none p-4 pt-0"
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
