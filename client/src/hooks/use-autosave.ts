import { useEffect, useRef } from "react";

export function useAutoSave(
  saveFunction: () => void,
  dependencies: any[],
  delay: number = 2000
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Skip the first run to avoid saving on initial mount
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveFunction();
    }, delay);

    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}
