import { useState } from "react";
import { ReFlowNodeSimple } from "@/app/(nodock)/link/[linkCode]/components/ReflowTree";
import { cn } from "@/helpers/client/tailwind_helpers";

const MARGIN = 32;
const NODE_RADIUS = 56;
const NODE_SEPARATION = 95;
// const MAX_TEXT_WIDTH = 70;
const EDGE_STROKE_WIDTH = 16;
// const ELLIPSIS = "\u2026";
// const ZOOM_MIN = 0.1;
// const ZOOM_MAX = 20;
// const ZOOM_STEP = 0.1;
// const PAN_STEP = 50;
// const BASE_FONT_SIZE = 11;

const clamp = (value: number, min: number, max: number) => {
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
};

export type ReflowTreeNode = {
  nodeId: string;
  imageUrl: string | null;
  children: ReflowTreeNode[];
};

// a random number for imageUrl between 1 and 9
const getRandomImageUrl = () => {
  const randomNum = 1 + Math.floor(Math.random() * 9);
  return `/img/avatar${randomNum}.jpeg`;
};

const DEFAULT_REFLOW_TREE: ReflowTreeNode = {
  nodeId: "root",
  imageUrl: getRandomImageUrl(),
  children: [
    {
      nodeId: "root-1",
      imageUrl: getRandomImageUrl(),
      children: [
        { nodeId: "root-1-1", children: [], imageUrl: getRandomImageUrl() },
        {
          nodeId: "root-1-2",
          imageUrl: getRandomImageUrl(),
          children: [
            {
              nodeId: "root-1-2-1",
              children: [],
              imageUrl: getRandomImageUrl(),
            },
            {
              nodeId: "root-1-2-2",
              children: [],
              imageUrl: getRandomImageUrl(),
            },
            {
              nodeId: "root-1-2-3",
              children: [],
              imageUrl: getRandomImageUrl(),
            },
          ],
        },
      ],
    },
    { nodeId: "root-2", children: [], imageUrl: getRandomImageUrl() },
  ],
};

type Point = readonly [number, number];

type PlacedReFlowNode = Omit<ReFlowNodeSimple, "children"> & {
  size: number;
  vertSize: number;
  coords: Point;
  radius: number;
  children: PlacedReFlowNode[];
};

function computeTreeNodeWithPositions(root: ReFlowNodeSimple) {
  const treeLayers: PlacedReFlowNode[][] = [];
  let queue = [root as PlacedReFlowNode];
  while (queue.length > 0) {
    treeLayers.push(queue);
    const layerVertSize = queue.some((node) => node.children.length > 1)
      ? 2
      : 1;
    queue.forEach((node) => {
      node.vertSize = layerVertSize;
      node.children = node.children.map((c) => ({
        ...c,
        position: 0,
        size: 0,
        vertSize: 0,
        coords: [0, 0],
        radius: 0,
      }));
    });
    queue = queue.flatMap((node) => node.children);
  }
  treeLayers[treeLayers.length - 1].forEach((node) => {
    node.size = 1;
  });
  for (let i = treeLayers.length - 2; i >= 0; i--) {
    treeLayers[i].forEach((node) => {
      node.size = node.children.length
        ? node.children.reduce((sum, child) => sum + child.size, 0)
        : 1;
    });
  }
  const maxLayerSize = Math.max(
    ...treeLayers.map((layer) => layer.reduce((sum, n) => sum + n.size, 0)),
  );

  // const vertTotalSize = treeLayers
  //   .slice(0, -1)
  //   .reduce((sum, n) => sum + n[0].vertSize, 0);

  const widthOf = (size: number) =>
    size * (2 * NODE_RADIUS + NODE_SEPARATION) - NODE_SEPARATION;

  const heightOf = (size: number) => 0.75 * size * NODE_SEPARATION;

  treeLayers[0][0].coords = [0.5 * widthOf(maxLayerSize), NODE_RADIUS];

  const populateNodePositions = (
    parent: PlacedReFlowNode,
    nodes: PlacedReFlowNode[],
  ) => {
    let x = parent.coords[0] - 0.5 * widthOf(parent.size);
    const y = parent.coords[1] + heightOf(parent.vertSize) + 2 * NODE_RADIUS;
    nodes.forEach((node) => {
      node.coords = [x + 0.5 * widthOf(node.size), y];
      x += widthOf(node.size) + NODE_SEPARATION;
      if (node.children && node.children.length > 0)
        populateNodePositions(node, node.children);
    });
  };
  populateNodePositions(treeLayers[0][0], treeLayers[0][0].children);

  const { width, height } = treeLayers
    .flatMap((layer) => layer)
    .reduce(
      (acc, node) => {
        const [x, y] = node.coords;
        return {
          width: Math.max(acc.width, x + NODE_RADIUS),
          height: Math.max(acc.height, y + NODE_RADIUS),
        };
      },
      { width: 0, height: 0 },
    );

  return { width: width + NODE_SEPARATION, height, treeLayers };
}

const createEdgePath = (start: Point, end: Point): string => {
  const [x0, y0] = start;
  const [x1, y1] = end;
  const edgeCurveRadius = NODE_RADIUS / 2;
  const isStraightEdge = Math.abs(x1 - x0) < 1;
  const midY = (y0 + y1) / 2;

  if (isStraightEdge) {
    return `M ${0.5 * (x0 + x1)} ${y0} V ${y1}`;
  }

  const [, , curveX] =
    x0 < x1 ? [x0, x1, edgeCurveRadius] : [x1, x0, -edgeCurveRadius];

  return `M ${x0} ${y0}
          L ${x0} ${midY - edgeCurveRadius}
          S ${x0} ${midY} ${x0 + curveX} ${midY}
          L ${x1 - curveX} ${midY}
          S ${x1} ${midY} ${x1} ${midY + edgeCurveRadius}
          L ${x1} ${y1}`;
};

const TOOLTIP_WIDTH = 300;
const TOOLTIP_HEIGHT = 108;
const TOOLTIP_GAP = 16;

const formatReferer = (referer: PlacedReFlowNode["referer"]) => {
  if (!referer) return "Direct";
  const normalized = referer === "unknown" ? "Unknown" : referer;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getSvgNodes = (
  treeLayers: PlacedReFlowNode[][],
  activeNodeId: string | undefined,
  onNodeClick: (nodeId: string) => void,
  viewport: { width: number; height: number },
) => {
  return [
    ...treeLayers.flatMap((layer, index) =>
      layer.flatMap(({ coords: [x, y], children, id }) =>
        children.map(({ coords: [x1, y1], id: childNodeId }) => (
          <path
            key={`${id}-${childNodeId}`}
            d={createEdgePath([x, y], [x1, y1])}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={EDGE_STROKE_WIDTH}
            className="stroke-primary draw z-0"
            style={{ animationDelay: `${500 + index * 500}ms` }}
          />
        )),
      ),
    ),
    treeLayers.flatMap((layer, index) =>
      layer.map(
        ({
          coords: [x, y],
          id: nodeId,
          imageUrl,
          title,
          subtitle,
          referer,
        }) => {
          const imageHref =
            typeof imageUrl === "string" && imageUrl.trim()
              ? imageUrl
              : undefined;
          const isActive = nodeId === activeNodeId;
          const displayTitle =
            (typeof title === "string" && title.trim()) || "Unnamed node";
          const displaySubtitle =
            (typeof subtitle === "string" && subtitle.trim()) || "Date unknown";
          const refererLabel = formatReferer(referer);
          const tooltipX = clamp(
            x - TOOLTIP_WIDTH / 2,
            -MARGIN + 8,
            viewport.width + MARGIN - TOOLTIP_WIDTH - 8,
          );
          const tooltipY = clamp(
            y - NODE_RADIUS - TOOLTIP_HEIGHT - TOOLTIP_GAP,
            -MARGIN + 8,
            viewport.height + MARGIN - TOOLTIP_HEIGHT - 8,
          );
          return (
            <g
              key={`${nodeId}`}
              className="fade z-10"
              style={{ animationDelay: `${index * 500}ms`, cursor: "pointer" }}
              onClick={(event) => {
                event.stopPropagation();
                onNodeClick(nodeId);
              }}
            >
              <circle
                cx={x}
                cy={y}
                r={NODE_RADIUS}
                strokeWidth={
                  isActive ? EDGE_STROKE_WIDTH + 4 : EDGE_STROKE_WIDTH
                }
                className={cn(
                  "stroke-primary fill-primary transition-all duration-200",
                  isActive && "drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]",
                )}
              />
              <mask id={`mask-${nodeId}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_RADIUS}
                  strokeWidth={0}
                  fill="white"
                />
              </mask>
              <image
                x={x - NODE_RADIUS}
                y={y - NODE_RADIUS}
                width={2 * NODE_RADIUS}
                height={2 * NODE_RADIUS}
                href={imageHref}
                mask={`url(#mask-${nodeId})`}
              />
              {isActive ? (
                <foreignObject
                  x={tooltipX}
                  y={tooltipY}
                  width={TOOLTIP_WIDTH}
                  height={TOOLTIP_HEIGHT}
                  style={{ pointerEvents: "none" }}
                >
                  <div className="flex w-full max-w-[320px] min-w-[260px] flex-col gap-1 rounded-lg bg-gray-900/95 px-4 py-3 text-sm text-white shadow-xl">
                    <span className="text-xl leading-tight font-semibold break-words whitespace-normal">
                      {displayTitle}
                    </span>
                    <span className="text-xl leading-tight break-words whitespace-normal">
                      {displaySubtitle}
                    </span>
                    <span className="text-lg leading-tight break-words whitespace-normal">
                      Referer: {refererLabel}
                    </span>
                  </div>
                </foreignObject>
              ) : null}
            </g>
          );
        },
      ),
    ),
  ];
};

export const ReflowTree = ({
  treeNodes,
  activeNodeId,
  onNodeClick,
}: {
  treeNodes?: ReFlowNodeSimple;
  activeNodeId?: string;
  onNodeClick?: (nodeId: string | undefined) => void;
}) => {
  if (!treeNodes) return null;
  const { treeLayers, ...dimensions } = computeTreeNodeWithPositions(treeNodes);

  return (
    <svg
      viewBox={`${-MARGIN} ${-MARGIN} ${dimensions.width + 2 * MARGIN} ${
        dimensions.height + 2 * MARGIN
      }`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="max-h-full max-w-full"
      onClick={() => {
        if (onNodeClick) {
          onNodeClick(undefined);
        }
      }}
      ref={(svgRef) => {
        if (!svgRef) return;
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            svgRef.classList.add("in_view");
            observer.disconnect();
          }
        });
        observer.observe(svgRef);
        return () => observer.disconnect();
      }}
    >
      <rect
        x={-MARGIN}
        y={-MARGIN}
        width={dimensions.width + 2 * MARGIN}
        height={dimensions.height + 2 * MARGIN}
        fill="transparent"
        onClick={() => {
          if (onNodeClick) {
            onNodeClick(undefined);
          }
        }}
      />
      {getSvgNodes(
        treeLayers,
        activeNodeId,
        (nodeId) => {
          if (onNodeClick) onNodeClick(nodeId);
        },
        dimensions,
      )}
    </svg>
  );
};
