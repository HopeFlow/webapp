import {
  useId,
  type DetailedHTMLProps,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { ArrowLeftIcon } from "./icons/arrow_left";
import { ArrowRightIcon } from "./icons/arrow_right";
import { cn } from "@/helpers/client/tailwind_helpers";

const CarouselItem = ({
  content,
  baseId,
  index,
  prevIndex,
  nextIndex,
}: {
  content: ReactNode;
  baseId: string;
  index: number;
  prevIndex: number;
  nextIndex: number;
}) => (
  <div id={`${baseId}_slide${index}`} className="carousel-item relative w-full">
    <div className="w-full flex flex-col justify-center items-center">
      {content}
    </div>
    <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
      <a
        href={`#${baseId}_slide${prevIndex}`}
        className="btn btn-circle opacity-60 hover:opacity-100"
      >
        <ArrowLeftIcon />
      </a>
      <a
        href={`#${baseId}_slide${nextIndex}`}
        className="btn btn-circle opacity-60 hover:opacity-100"
      >
        <ArrowRightIcon />
      </a>
    </div>
  </div>
);

export type CarouselProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export const Carousel = ({
  children,
  className,
  ...restProps
}: CarouselProps) => {
  const baseId = useId();
  return (
    <div
      className={cn(
        className,
        "carousel",
        "bg-base-content text-base-100 border-base-300",
        "rounded-box overflow-hidden",
      )}
      {...restProps}
    >
      {children &&
        (Array.isArray(children) ? children : [children]).map(
          (child, index, children) => (
            <CarouselItem
              key={`${baseId}_item${index}`}
              baseId={baseId}
              content={child}
              index={index}
              prevIndex={index === 0 ? children.length - 1 : index - 1}
              nextIndex={index === children.length - 1 ? 0 : index + 1}
            />
          ),
        )}
    </div>
  );
};
