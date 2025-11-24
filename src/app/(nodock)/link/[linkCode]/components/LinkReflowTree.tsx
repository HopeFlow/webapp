import { useState } from "react";
import { ReFlowNodeSimple } from "./ReflowTree";
import { ReflowTree } from "@/components/reflow_tree";
import { useLinkNode } from "@/server_actions/client/link/linkNode";
import { useRouter } from "next/navigation";

type LinkReflowTreeProps = {
  treeRoot: ReFlowNodeSimple;
  activeNodeId?: string;
  onActiveNodeChange?: (nodeId: string | undefined) => void;
  userImageUrl?: string;
  linkCode: string;
  isLoggedIn: boolean;
};

export function LinkReflowTree({
  treeRoot,
  activeNodeId,
  onActiveNodeChange,
  userImageUrl,
  linkCode,
  isLoggedIn,
}: LinkReflowTreeProps) {
  const [uncontrolledActiveNodeId, setUncontrolledActiveNodeId] = useState<
    string | undefined
  >(undefined);
  const isControlled = typeof onActiveNodeChange === "function";
  const resolvedActiveNodeId = isControlled
    ? activeNodeId
    : uncontrolledActiveNodeId;

  const { create: createNode } = useLinkNode({ linkCode });
  const router = useRouter();

  const handleNodeSelection = (nodeId: string | undefined) => {
    if (!isControlled) {
      setUncontrolledActiveNodeId(nodeId);
    }
    onActiveNodeChange?.(nodeId);
  };

  const handlePotentialNodeClick = async () => {
    // TODO: we should have linkCode and using link/${linkCode} instead currentUrl
    // TODO: we should use routeToLogin instead of router.push
    if (!isLoggedIn) {
      const currentUrl = window.location.href;
      const loginUrl = `/login?url=${encodeURIComponent(currentUrl)}`;
      router.push(loginUrl);
      return;
    }
    // TODO: We should pass referer from page.tsx to here to use proper referer
    await createNode.mutateAsync({ referer: "unknown" });
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
