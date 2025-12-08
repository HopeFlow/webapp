"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { notificationsTable, chatMessagesTable } from "@/db/schema";
import { REALTIME_SERVER_URL } from "./constants";
import { initializeChatRoom, initializeNotifications } from "../server/realtime";

export type RealtimeEnvelope = {
  type: string;
  userId: string;
  timestamp: string;
  payload?: unknown;
};

type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

type RealtimeContextType = {
  connectionState: ConnectionState;
  notifications: Array<typeof notificationsTable.$inferSelect>;
  subscribe: (
    handler: (type: string, timestamp: string, payload: unknown) => void,
  ) => () => void;
};

const RealtimeContext = createContext<RealtimeContextType>({
  connectionState: "idle" as ConnectionState,
  notifications: [] as Array<typeof notificationsTable.$inferSelect>,
  subscribe: () => {
    throw new Error("Context not initialized");
  },
});

export const useNotifications = () => {
  const { notifications } = useContext(RealtimeContext);
  return notifications;
};

export const useChatRoom = (questId: string, nodeId: string) => {
  const { subscribe } = useContext(RealtimeContext);
  const [messages, setMessages] = useState<
    Array<typeof chatMessagesTable.$inferSelect>
  >([]);
  useEffect(() => {
    const unsubscribe = subscribe((type, timestamp, payload) => {});
    initializeChatRoom(questId, nodeId);
  }, [subscribe]);
  const sendMessage = useCallback(() => {}, []);
  return { messages, sendMessage };
};

const isRealtimeEnvelope = (payload: unknown): payload is RealtimeEnvelope => {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Partial<RealtimeEnvelope>;
  return (
    typeof data.type === "string" &&
    typeof data.userId === "string" &&
    typeof data.timestamp === "string"
  );
};

export const RealtimeProvider = ({
  token,
  children,
}: {
  token: string;
  children?: React.ReactNode;
}) => {
  const url = `wss://${REALTIME_SERVER_URL}`;
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [notifications, setNotifications] = useState<
    Array<typeof notificationsTable.$inferSelect>
  >([]);
  const handlersRef = useRef<
    Array<(type: string, timestamp: string, payload: unknown) => void>
  >([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!url) return undefined;
    const connect = async () => {
      setConnectionState("connecting");
      try {
        const finalUrl = new URL(url);
        finalUrl.searchParams.append("token", token);
        const socket = new WebSocket(finalUrl);
        const guard = function <F extends (...args: unknown[]) => unknown>(
          f: F,
        ) {
          return (...args: unknown[]) => {
            if (socketRef.current === socket) {
              return f(...args);
            }
          };
        };
        socket.onopen = guard(() => {
          setConnectionState("open");
        });
        socket.onclose = guard(() => {
          setConnectionState("closed");
        });
        socket.onerror = guard((event) => {
          console.error("[realtime] websocket error", event);
          setConnectionState("error");
        });
        let notificationsInitialized = false;
        socket.onmessage = guard((event) => {
          try {
            const parsed = JSON.parse(
              (event as { data: string }).data,
            ) as unknown;
            if (isRealtimeEnvelope(parsed)) {
              console.log("[realtime] message received", parsed);
              if (parsed.type === "notifications_init") {
                setNotifications(parsed.payload as typeof notifications);
                notificationsInitialized = true;
              } else if (
                notificationsInitialized &&
                parsed.type === "notification"
              ) {
                setNotifications((prev) => [
                  ...prev,
                  parsed.payload as typeof notificationsTable.$inferSelect,
                ]);
              } else
                for (const handler of handlersRef.current ?? []) {
                  handler(parsed.type, parsed.timestamp, parsed.payload);
                }
            } else {
              console.warn(
                "[realtime] ignoring unknown payload",
                (event as { data: string }).data,
              );
            }
          } catch (error) {
            console.error("[realtime] failed to parse message", error);
          }
        });
        socketRef.current = socket;
        initializeNotifications();
        return () => {
          if (socketRef.current === socket) {
            setConnectionState("closed");
            socketRef.current = null;
          }
          socket.close();
        };
      } catch (error) {
        console.error(
          "[realtime] failed to establish websocket connection",
          error,
        );
        setConnectionState("error");
      }
    };

    const callBackPromise = connect();

    return () => {
      callBackPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [token, url]);

  const subscribe = useCallback(
    (handler: (type: string, timestamp: string, payload: unknown) => void) => {
      const index = handlersRef.current.indexOf(handler);
      if (index !== -1)
        return () => {
          handlersRef.current.splice(index, 1);
        };
      handlersRef.current.push(handler);
      return () => {
        const index = handlersRef.current.indexOf(handler);
        if (index !== -1) {
          handlersRef.current.splice(index, 1);
        }
      };
    },
    [],
  );

  return (
    <RealtimeContext.Provider
      value={{ notifications, connectionState, subscribe }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};
