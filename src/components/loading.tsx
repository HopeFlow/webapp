import { cn } from "@/helpers/client/tailwind_helpers";

type LoadingElementProps = {
  /** Size in pixels */
  size?: number;
  /** Additional classes */
  className?: string;
  /** Choose a daisyUI loader style */
  variant?: "spinner" | "dots" | "bars" | "ring";
  /** Optional color class (e.g. 'text-primary', 'text-secondary') */
  colorClassName?: string;
};

/**
 * LoadingElement
 * --------------
 * A small, reusable loader that uses daisyUI's built-in "loading" utilities.
 * - Accepts a pixel `size` so you can precisely fit it into layouts.
 * - Supports multiple daisyUI loader variants (spinner/dots/bars/ring).
 * - Color is controlled via Tailwind text color classes (e.g., `text-primary`).
 * - Includes ARIA attributes for accessibility.
 */
export function LoadingElement({
  size = 24,
  className,
  variant = "spinner",
  colorClassName = "text-primary",
}: LoadingElementProps) {
  const variantClass =
    {
      spinner: "loading-spinner",
      dots: "loading-dots",
      bars: "loading-bars",
      ring: "loading-ring",
    }[variant] ?? "loading-spinner";

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={cn(
        "flex items-center justify-center overflow-hidden",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* daisyUI loader respects width/height via inline style */}
      <span
        className={cn("loading", variantClass, colorClassName)}
        style={{ width: `${size}px`, height: `${size}px` }}
        aria-hidden="true"
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/**
 * LoadingBlocker
 * --------------
 * A full-surface blocking overlay with a centered loader and optional title.
 * - Useful while a whole page/section is in a loading state.
 * - Uses backdrop blur and a semi-transparent themed background layer.
 * - Adapts to daisyUI theme tokens (`bg-base-100`, `text-base-content`).
 */
export function LoadingBlocker({ title }: { title?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 backdrop-blur-lg bg-base-100/60">
      {title && (
        <div className="text-center text-base-content text-[21px] font-semibold tracking-wide">
          {title}
        </div>
      )}
      <LoadingElement size={48} />
    </div>
  );
}
