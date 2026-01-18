"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Generate unique session ID per tab
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

interface OnlineUser {
  userId: string;
  userName: string;
  userAvatar?: string;
  userColor: string;
  currentPath: string;
  currentNodeId?: Id<"nodes">;
  currentNodeTitle?: string;
  currentNodeType?: "doc" | "folder";
  lastSeenAt: number;
  isCurrentUser: boolean;
}

interface PresenceContextValue {
  onlineUsers: OnlineUser[];
  onlineCount: number;
  isLoading: boolean;
}

const PresenceContext = createContext<PresenceContextValue>({
  onlineUsers: [],
  onlineCount: 0,
  isLoading: true,
});

// Heartbeat interval (15 seconds)
const HEARTBEAT_INTERVAL = 15 * 1000;

export function PresenceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { organization } = useOrganization();
  const sessionIdRef = useRef<string>(generateSessionId());
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const heartbeat = useMutation(api.presence.heartbeat);
  const leave = useMutation(api.presence.leave);

  // Query online users
  const onlineUsersQuery = useQuery(api.presence.getOnlineUsers, {
    orgId: organization?.id,
  });

  const onlineCountQuery = useQuery(api.presence.getOnlineCount, {
    orgId: organization?.id,
  });

  const onlineUsers = onlineUsersQuery ?? [];
  const onlineCount = onlineCountQuery ?? 0;

  // Extract current node ID and type from path
  const getCurrentNode = useCallback((): { nodeId: Id<"nodes">; nodeType: "doc" | "folder" } | undefined => {
    const docMatch = pathname.match(/\/app\/doc\/([^\/]+)/);
    if (docMatch && docMatch[1]) {
      return { nodeId: docMatch[1] as Id<"nodes">, nodeType: "doc" };
    }
    const folderMatch = pathname.match(/\/app\/folder\/([^\/]+)/);
    if (folderMatch && folderMatch[1]) {
      return { nodeId: folderMatch[1] as Id<"nodes">, nodeType: "folder" };
    }
    return undefined;
  }, [pathname]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    const currentNode = getCurrentNode();

    try {
      await heartbeat({
        sessionId: sessionIdRef.current,
        currentPath: pathname,
        currentNodeId: currentNode?.nodeId,
        currentNodeType: currentNode?.nodeType,
        orgId: organization?.id,
      });
    } catch (error) {
      console.error("Failed to send presence heartbeat:", error);
    }
  }, [heartbeat, pathname, organization?.id, getCurrentNode]);

  // Start heartbeat loop
  useEffect(() => {
    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    heartbeatTimeoutRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatTimeoutRef.current) {
        clearInterval(heartbeatTimeoutRef.current);
      }
    };
  }, [sendHeartbeat]);

  // Send heartbeat when path changes
  useEffect(() => {
    sendHeartbeat();
  }, [pathname, sendHeartbeat]);

  // Clean up on unmount / tab close
  useEffect(() => {
    const sessionId = sessionIdRef.current;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable cleanup on tab close
      // Note: This is best-effort; the timeout mechanism handles missed cleanups
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab visible - send immediate heartbeat
        sendHeartbeat();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Explicit leave on unmount
      leave({ sessionId }).catch(() => {});
    };
  }, [leave, sendHeartbeat]);

  return (
    <PresenceContext.Provider
      value={{
        onlineUsers,
        onlineCount,
        isLoading: onlineUsersQuery === undefined,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

export const usePresence = () => useContext(PresenceContext);
