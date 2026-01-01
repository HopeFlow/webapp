"use client";

import { useUser } from "@clerk/nextjs";
import { useGotoLogin } from "@/helpers/client/routes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, ReactNode, useContext, useCallback } from "react";

type DeferredActionType =
  | "comment"
  | "reaction"
  | "open_reflow"
  | "open_answer"
  | "node_join"
  | "ask_question";

type DeferredActionPayload = {
  type: DeferredActionType;
  data?: unknown;
  timestamp: number;
};

type DeferredActionContextType = {
  defer: (type: DeferredActionType, data?: unknown) => void;
  consume: <T = unknown>(type: DeferredActionType) => T | null;
};

const DeferredActionContext = createContext<DeferredActionContextType | null>(
  null,
);

const STORAGE_KEY = "deferred_action_pending";

const EXPIRY_DURATION = 1000 * 60 * 60;
export function DeferredActionProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();

  const gotoLogin = useGotoLogin();

  const defer = useCallback(
    (type: DeferredActionType, data?: unknown) => {
      const payload: DeferredActionPayload = {
        type,
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      const currentUrlString = window.location.href;
      // remove the first part of the url http://.*?/
      const currentUrlStringWithoutProtocol = currentUrlString.replace(
        /^https?:\/\/.*?\//,
        "/",
      );
      gotoLogin({ url: currentUrlStringWithoutProtocol });
    },
    [gotoLogin],
  );

  const consume = useCallback(
    <T = unknown,>(type: DeferredActionType): T | null => {
      if (!isLoaded || !user) return null; // Only consume if user is logged in

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      try {
        const parsed = JSON.parse(stored) as DeferredActionPayload;

        // Check expiry
        if (Date.now() - parsed.timestamp >= EXPIRY_DURATION) {
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }

        if (parsed.type === type) {
          // Clear from storage
          localStorage.removeItem(STORAGE_KEY);
          return parsed.data as T;
        }
      } catch (e) {
        console.error("Failed to parse deferred action", e);
        localStorage.removeItem(STORAGE_KEY);
      }
      return null;
    },
    [isLoaded, user],
  );

  return (
    <DeferredActionContext.Provider value={{ defer, consume }}>
      {children}
    </DeferredActionContext.Provider>
  );
}

export function useDeferredAction(type: DeferredActionType) {
  const context = useContext(DeferredActionContext);
  if (!context) {
    throw new Error(
      "useDeferredAction must be used within a DeferredActionProvider",
    );
  }
  return {
    defer: (data?: unknown) => context.defer(type, data),
    consume: <T = unknown,>() => context.consume<T>(type),
  };
}
