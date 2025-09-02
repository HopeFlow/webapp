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

export type ReflowTreeNode = {
  nodeId: string;
  children: ReflowTreeNode[];
};

type Point = readonly [number, number];

type PlacedReFlowNode = {
  nodeId: string;
  size: number;
  vertSize: number;
  coords: Point;
  radius: number;
  children: PlacedReFlowNode[];
};

function computeTreeNodeWithPositions(root: PlacedReFlowNode) {
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

  const vertTotalSize = treeLayers
    .slice(0, -1)
    .reduce((sum, n) => sum + n[0].vertSize, 0);

  const widthOf = (size: number) =>
    size * (2 * NODE_RADIUS + NODE_SEPARATION) - NODE_SEPARATION;

  const heightOf = (size: number) => 0.75 * size * NODE_SEPARATION;

  treeLayers[0][0].coords = [
    0.5 * widthOf(maxLayerSize),
    NODE_RADIUS,
  ];

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

const getSvgNodes = (treeLayers: PlacedReFlowNode[][]) => {
  let i = 0;
  return [
    ...treeLayers.flatMap((layer, index) =>
      layer.flatMap(({ coords: [x, y], children, nodeId }) =>
        children.map(({ coords: [x1, y1], nodeId: childNodeId }) => (
          <path
            key={`${nodeId}-${childNodeId}`}
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
      layer.map(({ coords: [x, y], nodeId }) => (
        <g
          key={`${nodeId}`}
          className="fade z-10"
          style={{ animationDelay: `${index * 500}ms` }}
        >
          <circle
            cx={x}
            cy={y}
            r={NODE_RADIUS}
            strokeWidth={EDGE_STROKE_WIDTH}
            className="stroke-primary fill-primary"
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
            href={`/img/avatar${1 + (i++ % 9)}.jpeg`}
            mask={`url(#mask-${nodeId})`}
          />
        </g>
      )),
    ),
  ];
};

export const ReflowTree = () => {
  const treeNodes = {
    nodeId: "root",
    children: [
      {
        nodeId: "root-1",
        children: [
          {
            nodeId: "root-1-1",
            children: [],
          },
          {
            nodeId: "root-1-2",
            children: [
              {
                nodeId: "root-1-2-1",
                children: [],
              },
              {
                nodeId: "root-1-2-2",
                children: [],
              },
              {
                nodeId: "root-1-2-3",
                children: [],
              },
            ],
          },
        ],
      },
      {
        nodeId: "root-2",
        children: [],
      },
    ],
  };
  const { treeLayers, ...dimensions } = computeTreeNodeWithPositions(
    treeNodes as unknown as PlacedReFlowNode,
  );

  return (
    <svg
      viewBox={`${-MARGIN} ${-MARGIN} ${dimensions.width + 2 * MARGIN} ${
        dimensions.height + 2 * MARGIN
      }`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="max-w-full max-h-full"
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
      {getSvgNodes(treeLayers)}
    </svg>
  );
};
