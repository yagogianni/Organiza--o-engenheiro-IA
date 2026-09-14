import { beforeEach, afterEach, vi } from "vitest";
import { hashPassword, login, logout, isAuthenticated, getSession } from "@/lib/auth";

const SESSION_KEY = "karrer_session";

describe("auth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv("VITE_APP_USERNAME", "bernardo");
    vi.stubEnv("VITE_APP_PASSWORD_HASH", hashPassword("senha-correta"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("hashPassword is deterministic and never returns the plaintext", () => {
    const hash = hashPassword("abc123");
    expect(hash).not.toBe("abc123");
    expect(hashPassword("abc123")).toBe(hash);
  });

  it("login succeeds with correct username/password and stores a session", () => {
    const result = login("bernardo", "senha-correta");
    expect(result).toBe(true);
    expect(isAuthenticated()).toBe(true);
    const session = getSession();
    expect(session?.username).toBe("bernardo");
    expect(typeof session?.token).toBe("string");
  });

  it("login fails with wrong password and stores no session", () => {
    const result = login("bernardo", "senha-errada");
    expect(result).toBe(false);
    expect(isAuthenticated()).toBe(false);
    expect(getSession()).toBeNull();
  });

  it("login fails with wrong username", () => {
    expect(login("outro", "senha-correta")).toBe(false);
  });

  it("isAuthenticated is false when session is expired", () => {
    vi.useFakeTimers();
    login("bernardo", "senha-correta");
    vi.advanceTimersByTime(8 * 60 * 60 * 1000 + 1000); // 8h + 1s
    expect(isAuthenticated()).toBe(false);
  });

  it("logout clears the session", () => {
    login("bernardo", "senha-correta");
    logout();
    expect(isAuthenticated()).toBe(false);
    expect(getSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
