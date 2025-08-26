import { cn } from "@/helpers/client/tailwind_helpers";
import { useEffect, type DetailedHTMLProps, type HTMLAttributes } from "react";

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
  // TODO: Check if readme is really necessary
  return (
    <div
      className={cn(
        "relative",
        className,
        "overflow-hidden transition-[max-height] duration-1000",
        "[&:has(input:checked)>.veil]:opacity-0",
        "[&:has(input:checked)_.lboc]:inline [&:has(input:not(:checked))_.lbon]:inline",
      )}
      ref={(ref) => {
        if (ref) {
          ref.style.maxHeight = maxHeight;
        }
      }}
      {...restProps}
    >
      {children}
      <div className="pusher w-full opacity-0">Read more ...</div>
      <input
        type="checkbox"
        className="absolute bottom-0 left-0 right-0 h-lh opacity-0 cursor-pointer"
        onChange={(e) => {
          const container = e.target.parentElement as HTMLDivElement;
          container.style.maxHeight = e.target.checked
            ? `${container.scrollHeight}px`
            : maxHeight;
        }}
      />
      <div className="veil absolute bottom-0 left-0 right-0 h-30 bg-gradient-to-t from-base-100 from-30% to-transparent transition-opacity duration-700 pointer-events-none" />
      <div className="absolute bottom-0 p-2 text-primary pointer-events-none">
        <span className="hidden lbon">Read more ...</span>
        <span className="hidden lboc">Read less ...</span>
      </div>
    </div>
  );
};
