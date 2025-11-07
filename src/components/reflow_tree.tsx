import {
  type SocialMediaName,
  ReFlowNodeSimple,
} from "@/app/(nodock)/link/[linkCode]/components/ReflowTree";
import { cn } from "@/helpers/client/tailwind_helpers";
import {
  FacebookLogo,
  InstagramLogo,
  LinkedInLogo,
  PinterestLogo,
  RedditLogo,
  SnapchatLogo,
  TelegramLogo,
  TikTokLogo,
  TwitterLogo,
  WhatsAppLogo,
} from "@/components/logos/socialMedia";
import { AppTimeAgo } from "@/helpers/client/time";

const MARGIN = 42;
const NODE_RADIUS = 56;
const NODE_SEPARATION = 95;
// const MAX_TEXT_WIDTH = 70;
const EDGE_STROKE_WIDTH = 12;
const TARGET_NODE_RADIUS_SCALE = 1.2;
const TARGET_EDGE_STROKE_SCALE = 1.25;
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

type Point = readonly [number, number];

type PlacedReFlowNode = Omit<ReFlowNodeSimple, "children"> & {
  size: number;
  vertSize: number;
  coords: Point;
  radius: number;
  children: PlacedReFlowNode[];
};

const REFERER_ICON_MAP: Partial<Record<SocialMediaName, typeof FacebookLogo>> =
  {
    facebook: FacebookLogo,
    instagram: InstagramLogo,
    twitter: TwitterLogo,
    linkedin: LinkedInLogo,
    pinterest: PinterestLogo,
    tiktok: TikTokLogo,
    reddit: RedditLogo,
    snapchat: SnapchatLogo,
    telegram: TelegramLogo,
    whatsapp: WhatsAppLogo,
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

const getRefererIcon = (referer: PlacedReFlowNode["referer"]) => {
  if (!referer || referer === "unknown") return null;
  return REFERER_ICON_MAP[referer] ?? null;
};

const resolveNodeRadius = (node: PlacedReFlowNode) =>
  node.targetNode ? NODE_RADIUS * TARGET_NODE_RADIUS_SCALE : NODE_RADIUS;

const getSvgNodes = (
  treeLayers: PlacedReFlowNode[][],
  activeNodeId: string | undefined,
  onNodeClick: (nodeId: string) => void,
  viewport: { minX: number; minY: number; width: number; height: number },
) => {
  const viewportMaxX = viewport.minX + viewport.width;
  const viewportMaxY = viewport.minY + viewport.height;
  const rootNode = treeLayers[0]?.[0];
  const topCenter: Point = [viewport.minX + viewport.width / 2, viewport.minY];
  const rootToViewportPath = rootNode
    ? [
        <path
          key={`root-to-top-center-${rootNode.id}`}
          d={createEdgePath(rootNode.coords, topCenter)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={EDGE_STROKE_WIDTH}
          className="stroke-primary z-0"
        />,
      ]
    : [];
  return [
    ...rootToViewportPath,
    ...treeLayers.flatMap((layer, index) =>
      layer.flatMap(({ coords: [x, y], children, id }) =>
        children.map(({ coords: [x1, y1], id: childNodeId }) => (
          <path
            key={`${id}-${childNodeId}`}
            d={createEdgePath([x, y], [x1, y1])}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={EDGE_STROKE_WIDTH}
            className="stroke-primary z-0"
            style={{ animationDelay: `${500 + index * 500}ms` }}
          />
        )),
      ),
    ),
    treeLayers.flatMap((layer, layerIndex) =>
      layer.map((node, nodeIndex) => {
        const {
          coords: [x, y],
          id: nodeId,
          imageUrl,
          title,
          createdAt,
          referer,
          potentialNode,
          targetNode,
          rank,
        } = node;
        const isRootNode = layerIndex === 0 && nodeIndex === 0;
        const isTargetNode = Boolean(targetNode);
        const radius = resolveNodeRadius(node);
        const imageHref =
          typeof imageUrl === "string" && imageUrl.trim()
            ? imageUrl
            : undefined;
        const resolvedImageHref = imageHref ?? "/img/unknown.png";
        const showPotentialNode = Boolean(potentialNode);
        const RefererIcon = showPotentialNode ? null : getRefererIcon(referer);
        const showRefererIcon = Boolean(RefererIcon);
        const isActive = nodeId === activeNodeId;
        const baseStrokeWidth = isTargetNode
          ? EDGE_STROKE_WIDTH * TARGET_EDGE_STROKE_SCALE
          : EDGE_STROKE_WIDTH;
        const strokeWidth = isActive ? baseStrokeWidth + 4 : baseStrokeWidth;
        const displayTitle =
          (typeof title === "string" && title.trim()) || "Unnamed node";
        // const displaySubtitle =
        //   (typeof subtitle === "string" && subtitle.trim()) || "Date unknown";
        const showRankBadge =
          !isRootNode && typeof rank === "number" && Number.isFinite(rank);
        const badgeRadius = radius * 0.5;
        const badgeOffset = radius * 0.8;
        const tooltipX = clamp(
          x - TOOLTIP_WIDTH / 2,
          viewport.minX + 8,
          viewportMaxX - TOOLTIP_WIDTH - 8,
        );
        const tooltipY = clamp(
          y - radius - TOOLTIP_HEIGHT - TOOLTIP_GAP,
          viewport.minY + 8,
          viewportMaxY - TOOLTIP_HEIGHT - 8,
        );
        return (
          <g
            key={`${nodeId}`}
            className="z-10"
            style={{
              animationDelay: `${layerIndex * 500}ms`,
              cursor: "pointer",
            }}
            onClick={(event) => {
              event.stopPropagation();
              onNodeClick(nodeId);
            }}
          >
            <circle
              cx={x}
              cy={y}
              r={radius}
              strokeWidth={strokeWidth}
              className={cn(
                "stroke-primary fill-primary transition-all duration-200",
                isActive && "drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]",
              )}
              style={isTargetNode ? { stroke: "#22c55e" } : undefined}
            />
            <mask id={`mask-${nodeId}`}>
              <circle cx={x} cy={y} r={radius} strokeWidth={0} fill="white" />
            </mask>
            <image
              x={x - radius}
              y={y - radius}
              width={2 * radius}
              height={2 * radius}
              href={resolvedImageHref}
              mask={`url(#mask-${nodeId})`}
              className={cn(
                "w-auto filter transition duration-200",
                showPotentialNode && "brightness-75 grayscale",
              )}
            />
            {(showPotentialNode || showRefererIcon) && (
              <g
                transform={`translate(${x + 0.25 * radius}, ${y + 0.5 * radius})`}
              >
                {showPotentialNode ? (
                  <g color="white" fill="green">
                    <circle cx={12} cy={12} r={13} fill="green" />
                    <path
                      d="M12 6v12M6 12h12"
                      stroke="white"
                      strokeWidth={2}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </g>
                ) : (
                  RefererIcon && <RefererIcon size={48} />
                )}
              </g>
            )}
            {showRankBadge && (
              <g>
                <circle
                  cx={x + badgeOffset}
                  cy={y - badgeOffset}
                  r={badgeRadius}
                  fill="#f3f4f6"
                  stroke={
                    rank === 1
                      ? "#d4af37"
                      : rank === 2
                        ? "#c0c0c0"
                        : rank === 3
                          ? "#cd7f32"
                          : "#1f2937"
                  }
                  strokeWidth={2}
                />
                <foreignObject
                  x={x + badgeOffset - badgeRadius}
                  y={y - badgeOffset - badgeRadius}
                  width={badgeRadius * 2}
                  height={badgeRadius * 2}
                  style={{ pointerEvents: "none" }}
                >
                  <div
                    className="flex h-full w-full items-center justify-center text-xs"
                    style={{ fontSize: badgeRadius * 0.9 }}
                  >
                    {rank === 1 && "🏆"}
                    {rank === 2 && "🥈"}
                    {rank === 3 && "🥉"}
                    {rank !== 1 && rank !== 2 && rank !== 3 && rank}
                  </div>
                </foreignObject>
              </g>
            )}
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
                    <AppTimeAgo date={createdAt} />
                  </span>
                </div>
              </foreignObject>
            ) : null}
          </g>
        );
      }),
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
  const rawBounds = treeLayers.reduce(
    (acc, layer) => {
      layer.forEach((node) => {
        const [x, y] = node.coords;
        const radius = resolveNodeRadius(node);
        const nodeMinX = x - radius;
        const nodeMaxX = x + radius;
        const nodeMinY = y - radius;
        const nodeMaxY = y + radius;
        if (nodeMinX < acc.minX) acc.minX = nodeMinX;
        if (nodeMaxX > acc.maxX) acc.maxX = nodeMaxX;
        if (nodeMinY < acc.minY) acc.minY = nodeMinY;
        if (nodeMaxY > acc.maxY) acc.maxY = nodeMaxY;
      });
      return acc;
    },
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
  const hasFiniteBounds =
    Number.isFinite(rawBounds.minX) && Number.isFinite(rawBounds.minY);
  const bounds = hasFiniteBounds
    ? rawBounds
    : {
        minX: -NODE_RADIUS,
        maxX: NODE_RADIUS,
        minY: -NODE_RADIUS,
        maxY: NODE_RADIUS,
      };
  const viewBoxWidth = dimensions.width + 2 * MARGIN;
  const viewBoxHeight = dimensions.height + 2 * MARGIN;
  const contentCenterX = (bounds.minX + bounds.maxX) / 2;
  const contentCenterY = (bounds.minY + bounds.maxY) / 2;
  const viewBoxMinX = contentCenterX - viewBoxWidth / 2;
  const viewBoxMinY = contentCenterY - viewBoxHeight / 2;
  const viewport = {
    minX: viewBoxMinX,
    minY: viewBoxMinY,
    width: viewBoxWidth,
    height: viewBoxHeight,
  };

  return (
    <svg
      viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="max-h-[40vh] w-full max-w-full md:max-h-[14.7rem]"
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
        x={viewBoxMinX}
        y={viewBoxMinY}
        width={viewBoxWidth}
        height={viewBoxHeight}
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
        viewport,
      )}
    </svg>
  );
};
