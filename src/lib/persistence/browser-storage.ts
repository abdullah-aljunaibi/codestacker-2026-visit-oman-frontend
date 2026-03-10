function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readStorageItem(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readJsonStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const rawValue = readStorageItem(key);
    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function readJsonStorageFromKeys<T>(keys: readonly string[], fallback: T): T {
  for (const key of keys) {
    const value = readJsonStorage<T | undefined>(key, undefined);
    if (value !== undefined) {
      return value;
    }
  }

  return fallback;
}

export function writeJsonStorage<T>(key: string, value: T): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures so the planner remains usable.
  }
}

export function removeStorageKey(key: string): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage removal failures so reset actions do not crash the page.
  }
}

export function removeStorageKeys(keys: readonly string[]): void {
  keys.forEach((key) => {
    removeStorageKey(key);
  });
}
