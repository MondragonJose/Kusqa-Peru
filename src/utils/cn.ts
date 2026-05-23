/**
 * Clase utility para combinar clases de Tailwind
 * Merges de clsx + tailwind-merge para evitar conflictos
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
