/**
 * Custom React hook for debouncing fast-changing values (Day 17).
 * Delays updating the debounced value until after the specified delay (400 ms)
 * has elapsed since the last time the value was changed.
 *
 * Essential for search inputs to avoid triggering HTTP API requests on every keystroke.
 *
 * Example:
 *   const [searchQuery, setSearchQuery] = useState("");
 *   const debouncedQuery = useDebounce(searchQuery, 400);
 *
 *   useEffect(() => {
 *     fetchReceiptsFromBackend(debouncedQuery);
 *   }, [debouncedQuery]);
 */

import { useState, useEffect } from "react";

export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update debouncedValue after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timer if value changes (user is still typing) or component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

