import { useState } from "react";
import { ReFlowNodeSimple } from "./ReflowTree";
import { ReflowTree } from "@/components/reflow_tree";

export function LinkReflowTree({ treeRoot }: { treeRoot: ReFlowNodeSimple }) {
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
