/**
 * Rutas de navegación de KUSQA
 */

import type { LucideIcon } from "lucide-react";
import {
  Compass,
  MapPin,
  Zap,
  Bell,
  Trophy,
  User,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Explorar", icon: Compass, exact: true },
  { to: "/app/mapa", label: "Mapa", icon: MapPin },
  { to: "/app/crear", label: "Crear", icon: Zap },
  { to: "/app/notificaciones", label: "Notificaciones", icon: Bell },
  { to: "/app/progreso", label: "Progreso", icon: Trophy },
  { to: "/app/perfil", label: "Perfil", icon: User },
];

export const ROUTES = {
  LANDING: "/",
  APP: "/app",
  CREATE: "/app/crear",
  MAP: "/app/mapa",
  MISSION_DETAIL: "/app/mision/:missionId",
  NOTIFICATIONS: "/app/notificaciones",
  PROFILE: "/app/perfil",
  PROGRESS: "/app/progreso",
};
