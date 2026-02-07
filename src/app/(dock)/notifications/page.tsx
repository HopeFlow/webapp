"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const { notifications, markNotificationsAsRead } = useNotificationControls();
  const [isMarking, setIsMarking] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const nodeMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const unreadIdSetRef = useRef<
    Map<string, (typeof notifications)[number]["components"]>
  >(new Map());

  const unreadIds = useMemo(
    () =>
      notifications
        .filter((n) => n.status !== "read")
        .map((n) => [n.id, n.components] as const),
    [notifications],
  );

  useEffect(() => {
    unreadIdSetRef.current = new Map(unreadIds);
    for (const [id, timeoutId] of timersRef.current) {
      if (!unreadIdSetRef.current.has(id)) {
        clearTimeout(timeoutId);
        timersRef.current.delete(id);
      }
    }
  }, [unreadIds]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      for (const timeoutId of timersRef.current.values()) {
        clearTimeout(timeoutId);
      }
      timersRef.current.clear();
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  const handleMarkAll = async () => {
    if (isMarking) return;
    setIsMarking(true);
    try {
      await markNotificationsAsRead(
        unreadIds.flatMap((e) => e[1].map((c) => c.id)),
      );
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    } finally {
      setIsMarking(false);
    }
  };

  const attachObserver = (id: string) => (node: HTMLDivElement | null) => {
    if (!node) {
      const existingNode = nodeMapRef.current.get(id);
      if (existingNode && observerRef.current) {
        observerRef.current.unobserve(existingNode);
      }
      nodeMapRef.current.delete(id);
      return;
    }
    nodeMapRef.current.set(id, node);
    if (!observerRef.current) {
      const markAccumulatedNotificationsAsRead = (() => {
        let accumulated: string[] = [];
        let performTimeout: ReturnType<typeof setTimeout>;
        return (ids: string[]) => {
          accumulated.push(...ids);
          clearTimeout(performTimeout);
          performTimeout = setTimeout(async () => {
            try {
              await markNotificationsAsRead(accumulated);
              accumulated = [];
            } catch (error) {
              console.error("Failed to mark notification as read", error);
            }
          }, 500);
        };
      })();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const target = entry.target as HTMLElement;
            const targetId = target.dataset.notificationId;
            if (!targetId) continue;

            const components = unreadIdSetRef.current.get(targetId);
            if (!components) continue;

            const existing = timersRef.current.get(targetId);
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
              if (existing) continue;
              const timeoutId = setTimeout(async () => {
                timersRef.current.delete(targetId);
                markAccumulatedNotificationsAsRead(components.map((c) => c.id));
              }, 2000);
              timersRef.current.set(targetId, timeoutId);
            } else if (existing) {
              clearTimeout(existing);
              timersRef.current.delete(targetId);
            }
          }
        },
        { threshold: [0.6] },
      );
    }

    observerRef.current.observe(node);
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
              ref={attachObserver(notification.id)}
              data-notification-id={notification.id}
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
