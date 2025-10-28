import { cn } from "@/helpers/client/tailwind_helpers";
import {
  type DetailedHTMLProps,
  type HTMLAttributes,
  useLayoutEffect,
  useRef,
} from "react";

export type ReadMoreProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & { maxHeight: string };

export const ReadMore = ({
  children,
  maxHeight,
  className,
  ...restProps
}: ReadMoreProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.style.maxHeight = maxHeight;

    const computedMaxHeight = window.getComputedStyle(container).maxHeight;
    const resolvedMaxHeight = Number.parseFloat(computedMaxHeight);
    const hasFiniteMaxHeight = Number.isFinite(resolvedMaxHeight);
    const effectiveMaxHeight = hasFiniteMaxHeight ? resolvedMaxHeight : 0;

    const isOverflowing =
      hasFiniteMaxHeight && container.scrollHeight - effectiveMaxHeight > 1;

    container.dataset.readMoreActive = isOverflowing ? "true" : "false";
    container.style.cursor = isOverflowing ? "pointer" : "default";

    const readMoreElements = container.querySelectorAll<HTMLElement>(
      "[data-read-more-element]",
    );
    readMoreElements.forEach((element) => {
      element.hidden = !isOverflowing;
    });

    const checkbox = container.querySelector<HTMLInputElement>(
      "input[type='checkbox']",
    );

    if (isOverflowing) {
      if (checkbox) {
        checkbox.style.cursor = "pointer";
      }
      return;
    }

    container.style.maxHeight = "none";
    if (checkbox) {
      checkbox.checked = false;
      checkbox.style.cursor = "default";
    }
    container.style.cursor = "default";
  }, [children, maxHeight]);

  return (
    <div
      className={cn(
        "relative border-neutral-400 [&:not(:has(input:checked))]:border",
        className,
        "transition-[max-height] duration-1000",
        "data-[read-more-active='true']:overflow-hidden",
        "data-[read-more-active='true']:[&:has(input:checked)>.veil]:opacity-0",
        "data-[read-more-active='true']:[&:has(input:checked)_.lboc]:inline",
        "data-[read-more-active='true']:[&:has(input:not(:checked))_.lbon]:inline",
      )}
      ref={containerRef}
      {...restProps}
    >
      {children}
      <div data-read-more-element hidden className="pusher w-full opacity-0">
        Read more ...
      </div>
      <input
        data-read-more-element
        hidden
        type="checkbox"
        className="absolute right-0 bottom-0 left-0 h-lh opacity-0"
        onChange={(e) => {
          const container = e.target.parentElement as HTMLDivElement;
          container.style.maxHeight = e.target.checked
            ? `${container.scrollHeight}px`
            : maxHeight;
        }}
      />
      <div
        data-read-more-element
        hidden
        className="veil from-base-100 pointer-events-none absolute right-0 bottom-0 left-0 h-30 bg-gradient-to-t from-30% to-transparent transition-opacity duration-700"
      />
      <div
        data-read-more-element
        hidden
        className="text-primary pointer-events-none absolute bottom-0 p-2"
      >
        <span className="lbon hidden">Read more ...</span>
        <span className="lboc hidden">Read less ...</span>
      </div>
    </div>
  );
};
