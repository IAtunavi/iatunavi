import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed store. Server render and the first client render use
 * the initial value (no hydration mismatch); the saved value loads right after.
 */
export function createPersisted<T>(key: string, initial: T, version = 1) {
  const storageKey = `tunavi.${key}.v${version}`;
  let state: T = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  function load() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) state = { ...(initial as object), ...(JSON.parse(raw) as object) } as T;
      if (Array.isArray(initial) && raw) state = JSON.parse(raw) as T;
    } catch {
      state = initial;
    }
  }

  function get() {
    load();
    return state;
  }

  function set(next: T | ((prev: T) => T)) {
    load();
    state = typeof next === "function" ? (next as (p: T) => T)(state) : next;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep in memory */
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        loaded = false;
        load();
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function reset() {
    set(initial);
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, get, () => initial);
  }

  return { get, set, subscribe, reset, useValue, storageKey };
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
