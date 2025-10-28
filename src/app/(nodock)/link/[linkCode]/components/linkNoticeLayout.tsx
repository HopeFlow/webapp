"use client";

import { cn } from "@/helpers/client/tailwind_helpers";
import type { ReactNode } from "react";

type NoticeVariant =
  | "neutral"
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error";

const alertClassName: Record<NoticeVariant, string> = {
  neutral: "alert-neutral",
  primary: "alert-primary",
  secondary: "alert-secondary",
  accent: "alert-accent",
  info: "alert-info",
  success: "alert-success",
  warning: "alert-warning",
  error: "alert-error",
};

type LinkNoticeLayoutProps = {
  title: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  iconVariant?: NoticeVariant;
  alert?: {
    variant: NoticeVariant;
    icon: ReactNode;
    message: ReactNode;
    className?: string;
  };
  actions?: ReactNode;
  actionsWrapperClassName?: string;
  maxWidthClassName?: string;
  heroClassName?: string;
  className?: string;
  children?: ReactNode;
};

export function LinkNoticeLayout({
  title,
  description,
  icon,
  iconVariant = "info",
  alert,
  actions,
  actionsWrapperClassName,
  maxWidthClassName,
  heroClassName,
  className,
  children,
}: LinkNoticeLayoutProps) {
  return (
    <div className={cn("hero bg-base-200 min-h-screen", heroClassName)}>
      <div className="hero-content text-center">
        <div className={cn("max-w-2xl", maxWidthClassName, className)}>
          <div
            className={cn(
              "bg-base-100 alert mx-auto mb-6 flex size-16 items-center justify-center rounded-full shadow",
              alertClassName[iconVariant],
            )}
          >
            {icon}
          </div>

          <h1 className="text-3xl font-bold">{title}</h1>

          <p className="text-base-content/70 mt-3">{description}</p>

          {alert ? (
            <div
              className={cn(
                "alert mt-6 shadow",
                alertClassName[alert.variant],
                alert.className,
              )}
            >
              {alert.icon}
              <span>{alert.message}</span>
            </div>
          ) : null}

          {children}

          {actions ? (
            <div
              className={cn(
                "mt-20 flex items-center justify-center gap-3",
                actionsWrapperClassName,
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
