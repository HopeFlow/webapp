"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { useNotificationControls } from "@/helpers/client/realtime";
import { cn } from "@/helpers/client/tailwind_helpers";

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
};

export default function Notifications() {
  const { notifications, allNotifications, markNotificationsAsRead } =
    useNotificationControls();
  const [isMarking, setIsMarking] = useState(false);

  const unreadIds = useMemo(
    () => allNotifications.filter((n) => n.status !== "read").map((n) => n.id),
    [allNotifications],
  );

  useEffect(() => {
    if (unreadIds.length === 0) return;
    const run = async () => {
      try {
        markNotificationsAsRead(unreadIds);
      } catch (error) {
        console.error("Failed to mark notifications as read", error);
      }
    };
    void run();
  }, [markNotificationsAsRead, unreadIds]);

  const handleMarkAll = async () => {
    if (isMarking) return;
    setIsMarking(true);
    try {
      markNotificationsAsRead(unreadIds);
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="w-full flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <Button
          buttonType="neutral"
          buttonStyle="outline"
          disabled={isMarking || notifications.length === 0}
          onClick={handleMarkAll}
        >
          Mark all read
        </Button>
      </div>
      {notifications.length === 0 ? (
        <div className="text-base-content/60 rounded-box border-base-content/30 border border-dashed p-8 text-center text-sm">
          No notifications yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "card bg-base-100 border p-4",
                notification.status !== "read"
                  ? "border-primary"
                  : "border-base-content/20",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base-content/60 text-sm tracking-[0.14em] uppercase">
                    {formatTime(notification.timestamp)}
                  </p>
                  <p className="text-lg font-semibold">
                    {notification.message}
                  </p>
                </div>
                <Link href={notification.url}>
                  <Button buttonType="neutral" buttonStyle="outline">
                    Open <ArrowRightIcon />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
