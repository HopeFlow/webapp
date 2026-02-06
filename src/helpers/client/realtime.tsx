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
  initializeNotifications,
  markNotificationsRead as markNotificationsReadAction,
  sendChatMessage,
  sendChatTyping,
} from "../server/realtime";
import { messageStatusDef } from "@/db/constants";
import { createRealtimeJwt } from "../server/realtime.server";

export type RealtimeEnvelope = {
  envelopeId: string;
  type: string;
  timestamp?: string;
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
  isOptimistic?: boolean;
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
type RealtimeFilter = Record<string, string>;
type ChatAckState = "received" | "displayed";

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

const normalizeFilter = (filter: RealtimeFilter) => {
  const entries = Object.entries(filter).map(([key, value]) => [
    key,
    String(value),
  ]);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return { key: JSON.stringify(entries), filter: Object.fromEntries(entries) };
};

const chunkFilters = (filters: RealtimeFilter[], size = 50) => {
  const chunks: RealtimeFilter[][] = [];
  for (let i = 0; i < filters.length; i += size) {
    chunks.push(filters.slice(i, i + size));
  }
  return chunks;
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
  markNotificationsAsRead: (ids: string[]) => void;
  getThreadNotifications: (
    questId: string,
    nodeId?: string,
  ) => {
    all: Array<Notification>;
    unread: Array<Notification>;
    unreadIds: Array<string>;
  };
  subscribe: (
    handler: (
      type: string,
      timestamp: string | undefined,
      payload: unknown,
    ) => unknown | Promise<unknown>,
    filters?: Array<RealtimeFilter>,
  ) => () => void;
};

const RealtimeContext = createContext<RealtimeContextType>({
  connectionState: "idle",
  notifications: [],
  allNotifications: [],
  markNotificationsAsRead: () => {
    throw new Error("Context not initialized");
  },
  getThreadNotifications: () => {
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
  const {
    notifications,
    allNotifications,
    markNotificationsAsRead,
    getThreadNotifications,
  } = useContext(RealtimeContext);
  return { notifications, allNotifications, markNotificationsAsRead };
};

export const useChatRoom = (
  questId: string,
  nodeId: string,
  initialData: {
    currentUserId: string;
    currentUserImageUrl?: string | null;
    targetUserImageUrl?: string | null;
    targetUserName?: string;
    questTitle?: string;
    messages: ChatMessage[];
  },
) => {
  const { subscribe } = useContext(RealtimeContext);
  const [messages, setMessages] = useState<Array<ChatMessage>>(
    initialData.messages,
  );

  // We need a ref for the current user ID to use inside the stable useEffect closure
  // without triggering re-runs on every render.
  const currentUserIdRef = useRef<string>(initialData.currentUserId);

  const [isTargetTyping, setIsTargetTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatFilters = useMemo(
    () => [
      { type: "chat_message", questId, nodeId },
      { type: "chat_typing", questId, nodeId },
    ],
    [nodeId, questId],
  );

  useEffect(() => {
    const unsubscribe = subscribe((type, timestamp, payload) => {
      if (type === "chat_message") {
        const message = payload as ChatMessage;
        if (message.questId !== questId || message.nodeId !== nodeId) return;
        setMessages((prev) =>
          prev.find((m) => m.id === message.id) ? prev : [...prev, message],
        );
        return {
          state: "displayed",
          messageId: message.id,
          questId: message.questId,
          nodeId: message.nodeId,
        };
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
    }, chatFilters);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      unsubscribe();
    };
  }, [chatFilters, nodeId, questId, subscribe]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return null;

      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const optimisticMessage: ChatMessage = {
        id,
        questId,
        nodeId,
        userId: currentUserIdRef.current,
        content: trimmed,
        timestamp,
        status: "sent",
        isOptimistic: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const sentMessage = await sendChatMessage(questId, nodeId, trimmed, id);
        setMessages((prev) => prev.map((m) => (m.id === id ? sentMessage : m)));
        return sentMessage;
      } catch (error) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        throw error;
      }
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
    currentUserId: initialData.currentUserId,
    currentUserImageUrl: initialData.currentUserImageUrl,
    targetUserImageUrl: initialData.targetUserImageUrl,
    targetUserName: initialData.targetUserName,
    questTitle: initialData.questTitle,
    isTargetTyping,
  };
};

const isRealtimeEnvelope = (payload: unknown): payload is RealtimeEnvelope => {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Partial<RealtimeEnvelope>;
  return typeof data.type === "string" && typeof data.envelopeId === "string";
};

export const RealtimeProvider = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const [token, setToken] = useState<string>("");
  const url = `${process.env.NODE_ENV === "development" ? "ws" : "wss"}://${REALTIME_SERVER_URL}`;
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [notificationsRaw, setNotificationsRaw] = useState<Array<Notification>>(
    [],
  );
  const handlersRef = useRef<
    Array<
      (
        type: string,
        timestamp: string | undefined,
        payload: unknown,
      ) => unknown | Promise<unknown>
    >
  >([]);
  const socketRef = useRef<WebSocket | null>(null);
  const filterStateRef = useRef<
    Map<string, { filter: RealtimeFilter; count: number }>
  >(new Map());
  const notifications = useMemo(
    () => aggregateNotifications(notificationsRaw),
    [notificationsRaw],
  );

  const sendFilters = useCallback(
    (action: "subscribe" | "unsubscribe", filters: RealtimeFilter[]) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)
        return;
      for (const chunk of chunkFilters(filters)) {
        socketRef.current.send(
          JSON.stringify({ type: action, filters: chunk }),
        );
      }
    },
    [],
  );

  const addFilters = useCallback(
    (filters: RealtimeFilter[]) => {
      const additions: RealtimeFilter[] = [];
      for (const filter of filters) {
        const { key, filter: normalized } = normalizeFilter(filter);
        const existing = filterStateRef.current.get(key);
        if (existing) {
          filterStateRef.current.set(key, {
            filter: existing.filter,
            count: existing.count + 1,
          });
        } else {
          additions.push(normalized);
          filterStateRef.current.set(key, { filter: normalized, count: 1 });
        }
      }
      if (additions.length > 0) {
        sendFilters("subscribe", additions);
      }
      return () => {
        const removals: RealtimeFilter[] = [];
        for (const filter of filters) {
          const { key } = normalizeFilter(filter);
          const existing = filterStateRef.current.get(key);
          if (!existing) continue;
          if (existing.count <= 1) {
            filterStateRef.current.delete(key);
            removals.push(existing.filter);
          } else {
            filterStateRef.current.set(key, {
              filter: existing.filter,
              count: existing.count - 1,
            });
          }
        }
        if (removals.length > 0) {
          sendFilters("unsubscribe", removals);
        }
      };
    },
    [sendFilters],
  );

  const markNotificationsAsRead = useCallback(
    (idsToMark: string[]) => {
      if (idsToMark.length === 0) return;

      // Capture previous statuses for rollback
      const previousStatuses = new Map<
        string,
        (typeof messageStatusDef)[number]
      >();
      notificationsRaw.forEach((n) => {
        if (idsToMark.includes(n.id)) {
          previousStatuses.set(n.id, n.status);
        }
      });

      // Optimistic update
      setNotificationsRaw((prev) =>
        prev.map((n) =>
          idsToMark.includes(n.id) ? { ...n, status: "read" } : n,
        ),
      );

      void (async () => {
        try {
          await markNotificationsReadAction({ ids: idsToMark });
        } catch (error) {
          console.error("[realtime] failed to mark notifications read", error);
          // Rollback
          setNotificationsRaw((prev) =>
            prev.map((n) => {
              const oldStatus = previousStatuses.get(n.id);
              return oldStatus ? { ...n, status: oldStatus } : n;
            }),
          );
        }
      })();
    },
    [notificationsRaw],
  );

  const getThreadNotifications = useCallback(
    (questId: string, nodeId?: string) => {
      const all = notificationsRaw.filter(
        (notification) =>
          notification.questId === questId &&
          (typeof nodeId === "undefined" || notification.nodeId === nodeId),
      );
      const unread = all.filter(
        (notification) => notification.status !== "read",
      );
      return {
        all,
        unread,
        unreadIds: unread.map((notification) => notification.id),
      };
    },
    [notificationsRaw],
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
    void (async () => {
      const realtimeToken = await createRealtimeJwt();
      setToken(realtimeToken);
    })();
  }, []);
  useEffect(() => {
    if (!token) return undefined;
    const removeFilters = addFilters([
      { type: "notification" },
      { type: "notifications_init" },
    ]);
    return () => {
      removeFilters?.();
    };
  }, [addFilters, token]);

  useEffect(() => {
    if (!url || !token) return undefined;
    let cancelled = false;
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
          const activeFilters = Array.from(filterStateRef.current.values()).map(
            ({ filter }) => filter,
          );
          if (activeFilters.length > 0) {
            sendFilters("subscribe", activeFilters);
          }
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
          void (async () => {
            try {
              const parsed = JSON.parse(
                (event as { data: string }).data,
              ) as unknown;
              if (!isRealtimeEnvelope(parsed)) {
                console.warn(
                  "[realtime] ignoring unknown payload",
                  (event as { data: string }).data,
                );
                return;
              }
              let ackResult: unknown = null;
              const envelopeTimestamp =
                parsed.timestamp ??
                (new Date().toISOString() as RealtimeEnvelope["timestamp"]);
              // if (parsed.type === "notifications_init") {
              //   const merged = mergeNotifications(
              //     parsed.payload as typeof notifications,
              //     preInitNotifications,
              //   );
              //   setNotificationsRaw((prev) => mergeNotifications(prev, merged));
              //   notificationsInitialized = true;
              // } else
              if (parsed.type === "notification") {
                const notification = parsed.payload as Notification;
                if (!notificationsInitialized) {
                  preInitNotifications.push(notification);
                } else {
                  setNotificationsRaw((prev) =>
                    mergeNotifications(prev, [notification]),
                  );
                  maybeShowBrowserNotification(notification);
                }
              } else {
                for (const handler of handlersRef.current ?? []) {
                  try {
                    const result = await handler(
                      parsed.type,
                      envelopeTimestamp,
                      parsed.payload,
                    );
                    if (typeof result !== "undefined") {
                      ackResult = result;
                    }
                  } catch (handlerError) {
                    console.error("[realtime] handler failed", handlerError);
                  }
                }
              }
              if (
                socketRef.current &&
                socketRef.current.readyState === WebSocket.OPEN
              ) {
                socketRef.current.send(
                  JSON.stringify({
                    type: "ack",
                    envelopeId: parsed.envelopeId,
                    result: ackResult ?? null,
                  }),
                );
              }
            } catch (error) {
              console.error("[realtime] failed to parse message", error);
            }
          })();
        });
        socketRef.current = socket;
        const loadNotifications = async (attempt = 1) => {
          try {
            if (cancelled) return;
            const result = await initializeNotifications();
            if (result !== null) {
              setNotificationsRaw(result);
            }
            notificationsInitialized = true;
          } catch (error) {
            console.error(
              `[realtime] failed to initialize notifications (attempt ${attempt})`,
              error,
            );
            if (attempt < 3) {
              setTimeout(
                () => void loadNotifications(attempt + 1),
                attempt * 1000,
              );
            }
          }
        };
        void loadNotifications();
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
      cancelled = true;
      callBackPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [maybeShowBrowserNotification, sendFilters, token, url]);

  const subscribe = useCallback(
    (
      handler: (
        type: string,
        timestamp: string | undefined,
        payload: unknown,
      ) => unknown | Promise<unknown>,
      filters: Array<RealtimeFilter> = [],
    ) => {
      const filterCleanup = filters.length > 0 ? addFilters(filters) : null;
      const index = handlersRef.current.indexOf(handler);
      if (index === -1) {
        handlersRef.current.push(handler);
      }
      return () => {
        const handlerIndex = handlersRef.current.indexOf(handler);
        if (handlerIndex !== -1) {
          handlersRef.current.splice(handlerIndex, 1);
        }
        if (filterCleanup) {
          filterCleanup();
        }
      };
    },
    [addFilters],
  );

  return (
    <RealtimeContext.Provider
      value={{
        notifications,
        allNotifications: notificationsRaw,
        connectionState,
        markNotificationsAsRead,
        getThreadNotifications,
        subscribe,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};
