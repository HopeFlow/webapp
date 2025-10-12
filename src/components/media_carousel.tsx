import {
  useId,
  useMemo,
  useState,
  type DetailedHTMLProps,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { ArrowLeftIcon } from "./icons/arrow_left";
import { ArrowRightIcon } from "./icons/arrow_right";
import { cn } from "@/helpers/client/tailwind_helpers";
import { Carousel } from "./carousel";
import { GhostButton } from "./button";

export type MediaCarouselProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  slideClassName?: string;
  controls?: ReactNode;
};

export const MediaCarousel = ({
  children,
  className,
  initialIndex = 0,
  onIndexChange,
  slideClassName,
  controls,
  ...restProps
}: MediaCarouselProps) => {
  const baseId = useId();

  const items = useMemo(
    () => (Array.isArray(children) ? children : [children]).filter(Boolean),
    [children],
  );
  const maxIndex = Math.max(0, items.length - 1);

  const [index, setIndex] = useState(
    Math.min(Math.max(0, initialIndex), maxIndex),
  );

  const goPrev = () => setIndex((i) => (i === 0 ? maxIndex : i - 1));
  const goNext = () => setIndex((i) => (i === maxIndex ? 0 : i + 1));

  return (
    <div
      className={cn(
        "relative rounded-box overflow-hidden",
        "bg-base-content text-base-100 border-base-300",
        className,
      )}
      {...restProps}
    >
      <Carousel
        className="w-full h-full"
        childClassName={cn("w-full", slideClassName)}
        itemIndex={index}
        onItemIndexChange={(i) => {
          setIndex(i);
          onIndexChange?.(i);
        }}
        aria-roledescription="carousel"
        aria-label={baseId}
      >
        {items.map((child, i) => (
          <div
            key={`${baseId}_slide${i}`}
            className="w-full flex flex-col justify-center items-center"
          >
            {child}
          </div>
        ))}
      </Carousel>
      {controls}
      <GhostButton
        circle
        onClick={goPrev}
        className="absolute left-4 top-1/2 -!translate-y-1/2 opacity-60 hover:opacity-100"
        aria-label="Previous slide"
      >
        <ArrowLeftIcon />
      </GhostButton>
      <GhostButton
        circle
        onClick={goNext}
        className="absolute right-4 top-1/2 -!translate-y-1/2 opacity-60 hover:opacity-100"
        aria-label="Next slide"
      >
        <ArrowRightIcon />
      </GhostButton>
    </div>
  );
};
