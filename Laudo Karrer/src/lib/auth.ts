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
