"use client";

import { useMemo, useState } from "react";
import { LinkBotonicalTree } from "@/app/(nodock)/link/[linkCode]/components/LinkBotonicalTree";
import { LinkReflowTree } from "@/app/(nodock)/link/[linkCode]/components/LinkReflowTree";
import type {
  ReFlowNodeSimple,
  SocialMediaName,
} from "@/app/(nodock)/link/[linkCode]/components/ReflowTree";
import { socialMediaNames } from "@/db/constants";

const DEFAULT_DRAFT_QUEST_ID = "draft-playground";

const FIRST_NAMES = [
  "Rowan",
  "Asha",
  "Mateo",
  "Priya",
  "Jun",
  "Lena",
  "Noor",
  "Idris",
  "Farah",
  "Theo",
];

const LAST_NAMES = [
  "Kim",
  "Lopez",
  "Adeyemi",
  "Singh",
  "Okafor",
  "Zhou",
  "Martins",
  "Patel",
  "Garcia",
  "Bennett",
];

const AVATAR_PATHS = [
  "/img/avatar1.jpeg",
  "/img/avatar2.jpeg",
  "/img/avatar3.jpeg",
  "/img/avatar4.jpeg",
  "/img/avatar5.jpeg",
  "/img/avatar6.jpeg",
  "/img/avatar7.jpeg",
  "/img/avatar8.jpeg",
  "/img/avatar9.jpeg",
];

const refererChoices: SocialMediaName[] = socialMediaNames.filter(
  (name): name is SocialMediaName => name !== "unknown",
);

const MIN_WIDTH = 1;
const MAX_WIDTH = 5;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const randomItem = <T,>(array: readonly T[]): T =>
  array[Math.floor(Math.random() * array.length)];

const randomName = () => `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;

const randomAvatar = () => randomItem(AVATAR_PATHS);

const randomReferer = (): SocialMediaName | null => {
  if (!refererChoices.length) return null;
  return Math.random() > 0.7 ? null : randomItem(refererChoices);
};

const randomCreatedAt = () => {
  const daysAgo = Math.floor(Math.random() * 14);
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
};

type FakeNodeInput = Partial<Omit<ReFlowNodeSimple, "children">> & {
  children?: ReFlowNodeSimple[];
};

const generateNodeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const generateQuestSeed = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `quest-${Math.random().toString(36).slice(2, 10)}`;
};

const createFakeNode = (overrides: FakeNodeInput = {}): ReFlowNodeSimple => {
  const { children = [], ...rest } = overrides;
  return {
    id: rest.id ?? generateNodeId(),
    title: rest.title ?? randomName(),
    createdAt: rest.createdAt ?? randomCreatedAt(),
    referer: rest.referer ?? randomReferer(),
    imageUrl: rest.imageUrl ?? randomAvatar(),
    potentialNode: rest.potentialNode ?? false,
    targetNode: rest.targetNode ?? false,
    rank: rest.rank,
    children: children.map(cloneNode),
  };
};

const buildInitialTree = (): ReFlowNodeSimple => {
  const root = createFakeNode({
    title: "Quest Seeker",
    targetNode: true,
    referer: null,
  });
  const firstLayer = Array.from({ length: 2 }, (_, index) =>
    createFakeNode({
      rank: index + 1,
      children: Array.from({ length: 2 }, () => createFakeNode()),
    }),
  );
  return { ...root, children: firstLayer };
};

function cloneNode(node: ReFlowNodeSimple): ReFlowNodeSimple {
  return { ...node, children: node.children.map(cloneNode) };
}

const countNodes = (node: ReFlowNodeSimple): number =>
  1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);

const getTreeDepth = (node: ReFlowNodeSimple): number => {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(getTreeDepth));
};

const findNodeById = (
  node: ReFlowNodeSimple,
  targetId?: string,
): ReFlowNodeSimple | null => {
  if (!targetId) return null;
  if (node.id === targetId) return node;
  for (const child of node.children) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }
  return null;
};

const addLayerToLeaves = (
  node: ReFlowNodeSimple,
  width: number,
): ReFlowNodeSimple => {
  if (node.children.length === 0) {
    return {
      ...node,
      children: Array.from({ length: width }, () => createFakeNode()),
    };
  }
  return {
    ...node,
    children: node.children.map((child) => addLayerToLeaves(child, width)),
  };
};

const stripDeepestLayer = (
  node: ReFlowNodeSimple,
  maxDepth: number,
  currentDepth = 1,
): ReFlowNodeSimple => {
  if (maxDepth <= 1) return node;
  if (currentDepth === maxDepth - 1) {
    return { ...node, children: [] };
  }
  return {
    ...node,
    children: node.children.map((child) =>
      stripDeepestLayer(child, maxDepth, currentDepth + 1),
    ),
  };
};

const addChildrenToNode = (
  node: ReFlowNodeSimple,
  targetId: string,
  count: number,
): [ReFlowNodeSimple, boolean] => {
  if (node.id === targetId) {
    return [
      {
        ...node,
        children: [
          ...node.children,
          ...Array.from({ length: count }, () => createFakeNode()),
        ],
      },
      true,
    ];
  }
  let didUpdate = false;
  const nextChildren = node.children.map((child) => {
    const [updatedChild, childUpdated] = addChildrenToNode(
      child,
      targetId,
      count,
    );
    if (childUpdated) didUpdate = true;
    return updatedChild;
  });
  if (!didUpdate) {
    return [node, false];
  }
  return [{ ...node, children: nextChildren }, true];
};

const removeNodeFromTree = (
  node: ReFlowNodeSimple,
  targetId: string,
): [ReFlowNodeSimple, boolean] => {
  let removed = false;
  const nextChildren = node.children
    .map((child) => {
      if (child.id === targetId) {
        removed = true;
        return null;
      }
      const [updatedChild, childRemoved] = removeNodeFromTree(child, targetId);
      if (childRemoved) removed = true;
      return updatedChild;
    })
    .filter((child): child is ReFlowNodeSimple => Boolean(child));
  if (!removed) {
    return [node, false];
  }
  return [{ ...node, children: nextChildren }, true];
};

export default function LinkDraftPage() {
  const [treeRoot, setTreeRoot] = useState<ReFlowNodeSimple>(() =>
    buildInitialTree(),
  );
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>();
  const [layerWidth, setLayerWidth] = useState(3);
  const [childrenPerInsert, setChildrenPerInsert] = useState(2);
  const [questId, setQuestId] = useState(DEFAULT_DRAFT_QUEST_ID);

  const treeDepth = useMemo(() => getTreeDepth(treeRoot), [treeRoot]);
  const totalNodes = useMemo(() => countNodes(treeRoot), [treeRoot]);
  const activeNode = useMemo(
    () => findNodeById(treeRoot, activeNodeId),
    [treeRoot, activeNodeId],
  );

  const handleAddLayer = () => {
    setTreeRoot((prev) => addLayerToLeaves(prev, layerWidth));
  };

  const handleRemoveLayer = () => {
    setTreeRoot((prev) => {
      const next = stripDeepestLayer(prev, getTreeDepth(prev));
      if (activeNodeId && !findNodeById(next, activeNodeId)) {
        setActiveNodeId(undefined);
      }
      return next;
    });
  };

  const handleAddChildren = () => {
    if (!activeNodeId) return;
    setTreeRoot((prev) => {
      const [next, updated] = addChildrenToNode(
        prev,
        activeNodeId,
        childrenPerInsert,
      );
      return updated ? next : prev;
    });
  };

  const handleRemoveNode = () => {
    if (!activeNodeId) return;
    setTreeRoot((prev) => {
      if (prev.id === activeNodeId) {
        return prev;
      }
      const [next, removed] = removeNodeFromTree(prev, activeNodeId);
      if (removed) {
        setActiveNodeId(undefined);
      }
      return removed ? next : prev;
    });
  };

  const handleReset = () => {
    setTreeRoot(buildInitialTree());
    setActiveNodeId(undefined);
    setLayerWidth(3);
    setChildrenPerInsert(2);
    setQuestId(DEFAULT_DRAFT_QUEST_ID);
  };

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div>
        <p className="text-base-content/70 text-sm tracking-wide uppercase">
          Draft Playground
        </p>
        <h1 className="text-3xl font-semibold">Botanical + ReFlow Sandbox</h1>
        <p className="text-base-content/80">
          Experiment with fake data, add or remove layers, and sculpt the
          referral tree without touching the database.
        </p>
      </div>
      <div className="bg-secondary-content border-secondary card flex flex-col border shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold">Botanical tree</h2>
          <p className="text-base-content/70 text-sm">
            Mirrors the current ReFlow layers with a quest-id-based seed.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="form-control w-60 max-w-full">
              <span className="label-text text-xs">Quest ID seed</span>
              <input
                type="text"
                value={questId}
                onChange={(event) => setQuestId(event.target.value)}
                className="input input-sm input-bordered"
                placeholder="quest-id"
              />
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setQuestId(generateQuestSeed())}
            >
              Randomize
            </button>
          </div>
          <div className="border-base-300/40 bg-base-100 mt-4 w-full overflow-hidden rounded-2xl border">
            <div className="text-secondary flex h-[15.5rem] flex-col overflow-hidden">
              <LinkBotonicalTree
                questId={questId}
                treeRoot={treeRoot}
                isLoading={false}
              />
            </div>
          </div>
        </div>
        <hr className="border-secondary mx-6" />
        <div className="flex flex-col gap-4 p-6">
          <div className="text-base-content/80 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">Tree snapshot:</span>
            <span>{totalNodes} nodes</span>
            <span className="text-base-content/50 hidden sm:inline">●</span>
            <span>Depth {treeDepth}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-base-300/60 bg-base-100 rounded-xl border p-4">
              <p className="text-base-content/60 text-sm font-semibold uppercase">
                Layers
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="form-control w-32">
                  <span className="label-text text-xs">
                    Nodes per new layer
                  </span>
                  <input
                    type="number"
                    min={MIN_WIDTH}
                    max={MAX_WIDTH}
                    value={layerWidth}
                    onChange={(event) =>
                      setLayerWidth(
                        clamp(
                          parseInt(event.target.value, 10) || MIN_WIDTH,
                          MIN_WIDTH,
                          MAX_WIDTH,
                        ),
                      )
                    }
                    className="input input-sm input-bordered"
                  />
                </label>
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  onClick={handleAddLayer}
                >
                  Add layer
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  disabled={treeDepth <= 1}
                  onClick={handleRemoveLayer}
                >
                  Remove deepest layer
                </button>
              </div>
            </div>
            <div className="border-base-300/60 bg-base-100 rounded-xl border p-4">
              <p className="text-base-content/60 text-sm font-semibold uppercase">
                Nodes
              </p>
              <p className="text-base-content/70 text-xs">
                Click a node in the ReFlow tree to edit that branch.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="form-control w-32">
                  <span className="label-text text-xs">Children per add</span>
                  <input
                    type="number"
                    min={MIN_WIDTH}
                    max={MAX_WIDTH}
                    value={childrenPerInsert}
                    onChange={(event) =>
                      setChildrenPerInsert(
                        clamp(
                          parseInt(event.target.value, 10) || MIN_WIDTH,
                          MIN_WIDTH,
                          MAX_WIDTH,
                        ),
                      )
                    }
                    className="input input-sm input-bordered"
                  />
                </label>
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  disabled={!activeNodeId}
                  onClick={handleAddChildren}
                >
                  Add children
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  disabled={!activeNodeId || treeRoot.id === activeNodeId}
                  onClick={handleRemoveNode}
                >
                  Remove node
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={handleReset}
                >
                  Reset
                </button>
              </div>
              {activeNode ? (
                <div className="bg-base-200 mt-4 rounded-lg p-3 text-sm">
                  <p className="font-semibold">{activeNode.title}</p>
                  <p className="text-base-content/70">
                    {activeNode.children.length} direct children · Created{" "}
                    {activeNode.createdAt.toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-base-content/60 mt-4 text-sm">
                  Select a node to show its details.
                </p>
              )}
            </div>
          </div>
          <LinkReflowTree
            treeRoot={treeRoot}
            activeNodeId={activeNodeId}
            onActiveNodeChange={setActiveNodeId}
            userImageUrl={undefined}
            isLoading={false}
            onPotentialNodeClick={() => {
              /* no-op in draft */
            }}
          />
        </div>
      </div>
    </div>
  );
}
