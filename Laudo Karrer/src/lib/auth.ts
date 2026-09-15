const SESSION_KEY = "karrer_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface Session {
  username: string;
  exp: number;
  token: string;
}

export function hashPassword(password: string): string {
  return btoa(encodeURIComponent(password));
}

/**
 * Whether the app has VITE_APP_USERNAME and VITE_APP_PASSWORD_HASH configured
 * at all. A `false` here means login can never succeed regardless of what the
 * user types — distinct from a simple wrong username/password.
 */
export function isAppConfigured(): boolean {
  const expectedUsername = import.meta.env.VITE_APP_USERNAME;
  const expectedHash = import.meta.env.VITE_APP_PASSWORD_HASH;
  return (
    typeof expectedUsername === "string" &&
    expectedUsername.length > 0 &&
    typeof expectedHash === "string" &&
    expectedHash.length > 0
  );
}

export function login(username: string, password: string): boolean {
  const expectedUsername = import.meta.env.VITE_APP_USERNAME;
  const expectedHash = import.meta.env.VITE_APP_PASSWORD_HASH;

  if (username !== expectedUsername || hashPassword(password) !== expectedHash) {
    return false;
  }

  const session: Session = {
    username,
    exp: Date.now() + SESSION_DURATION_MS,
    token: crypto.randomUUID(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return true;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const session = getSession();
  if (!session) return false;
  if (Date.now() >= session.exp) {
    logout();
    return false;
  }
  return true;
}
