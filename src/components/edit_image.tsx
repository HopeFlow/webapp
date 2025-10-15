"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseButton, Button } from "./button";
import { useToast } from "./toast";
import { FileImage } from "./file_image";
import { ArrowUturnRightIcon } from "./icons/arrow_uturn_right";
import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "./icons/magnifying_glass";
import { cn } from "@/helpers/client/tailwind_helpers";

type TransformParamsType = {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
};

const applyTransformAndConvertToPng = async (
  image: HTMLImageElement,
  container: HTMLDivElement,
  aspectRatioValue: number,
  filename: string,
  { offsetX, offsetY, rotation, scale }: TransformParamsType,
) => {
  const canvas = document.createElement("canvas");
  const sizeW = Math.min(
    container.offsetWidth,
    container.offsetHeight * aspectRatioValue,
  );
  const sizeH = Math.min(
    container.offsetWidth / aspectRatioValue,
    container.offsetHeight,
  );
  canvas.width = sizeW;
  canvas.height = sizeH;
  const context = canvas.getContext("2d");
  if (!context) throw Error("Error getting 2d context for the canvas");

  const dw = image.width * scale;
  const dh = image.height * scale;
  const dx = 0.5 * (offsetX - dw + sizeW);
  const dy = 0.5 * (offsetY - dh + sizeH);
  switch (rotation / 90) {
    case 0:
      context.translate(dx, dy);
      break;
    case 1:
      context.translate(dw + dx, dy);
      break;
    case 2:
      context.translate(dw + dx, dh + dy);
      break;
    case 3:
      context.translate(dx, dh + dy);
      break;
    default:
  }
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(image, 0, 0, dw, dh);

  return new Promise<File>((resolve) => {
    canvas.toBlob((b) => {
      if (!b) throw Error("Error converting photo to PNG image");
      resolve(new File([b], filename, { type: "image/png" }));
    }, "image/png");
  });
};

const sanitizeTransformParams = (
  params: TransformParamsType,
  container: HTMLDivElement,
  aspectRatioValue: number,
) => {
  if (container === null) return params;
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  const domImage = container.querySelector("img")!;
  const imageWidth = domImage.width;
  const imageHeight = domImage.height;
  const sizeW = Math.min(width, height * aspectRatioValue);
  const sizeH = Math.min(width / aspectRatioValue, height);
  const sanitizedScale = Math.max(
    sizeW / imageWidth,
    sizeH / imageHeight,
    params.scale,
  );
  const h1 = (o: number, b: number) => Math.min(b, Math.max(-b, o));
  const h2 = (o: number, b0: number, b1: number) =>
    params.rotation % 180 === 0 ? h1(o, b0) : h1(o, b1);
  const sanitizedOffsetX = h2(
    params.offsetX,
    imageWidth * sanitizedScale - sizeW,
    imageHeight * sanitizedScale - sizeH,
  );
  const sanitizedOffsetY = h2(
    params.offsetY,
    imageHeight * sanitizedScale - sizeH,
    imageWidth * sanitizedScale - sizeW,
  );
  return {
    offsetX: sanitizedOffsetX,
    offsetY: sanitizedOffsetY,
    scale: sanitizedScale,
    rotation: params.rotation,
  };
};

const normalizeWheelDelta = (e: WheelEvent) => {
  const scale = (() => {
    if (e.deltaMode === window.WheelEvent.DOM_DELTA_PIXEL) return 10 / 120 / 50;
    if (e.deltaMode === window.WheelEvent.DOM_DELTA_LINE) return 40 / 50;
    if (e.deltaMode === window.WheelEvent.DOM_DELTA_PAGE) return 800 / 50;
    return 1;
  })();
  return { dx: e.deltaX * scale, dy: e.deltaY * scale };
};

export type AspectRatio = "square" | "video";

export type EditImageProps = {
  image?: File;
  aspectRatio: AspectRatio;
  done: (result?: File) => void;
  className?: string;
};

export function EditImage({
  image,
  aspectRatio,
  done,
  className,
}: EditImageProps) {
  const aspectRatioValue = aspectRatio === "square" ? 1 : 16 / 9;
  const containerRef = useRef<HTMLDivElement>(null);
  const imageFileName = image?.name;

  const [{ offsetX, offsetY, scale, rotation }, setTransformParams] =
    useState<TransformParamsType>({
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1,
    });

  const updateTransformParams = useCallback(
    (update: Partial<TransformParamsType>) => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      setTransformParams((params) =>
        sanitizeTransformParams(
          { ...params, ...update },
          container,
          aspectRatioValue,
        ),
      );
    },
    [aspectRatioValue],
  );
  const [initialScalingApplied, setInitialScalingApplied] = useState(false);

  type PanAnchorType = {
    points: Array<{ X: number; Y: number }>;
    startParams: TransformParamsType;
  };

  const [panAnchor, setPanAnchor] = useState<PanAnchorType | null>(null);

  const addToast = useToast();

  const applyChanges = useCallback(() => {
    if (containerRef.current === null) return;
    const image = containerRef.current.querySelector("img")!;
    applyTransformAndConvertToPng(
      image,
      containerRef.current,
      aspectRatioValue,
      imageFileName ?? "image.png",
      { offsetX, offsetY, rotation, scale },
    )
      .then((f) => {
        done(f);
      })
      .catch((e) => {
        if (e instanceof Error)
          addToast({
            title: "Edit Error",
            description: e.message,
            type: "error",
          });
      });
  }, [
    aspectRatioValue,
    imageFileName,
    offsetX,
    offsetY,
    rotation,
    scale,
    done,
    addToast,
  ]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const container = containerRef.current;

    function installEventListener<K extends keyof HTMLElementEventMap>(
      target: HTMLElement,
      type: K,
      listener: (this: HTMLElement, e: HTMLElementEventMap[K]) => void,
      passive?: boolean,
    ): () => void;
    function installEventListener<K extends keyof DocumentEventMap>(
      target: Document,
      type: K,
      listener: (this: Document, e: DocumentEventMap[K]) => void,
      passive?: boolean,
    ): () => void;
    function installEventListener(
      target: HTMLElement | Document,
      type: string,
      listener:
        | ((
            this: HTMLElement,
            e: HTMLElementEventMap[keyof HTMLElementEventMap],
          ) => void)
        | ((
            this: Document,
            e: DocumentEventMap[keyof DocumentEventMap],
          ) => void),
      passive?: boolean,
    ) {
      if (passive !== undefined)
        target.addEventListener(type, listener, { passive });
      else target.addEventListener(type, listener);
      return () => target.removeEventListener(type, listener);
    }

    function startPointerAction<P extends { clientX: number; clientY: number }>(
      points: P[],
    ) {
      if (points.length < 1) {
        // TODO: warn("Unexpected behaviour, empty point list");
        return;
      }
      setPanAnchor({
        points: points.map(({ clientX, clientY }) => ({
          X: clientX,
          Y: clientY,
        })),
        startParams: { offsetX, offsetY, scale, rotation },
      });
    }

    function applyPointerAction<P extends { clientX: number; clientY: number }>(
      points: P[],
    ) {
      if (points.length < 1) {
        // TODO: warn("Unexpected behaviour, empty point list");
        return;
      }
      if (!panAnchor) return;
      const {
        startParams: { offsetX: stOffsX, offsetY: stOffsY, scale: stScale },
        points: anchorPoints,
      } = panAnchor;
      if (anchorPoints.length > 1 && points.length > 1) {
        function getDistance(P0: [number, number], P1: [number, number]) {
          const [d0, d1] = [P0[0] - P1[0], P0[1] - P1[1]];
          return Math.sqrt(d0 * d0 + d1 * d1);
        }

        function getCenterAndDiameter(
          Xs: number[],
          Ys: number[],
        ): [[number, number], number] {
          const P0: [number, number] = [Math.min(...Xs), Math.min(...Ys)];
          const P1: [number, number] = [Math.max(...Xs), Math.max(...Ys)];

          const center: [number, number] = [
            0.5 * (P0[0] + P1[0]),
            0.5 * (P0[1] + P1[1]),
          ];
          const diameter = getDistance(P0, P1);

          return [center, diameter];
        }

        // TODO: Memoise these two values for anchorPoints?
        const [anchorCenter, anchorDiameter] = getCenterAndDiameter(
          anchorPoints.map((p) => p.X),
          anchorPoints.map((p) => p.Y),
        );
        const [center, diameter] = getCenterAndDiameter(
          points.map((p) => p.clientX),
          points.map((p) => p.clientY),
        );
        updateTransformParams({
          offsetX: stOffsX + 2 * (center[0] - anchorCenter[0]),
          offsetY: stOffsY + 2 * (center[1] - anchorCenter[1]),
          scale: stScale * (diameter / anchorDiameter),
        });
      } else {
        updateTransformParams({
          offsetX: stOffsX + 2 * (points[0].clientX - anchorPoints[0].X),
          offsetY: stOffsY + 2 * (points[0].clientY - anchorPoints[0].Y),
        });
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startPointerAction([e]);
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startPointerAction(Array.from(e.touches));
    };

    const handleMouseUp = () => {
      setPanAnchor(null);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) startPointerAction(Array.from(e.touches));
      else setPanAnchor(null);
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      applyPointerAction([e]);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      applyPointerAction(Array.from(e.touches));
    };

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const { dx, dy } = normalizeWheelDelta(e);
      if (e.getModifierState("Control"))
        updateTransformParams({ scale: scale + dy });
      else
        updateTransformParams({ offsetX: offsetX + dx, offsetY: offsetY + dy });
    };

    const eventListenerCleanupQueue = [
      installEventListener(container, "mousedown", handleMouseDown),
      installEventListener(container, "mousemove", handleMouseMove),
      installEventListener(document, "mouseup", handleMouseUp),
      installEventListener(container, "wheel", handleWheelEvent, false),
      installEventListener(container, "touchstart", handleTouchStart),
      installEventListener(container, "touchmove", handleTouchMove),
      installEventListener(document, "touchend", handleTouchEnd),
    ];

    return () => eventListenerCleanupQueue.forEach((f) => f());
  }, [offsetX, offsetY, panAnchor, rotation, scale, updateTransformParams]);

  return (
    <div
      className={cn(
        "bg-base-100 fixed top-0 left-0 z-50 h-full w-full",
        className,
        "flex flex-col items-stretch",
      )}
    >
      <div className="flex h-12 flex-row items-center justify-center gap-5 px-6 py-2">
        <div className="inline-flex items-center justify-center gap-3 rounded-lg p-1">
          <div className="relative h-6 w-6" />
        </div>
        <div className="text-information-content-secondary font-body inline-flex flex-1 flex-row items-center justify-center text-[21px] leading-loose font-bold tracking-wide">
          Edit photo
        </div>
        <div className="inline-flex items-center justify-center gap-3 rounded-lg p-1">
          <CloseButton onClick={() => done()} />
        </div>
      </div>
      <div className="relative w-full flex-1" ref={containerRef}>
        <div className="bg-information-content-secondary pointer-events-none absolute top-0 right-0 bottom-0 left-0 overflow-hidden">
          <FileImage
            src={image}
            onLoad={(e) => {
              if (!containerRef.current) return;
              if (initialScalingApplied) return;
              const { offsetWidth, offsetHeight } = containerRef.current;
              const { width, height } = e.currentTarget;
              setInitialScalingApplied(true);
              updateTransformParams({
                scale: Math.min(offsetWidth / width, offsetHeight / height),
              });
            }}
            alt="Edit Photo"
            className="absolute top-1/2 left-1/2 origin-center overflow-visible"
            style={{
              transform: `translate(-50%, -50%) translate(${offsetX / 2}px,${
                offsetY / 2
              }px) rotate(${rotation}deg) scale(${scale})`,
            }}
          />
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-full w-full origin-center -translate-x-1/2 -translate-y-1/2">
            <div
              className={
                "relative top-1/2 left-1/2 max-h-full -translate-x-1/2 -translate-y-1/2" +
                (aspectRatio === "square"
                  ? " aspect-square "
                  : " aspect-video ") +
                "pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
              }
            ></div>
          </div>
        </div>
      </div>
      <div className="flex flex-row justify-between px-6 pt-3 pb-10">
        <Button
          buttonType="secondary"
          buttonSize="sm"
          onClick={() =>
            setTransformParams({
              offsetX,
              offsetY,
              scale,
              rotation: (rotation + 90) % 360,
            })
          }
        >
          <ArrowUturnRightIcon /> Rotate
        </Button>
        <div className="flex flex-row gap-2">
          <Button
            buttonSize="sm"
            buttonType="secondary"
            onClick={() => updateTransformParams({ scale: scale + 0.2 })}
          >
            <MagnifyingGlassPlusIcon />
          </Button>
          <Button
            buttonSize="sm"
            buttonType="secondary"
            onClick={() => updateTransformParams({ scale: scale - 0.2 })}
          >
            <MagnifyingGlassMinusIcon />
          </Button>
        </div>
        <Button
          buttonType="neutral"
          buttonSize="sm"
          onClick={() => applyChanges()}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
