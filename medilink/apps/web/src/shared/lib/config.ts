const DEFAULT_API_PORT = 8787;

/**
 * Get the API base URL.
 *
 * Priority:
 * 1. NEXT_PUBLIC_API_BASE_URL environment variable
 * 2. Same hostname as current page with port 8787 (keeps cookies first-party)
 * 3. Default to localhost:8787
 */
export function getApiBaseUrl(): string {
  // Prefer explicit env
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // Default: match current hostname to keep session cookies first-party
  // (localhost vs 127.0.0.1 mismatch causes SameSite=Lax cookies to not be sent)
  if (typeof window !== "undefined") {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    return `${proto}//${host}:${DEFAULT_API_PORT}`;
  }

  return `http://127.0.0.1:${DEFAULT_API_PORT}`;
}
