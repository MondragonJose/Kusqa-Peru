/**
 * Utilidades para formateo de fechas en formato humano
 */

const WEEKDAY_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

const MONTH_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export function formatRelativeDate(dateString: string | Date): string {
  // Fallback seguro si fecha es inválida
  if (!dateString) return "Fecha no disponible";

  const date = typeof dateString === "string" ? new Date(dateString) : dateString;

  // Validar que la fecha sea válida
  if (isNaN(date.getTime())) return "Fecha inválida";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Si la fecha es futura, mostrar fecha absoluta
  if (diffMs < 0) {
    return date.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Thresholds claros
  if (diffMins < 1) return "Ahora mismo";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 2) return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  if (diffHours < 24) return `Hace ${diffHours} horas`;

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30)
    return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
  if (diffDays < 365)
    return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? "es" : ""}`;

  // Para fechas muy antiguas, mostrar fecha absoluta
  return date.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Humane formatting for a *future* proposed date.
 *
 * Examples:
 *   - "Sábado 14 de junio"
 *   - "Hoy"           (today)
 *   - "Mañana"        (tomorrow)
 *   - "Próximamente"  (within 7 days but no specific date set)
 *   - "Fecha por definir" (null/undefined)
 */
export function formatProposedDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "Fecha por definir";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "Fecha por definir";

  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const todayStart = startOfDay(now);
  const targetStart = startOfDay(date);
  const diffDays = Math.round((targetStart.getTime() - todayStart.getTime()) / 86_400_000);

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays > 1 && diffDays < 14) {
    return `${WEEKDAY_ES[date.getDay()]} ${date.getDate()} de ${MONTH_ES[date.getMonth()]}`;
  }
  if (diffDays < 0) {
    return `${WEEKDAY_ES[date.getDay()]} ${date.getDate()} de ${MONTH_ES[date.getMonth()]}`;
  }

  return `${WEEKDAY_ES[date.getDay()]} ${date.getDate()} de ${MONTH_ES[date.getMonth()]}`;
}
