"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ReadMore } from "@/components/read_more";
import { Timeline } from "@/components/timeline";
import { EyeIcon } from "@/components/icons/eye";
import { MediatorsIcon } from "@/components/icons/mediators";
import { BulbIcon } from "@/components/icons/bulb";
import { ChatBubbleIcon } from "@/components/icons/chat_bubble";
import { Avatar } from "@/components/user_avatar";
import { Tree } from "@dgreenheck/ez-tree";
import {
  AmbientLight,
  Clock,
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
import { SafeUser } from "@/helpers/server/auth";
import { Button } from "@/components/button";

export type TimelineAction = React.ComponentProps<
  typeof Timeline
>["actions"][number];

export type TimelineStat = {
  id: string;
  icon: "views" | "shares" | "leads" | "comments";
  text: ReactNode;
};

export function LinkTimelineContent({
  actions,
  user,
}: {
  actions: TimelineAction[];
  user?: SafeUser;
}) {
  const commentInputId = useId();

  return (
    <div className="">
      <ReadMore
        maxHeight="11rem"
        className="card bg-base-100 rounded-b-none border-b-0 p-4 outline-0"
      >
        <Timeline actions={actions} />
      </ReadMore>
      <form className="card bg-base-100/80 rounded-t-none border border-t-0 border-neutral-400 p-2 shadow-xs transition">
        <div className="bg-base-200/50 focus-within:bg-base-300/60 flex items-center gap-1 rounded shadow-inner transition-all">
          {user?.imageUrl && (
            <div className="shrink-0">
              <Avatar
                name="You"
                className="w-10 bg-transparent"
                imageUrl={user?.imageUrl}
              />
            </div>
          )}
          <div className="flex flex-1 items-center gap-1 pr-1">
            <label htmlFor={commentInputId} className="sr-only">
              Leave a comment
            </label>
            <input
              id={commentInputId}
              type="text"
              placeholder={user ? "Share your thoughts…" : "Sign in to comment"}
              className="placeholder:text-base-content/50 flex-1 border-none bg-transparent text-sm outline-none"
            />
            <Button type="button" buttonType="primary" buttonSize="sm">
              {user ? "Post" : "Sign in and Post"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function LinkTimelineStats({
  stats: _stats,
}: {
  stats: TimelineStat[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
    tree.options.seed = Math.floor(Math.random() * 100000);
    tree.options.branch.length[0] = 56;
    tree.options.branch.gnarliness[0] = 0;

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

      const distanceV =
        treeHeight / Math.max(Math.tan(halfVerticalFov), 0.0001);
      const distanceH =
        treeRadius / Math.max(Math.tan(halfHorizontalFov), 0.0001);
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

    let animationFrame = 0;

    const renderScene = () => {
      animationFrame = requestAnimationFrame(renderScene);
      tree.rotation.y += 0.001;
      renderer.render(scene, camera);
    };

    renderScene();

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
    };
  }, []);

  return (
    <div className="flex flex-col">
      <div className="text-secondary flex h-[15.5rem] flex-col overflow-hidden">
        <div ref={containerRef} className="h-full w-full" />
        {/* <b className="mb-3 font-bold">Statistics</b>
        {_stats.map((stat) => (
          <div key={stat.id} className="flex flex-row gap-4">
            {iconForStat(stat.icon)}
            {stat.text}
          </div>
        ))} */}
      </div>
    </div>
  );
}

const iconForStat = (icon: TimelineStat["icon"]) => {
  switch (icon) {
    case "views":
      return <EyeIcon />;
    case "shares":
      return <MediatorsIcon />;
    case "leads":
      return <BulbIcon />;
    case "comments":
      return <ChatBubbleIcon />;
    default:
      return null;
  }
};
