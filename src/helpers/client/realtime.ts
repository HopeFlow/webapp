"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RealtimeEnvelope = {
  type: string;
  userId: string;
  timestamp: string;
  payload?: unknown;
};

type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

const isRealtimeEnvelope = (payload: unknown): payload is RealtimeEnvelope => {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Partial<RealtimeEnvelope>;
  return (
    typeof data.type === "string" &&
    typeof data.userId === "string" &&
    typeof data.timestamp === "string"
  );
};

export const useRealtime = (url: string, token: string) => {
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
      socketRef.current = null;
      setConnectionState("closed");
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
