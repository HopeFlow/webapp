import { useState } from "react";
import { ReFlowNodeSimple } from "./ReflowTree";
import { ReflowTree } from "@/components/reflow_tree";

type LinkReflowTreeProps = {
  activeNodeId?: string;
  onActiveNodeChange?: (nodeId: string | undefined) => void;
  treeRoot: ReFlowNodeSimple | undefined;
  userImageUrl: string | undefined;
  isLoading: boolean;
  onPotentialNodeClick: () => void;
};

export function LinkReflowTree({
  activeNodeId,
  onActiveNodeChange,
  treeRoot,
  userImageUrl,
  isLoading,
  onPotentialNodeClick,
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

  if (isLoading || !treeRoot) {
    return (
      <div className="text-secondary flex-1 items-center justify-center self-stretch rounded-t-none p-4 pt-0">
        <div className="flex items-center justify-center p-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="text-secondary flex flex-1 flex-col items-center justify-center self-stretch rounded-t-none p-4 pt-0"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleNodeSelection(undefined);
        }
      }}
    >
      <div className="bg-primary mx-auto min-h-0 w-[12px] flex-1 flex-shrink-0" />
      <ReflowTree
        treeNodes={treeRoot}
        activeNodeId={resolvedActiveNodeId}
        onNodeClick={handleNodeSelection}
        userImageUrl={userImageUrl}
        onPotentialNodeClick={onPotentialNodeClick}
      />
      <div className="min-h-0 flex-1 flex-shrink-0" />
    </div>
  );
}
