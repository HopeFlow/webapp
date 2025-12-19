"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { REALTIME_SERVER_URL } from "./constants";
import {
  initializeChatRoom,
  initializeNotifications,
  sendChatMessage,
  sendChatTyping,
} from "../server/realtime";
import { messageStatusDef } from "@/db/constants";

export type RealtimeEnvelope = {
  type: string;
  userId: string;
  timestamp: string;
  payload?: unknown;
};

export type ChatMessage = {
  id: string;
  questId: string;
  nodeId: string;
  userId: string;
  content: string;
  timestamp: string;
};

export type Notification = {
  id: string;
  message: string;
  url: string;
  status: (typeof messageStatusDef)[number];
  timestamp: string;
};

type ChatTypingEvent = {
  questId: string;
  nodeId: string;
  userId: string;
  timestamp: string;
};

type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

type RealtimeContextType = {
  connectionState: ConnectionState;
  notifications: Array<Notification>;
  subscribe: (
    handler: (type: string, timestamp: string, payload: unknown) => void,
  ) => () => void;
};

const RealtimeContext = createContext<RealtimeContextType>({
  connectionState: "idle",
  notifications: [],
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
  const [messages, setMessages] = useState<Array<ChatMessage>>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const currentUserIdRef = useRef<string>("");
  const [currentUserImageUrl, setCurrentUserImageUrl] = useState<
    string | undefined
  >(undefined);
  const [targetUserImageUrl, setTargetUserImageUrl] = useState<
    string | undefined
  >(undefined);
  const [targetUserName, setTargetUserName] = useState<string | undefined>(
    undefined,
  );
  const [isTargetTyping, setIsTargetTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    let chatMessagesInitialized = false;
    const preInitQueue: Array<ChatMessage> = [];
    const unsubscribe = subscribe((type, timestamp, payload) => {
      if (type === "chat_message") {
        if (!chatMessagesInitialized) {
          preInitQueue.push(payload as ChatMessage);
        } else {
          setMessages((prev) =>
            prev.find((m) => m.id === (payload as ChatMessage).id)
              ? prev
              : [...prev, payload as ChatMessage],
          );
        }
      } else if (type === "chat_typing") {
        const typingPayload = payload as ChatTypingEvent;
        if (
          typingPayload.questId === questId &&
          typingPayload.nodeId === nodeId &&
          typingPayload.userId !== currentUserIdRef.current
        ) {
          setIsTargetTyping(true);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(
            () => setIsTargetTyping(false),
            2000,
          );
        }
      }
    });
    (async () => {
      if (cancelled) return;
      setIsMessagesLoading(true);
      try {
        const {
          currentUserId,
          currentUserImageUrl,
          targetUserImageUrl,
          targetUserName,
          messages,
        } = await initializeChatRoom(questId, nodeId);
        if (cancelled) return;
        setCurrentUserId(currentUserId);
        currentUserIdRef.current = currentUserId;
        setCurrentUserImageUrl(currentUserImageUrl);
        setTargetUserImageUrl(targetUserImageUrl);
        setTargetUserName(targetUserName);
        setMessages([
          ...messages,
          ...preInitQueue.filter((m) => !messages.find((pm) => pm.id === m.id)),
        ]);
        chatMessagesInitialized = true;
      } catch (error) {
        console.error("[realtime] failed to initialize chat room", error);
      } finally {
        if (!cancelled) setIsMessagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      unsubscribe();
    };
  }, [nodeId, questId, subscribe]);
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return null;
      const sentMessage = await sendChatMessage(questId, nodeId, trimmed);
      setMessages((prev) =>
        prev.find((m) => m.id === sentMessage.id)
          ? prev
          : [...prev, sentMessage],
      );
      return sentMessage;
    },
    [nodeId, questId],
  );
  const sendTyping = useCallback(async () => {
    await sendChatTyping(questId, nodeId);
  }, [nodeId, questId]);
  return {
    messages,
    sendMessage,
    sendTyping,
    currentUserId,
    currentUserImageUrl,
    targetUserImageUrl,
    targetUserName,
    isTargetTyping,
    isMessagesLoading,
  };
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
  const [notifications, setNotifications] = useState<Array<Notification>>([]);
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
        const preInitNotifications: Array<Notification> = [];
        socket.onmessage = guard((event) => {
          try {
            const parsed = JSON.parse(
              (event as { data: string }).data,
            ) as unknown;
            if (isRealtimeEnvelope(parsed)) {
              console.log("[realtime] message received", parsed);
              if (parsed.type === "notifications_init") {
                setNotifications([
                  ...(parsed.payload as typeof notifications),
                  ...preInitNotifications.filter(
                    (m) =>
                      !(parsed.payload as typeof notifications).some(
                        (pm) => pm.id === m.id,
                      ),
                  ),
                ]);
                notificationsInitialized = true;
              } else if (parsed.type === "notification") {
                if (!notificationsInitialized) {
                  preInitNotifications.push(parsed.payload as Notification);
                } else {
                  setNotifications((prev) =>
                    prev.find(
                      (m) =>
                        m.id ===
                        (parsed.payload as (typeof notifications)[number]).id,
                    )
                      ? prev
                      : [
                          ...prev,
                          parsed.payload as (typeof notifications)[number],
                        ],
                  );
                }
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
