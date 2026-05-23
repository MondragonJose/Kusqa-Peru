/**
 * Utilidades para manipulación de fechas
 */

/**
 * Formatea una fecha en formato amigable (ej: "Hace 2 horas")
 * @param dateString Fecha ISO o timestamp
 * @returns Formato relativo
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Justo ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  
  return date.toLocaleDateString("es-PE");
}

/**
 * Formatea fecha para mostrar en cards (ej: "Sáb 14 jun · 9:00")
 */
export function formatMissionDate(dateString: string): string {
  // Si ya está en formato "Sáb 14 jun · 9:00", retorna como está
  // Si es ISO, parsea y formatea
  if (dateString.includes("·")) return dateString;
  
  const date = new Date(dateString);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  
  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const monthName = months[date.getMonth()];
  const time = date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  
  return `${dayName} ${dayNum} ${monthName} · ${time}`;
}

/**
 * Obtiene el día de la semana en español
 */
export function getDayNameInSpanish(date: Date): string {
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return days[date.getDay()];
}
