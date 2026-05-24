/**
 * In-app notifications repository (realtime-ready).
 */

import { supabase } from "@/lib/supabase";
import { z } from "zod";

export type UserNotificationRow = {
  id: string;
  userId: string;
  notificationType: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

const DB_NOTIFICATION_SCHEMA = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  notification_type: z.string(),
  title: z.string(),
  body: z.string(),
  payload: z.record(z.unknown()),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

function toRow(row: z.infer<typeof DB_NOTIFICATION_SCHEMA>): UserNotificationRow {
  return {
    id: row.id,
    userId: row.user_id,
    notificationType: row.notification_type,
    title: row.title,
    body: row.body,
    payload: row.payload,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export const notificationRepository = {
  async findInboxByUserId(userId: string, limit = 50): Promise<UserNotificationRow[]> {
    const { data, error } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return (data ?? []).map((row) => toRow(DB_NOTIFICATION_SCHEMA.parse(row)));
  },

  async countUnread(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("user_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      throw new Error(`Failed to count unread notifications: ${error.message}`);
    }

    return count ?? 0;
  },

  async markRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to mark notification read: ${error.message}`);
    }
  },

  async markAllRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      throw new Error(`Failed to mark all notifications read: ${error.message}`);
    }
  },
};
