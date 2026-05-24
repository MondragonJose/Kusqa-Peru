/**
 * useAutocomplete
 * Shared debounced search hook for location autocomplete.
 * Eliminates duplicated debounce/cleanup/isMounted patterns.
 *
 * Usage:
 * const { suggestions, setSuggestions, containerRef, clearSuggestions } = useAutocomplete({
 *   fetcher: getPlaceSuggestions,
 *   query: inputValue,
 *   delay: 400,
 * });
 */
import { useState, useEffect, useRef, useCallback } from "react";

type UseAutocompleteOptions<T> = {
  /** The current search query string */
  query: string;
  /** Async function that fetches suggestions for the given query */
  fetcher: (query: string) => Promise<T[]>;
  /** Minimum query length before fetching (default: 2) */
  minLength?: number;
  /** Debounce delay in ms (default: 400) */
  delay?: number;
};

type UseAutocompleteReturn<T> = {
  suggestions: T[];
  setSuggestions: React.Dispatch<React.SetStateAction<T[]>>;
  /** Ref for the container div — attach for click-outside detection */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Call to clear suggestions (e.g., after selection) */
  clearSuggestions: () => void;
};

export function useAutocomplete<T>({
  query,
  fetcher,
  minLength = 2,
  delay = 400,
}: UseAutocompleteOptions<T>): UseAutocompleteReturn<T> {
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  // Debounced fetch effect
  useEffect(() => {
    if (query.trim().length < minLength) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const results = await fetcher(query);
        if (isMounted) setSuggestions(results);
      } catch (err) {
        if (isMounted) setSuggestions([]);
      }
    }, delay);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, fetcher, minLength, delay]);

  // Click-outside to clear
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return { suggestions, setSuggestions, containerRef, clearSuggestions };
}
