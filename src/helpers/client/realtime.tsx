"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  status: (typeof messageStatusDef)[number];
};

export type Notification = {
  id: string;
  message: string;
  url: string;
  status: (typeof messageStatusDef)[number];
  timestamp: string;
  questId?: string | null;
  nodeId?: string | null;
};

type ChatTypingEvent = {
  questId: string;
  nodeId: string;
  userId: string;
  timestamp: string;
};

type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

const AGGREGATION_WINDOW_MS = 60 * 1000;

const parseCount = (message: string): number | null => {
  const match = message.match(/\((\d+)\)$/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const baseMessage = (message: string) => message.replace(/\s+\(\d+\)$/, "");

const aggregateNotifications = (items: Array<Notification>) => {
  const sorted = [...items].sort(
    (a, b) => new Date(a.timestamp).valueOf() - new Date(b.timestamp).valueOf(),
  );
  const aggregated: Array<Notification> = [];
  for (const notification of sorted) {
    const last = aggregated[aggregated.length - 1];
    const lastTs = last ? new Date(last.timestamp).valueOf() : null;
    const currentTs = new Date(notification.timestamp).valueOf();
    if (
      last &&
      last.url === notification.url &&
      last.status === notification.status &&
      lastTs !== null &&
      Math.abs(currentTs - lastTs) <= AGGREGATION_WINDOW_MS
    ) {
      const base = baseMessage(last.message);
      const currentCount = parseCount(last.message) ?? 1;
      aggregated[aggregated.length - 1] = {
        ...last,
        message: `${base} (${currentCount + 1})`,
        timestamp: notification.timestamp,
      };
    } else {
      aggregated.push(notification);
    }
  }
  return aggregated.sort(
    (a, b) => new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf(),
  );
};

const mergeNotifications = (
  existing: Array<Notification>,
  incoming: Array<Notification>,
) => {
  const map = new Map<string, Notification>();
  for (const n of existing) map.set(n.id, n);
  for (const n of incoming) map.set(n.id, n);
  return Array.from(map.values());
};

type RealtimeContextType = {
  connectionState: ConnectionState;
  notifications: Array<Notification>;
  allNotifications: Array<Notification>;
  markNotificationsAsRead: (questId?: string, nodeId?: string) => void;
  subscribe: (
    handler: (type: string, timestamp: string, payload: unknown) => void,
  ) => () => void;
};

const RealtimeContext = createContext<RealtimeContextType>({
  connectionState: "idle",
  notifications: [],
  allNotifications: [],
  markNotificationsAsRead: () => {
    throw new Error("Context not initialized");
  },
  subscribe: () => {
    throw new Error("Context not initialized");
  },
});

export const useNotifications = () => {
  const { notifications } = useContext(RealtimeContext);
  return notifications;
};

export const useNotificationControls = () => {
  const { notifications, allNotifications, markNotificationsAsRead } =
    useContext(RealtimeContext);
  return { notifications, allNotifications, markNotificationsAsRead };
};

export const useChatRoom = (questId: string, nodeId: string) => {
  const { subscribe, markNotificationsAsRead } = useContext(RealtimeContext);
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
        markNotificationsAsRead(questId, nodeId);
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
  }, [markNotificationsAsRead, nodeId, questId, subscribe]);
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
  const [notificationsRaw, setNotificationsRaw] = useState<Array<Notification>>(
    [],
  );
  const handlersRef = useRef<
    Array<(type: string, timestamp: string, payload: unknown) => void>
  >([]);
  const socketRef = useRef<WebSocket | null>(null);
  const notifications = useMemo(
    () => aggregateNotifications(notificationsRaw),
    [notificationsRaw],
  );

  const markNotificationsAsRead = useCallback(
    (questId?: string, nodeId?: string) => {
      setNotificationsRaw((prev) =>
        prev.map((notification) => {
          const questMatch = questId ? notification.questId === questId : true;
          const nodeMatch = nodeId
            ? notification.nodeId === nodeId ||
              notification.url.endsWith(`/${nodeId}`)
            : true;
          if (questMatch && nodeMatch && notification.status !== "read") {
            return { ...notification, status: "read" };
          }
          return notification;
        }),
      );
    },
    [],
  );

  const maybeShowBrowserNotification = useCallback(
    (notification: Notification) => {
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      try {
        const n = new Notification(notification.message, {
          tag: notification.id,
        });
        n.onclick = () => {
          window?.open(notification.url, "_self");
        };
      } catch (error) {
        console.error(
          "[realtime] failed to display browser notification",
          error,
        );
      }
    },
    [],
  );

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
                const merged = mergeNotifications(
                  parsed.payload as typeof notifications,
                  preInitNotifications,
                );
                setNotificationsRaw((prev) => mergeNotifications(prev, merged));
                notificationsInitialized = true;
              } else if (parsed.type === "notification") {
                const notification = parsed.payload as Notification;
                if (!notificationsInitialized) {
                  preInitNotifications.push(notification);
                } else {
                  setNotificationsRaw((prev) =>
                    mergeNotifications(prev, [notification]),
                  );
                  maybeShowBrowserNotification(notification);
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
  }, [maybeShowBrowserNotification, token, url]);

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
      value={{
        notifications,
        allNotifications: notificationsRaw,
        connectionState,
        markNotificationsAsRead,
        subscribe,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};
