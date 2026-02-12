"use client";

import { useNotifications } from "@/helpers/client/realtime";

type NotificationBadgeProps = { className?: string };

export const NotificationBadge = ({ className }: NotificationBadgeProps) => {
  const notifications = useNotifications();
  const activeCount = notifications.filter((n) => n.status !== "read").length;

  if (activeCount === 0) return null;

  return (
    <span
      className={`badge badge-sm badge-error h-4 w-4 rounded-full p-0 text-[10px] text-white ${className}`}
    >
      {activeCount > 99 ? "99+" : activeCount}
    </span>
  );
};
