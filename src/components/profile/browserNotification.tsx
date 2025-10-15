"use client";
import { useCallback, useEffect, useState } from "react";

export function BrowserNotificationsRow() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      Promise.resolve(Notification.permission).then((p) => setPermission(p));
    }
  }, []);

  const requestPermission = useCallback(() => {
    if (typeof Notification !== "undefined") {
      Notification.requestPermission().then((perm) => setPermission(perm));
    }
  }, []);

  return (
    <div className="flex w-full justify-between gap-2">
      <div className="flex gap-2">
        <label className="font-light">Browser Notifications</label>
        <div className="flex">
          <input
            type="checkbox"
            className="toggle"
            onClick={requestPermission}
            checked={permission === "granted"}
            disabled={permission !== "default"}
            readOnly
          />
        </div>
      </div>
      <div className="hidden md:inline">
        {permission === "default" &&
          "Enable push notifications in your browser to get real-time updates."}
        {permission === "denied" &&
          "Notifications are blocked. Update your browser settings"}
        {permission === "granted" &&
          "Notifications are enabled. To Disable, go to your browser settings."}
      </div>
    </div>
  );
}
