import { cn } from "@/helpers/client/tailwind_helpers";
import type { ButtonHTMLAttributes } from "react";

// Color Variants
export const colorButtonVariants = {
  base: "btn-base-content",
  neutral: "btn-neutral",
  primary: "btn-primary",
  secondary: "btn-secondary",
  accent: "btn-accent",
  info: "btn-info",
  success: "btn-success",
  warning: "btn-warning",
  error: "btn-error",
} as const;

// Style Modifiers
export const styleButtonVariants = {
  outline: "btn-outline",
  dash: "btn-dash",
  soft: "btn-soft",
  ghost: "btn-ghost",
  link: "btn-link",
} as const;

// State Variants
export const stateButtonVariants = {
  active: "btn-active",
  disabled: "btn-disabled", // or HTML disabled attribute
} as const;

// Shapes & Layout
export const shapeButtonVariants = {
  square: "btn-square",
  circle: "btn-circle",
  wide: "btn-wide",
  block: "btn-block",
} as const;

// Sizes
export const sizeButtonVariants = {
  xs: "btn-xs",
  sm: "btn-sm",
  md: "", // default size has no extra class
  lg: "btn-lg",
  xl: "btn-xl",
} as const;

type ButtonProps = {
  withSpinner?: boolean;
  buttonType?: keyof typeof colorButtonVariants;
  buttonStyle?: keyof typeof styleButtonVariants;
  buttonSize?: keyof typeof sizeButtonVariants;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  className,
  children,
  withSpinner,
  buttonType = "primary",
  buttonStyle,
  buttonSize,
  ...htmlButtonAttributes
}: ButtonProps) {
  return (
    <button
      className={cn(
        className,
        "btn",
        colorButtonVariants[buttonType],
        buttonStyle && styleButtonVariants[buttonStyle],
        buttonSize && sizeButtonVariants[buttonSize],
      )}
      {...htmlButtonAttributes}
    >
      {children}
      {withSpinner && <span className="loading loading-spinner"></span>}
    </button>
  );
}

export function GhostButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(className, "btn btn-ghost")} {...props}>
      {children}
    </button>
  );
}

export function CloseButton(
  props: Exclude<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
) {
  return (
    <GhostButton {...props}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18 18 6M6 6l12 12"
        />
      </svg>
    </GhostButton>
  );
}
