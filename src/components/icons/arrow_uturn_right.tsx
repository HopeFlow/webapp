import type { IconProps } from "./types";

export const ArrowUturnRightIcon = ({ size = 24, className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3"
    />
  </svg>
);
