import { useState } from "react";
import { ReFlowNodeSimple } from "./ReflowTree";
import { ReflowTree } from "@/components/reflow_tree";

type LinkReflowTreeProps = {
  treeRoot: ReFlowNodeSimple;
  activeNodeId?: string;
  onActiveNodeChange?: (nodeId: string | undefined) => void;
  userImageUrl?: string;
};

export function LinkReflowTree({
  treeRoot,
  activeNodeId,
  onActiveNodeChange,
  userImageUrl,
}: LinkReflowTreeProps) {
  const [uncontrolledActiveNodeId, setUncontrolledActiveNodeId] = useState<
    string | undefined
  >(undefined);
  const isControlled = typeof onActiveNodeChange === "function";
  const resolvedActiveNodeId = isControlled
    ? activeNodeId
    : uncontrolledActiveNodeId;

  const handleNodeSelection = (nodeId: string | undefined) => {
    if (!isControlled) {
      setUncontrolledActiveNodeId(nodeId);
    }
    onActiveNodeChange?.(nodeId);
  };

  return (
    <div
      className="text-secondary flex-1 items-center justify-center self-stretch rounded-t-none p-4 pt-0"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleNodeSelection(undefined);
        }
      }}
    >
      <ReflowTree
        treeNodes={treeRoot}
        activeNodeId={resolvedActiveNodeId}
        onNodeClick={handleNodeSelection}
        userImageUrl={userImageUrl}
      />
    </div>
  );
}
