"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io } from "socket.io-client";
import {
  API_URL,
  api,
  getToken,
  type CreativeRequest,
  type AppNotification,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/lib/ToastProvider";

type RequestListener = (request: CreativeRequest) => void;
type NotificationListener = (notification: AppNotification) => void;

type NotificationsContextValue = {
  // False for visitors: they have no notifications.
  enabled: boolean;
  notifications: AppNotification[];
  unread: number;
  loading: boolean;
  markRead: (id: number) => void;
  markAllRead: () => void;
  // Staff only: called whenever a request is created or changes, so the
  // requests queue updates live. Returns the unsubscribe function.
  onRequest: (listener: RequestListener) => () => void;
  // Called for each new notification as it arrives, e.g. so a customer's
  // requests page reloads when one is delivered. Returns the unsubscribe
  // function.
  onNotification: (listener: NotificationListener) => () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const EMPTY_INBOX = { notifications: [], unread: 0 };

// The signed-in person's notifications, kept live over Socket.IO. Mounted in
// the root layout so the connection survives page changes. Staff also get
// their role's notifications and live request updates.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const enabled = !!user;
  const userId = user?.id;

  // The list holds the latest 100; unread counts every unread one.
  const [inbox, setInbox] = useState<{ notifications: AppNotification[]; unread: number }>(
    EMPTY_INBOX
  );
  const [loading, setLoading] = useState(true);
  const requestListeners = useRef(new Set<RequestListener>());
  const notificationListeners = useRef(new Set<NotificationListener>());

  useEffect(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    const load = () =>
      api
        .getNotifications()
        .then((loaded) => {
          if (!cancelled) setInbox(loaded);
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false));

    const socket = io(API_URL, { auth: { token } });
    // Also runs after a reconnect, catching anything sent while offline.
    socket.on("connect", load);
    socket.on("notification", (n: AppNotification) => {
      setInbox((prev) => ({
        notifications: [n, ...prev.notifications.filter((x) => x.id !== n.id)],
        unread: prev.unread + 1,
      }));
      toast.success(n.body ? `${n.title}: ${n.body}` : n.title);
      notificationListeners.current.forEach((listener) => listener(n));
    });
    socket.on("notifications-read", (read: { id: number } | { all: true }) => {
      setInbox((prev) => {
        if ("all" in read) {
          return {
            notifications: prev.notifications.map((n) => ({ ...n, read: true })),
            unread: 0,
          };
        }
        const wasUnread = prev.notifications.some((n) => n.id === read.id && !n.read);
        return {
          notifications: prev.notifications.map((n) =>
            n.id === read.id ? { ...n, read: true } : n
          ),
          unread: wasUnread ? Math.max(0, prev.unread - 1) : prev.unread,
        };
      });
    });
    socket.on("request", (request: CreativeRequest) => {
      requestListeners.current.forEach((listener) => listener(request));
    });

    return () => {
      cancelled = true;
      socket.disconnect();
      setInbox(EMPTY_INBOX);
      setLoading(true);
    };
    // Reconnect when a different person signs in, not on every user refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId]);

  // The server confirms each read to all of this person's open tabs (this one
  // included), and that event updates the list, so these just send the request.
  const markRead = useCallback((id: number) => {
    api.markNotificationRead(id).catch(() => {});
  }, []);
  const markAllRead = useCallback(() => {
    api.markAllNotificationsRead().catch(() => {});
  }, []);
  const onRequest = useCallback((listener: RequestListener) => {
    requestListeners.current.add(listener);
    return () => {
      requestListeners.current.delete(listener);
    };
  }, []);

  const onNotification = useCallback((listener: NotificationListener) => {
    notificationListeners.current.add(listener);
    return () => {
      notificationListeners.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({ enabled, ...inbox, loading, markRead, markAllRead, onRequest, onNotification }),
    [enabled, inbox, loading, markRead, markAllRead, onRequest, onNotification]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
