"use client";

import { useEffect, useRef } from "react";
import { Tree, TreePreset, LeafType } from "@dgreenheck/ez-tree";
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Mesh,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import type { ReFlowNodeSimple } from "./ReflowTree";

// const MAX_CHILDREN_PER_LEVEL = 10;

type LayerStats = {
  depth: number;
  count: number;
  totalChildren: number;
  avgChildren: number;
  maxChildren: number;
};

// const clampValue = (value: number, min: number, max: number) =>
//   Math.max(min, Math.min(max, value));

const hashStringToSeed = (value: string) => {
  if (!value) return 1;
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
};

const collectLayerStats = (root: ReFlowNodeSimple): LayerStats[] => {
  const stats: LayerStats[] = [];
  let depth = 0;
  let queue: ReFlowNodeSimple[] = [root];
  while (queue.length) {
    let totalChildren = 0;
    let maxChildren = 0;
    const next: ReFlowNodeSimple[] = [];
    queue.forEach((node) => {
      const childCount = node.children.length;
      totalChildren += childCount;
      if (childCount > maxChildren) maxChildren = childCount;
      next.push(...node.children);
    });
    const count = queue.length;
    stats.push({
      depth,
      count,
      totalChildren,
      avgChildren: count ? totalChildren / count : 0,
      maxChildren,
    });
    queue = next;
    depth += 1;
  }
  return stats;
};

const BARK_TINTS = [0x654321, 0x5b3a29, 0x734f2b, 0x59381d] as const;
const LEAF_TINTS = [0x8ee59a, 0xa1f0a4, 0x77d8b2, 0xb0f5b9] as const;
const SPECIES = ["Ash", "Aspen", "Oak", "Pine"] as const;
// const BASE_TREE_SIZES = ["Small", "Medium", "Large"] as const;
// const TREE_SIZES = [
//   "Sprout",
//   "Small",
//   "SmallMedium",
//   "Medium",
//   "MediumLarge",
//   "Large",
// ] as const;
type SpeciesName = (typeof SPECIES)[number];
// type BaseTreeSize = (typeof BASE_TREE_SIZES)[number];
type BaseTreeSize = "Small" | "Medium" | "Large";
// type TreeSize = (typeof TREE_SIZES)[number];
type TreeSize =
  | "Sprout"
  | "Small"
  | "SmallMedium"
  | "Medium"
  | "MediumLarge"
  | "Large";
type PresetName = `${SpeciesName} ${BaseTreeSize}`;

type TreeOptionsLike = Tree["options"];

const leafTypeRecord = LeafType as Record<
  string,
  (typeof LeafType)[keyof typeof LeafType]
>;

const SPECIES_LEAF_KEYS: Record<SpeciesName, string[]> = {
  Ash: ["Ash"],
  Aspen: ["Aspen"],
  Oak: ["Oak", "Oak_1"],
  Pine: ["Pine", "Pine_1"],
};

const resolveLeafType = (species: SpeciesName) => {
  const candidates = SPECIES_LEAF_KEYS[species] ?? ["Oak", "Oak_1"];
  for (const key of candidates) {
    if (key in leafTypeRecord) {
      return leafTypeRecord[key];
    }
  }
  const [fallbackKey] = Object.keys(leafTypeRecord);
  return leafTypeRecord[fallbackKey];
};

const SIZE_CONFIG: Record<
  TreeSize,
  { from: BaseTreeSize; to?: BaseTreeSize; t?: number }
> = {
  Sprout: { from: "Small", to: "Medium", t: 0.15 },
  Small: { from: "Small" },
  SmallMedium: { from: "Small", to: "Medium", t: 0.5 },
  Medium: { from: "Medium" },
  MediumLarge: { from: "Medium", to: "Large", t: 0.5 },
  Large: { from: "Large" },
};

const SIZE_THRESHOLDS: Array<{ size: TreeSize; max: number }> = [
  { size: "Sprout", max: 3 },
  { size: "Small", max: 6 },
  { size: "SmallMedium", max: 10 },
  { size: "Medium", max: 16 },
  { size: "MediumLarge", max: 24 },
  { size: "Large", max: Number.POSITIVE_INFINITY },
];

const SIZE_CAMERA_SCALE: Record<TreeSize, number> = {
  Sprout: 0.4,
  Small: 0.55,
  SmallMedium: 0.7,
  Medium: 0.85,
  MediumLarge: 0.95,
  Large: 1,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const interpolateNumericMap = (
  source: Record<string | number, number> | undefined,
  target: Record<string | number, number> | undefined,
  t: number,
) => {
  const keys = new Set([
    ...(source ? Object.keys(source) : []),
    ...(target ? Object.keys(target) : []),
  ]);
  const result: Record<string, number> = {};
  keys.forEach((key) => {
    const fromValue =
      source?.[key as keyof typeof source] ??
      target?.[key as keyof typeof target] ??
      0;
    const toValue = target?.[key as keyof typeof target] ?? fromValue;
    result[key] = lerp(fromValue, toValue, t);
  });
  return result;
};

const interpolateTypedMap = <T extends Record<string | number, number>>(
  base: T,
  target: Record<string | number, number> | undefined,
  t: number,
): T => interpolateNumericMap(base, target, t) as T;

const interpolateTreeOptions = (
  base: TreeOptionsLike,
  target: TreeOptionsLike | undefined,
  t: number,
): TreeOptionsLike => {
  if (!target || t <= 0) return base;
  const clone =
    typeof structuredClone === "function"
      ? structuredClone(base)
      : (JSON.parse(JSON.stringify(base)) as TreeOptionsLike);
  clone.bark.tint = lerp(base.bark.tint, target.bark.tint, t);
  clone.bark.textureScale = {
    x: lerp(base.bark.textureScale.x, target.bark.textureScale.x, t),
    y: lerp(base.bark.textureScale.y, target.bark.textureScale.y, t),
  };
  clone.branch.children = interpolateTypedMap(
    base.branch.children,
    target.branch.children,
    t,
  );
  clone.branch.angle = interpolateTypedMap(
    base.branch.angle,
    target.branch.angle,
    t,
  );
  clone.branch.start = interpolateTypedMap(
    base.branch.start,
    target.branch.start,
    t,
  );
  clone.branch.gnarliness = interpolateTypedMap(
    base.branch.gnarliness,
    target.branch.gnarliness,
    t,
  );
  clone.branch.length = interpolateTypedMap(
    base.branch.length,
    target.branch.length,
    t,
  );
  clone.branch.radius = interpolateTypedMap(
    base.branch.radius,
    target.branch.radius,
    t,
  );
  clone.branch.sections = interpolateTypedMap(
    base.branch.sections,
    target.branch.sections,
    t,
  );
  clone.branch.segments = interpolateTypedMap(
    base.branch.segments,
    target.branch.segments,
    t,
  );
  clone.branch.taper = interpolateTypedMap(
    base.branch.taper,
    target.branch.taper,
    t,
  );
  clone.branch.twist = interpolateTypedMap(
    base.branch.twist,
    target.branch.twist,
    t,
  );
  clone.branch.force = {
    direction: {
      x: lerp(
        base.branch.force.direction.x,
        target.branch.force.direction.x,
        t,
      ),
      y: lerp(
        base.branch.force.direction.y,
        target.branch.force.direction.y,
        t,
      ),
      z: lerp(
        base.branch.force.direction.z,
        target.branch.force.direction.z,
        t,
      ),
    },
    strength: lerp(base.branch.force.strength, target.branch.force.strength, t),
  };
  clone.leaves.angle = lerp(base.leaves.angle, target.leaves.angle, t);
  clone.leaves.count = lerp(base.leaves.count, target.leaves.count, t);
  clone.leaves.start = lerp(base.leaves.start, target.leaves.start, t);
  clone.leaves.size = lerp(base.leaves.size, target.leaves.size, t);
  clone.leaves.sizeVariance = lerp(
    base.leaves.sizeVariance,
    target.leaves.sizeVariance,
    t,
  );
  clone.leaves.tint = lerp(base.leaves.tint, target.leaves.tint, t);
  clone.leaves.alphaTest = lerp(
    base.leaves.alphaTest,
    target.leaves.alphaTest,
    t,
  );
  return clone;
};

const getPresetForSize = (species: SpeciesName, size: TreeSize) => {
  const config = SIZE_CONFIG[size];
  const basePreset = clonePresetOptions(
    `${species} ${config.from}` as PresetName,
  );
  if (!basePreset) return undefined;
  if (!config.to || typeof config.t !== "number") {
    return basePreset;
  }
  const targetPreset = clonePresetOptions(
    `${species} ${config.to}` as PresetName,
  );
  if (!targetPreset) return basePreset;
  return interpolateTreeOptions(basePreset, targetPreset, config.t);
};

const pickSpecies = (questSeed: number): SpeciesName =>
  SPECIES[Math.abs(questSeed) % SPECIES.length] ?? SPECIES[0];

const sizeFromNodeCount = (nodeCount: number): TreeSize =>
  SIZE_THRESHOLDS.find(({ max }) => nodeCount <= max)?.size ?? "Large";

const clonePresetOptions = (
  presetName: PresetName,
): TreeOptionsLike | undefined => {
  const preset = TreePreset[presetName];
  if (!preset) return undefined;
  const clone =
    typeof structuredClone === "function"
      ? structuredClone(preset)
      : JSON.parse(JSON.stringify(preset));
  return clone as TreeOptionsLike;
};

type TreeSectionList = Parameters<Tree["generateChildBranches"]>[2];

let patchedTreeChildBranches = false;
const patchTreeLeafFallback = () => {
  if (patchedTreeChildBranches) return;
  patchedTreeChildBranches = true;
  const originalGenerateChildBranches = Tree.prototype.generateChildBranches;
  Tree.prototype.generateChildBranches = function patchedGenerateChildBranches(
    this: Tree,
    count: number,
    level: number,
    sections: TreeSectionList,
  ) {
    // When the branching logic would stop prematurely, attach leaves so limbs never look bare.
    if (!count || count <= 0) {
      this.generateLeaves(sections);
      return;
    }
    return originalGenerateChildBranches.call(this, count, level, sections);
  };
};

const configureTreeFromStructure = (
  tree: Tree,
  root: ReFlowNodeSimple,
  questId: string,
) => {
  const stats = collectLayerStats(root);
  const questSeed = hashStringToSeed(questId);
  const totalNodes = stats.reduce((sum, layer) => sum + layer.count, 0);
  const species = pickSpecies(questSeed);
  const size = sizeFromNodeCount(totalNodes);
  const presetOptions = getPresetForSize(species, size);
  if (presetOptions) {
    tree.options.bark = presetOptions.bark;
    tree.options.branch = presetOptions.branch;
    tree.options.leaves = presetOptions.leaves;
    tree.options.type = presetOptions.type;
  }
  tree.userData = {
    ...tree.userData,
    treeSize: size,
    cameraScale: SIZE_CAMERA_SCALE[size] ?? 1,
  };

  tree.options.seed = questSeed;
  tree.options.leaves.type = resolveLeafType(species);

  tree.options.bark.tint = BARK_TINTS[questSeed % BARK_TINTS.length];
  tree.options.leaves.tint = LEAF_TINTS[(questSeed >> 3) % LEAF_TINTS.length];
};

patchTreeLeafFallback();

export function LinkBotonicalTreeImpl({
  treeRoot,
  questId,
}: {
  treeRoot: ReFlowNodeSimple;
  questId: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!treeRoot) {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new Scene();
    scene.background = null;

    const camera = new PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 14, 32);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambientLight = new AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 1.1);
    directionalLight.position.set(12, 18, 10);
    scene.add(directionalLight);

    const tree = new Tree();
    configureTreeFromStructure(tree, treeRoot, questId);

    tree.generate();

    const initialBox = new Box3().setFromObject(tree);
    const initialCenter = initialBox.getCenter(new Vector3());
    tree.position.sub(initialCenter);

    const centeredBox = new Box3().setFromObject(tree);
    tree.position.y -= centeredBox.min.y;
    tree.updateMatrixWorld(true);

    const groundedBox = new Box3().setFromObject(tree);
    const treeHeight = groundedBox.max.y - groundedBox.min.y;
    const treeSphere = groundedBox.getBoundingSphere(new Sphere());
    const treeCenter = treeSphere.center.clone();
    const treeRadius = treeSphere.radius;
    const boxCenter = groundedBox.getCenter(new Vector3());
    const bottomReference = new Vector3(
      boxCenter.x,
      groundedBox.min.y,
      boxCenter.z,
    );
    const topReference = new Vector3(
      boxCenter.x,
      groundedBox.max.y,
      boxCenter.z,
    );

    scene.add(tree);

    const updateViewport = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width || container.clientWidth || 320;
      const height = rect.height || container.clientHeight || 240;

      renderer.setSize(width, height);

      const aspect = width / Math.max(height, 1);
      camera.aspect = aspect;

      const verticalFov = MathUtils.degToRad(camera.fov);
      const halfVerticalFov = verticalFov / 2;
      const halfHorizontalFov =
        Math.atan(Math.tan(halfVerticalFov) * aspect) || halfVerticalFov;
      const cameraScale =
        (tree.userData as { cameraScale?: number }).cameraScale ?? 1;
      const normalizedScale = Math.max(cameraScale, 0.1);
      const referenceHeight = treeHeight / normalizedScale;
      const referenceRadius = treeRadius / normalizedScale;

      const distanceV =
        referenceHeight / Math.max(Math.tan(halfVerticalFov), 0.0001);
      const distanceH =
        referenceRadius / Math.max(Math.tan(halfHorizontalFov), 0.0001);
      const distance = Math.max(distanceV, distanceH) * 0.6;

      camera.near = Math.max(0.1, distance / 50);
      camera.far = Math.max(distance + treeHeight * 4, camera.near + 1);
      camera.updateProjectionMatrix();

      camera.position.set(
        treeCenter.x,
        treeHeight * 0.55,
        treeCenter.z + distance,
      );

      tree.updateMatrixWorld(true);

      const bottomWorld = bottomReference
        .clone()
        .applyMatrix4(tree.matrixWorld);
      const topWorld = topReference.clone().applyMatrix4(tree.matrixWorld);

      let lowTarget = groundedBox.min.y;
      let highTarget = groundedBox.max.y + treeHeight;
      let targetY = groundedBox.max.y * 0.6;

      // Tilt camera until the projected trunk base sits on the bottom edge.
      for (let i = 0; i < 30; i++) {
        targetY = (lowTarget + highTarget) / 2;
        camera.lookAt(treeCenter.x, targetY, treeCenter.z);
        camera.updateMatrixWorld();
        const projectedBottom = bottomWorld.clone().project(camera).y;
        if (!Number.isFinite(projectedBottom)) {
          break;
        }
        if (projectedBottom < -1) {
          highTarget = targetY;
        } else {
          lowTarget = targetY;
        }
        if (Math.abs(projectedBottom + 1) < 0.005) {
          break;
        }
      }

      camera.lookAt(treeCenter.x, targetY, treeCenter.z);
      camera.updateMatrixWorld();

      const projectedTop = topWorld.clone().project(camera).y;
      if (projectedTop > 1) {
        // Pull the camera back slightly if the top would get cropped.
        const extraDistance = distance * (1 + (projectedTop - 1) * 0.6);
        camera.position.set(
          treeCenter.x,
          treeHeight * 0.55,
          treeCenter.z + extraDistance,
        );
        camera.near = Math.max(0.1, extraDistance / 50);
        camera.far = Math.max(extraDistance + treeHeight * 4, camera.near + 1);
        camera.updateProjectionMatrix();

        lowTarget = groundedBox.min.y;
        highTarget = groundedBox.max.y + treeHeight;

        for (let i = 0; i < 30; i++) {
          targetY = (lowTarget + highTarget) / 2;
          camera.lookAt(treeCenter.x, targetY, treeCenter.z);
          camera.updateMatrixWorld();
          const projectedBottom = bottomWorld.clone().project(camera).y;
          if (!Number.isFinite(projectedBottom)) {
            break;
          }
          if (projectedBottom < -1) {
            highTarget = targetY;
          } else {
            lowTarget = targetY;
          }
          if (Math.abs(projectedBottom + 1) < 0.005) {
            break;
          }
        }
        camera.lookAt(treeCenter.x, targetY, treeCenter.z);
        camera.updateMatrixWorld();
      }
    };

    updateViewport();

    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";

    let animationFrame = 0;
    let lastFrameTime: number | null = null;
    const BASE_SPEED = 0.00006;
    const MAX_USER_SPEED = 0.0012;
    const PIXEL_TO_RADIANS = 0.004;
    const SPEED_DECAY = 0.00001;

    let userSpeed = 0;
    let isDragging = false;
    let lastPointerX: number | null = null;
    let lastPointerTime: number | null = null;

    const handlePointerDown = (event: PointerEvent) => {
      isDragging = true;
      userSpeed = 0;
      lastPointerX = event.clientX;
      lastPointerTime = performance.now();
      renderer.domElement.setPointerCapture?.(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging || lastPointerX === null) {
        return;
      }
      const now = performance.now();
      const deltaX = event.clientX - lastPointerX;
      const deltaTime = Math.max(now - (lastPointerTime ?? now), 1);
      const rotationDelta = deltaX * PIXEL_TO_RADIANS;

      tree.rotation.y += rotationDelta;

      if (deltaTime > 0) {
        const velocity = rotationDelta / deltaTime;
        userSpeed = MathUtils.clamp(velocity, -MAX_USER_SPEED, MAX_USER_SPEED);
      }

      lastPointerX = event.clientX;
      lastPointerTime = now;
    };

    const endDrag = (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      lastPointerX = null;
      lastPointerTime = null;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", endDrag);
    renderer.domElement.addEventListener("pointerleave", endDrag);
    renderer.domElement.addEventListener("pointercancel", endDrag);

    const renderScene = (time: number) => {
      animationFrame = requestAnimationFrame(renderScene);

      if (lastFrameTime === null) {
        lastFrameTime = time;
      }
      const delta = Math.max(Math.min(time - lastFrameTime, 64), 0);
      lastFrameTime = time;

      if (!isDragging) {
        if (userSpeed > 0) {
          userSpeed = Math.max(userSpeed - SPEED_DECAY * delta, 0);
        } else if (userSpeed < 0) {
          userSpeed = Math.min(userSpeed + SPEED_DECAY * delta, 0);
        }
      }

      const angularVelocity = isDragging ? 0 : BASE_SPEED + userSpeed;
      tree.rotation.y += angularVelocity * delta;
      renderer.render(scene, camera);
    };

    animationFrame = requestAnimationFrame(renderScene);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateViewport())
        : null;

    resizeObserver?.observe(container);

    const disposeTree = () => {
      scene.remove(tree);
      tree.traverse((child) => {
        if (!(child instanceof Mesh)) {
          return;
        }
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
          return;
        }
        child.material?.dispose();
      });
    };

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      disposeTree();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", endDrag);
      renderer.domElement.removeEventListener("pointerleave", endDrag);
      renderer.domElement.removeEventListener("pointercancel", endDrag);
      renderer.domElement.style.cursor = "";
      renderer.domElement.style.touchAction = "";
    };
  }, [treeRoot, questId]);
  return <div ref={containerRef} className="h-full w-full" />;
}
