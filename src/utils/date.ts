/**
 * Utilidades para formateo de fechas en formato humano
 */

export function formatRelativeDate(dateString: string | Date): string {
  // Fallback seguro si fecha es inválida
  if (!dateString) return 'Fecha no disponible';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  // Validar que la fecha sea válida
  if (isNaN(date.getTime())) return 'Fecha inválida';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Si la fecha es futura, mostrar fecha absoluta
  if (diffMs < 0) {
    return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Thresholds claros
  if (diffMins < 1) return 'Ahora mismo';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 2) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Hace ${diffHours} horas`;

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;

  // Para fechas muy antiguas, mostrar fecha absoluta
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}
