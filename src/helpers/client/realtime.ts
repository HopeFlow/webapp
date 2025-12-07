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

export const useChatRoom = (questId: string, recepientUserId: string) => {
  const { subscribe } = useContext(RealtimeContext);
  const [messages, setMessages] = useState<
    Array<typeof chatMessagesTable.$inferSelect>
  >([]);
  useEffect(() => {
    return subscribe((type, timestamp, payload) => {});
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

const REALTIME_SERVER_URL = "wss://realtime.vedadian.workers.dev";
export const useRealtime = (token: string) => {
  const url = REALTIME_SERVER_URL;
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [latestMessage, setLatestMessage] = useState<RealtimeEnvelope | null>(
    null,
  );
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
        socket.onmessage = guard((event) => {
          try {
            const parsed = JSON.parse(
              (event as { data: string }).data,
            ) as unknown;
            if (isRealtimeEnvelope(parsed)) {
              console.log("[realtime] message received", parsed);
              setLatestMessage(parsed);
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

  const send = useCallback(
    (payload: string | ArrayBufferLike | Blob | ArrayBufferView) => {
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        socketRef.current.send(payload);
      }
    },
    [],
  );

  return { connectionState, latestMessage, send };
};
