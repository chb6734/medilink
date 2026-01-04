/**
 * Storage Abstraction Layer
 *
 * Provides a unified interface for storage operations with SSR safety.
 * This abstraction follows the Cohesion principle by colocating all storage-related logic.
 *
 * Design Rationale:
 * - SSR-safe: Handles `typeof window === 'undefined'` for server-side rendering
 * - Testable: Interface allows for easy mocking in tests
 * - Type-safe: Generic methods ensure type safety
 * - Extensible: Can be extended for sessionStorage or other storage mechanisms
 */

/**
 * Storage interface for abstracting browser storage operations
 */
export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Check if we are in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * No-op storage for SSR environments
 * Returns null for all get operations and does nothing for set/remove
 */
const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * Get a safe localStorage instance
 * Returns a no-op storage when running on the server (SSR)
 */
export function getLocalStorage(): Storage {
  if (!isBrowser()) {
    return noopStorage;
  }
  return window.localStorage;
}

/**
 * Get a safe sessionStorage instance
 * Returns a no-op storage when running on the server (SSR)
 */
export function getSessionStorage(): Storage {
  if (!isBrowser()) {
    return noopStorage;
  }
  return window.sessionStorage;
}

/**
 * Type-safe storage wrapper with JSON serialization
 */
export interface TypedStorage<T> {
  get(): T | null;
  set(value: T): void;
  remove(): void;
}

/**
 * Create a typed storage accessor for a specific key
 * This provides type-safe get/set operations with automatic JSON serialization
 *
 * @param storage - The storage instance (localStorage, sessionStorage, etc.)
 * @param key - The storage key
 * @returns A typed storage accessor
 *
 * @example
 * const userStorage = createTypedStorage<User>(getLocalStorage(), 'user');
 * userStorage.set({ name: 'John', id: '123' });
 * const user = userStorage.get(); // User | null
 */
export function createTypedStorage<T>(
  storage: Storage,
  key: string
): TypedStorage<T> {
  return {
    get(): T | null {
      const item = storage.getItem(key);
      if (!item) return null;
      try {
        return JSON.parse(item) as T;
      } catch {
        return null;
      }
    },
    set(value: T): void {
      storage.setItem(key, JSON.stringify(value));
    },
    remove(): void {
      storage.removeItem(key);
    },
  };
}

/**
 * Create a simple string storage accessor for a specific key
 * Use this for plain string values that don't need JSON serialization
 *
 * @param storage - The storage instance
 * @param key - The storage key
 * @returns A string storage accessor
 */
export function createStringStorage(
  storage: Storage,
  key: string
): {
  get(): string | null;
  set(value: string): void;
  remove(): void;
} {
  return {
    get(): string | null {
      return storage.getItem(key);
    },
    set(value: string): void {
      storage.setItem(key, value);
    },
    remove(): void {
      storage.removeItem(key);
    },
  };
}
