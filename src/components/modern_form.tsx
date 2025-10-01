import { debounce } from "@/helpers/client/functions";
import { cn } from "@/helpers/client/tailwind_helpers";
import { type DetailedHTMLProps, type HTMLAttributes, useId } from "react";

export type ModernFormProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  childClassName?: string;
  itemIndex: number;
  onItemIndexChange?: (index: number) => void;
};

export const ModernForm = ({
  children,
  className,
  onScroll,
  onItemIndexChange,
  childClassName,
  itemIndex,
  ...restProps
}: ModernFormProps) => {
  const baseId = useId();
  return (
    <div
      className={cn(
        "w-full h-full",
        className,
        "carousel carousel-horizontal carousel-center",
      )}
      onScroll={(e) => {
        onItemIndexChange &&
          (() => {
            const carousel = e.currentTarget;
            debounce(() => {
              const { scrollLeft, clientWidth } = carousel;
              const index = Math.round(scrollLeft / clientWidth);
              onItemIndexChange(index);
            }, 500)();
          });
        onScroll && onScroll(e);
      }}
      {...restProps}
    >
      {children &&
        (Array.isArray(children) ? children : [children]).map(
          (child, index) => (
            <div
              key={`${baseId}_item${index}`}
              ref={(itemContainer) => {
                if (index === itemIndex) {
                  itemContainer?.scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                  });
                }
              }}
              className={cn("w-full relative", childClassName, "carousel-item")}
            >
              {child}
            </div>
          ),
        )}
    </div>
  );
};
