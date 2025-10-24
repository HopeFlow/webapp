import { cn } from "@/helpers/client/tailwind_helpers";
import {
  type DetailedHTMLProps,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from "react";

export type CarouselProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  childClassName?: string;
  itemIndex: number;
  onItemIndexChange?: (index: number) => void;
};

export const Carousel = ({
  children,
  className,
  onItemIndexChange,
  childClassName,
  itemIndex,
  ...restProps
}: CarouselProps) => {
  const baseId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastReportedIndexRef = useRef<number>(-1);

  const childArray = (Array.isArray(children) ? children : [children]).filter(
    (c) => c !== null && c !== undefined,
  );
  const maxIndex = Math.max(0, childArray.length - 1);
  const clampedPropIndex = Math.min(Math.max(0, itemIndex), maxIndex);
  useEffect(() => {
    lastReportedIndexRef.current = clampedPropIndex;
  }, [clampedPropIndex]);

  // Compute which child is closest to the container's horizontal center
  const computeCenteredIndex = useCallback(() => {
    const el = containerRef.current;
    if (!el) return -1;

    const items = Array.from(
      el.querySelectorAll<HTMLElement>(":scope > .carousel-item"),
    );
    if (items.length === 0) return -1;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      const itemCenterX = r.left + r.width / 2;
      const dist = Math.abs(itemCenterX - centerX);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, []);

  // Throttled scroll handler using rAF
  const handleScrollInternal = useCallback(() => {
    if (rafIdRef.current != null) return; // already queued
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      const idx = computeCenteredIndex();
      if (
        idx !== -1 &&
        idx !== lastReportedIndexRef.current &&
        onItemIndexChange
      ) {
        lastReportedIndexRef.current = idx;
        onItemIndexChange(idx);
      }
    });
  }, [computeCenteredIndex, onItemIndexChange]);

  // Attach scroll listener (passive) and resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScrollInternal, { passive: true });

    // Recompute on resize (responsive)
    const ro = new ResizeObserver(() => handleScrollInternal());
    ro.observe(el);
    Array.from(el.querySelectorAll<HTMLElement>(".carousel-item")).forEach(
      (it) => ro.observe(it),
    );

    // Initial computation after mount
    handleScrollInternal();

    return () => {
      el.removeEventListener("scroll", handleScrollInternal);
      ro.disconnect();
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [handleScrollInternal]);

  // When children set changes, recompute centered index once
  useEffect(() => {
    handleScrollInternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childArray]);

  // Imperative scroll when the controlled prop changes
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const items = Array.from(
      el.querySelectorAll<HTMLElement>(":scope > .carousel-item"),
    );
    const target = items[clampedPropIndex];
    if (!target) return;

    // Only scroll if we’re not already centered on this child
    const current = computeCenteredIndex();
    if (current !== clampedPropIndex) {
      target.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
    }
  }, [clampedPropIndex, computeCenteredIndex]);

  return (
    <div
      className={cn(
        "carousel carousel-horizontal carousel-center h-full w-full",
        className,
      )}
      role="listbox"
      ref={containerRef}
      {...restProps}
    >
      {childArray.map((child, index) => {
        return (
          <div
            role="option"
            aria-selected={index === clampedPropIndex}
            key={child.key ?? `${baseId}_item${index}`}
            data-index={index}
            className={cn("carousel-item relative w-full", childClassName)}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};
