/**
 * Live notifications inbox (Phase B). Wire app.notificaciones when ready.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "@/lib/queryKeys";
import { isLiveUserEnabled } from "@/lib/userFeature";
import { notificationRepository } from "@/services/notificationRepository";

export function useLiveNotificationInbox(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? notificationKeys.inbox(userId) : notificationKeys.root,
    queryFn: () => notificationRepository.findInboxByUserId(userId!),
    enabled: isLiveUserEnabled() && Boolean(userId),
  });
}

export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? notificationKeys.unreadCount(userId) : notificationKeys.root,
    queryFn: () => notificationRepository.countUnread(userId!),
    enabled: isLiveUserEnabled() && Boolean(userId),
  });
}

export function useMarkNotificationRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => {
      if (!userId) throw new Error("No user");
      return notificationRepository.markRead(notificationId, userId);
    },
    onSuccess: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: notificationKeys.inbox(userId) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(userId) });
    },
  });
}
