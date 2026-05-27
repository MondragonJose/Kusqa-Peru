/**
 * Service para notificaciones
 * Gestiona notificaciones del sistema
 * 
 * @future Será: escucha en realtime de Supabase o WebSocket
 */

import type { Notification } from "@/types";
import { NOTIFICATIONS as NOTIFICATIONS_MOCK } from "@/data/mockData";

/**
 * Obtiene todas las notificaciones del usuario
 * @future Será: `await client.from('notifications').select().eq('user_id', userId)`
 */
export async function getNotifications(userId: string): Promise<Notification[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  
  // En producción: filtrar por userId
  return NOTIFICATIONS_MOCK;
}

/**
 * Marca una notificación como leída
 * @future Será: `await client.from('notifications').update({read: true})...`
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  
  // En producción: actualizar en Supabase
  const notification = NOTIFICATIONS_MOCK.find((n) => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
}

/**
 * Marca todas las notificaciones como leídas
 * @future Será: `await client.from('notifications').update({read: true}).eq('user_id', userId)`
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  // En producción: actualizar todas en Supabase
  NOTIFICATIONS_MOCK.forEach((n) => {
    n.read = true;
  });
}

/**
 * Obtiene notificaciones sin leer
 * @future Será: `await client.from('notifications').select().eq('user_id', userId).eq('read', false)`
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  
  return NOTIFICATIONS_MOCK.filter((n) => !n.read);
}
