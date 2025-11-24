import { useState } from "react";
import { ReFlowNodeSimple, SocialMediaName } from "./ReflowTree";
import { ReflowTree } from "@/components/reflow_tree";
import { useLinkNode } from "@/server_actions/client/link/linkNode";

import { useGotoLogin } from "@/helpers/client/routes";

type LinkReflowTreeProps = {
  treeRoot: ReFlowNodeSimple;
  activeNodeId?: string;
  onActiveNodeChange?: (nodeId: string | undefined) => void;
  userImageUrl?: string;
  linkCode: string;
  isLoggedIn: boolean;
  referer: SocialMediaName;
};

export function LinkReflowTree({
  treeRoot,
  activeNodeId,
  onActiveNodeChange,
  userImageUrl,
  linkCode,
  isLoggedIn,
  referer,
}: LinkReflowTreeProps) {
  const [uncontrolledActiveNodeId, setUncontrolledActiveNodeId] = useState<
    string | undefined
  >(undefined);
  const isControlled = typeof onActiveNodeChange === "function";
  const resolvedActiveNodeId = isControlled
    ? activeNodeId
    : uncontrolledActiveNodeId;

  const { create: createNode } = useLinkNode({ linkCode });
  const gotoLogin = useGotoLogin();

  const handleNodeSelection = (nodeId: string | undefined) => {
    if (!isControlled) {
      setUncontrolledActiveNodeId(nodeId);
    }
    onActiveNodeChange?.(nodeId);
  };

  const handlePotentialNodeClick = async () => {
    if (!isLoggedIn) {
      gotoLogin({ url: `/link/${linkCode}` });
      return;
    }
    await createNode.mutateAsync({ referer });
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
        onPotentialNodeClick={handlePotentialNodeClick}
      />
    </div>
  );
}
