# Sistema de Laudos Técnicos — Karrer Engenharia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100%-client-side React app where engineer Bernardo Karrer logs in, fills a 6-step wizard, and generates a branded technical-report PDF (jsPDF), with history in `localStorage`.

**Architecture:** Vite + React + TS SPA, React Router v6, no backend. `localStorage` is the only persistence layer (compressed photo data URLs inline in each laudo record). PDF assembly is a pure-function pipeline (`generateLaudo.ts` calls one drawing function per section in fixed order) so each section is independently testable against a jsPDF doc instance.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, jsPDF, React Router v6, Vitest + React Testing Library + jsdom.

**Spec:** `docs/superpowers/specs/2026-09-14-sistema-laudos-karrer-design.md` (content appendix: `docs/superpowers/specs/2026-09-14-sistema-laudos-karrer-conteudo-fixo.md`)

## Global Constraints

- Colors: `karrer-blue: #1B3A6B`, `karrer-lightblue: #2E5FA3`, `karrer-navy: #0D2040`. App background `#F6F8FC`. Cards: white, `border #E2E8F0`, `radius 12px`, light shadow.
- Font: Inter (Google Fonts). Icons: `lucide-react`.
- No Framer Motion anywhere — CSS transitions / plain `mousemove` handlers only.
- No backend, no database. Everything persists to `localStorage` only.
- Password never stored in plaintext: `btoa(encodeURIComponent(password))`.
- Session shape: `{ username, exp: Date.now() + 8*60*60*1000, token: crypto.randomUUID() }`.
- Photos are resized/compressed client-side (canvas, max width ~1600px, JPEG quality ~0.75) before being stored as a `dataUrl` — required so a single laudo (can have 100+ photos) fits in the browser's `localStorage` quota.
- All 3 laudo types (`vistoria_cautelar`, `laudo_tecnico`, `orcamento`) share one form and one PDF structure — no type-specific branching.
- **Deviation from spec doc's component-mapping table:** the spec names specific 21st.dev URLs for install via `npx shadcn add`. During planning, the 21st.dev MCP's code-retrieval tool hit its free-tier daily quota (1 successful fetch: Shimmer Button — verbatim source, already CSS-only, embedded in Task 10). The official Magic UI source for BorderBeam and SparklesText normally uses Framer Motion, which this project explicitly excludes — so this plan hand-authors CSS-only versions of BorderBeam and SparklesText (same visual result: a beam traveling a card's border, sparkles around highlighted text), plus GradientText, a spotlight-hover card, an animated stat card, and a drag-and-drop dropzone, all as first-party code embedded directly in Tasks 10–12. No third-party registry calls happen at execution time. Visual/functional outcome matches the spec's mapping table; only the code provenance differs (hand-authored vs. fetched).

---

## Task 1: Project scaffold, Tailwind theme, base tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `tailwind.config.js`, `postcss.config.js`, `src/index.css`
- Create: `src/main.tsx`, `src/App.tsx` (placeholder), `src/vite-env.d.ts`
- Create: `.env.example`, `.gitignore`, `vercel.json`
- Create: `vitest.config.ts`, `src/test/setup.ts`

**Interfaces:**
- Produces: Tailwind classes `bg-karrer-blue`, `bg-karrer-lightblue`, `bg-karrer-navy`, `text-karrer-*`, `border-karrer-*` available project-wide. `npm run dev`, `npm run build`, `npm run test` scripts.

- [ ] **Step 1: Scaffold the Vite React-TS project**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
When prompted about a non-empty directory (the reference PDF and docs/ already exist), confirm to proceed in the current directory.

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install react-router-dom jspdf lucide-react clsx tailwind-merge class-variance-authority
npm install -D tailwindcss postcss autoprefixer vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/node
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind with Karrer theme**

Replace `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        karrer: {
          blue: "#1B3A6B",
          lightblue: "#2E5FA3",
          navy: "#0D2040",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Global CSS with Inter font and app background**

Replace `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

@layer base {
  body {
    @apply bg-[#F6F8FC] text-slate-900 font-sans antialiased;
  }
}

@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60% { transform: translateX(4px); }
}
.animate-shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shimmer-slide {
  to { transform: translate(calc(100cqw - 100%), 0); }
}
@keyframes spin-around {
  0% { transform: translateZ(0) rotate(0deg); }
  15%, 35% { transform: translateZ(0) rotate(90deg); }
  65%, 85% { transform: translateZ(0) rotate(270deg); }
  100% { transform: translateZ(0) rotate(360deg); }
}
.animate-shimmer-slide {
  animation: shimmer-slide var(--speed, 3s) ease-in-out infinite alternate;
}
.animate-spin-around {
  animation: spin-around calc(var(--speed, 3s) * 2) infinite linear;
}
```

- [ ] **Step 5: `src/lib/utils.ts` — `cn` helper**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: `.env.example`, `vercel.json`, `.gitignore`**

`.env.example`:
```
# Username for the single-user login
VITE_APP_USERNAME=bernardo

# Password hash — generate with (Node REPL or browser console):
#   btoa(encodeURIComponent("your-password-here"))
# Never commit the real password or its plaintext anywhere.
VITE_APP_PASSWORD_HASH=
```

`vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

Append to `.gitignore` (Vite's default already covers `node_modules`, `dist`):
```
.env
```

- [ ] **Step 7: Vitest config**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

`src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

Add to `package.json` `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 8: Placeholder App and verify build**

`src/App.tsx`:
```tsx
export default function App() {
  return <div className="p-8">Karrer Laudos — scaffold OK</div>;
}
```

Run: `npm run build`
Expected: build succeeds, `dist/` created, no TypeScript errors.

Run: `npm run test`
Expected: "No test files found" (no tests yet) — exit code non-zero is acceptable at this step only; do not treat as failure.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+React+TS project with Tailwind Karrer theme"
```

---

## Task 2: shadcn/ui base components

**Files:**
- Create: `components.json`
- Create: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/select.tsx`
- Test: `src/components/ui/__tests__/smoke.test.tsx`

**Interfaces:**
- Consumes: `cn` from `src/lib/utils.ts` (Task 1).
- Produces: `Button`, `Input`, `Badge`, `Dialog`/`DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter`, `Tooltip`/`TooltipTrigger`/`TooltipContent`/`TooltipProvider`, `Textarea`, `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue` — all imported from `@/components/ui/<name>` in later tasks.

- [ ] **Step 1: Init shadcn and add the 7 primitives**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input badge dialog tooltip textarea select
```
This installs Radix UI peer deps automatically and writes `components.json` plus the 7 files listed above.

- [ ] **Step 2: Configure path alias `@/*` → `src/*`**

In `tsconfig.json` `compilerOptions`, ensure:
```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```
In `vite.config.ts`:
```ts
import path from "path";
// inside defineConfig:
resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
```

- [ ] **Step 3: Write the failing smoke test**

`src/components/ui/__tests__/smoke.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

describe("shadcn primitives", () => {
  it("renders a Button with its label", () => {
    render(<Button>Gerar PDF</Button>);
    expect(screen.getByRole("button", { name: "Gerar PDF" })).toBeInTheDocument();
  });

  it("renders a Badge with its label", () => {
    render(<Badge>Concluído</Badge>);
    expect(screen.getByText("Concluído")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run test to verify it fails (before alias fix) or passes**

Run: `npm run test`
Expected: PASS (if it fails on `@/` resolution, fix the alias from Step 2 first, then re-run).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui base primitives (Button, Input, Badge, Dialog, Tooltip, Textarea, Select)"
```

---

## Task 3: Data types and CPF/CNPJ mask utility

**Files:**
- Create: `src/types/laudo.ts`
- Create: `src/lib/masks.ts`
- Test: `src/lib/__tests__/masks.test.ts`

**Interfaces:**
- Produces: types `LaudoType`, `ClientData`, `PropertyData`, `PhotoItem`, `LaudoData` (exact shape below — every later task importing from `@/types/laudo` uses these names and fields verbatim). Functions `maskCpfCnpj(value: string): string` and `isValidCpfCnpjLength(value: string): boolean` from `@/lib/masks`.

- [ ] **Step 1: `src/types/laudo.ts`**

```ts
export type LaudoType = "vistoria_cautelar" | "laudo_tecnico" | "orcamento";

export interface ClientData {
  name: string;
  document: string; // CPF or CNPJ, masked
  address: string;
  email?: string;
}

export interface PropertyData {
  address: string;
  neighborhood: string;
  city: string;
  state: string; // UF, e.g. "SC"
  inspectionDate: string; // ISO date string, e.g. "2026-09-14"
  artNumber: string;
  description: string;
}

export interface PhotoItem {
  id: string;
  dataUrl: string; // compressed JPEG data URL
  caption: string;
  order: number; // 1-based, matches display order
}

export interface LaudoData {
  id: string;
  type: LaudoType;
  client: ClientData;
  property: PropertyData;
  photos: PhotoItem[];
  conclusion: string;
  notes?: string;
  status: "draft" | "completed";
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export const LAUDO_TYPE_LABELS: Record<LaudoType, string> = {
  vistoria_cautelar: "Laudo de Vistoria Cautelar",
  laudo_tecnico: "Laudo Técnico",
  orcamento: "Orçamento",
};
```

- [ ] **Step 2: Write the failing test for the mask util**

`src/lib/__tests__/masks.test.ts`:
```ts
import { maskCpfCnpj, isValidCpfCnpjLength } from "@/lib/masks";

describe("maskCpfCnpj", () => {
  it("masks an 11-digit CPF as 000.000.000-00", () => {
    expect(maskCpfCnpj("12345678900")).toBe("123.456.789-00");
  });

  it("masks a partial CPF while typing", () => {
    expect(maskCpfCnpj("123456")).toBe("123.456");
  });

  it("masks a 14-digit CNPJ as 00.000.000/0000-00", () => {
    expect(maskCpfCnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("strips non-digit characters before masking", () => {
    expect(maskCpfCnpj("123.456.789-00")).toBe("123.456.789-00");
  });

  it("truncates input beyond 14 digits", () => {
    expect(maskCpfCnpj("123456789001234567")).toBe("12.345.678/9001-23");
  });
});

describe("isValidCpfCnpjLength", () => {
  it("accepts 11 digits (CPF)", () => {
    expect(isValidCpfCnpjLength("123.456.789-00")).toBe(true);
  });

  it("accepts 14 digits (CNPJ)", () => {
    expect(isValidCpfCnpjLength("12.345.678/0001-99")).toBe(true);
  });

  it("rejects any other length", () => {
    expect(isValidCpfCnpjLength("123")).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- masks`
Expected: FAIL — `Cannot find module '@/lib/masks'`.

- [ ] **Step 4: Implement `src/lib/masks.ts`**

```ts
export function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function isValidCpfCnpjLength(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 || digits.length === 14;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- masks`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add LaudoData types and CPF/CNPJ mask utility"
```

---

## Task 4: Auth library

**Files:**
- Create: `src/lib/auth.ts`
- Test: `src/lib/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `import.meta.env.VITE_APP_USERNAME`, `import.meta.env.VITE_APP_PASSWORD_HASH`.
- Produces: `hashPassword(password: string): string`, `login(username: string, password: string): boolean`, `logout(): void`, `isAuthenticated(): boolean`, `getSession(): Session | null`, and type `Session = { username: string; exp: number; token: string }` — `AuthGuard` (Task 5) and `LoginPage` (Task 6) import these exact names from `@/lib/auth`.

- [ ] **Step 1: Write the failing tests**

`src/lib/__tests__/auth.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- auth`
Expected: FAIL — `Cannot find module '@/lib/auth'`.

- [ ] **Step 3: Implement `src/lib/auth.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- auth`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add auth library (login, logout, session expiry)"
```

---

## Task 5: AuthGuard and app routing skeleton

**Files:**
- Create: `src/components/auth/AuthGuard.tsx`
- Modify: `src/App.tsx`
- Create: `src/pages/Dashboard.tsx` (placeholder, filled in Task 27)
- Test: `src/components/auth/__tests__/AuthGuard.test.tsx`

**Interfaces:**
- Consumes: `isAuthenticated` from `@/lib/auth` (Task 4).
- Produces: `AuthGuard` component wrapping `<Outlet />`, used as a layout route in `App.tsx`. Routes: `/login` (public), `/` (Dashboard), `/novo-laudo`, `/laudos`, `/laudos/:id` (all behind `AuthGuard` — later tasks fill in the real page components as they're built; this task wires the route tree with placeholders where a page doesn't exist yet).

- [ ] **Step 1: Write the failing test**

`src/components/auth/__tests__/AuthGuard.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import { AuthGuard } from "@/components/auth/AuthGuard";
import * as auth from "@/lib/auth";

function renderWithGuard(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/" element={<div>Protected Home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthGuard", () => {
  it("renders the protected route when authenticated", () => {
    vi.spyOn(auth, "isAuthenticated").mockReturnValue(true);
    renderWithGuard("/");
    expect(screen.getByText("Protected Home")).toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", () => {
    vi.spyOn(auth, "isAuthenticated").mockReturnValue(false);
    renderWithGuard("/");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- AuthGuard`
Expected: FAIL — `Cannot find module '@/components/auth/AuthGuard'`.

- [ ] **Step 3: Implement `AuthGuard`**

`src/components/auth/AuthGuard.tsx`:
```tsx
import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";

export function AuthGuard() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- AuthGuard`
Expected: PASS (2 tests).

- [ ] **Step 5: Placeholder Dashboard and wire the route tree**

`src/pages/Dashboard.tsx` (placeholder — replaced in Task 27):
```tsx
export default function Dashboard() {
  return <div>Dashboard placeholder</div>;
}
```

`src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import LoginPage from "@/components/auth/LoginPage";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import NewLaudo from "@/pages/NewLaudo";
import LaudoList from "@/pages/LaudoList";
import LaudoDetail from "@/pages/LaudoDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/novo-laudo" element={<NewLaudo />} />
            <Route path="/laudos" element={<LaudoList />} />
            <Route path="/laudos/:id" element={<LaudoDetail />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

This references `LoginPage` (Task 6), `AppLayout` (Task 9), `NewLaudo` (Task 13), `LaudoList` (Task 28), `LaudoDetail` (Task 29) before they exist — add minimal placeholder files now (one-line default export returning a `<div>`) so `npm run build` succeeds; each later task replaces its placeholder with the real implementation.

`src/pages/NewLaudo.tsx`, `src/pages/LaudoList.tsx`, `src/pages/LaudoDetail.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/auth/LoginPage.tsx` — each:
```tsx
export default function PlaceholderName() {
  return <div>Placeholder</div>;
}
```
(`AppLayout` must export `Outlet` so the route tree renders children — see Task 9 for the real version; for now: `export function AppLayout() { return <Outlet />; }` importing `Outlet` from `react-router-dom`.)

Run: `npm run build`
Expected: build succeeds, no TS errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add AuthGuard and wire app route tree with placeholders"
```

---

## Task 6: Login page

**Files:**
- Modify: `src/components/auth/LoginPage.tsx` (replace placeholder from Task 5)
- Test: `src/components/auth/__tests__/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `login` from `@/lib/auth` (Task 4), `Button`/`Input` from shadcn (Task 2).
- Produces: default export `LoginPage`, navigates to `/` on successful login via `useNavigate`.

- [ ] **Step 1: Write the failing tests**

`src/components/auth/__tests__/LoginPage.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import LoginPage from "@/components/auth/LoginPage";
import * as auth from "@/lib/auth";

describe("LoginPage", () => {
  it("shows validation shake and error message on failed login", async () => {
    vi.spyOn(auth, "login").mockReturnValue(false);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText(/usuário/i), "bernardo");
    await userEvent.type(screen.getByLabelText(/senha/i), "errada");
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/usuário ou senha inválidos/i)).toBeInTheDocument();
    });
  });

  it("toggles password visibility", async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const passwordInput = screen.getByLabelText(/senha/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    await userEvent.click(screen.getByRole("button", { name: /mostrar senha/i }));
    expect(passwordInput.type).toBe("text");
  });

  it("calls login with entered credentials on submit", async () => {
    const loginSpy = vi.spyOn(auth, "login").mockReturnValue(true);
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText(/usuário/i), "bernardo");
    await userEvent.type(screen.getByLabelText(/senha/i), "senha-correta");
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(loginSpy).toHaveBeenCalledWith("bernardo", "senha-correta");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- LoginPage`
Expected: FAIL — placeholder component has no form fields.

- [ ] **Step 3: Implement `LoginPage`**

`src/components/auth/LoginPage.tsx`:
```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const success = login(username, password);
    if (success) {
      navigate("/");
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "linear-gradient(135deg, #0D2040, #1B3A6B)" }}
    >
      <form
        onSubmit={handleSubmit}
        className={cn(
          "w-full max-w-sm rounded-xl bg-white p-8 shadow-xl",
          error && "animate-shake",
        )}
      >
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-karrer-navy">Karrer Engenharia</h1>
          <p className="text-sm text-slate-500">Sistema de Laudos Técnicos</p>
        </div>

        <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
          Usuário
        </label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4"
          autoComplete="username"
        />

        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Senha
        </label>
        <div className="relative mb-2">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <p className="mb-2 text-sm text-red-600">Usuário ou senha inválidos.</p>
        )}

        <Button type="submit" className="mt-4 w-full bg-karrer-blue hover:bg-karrer-lightblue">
          Entrar
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- LoginPage`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement login page with shake-on-error and password toggle"
```

---

## Task 7: Client-side image compression

**Files:**
- Create: `src/lib/imageCompression.ts`
- Test: `src/lib/__tests__/imageCompression.test.ts`

**Interfaces:**
- Produces: `calculateTargetDimensions(originalWidth: number, originalHeight: number, maxWidth?: number): { width: number; height: number }` and `compressImageFile(file: File, quality?: number, maxWidth?: number): Promise<string>` (resolves to a JPEG data URL) from `@/lib/imageCompression` — `StepPhotos` (Task 17) calls `compressImageFile` for every uploaded file before storing it as a `PhotoItem.dataUrl`.

- [ ] **Step 1: Write the failing tests**

`src/lib/__tests__/imageCompression.test.ts`:
```ts
import { beforeEach, afterEach, vi } from "vitest";
import { calculateTargetDimensions, compressImageFile } from "@/lib/imageCompression";

describe("calculateTargetDimensions", () => {
  it("keeps original size when already within max width", () => {
    expect(calculateTargetDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("scales down proportionally when wider than max width", () => {
    expect(calculateTargetDimensions(3200, 2400, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("uses 1600 as the default max width", () => {
    expect(calculateTargetDimensions(3200, 1600)).toEqual({ width: 1600, height: 800 });
  });
});

describe("compressImageFile", () => {
  const OriginalImage = global.Image;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    class FakeImage {
      width = 3000;
      height = 2000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    // @ts-expect-error test stub replaces the global Image constructor
    global.Image = FakeImage;

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/jpeg;base64,FAKE");
  });

  afterEach(() => {
    global.Image = OriginalImage;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("resolves with a compressed JPEG data URL", async () => {
    const file = new File(["fake-bytes"], "foto.jpg", { type: "image/jpeg" });
    const result = await compressImageFile(file);
    expect(result).toBe("data:image/jpeg;base64,FAKE");
  });

  it("calls toDataURL with jpeg mime type and the given quality", async () => {
    const file = new File(["fake-bytes"], "foto.jpg", { type: "image/jpeg" });
    await compressImageFile(file, 0.5);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- imageCompression`
Expected: FAIL — `Cannot find module '@/lib/imageCompression'`.

- [ ] **Step 3: Implement `src/lib/imageCompression.ts`**

```ts
export interface Dimensions {
  width: number;
  height: number;
}

export function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth = 1600,
): Dimensions {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  const ratio = maxWidth / originalWidth;
  return { width: maxWidth, height: Math.round(originalHeight * ratio) };
}

export function compressImageFile(
  file: File,
  quality = 0.75,
  maxWidth = 1600,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o arquivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Falha ao carregar a imagem"));
      img.onload = () => {
        const { width, height } = calculateTargetDimensions(img.width, img.height, maxWidth);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context indisponível"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- imageCompression`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add client-side image compression before storage"
```

---

## Task 8: Storage library with quota handling

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/__tests__/storage.test.ts`

**Interfaces:**
- Consumes: `LaudoData` from `@/types/laudo` (Task 3).
- Produces: `getLaudos(): LaudoData[]`, `getLaudo(id: string): LaudoData | undefined`, `saveLaudo(laudo: LaudoData): void`, `deleteLaudo(id: string): void`, and class `StorageQuotaError extends Error` — all from `@/lib/storage`. `saveLaudo` throws `StorageQuotaError` (not the raw `DOMException`) when `localStorage.setItem` fails due to quota, so callers (Task 26 `StepReview`, Task 29 `LaudoDetail`) can catch one specific type and show a friendly message.

- [ ] **Step 1: Write the failing tests**

`src/lib/__tests__/storage.test.ts`:
```ts
import { beforeEach, vi } from "vitest";
import { getLaudos, getLaudo, saveLaudo, deleteLaudo, StorageQuotaError } from "@/lib/storage";
import type { LaudoData } from "@/types/laudo";

function makeLaudo(overrides: Partial<LaudoData> = {}): LaudoData {
  return {
    id: "laudo-1",
    type: "vistoria_cautelar",
    client: { name: "Cliente Teste", document: "123.456.789-00", address: "Rua A, 1" },
    property: {
      address: "Rua B, 2",
      neighborhood: "Centro",
      city: "Balneário Camboriú",
      state: "SC",
      inspectionDate: "2026-09-14",
      artNumber: "ART-001",
      description: "Casa térrea",
    },
    photos: [],
    conclusion: "Conclusão de teste",
    status: "draft",
    createdAt: "2026-09-14T10:00:00.000Z",
    updatedAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getLaudos returns an empty array when nothing is stored", () => {
    expect(getLaudos()).toEqual([]);
  });

  it("saveLaudo adds a new laudo and getLaudo finds it by id", () => {
    saveLaudo(makeLaudo());
    expect(getLaudo("laudo-1")?.client.name).toBe("Cliente Teste");
  });

  it("saveLaudo updates an existing laudo in place and bumps updatedAt", () => {
    saveLaudo(makeLaudo({ updatedAt: "2026-09-14T10:00:00.000Z" }));
    saveLaudo(makeLaudo({ conclusion: "Conclusão revisada" }));

    const laudos = getLaudos();
    expect(laudos).toHaveLength(1);
    expect(laudos[0].conclusion).toBe("Conclusão revisada");
    expect(laudos[0].updatedAt).not.toBe("2026-09-14T10:00:00.000Z");
  });

  it("getLaudo returns undefined for an unknown id", () => {
    expect(getLaudo("does-not-exist")).toBeUndefined();
  });

  it("deleteLaudo removes only the targeted laudo", () => {
    saveLaudo(makeLaudo({ id: "laudo-1" }));
    saveLaudo(makeLaudo({ id: "laudo-2" }));
    deleteLaudo("laudo-1");

    const laudos = getLaudos();
    expect(laudos).toHaveLength(1);
    expect(laudos[0].id).toBe("laudo-2");
  });

  it("saveLaudo throws StorageQuotaError when localStorage is full", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new DOMException("quota exceeded", "QuotaExceededError");
      throw err;
    });

    expect(() => saveLaudo(makeLaudo())).toThrow(StorageQuotaError);

    setItemSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- storage`
Expected: FAIL — `Cannot find module '@/lib/storage'`.

- [ ] **Step 3: Implement `src/lib/storage.ts`**

```ts
import type { LaudoData } from "@/types/laudo";

const STORAGE_KEY = "karrer_laudos";

export class StorageQuotaError extends Error {
  constructor() {
    super("Espaço de armazenamento cheio. Baixe o PDF e exclua rascunhos antigos.");
    this.name = "StorageQuotaError";
  }
}

export function getLaudos(): LaudoData[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LaudoData[];
  } catch {
    return [];
  }
}

export function getLaudo(id: string): LaudoData | undefined {
  return getLaudos().find((l) => l.id === id);
}

export function saveLaudo(laudo: LaudoData): void {
  const laudos = getLaudos();
  const index = laudos.findIndex((l) => l.id === laudo.id);
  const updated: LaudoData = { ...laudo, updatedAt: new Date().toISOString() };

  if (index >= 0) {
    laudos[index] = updated;
  } else {
    laudos.push(updated);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(laudos));
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      throw new StorageQuotaError();
    }
    throw err;
  }
}

export function deleteLaudo(id: string): void {
  const laudos = getLaudos().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(laudos));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- storage`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add localStorage-backed laudo storage with quota handling"
```

---

## Task 9: App layout — Sidebar, MobileHeader, AppLayout

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/MobileHeader.tsx`
- Modify: `src/components/layout/AppLayout.tsx` (replace placeholder from Task 5)
- Test: `src/components/layout/__tests__/Sidebar.test.tsx`
- Test: `src/components/layout/__tests__/MobileHeader.test.tsx`

**Interfaces:**
- Consumes: `logout` from `@/lib/auth` (Task 4), `Dialog`/`Button` from shadcn (Task 2), `cn` from `@/lib/utils` (Task 1).
- Produces: `Sidebar` (desktop nav, fixed 240px / `w-60`), `MobileHeader({ drawerOpen, onToggleDrawer }: { drawerOpen: boolean; onToggleDrawer: () => void })`, and `AppLayout` default composing both around `<Outlet />` — used as the layout route in `App.tsx` (Task 5).

- [ ] **Step 1: Write the failing Sidebar test**

`src/components/layout/__tests__/Sidebar.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { Sidebar } from "@/components/layout/Sidebar";
import * as auth from "@/lib/auth";

describe("Sidebar", () => {
  it("renders the 3 nav items and Logout", () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /novo laudo/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /meus laudos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("opens a confirmation dialog before logging out, and logs out on confirm", () => {
    const logoutSpy = vi.spyOn(auth, "logout").mockImplementation(() => {});
    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(screen.getByText(/sair do sistema/i)).toBeInTheDocument();
    expect(logoutSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(logoutSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- Sidebar`
Expected: FAIL — `Cannot find module '@/components/layout/Sidebar'`.

- [ ] **Step 3: Implement `Sidebar`**

`src/components/layout/Sidebar.tsx`:
```tsx
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FilePlus, FileText, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/novo-laudo", label: "Novo Laudo", icon: FilePlus },
  { to: "/laudos", label: "Meus Laudos", icon: FileText },
];

export function Sidebar() {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleLogout() {
    logout();
    setConfirmOpen(false);
    navigate("/login");
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E2E8F0] bg-white md:flex">
      <div className="flex h-16 items-center px-6 text-lg font-semibold text-karrer-navy">
        Karrer
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition-colors",
                isActive && "border-karrer-navy bg-karrer-lightblue/10 text-karrer-blue",
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#E2E8F0] p-3">
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair do sistema?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Você precisará fazer login novamente para acessar seus laudos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLogout} className="bg-karrer-blue hover:bg-karrer-lightblue">
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- Sidebar`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing MobileHeader test**

`src/components/layout/__tests__/MobileHeader.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import { MobileHeader } from "@/components/layout/MobileHeader";

function Wrapper() {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <MobileHeader drawerOpen={open} onToggleDrawer={() => setOpen((v) => !v)} />
    </MemoryRouter>
  );
}

describe("MobileHeader", () => {
  it("opens the drawer nav on hamburger click and closes it again", () => {
    render(<Wrapper />);
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /fechar menu/i }));
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test -- MobileHeader`
Expected: FAIL — `Cannot find module '@/components/layout/MobileHeader'`.

- [ ] **Step 7: Implement `MobileHeader`**

`src/components/layout/MobileHeader.tsx`:
```tsx
import { Menu, X, LayoutDashboard, FilePlus, FileText, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/novo-laudo", label: "Novo Laudo", icon: FilePlus },
  { to: "/laudos", label: "Meus Laudos", icon: FileText },
];

interface MobileHeaderProps {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

export function MobileHeader({ drawerOpen, onToggleDrawer }: MobileHeaderProps) {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 md:hidden">
        <span className="text-base font-semibold text-karrer-navy">Karrer</span>
        <button
          aria-label={drawerOpen ? "Fechar menu" : "Abrir menu"}
          onClick={onToggleDrawer}
          className="text-slate-600"
        >
          {drawerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onToggleDrawer} aria-hidden="true" />
          <nav className="relative z-50 flex h-full w-64 flex-col bg-white p-4 shadow-xl">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={onToggleDrawer}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm font-medium text-slate-600",
                    isActive && "border-karrer-navy bg-karrer-lightblue/10 text-karrer-blue",
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="mt-auto flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600"
            >
              <LogOut size={18} />
              Logout
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test -- MobileHeader`
Expected: PASS (1 test).

- [ ] **Step 9: Implement `AppLayout` (replaces the Task 5 placeholder) and rerun the full suite**

`src/components/layout/AppLayout.tsx`:
```tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <MobileHeader drawerOpen={drawerOpen} onToggleDrawer={() => setDrawerOpen((v) => !v)} />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

Run: `npm run test`
Expected: PASS (all tests so far).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add responsive app layout with sidebar, mobile drawer, logout confirmation"
```

---

## Task 10: Magic UI pieces — ShimmerButton, BorderBeam, SparklesText

**Files:**
- Create: `src/components/ui/shimmer-button.tsx`
- Create: `src/components/ui/border-beam.tsx`
- Create: `src/components/ui/sparkles-text.tsx`
- Modify: `src/index.css` (add `border-beam-spin` and `sparkle-pulse` keyframes)
- Test: `src/components/ui/__tests__/magic-ui-a.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (Task 1).
- Produces: `ShimmerButton` (used by `StepReview`, Task 26), `BorderBeam` (used by `StepType`, Task 14 — must be placed inside a `position: relative; overflow: hidden` parent that shares its `border-radius`), `SparklesText` (used by `Dashboard`'s empty state, Task 27) — all from `@/components/ui/<name>`.

- [ ] **Step 1: Add the two extra keyframes to `src/index.css`**

Append to `src/index.css` (after the existing `animate-spin-around` block from Task 1):
```css
@keyframes border-beam-spin {
  to { transform: rotate(360deg); }
}
.animate-border-beam-spin {
  animation: border-beam-spin var(--duration, 6s) linear infinite;
}

@keyframes sparkle-pulse {
  0%, 100% { opacity: 0; transform: scale(0.6); }
  50% { opacity: 1; transform: scale(1); }
}
.animate-sparkle-pulse {
  animation: sparkle-pulse 1.6s ease-in-out infinite;
}
```

- [ ] **Step 2: Write the failing tests**

`src/components/ui/__tests__/magic-ui-a.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { SparklesText } from "@/components/ui/sparkles-text";

describe("ShimmerButton", () => {
  it("renders its children as a button and forwards onClick", async () => {
    const onClick = vi.fn();
    render(<ShimmerButton onClick={onClick}>Gerar PDF</ShimmerButton>);
    const button = screen.getByRole("button", { name: "Gerar PDF" });
    button.click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("BorderBeam", () => {
  it("renders with the given duration as a CSS custom property", () => {
    render(<BorderBeam duration={4} />);
    const beam = screen.getByTestId("border-beam");
    expect(beam.style.getPropertyValue("--duration")).toBe("4s");
  });
});

describe("SparklesText", () => {
  it("renders the wrapped text", () => {
    render(<SparklesText>Crie seu primeiro laudo</SparklesText>);
    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });

  it("renders the requested number of sparkles", () => {
    render(<SparklesText sparkleCount={5}>Texto</SparklesText>);
    expect(screen.getAllByLabelText("", { selector: "[aria-hidden=\"true\"]" })).toHaveLength(5);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- magic-ui-a`
Expected: FAIL — none of the 3 modules exist yet.

- [ ] **Step 4: Implement `ShimmerButton`** (verbatim source retrieved from the 21st.dev / Magic UI registry — `dillionverma/shimmer-button`)

`src/components/ui/shimmer-button.tsx`:
```tsx
import React, { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "rgba(0, 0, 0, 1)",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)] dark:text-black",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          className,
        )}
        ref={ref}
        {...props}
      >
        <div
          className={cn(
            "-z-30 blur-[2px]",
            "absolute inset-0 overflow-visible [container-type:size]",
          )}
        >
          <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
            <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
          </div>
        </div>
        {children}

        <div
          className={cn(
            "insert-0 absolute size-full",
            "rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",
            "transform-gpu transition-all duration-300 ease-in-out",
            "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
            "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]",
          )}
        />

        <div
          className={cn(
            "absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]",
          )}
        />
      </button>
    );
  },
);

ShimmerButton.displayName = "ShimmerButton";

export { ShimmerButton };
```

- [ ] **Step 5: Implement `BorderBeam`** (hand-authored, CSS-only — no Framer Motion — same "beam traveling the border" visual as Magic UI's BorderBeam)

`src/components/ui/border-beam.tsx`:
```tsx
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface BorderBeamProps {
  className?: string;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  duration = 6,
  colorFrom = "#2E5FA3",
  colorTo = "#1B3A6B",
}: BorderBeamProps) {
  return (
    <div
      data-testid="border-beam"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        className,
      )}
      style={{ "--duration": `${duration}s` } as CSSProperties}
    >
      <div
        className="absolute left-1/2 top-1/2 h-[200%] w-[200%] animate-border-beam-spin"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, transparent 300deg, ${colorFrom} 330deg, ${colorTo} 345deg, transparent 360deg)`,
          transformOrigin: "50% 50%",
          marginLeft: "-100%",
          marginTop: "-100%",
        }}
      />
      <div className="absolute inset-[1.5px] rounded-[inherit] bg-white" />
    </div>
  );
}
```

- [ ] **Step 6: Implement `SparklesText`** (hand-authored, CSS-only — no Framer Motion)

`src/components/ui/sparkles-text.tsx`:
```tsx
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SparklesTextProps {
  children: ReactNode;
  className?: string;
  sparkleCount?: number;
  colors?: { first: string; second: string };
}

interface Sparkle {
  id: number;
  top: string;
  left: string;
  size: number;
  delay: string;
  color: string;
}

function generateSparkles(count: number, colors: { first: string; second: string }): Sparkle[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: 8 + Math.random() * 8,
    delay: `${(Math.random() * 2).toFixed(2)}s`,
    color: id % 2 === 0 ? colors.first : colors.second,
  }));
}

export function SparklesText({
  children,
  className,
  sparkleCount = 8,
  colors = { first: "#2E5FA3", second: "#1B3A6B" },
}: SparklesTextProps) {
  const sparkles = useMemo(
    () => generateSparkles(sparkleCount, colors),
    [sparkleCount, colors.first, colors.second],
  );

  return (
    <span className={cn("relative inline-block", className)}>
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          aria-hidden="true"
          className="absolute animate-sparkle-pulse"
          style={
            {
              top: sparkle.top,
              left: sparkle.left,
              width: sparkle.size,
              height: sparkle.size,
              animationDelay: sparkle.delay,
              color: sparkle.color,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 160 160" fill="currentColor" className="h-full w-full">
            <path d="M80 0c4 40 8 76 12 84 8 4 44 8 84 12-40 4-76 8-84 12-4 8-8 44-12 84-4-40-8-76-12-84-8-4-44-8-84-12 40-4 76-8 84-12 4-8 8-44 12-84Z" />
          </svg>
        </span>
      ))}
      <strong className="relative z-10 font-semibold">{children}</strong>
    </span>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run test -- magic-ui-a`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add ShimmerButton, BorderBeam, SparklesText (CSS-only, no Framer Motion)"
```

---

## Task 11: GradientText, SpotlightCard, AnimatedCard

**Files:**
- Create: `src/components/ui/gradient-text.tsx`
- Create: `src/components/ui/spotlight-card.tsx`
- Create: `src/components/ui/animated-card.tsx`
- Test: `src/components/ui/__tests__/magic-ui-b.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (Task 1).
- Produces: `GradientText`, `SpotlightCard` (the "MagicCard" base used by `StepType`, Task 14, wrapped together with `BorderBeam` on hover), `AnimatedCard` (used by `Dashboard` stat tiles, Task 27) — all from `@/components/ui/<name>`.

- [ ] **Step 1: Write the failing tests**

`src/components/ui/__tests__/magic-ui-b.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { GradientText } from "@/components/ui/gradient-text";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { AnimatedCard } from "@/components/ui/animated-card";

describe("GradientText", () => {
  it("renders its children with a gradient background-image", () => {
    render(<GradientText from="#1B3A6B" to="#2E5FA3">Karrer</GradientText>);
    const el = screen.getByText("Karrer");
    expect(el.style.backgroundImage).toContain("#1B3A6B");
    expect(el.style.backgroundImage).toContain("#2E5FA3");
  });
});

describe("SpotlightCard", () => {
  it("renders children and calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<SpotlightCard onClick={onClick}>Laudo de Vistoria Cautelar</SpotlightCard>);
    fireEvent.click(screen.getByText("Laudo de Vistoria Cautelar"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("updates the --x/--y CSS variables on mouse move", () => {
    render(<SpotlightCard>Conteúdo</SpotlightCard>);
    const card = screen.getByText("Conteúdo").closest("div")!.parentElement as HTMLElement;
    fireEvent.mouseMove(card, { clientX: 50, clientY: 30 });
    expect(card.style.getPropertyValue("--x")).toBe("50px");
    expect(card.style.getPropertyValue("--y")).toBe("30px");
  });
});

describe("AnimatedCard", () => {
  it("renders its children", () => {
    render(<AnimatedCard>Total: 12</AnimatedCard>);
    expect(screen.getByText("Total: 12")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- magic-ui-b`
Expected: FAIL — none of the 3 modules exist yet.

- [ ] **Step 3: Implement `GradientText`**

`src/components/ui/gradient-text.tsx`:
```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GradientTextProps {
  children: ReactNode;
  className?: string;
  from?: string;
  to?: string;
}

export function GradientText({
  children,
  className,
  from = "#1B3A6B",
  to = "#2E5FA3",
}: GradientTextProps) {
  return (
    <span
      className={cn("bg-clip-text text-transparent", className)}
      style={{ backgroundImage: `linear-gradient(90deg, ${from}, ${to})` }}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Implement `SpotlightCard`**

`src/components/ui/spotlight-card.tsx`:
```tsx
import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SpotlightCard({ children, className, onClick }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(200px circle at var(--x, 50%) var(--y, 50%), rgba(46,95,163,0.15), transparent 80%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Implement `AnimatedCard`**

`src/components/ui/animated-card.tsx`:
```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedCard({ children, className }: AnimatedCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- magic-ui-b`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add GradientText, SpotlightCard, AnimatedCard"
```

---

## Task 12: FileDropzone ("MagicDropzone") — drag-and-drop photo upload

**Files:**
- Create: `src/components/ui/file-dropzone.tsx`
- Modify: `src/index.css` (add `shimmer-sweep` keyframe and `.dropzone`/`.dropzone-shimmer-bar` hover rule)
- Test: `src/components/ui/__tests__/file-dropzone.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (Task 1).
- Produces: `FileDropzone({ onFilesSelected: (files: File[]) => void; className?: string; accept?: string })` from `@/components/ui/file-dropzone` — consumed by `StepPhotos` (Task 17), which passes each selected `File` through `compressImageFile` (Task 7) before adding it as a `PhotoItem`.

- [ ] **Step 1: Add the shimmer-sweep hover CSS**

Append to `src/index.css`:
```css
@keyframes shimmer-sweep {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
.dropzone-shimmer-bar {
  transform: translateX(-100%);
}
.dropzone:hover .dropzone-shimmer-bar {
  opacity: 1;
  animation: shimmer-sweep 1.2s ease-in-out infinite;
}
```

Plain CSS selectors (`.dropzone:hover .dropzone-shimmer-bar`) are used here instead of Tailwind's `group-hover:` variant, because that variant only generates rules for Tailwind's own utility vocabulary — a hand-named keyframe like `shimmer-sweep` needs either Tailwind's arbitrary-value syntax or a plain CSS rule; plain CSS is simpler and has no JIT-scanning edge cases.

- [ ] **Step 2: Write the failing tests**

`src/components/ui/__tests__/file-dropzone.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { FileDropzone } from "@/components/ui/file-dropzone";

function makeFile(name: string) {
  return new File(["fake"], name, { type: "image/jpeg" });
}

describe("FileDropzone", () => {
  it("calls onFilesSelected with dropped files", () => {
    const onFilesSelected = vi.fn();
    render(<FileDropzone onFilesSelected={onFilesSelected} />);
    const dropzone = screen.getByRole("button", { name: /arraste fotos/i });

    const files = [makeFile("foto1.jpg"), makeFile("foto2.jpg")];
    fireEvent.drop(dropzone, { dataTransfer: { files } });

    expect(onFilesSelected).toHaveBeenCalledWith(files);
  });

  it("calls onFilesSelected when files are chosen via the hidden input", () => {
    const onFilesSelected = vi.fn();
    render(<FileDropzone onFilesSelected={onFilesSelected} />);
    const input = screen.getByLabelText(/selecionar fotos/i) as HTMLInputElement;

    const files = [makeFile("foto3.jpg")];
    Object.defineProperty(input, "files", { value: files });
    fireEvent.change(input);

    expect(onFilesSelected).toHaveBeenCalledWith(files);
  });

  it("ignores an empty drop", () => {
    const onFilesSelected = vi.fn();
    render(<FileDropzone onFilesSelected={onFilesSelected} />);
    const dropzone = screen.getByRole("button", { name: /arraste fotos/i });

    fireEvent.drop(dropzone, { dataTransfer: { files: [] } });
    expect(onFilesSelected).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- file-dropzone`
Expected: FAIL — `Cannot find module '@/components/ui/file-dropzone'`.

- [ ] **Step 4: Implement `FileDropzone`**

`src/components/ui/file-dropzone.tsx`:
```tsx
import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
  accept?: string;
}

export function FileDropzone({ onFilesSelected, className, accept = "image/*" }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(fileList: FileList | File[] | null | undefined) {
    if (!fileList || fileList.length === 0) return;
    onFilesSelected(Array.from(fileList));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    e.target.value = "";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "dropzone group relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white p-10 text-center transition-colors hover:border-karrer-lightblue",
        isDragging && "border-karrer-blue bg-karrer-lightblue/5",
        className,
      )}
    >
      <ImagePlus className="text-slate-400" size={32} />
      <p className="text-sm font-medium text-slate-600">
        Arraste fotos aqui ou clique para selecionar
      </p>
      <p className="text-xs text-slate-400">JPG, PNG — múltiplos arquivos permitidos</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleInputChange}
        className="hidden"
        aria-label="Selecionar fotos"
      />
      <div
        aria-hidden="true"
        className="dropzone-shimmer-bar pointer-events-none absolute inset-0 opacity-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- file-dropzone`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add FileDropzone with dashed border and shimmer hover sweep"
```

---

## Task 13: NewLaudo shell — form state hook, ProgressBar, step wiring

**Files:**
- Create: `src/hooks/useLaudoForm.ts`
- Create: `src/components/form/ProgressBar.tsx`
- Modify: `src/pages/NewLaudo.tsx` (replace placeholder from Task 5)
- Create: `src/pages/steps/StepType.tsx`, `StepClient.tsx`, `StepProperty.tsx`, `StepPhotos.tsx`, `StepConclusion.tsx` (typed placeholders — replaced one at a time in Tasks 14–18), `StepReview.tsx` (placeholder — replaced in Task 26, after PDF generation exists to call)
- Test: `src/hooks/__tests__/useLaudoForm.test.tsx`
- Test: `src/components/form/__tests__/ProgressBar.test.tsx`

**Interfaces:**
- Consumes: `LaudoData`/`LaudoType`/`ClientData`/`PropertyData`/`PhotoItem` from `@/types/laudo` (Task 3), `saveLaudo`/`StorageQuotaError` from `@/lib/storage` (Task 8).
- Produces: `useLaudoForm()` returning `{ step, laudo, saveError, updateType, updateClient, updateProperty, updatePhotos, updateConclusion, updateNotes, next, back, goTo, saveDraft, complete }` and constant `STEP_COUNT = 6` from `@/hooks/useLaudoForm`. `ProgressBar({ currentStep: number })` from `@/components/form/ProgressBar`. **Exact prop signatures every step task (14–19) must implement:**
  - `StepType`: `{ laudo: LaudoData; onSelectType: (type: LaudoType) => void }`
  - `StepClient`: `{ client: ClientData; onChange: (client: ClientData) => void; onNext: () => void; onBack: () => void }`
  - `StepProperty`: `{ property: PropertyData; onChange: (property: PropertyData) => void; onNext: () => void; onBack: () => void }`
  - `StepPhotos`: `{ photos: PhotoItem[]; onChange: (photos: PhotoItem[]) => void; onNext: () => void; onBack: () => void }`
  - `StepConclusion`: `{ conclusion: string; notes?: string; onChangeConclusion: (v: string) => void; onChangeNotes: (v: string) => void; onNext: () => void; onBack: () => void }`
  - `StepReview`: `{ laudo: LaudoData; saveError: string | null; onBack: () => void; onSaveDraft: () => void; onComplete: () => boolean }`

- [ ] **Step 1: Write the failing `useLaudoForm` tests**

`src/hooks/__tests__/useLaudoForm.test.tsx`:
```tsx
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { useLaudoForm, STEP_COUNT } from "@/hooks/useLaudoForm";
import * as storage from "@/lib/storage";

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("useLaudoForm", () => {
  beforeEach(() => localStorage.clear());

  it("starts at step 0 with an empty draft", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    expect(result.current.step).toBe(0);
    expect(result.current.laudo.status).toBe("draft");
  });

  it("next/back stay within [0, STEP_COUNT - 1]", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.back());
    expect(result.current.step).toBe(0);

    act(() => {
      for (let i = 0; i < STEP_COUNT + 2; i++) result.current.next();
    });
    expect(result.current.step).toBe(STEP_COUNT - 1);
  });

  it("updateType updates the draft's type", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.updateType("orcamento"));
    expect(result.current.laudo.type).toBe("orcamento");
  });

  it("saveDraft persists the laudo with status draft", () => {
    const saveSpy = vi.spyOn(storage, "saveLaudo");
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    act(() => result.current.saveDraft());
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
  });

  it("complete persists the laudo with status completed and returns true", () => {
    const { result } = renderHook(() => useLaudoForm(), { wrapper });
    let success: boolean | undefined;
    act(() => {
      success = result.current.complete();
    });
    expect(success).toBe(true);
    expect(storage.getLaudos()[0].status).toBe("completed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- useLaudoForm`
Expected: FAIL — `Cannot find module '@/hooks/useLaudoForm'`.

- [ ] **Step 3: Implement `useLaudoForm`**

`src/hooks/useLaudoForm.ts`:
```ts
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ClientData, LaudoData, LaudoType, PhotoItem, PropertyData } from "@/types/laudo";
import { saveLaudo, StorageQuotaError } from "@/lib/storage";

export const STEP_COUNT = 6;

function emptyLaudo(): LaudoData {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: "vistoria_cautelar",
    client: { name: "", document: "", address: "", email: "" },
    property: {
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      inspectionDate: "",
      artNumber: "",
      description: "",
    },
    photos: [],
    conclusion: "",
    notes: "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function useLaudoForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [laudo, setLaudo] = useState<LaudoData>(emptyLaudo);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateType = useCallback((type: LaudoType) => setLaudo((l) => ({ ...l, type })), []);
  const updateClient = useCallback((client: ClientData) => setLaudo((l) => ({ ...l, client })), []);
  const updateProperty = useCallback(
    (property: PropertyData) => setLaudo((l) => ({ ...l, property })),
    [],
  );
  const updatePhotos = useCallback((photos: PhotoItem[]) => setLaudo((l) => ({ ...l, photos })), []);
  const updateConclusion = useCallback(
    (conclusion: string) => setLaudo((l) => ({ ...l, conclusion })),
    [],
  );
  const updateNotes = useCallback((notes: string) => setLaudo((l) => ({ ...l, notes })), []);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, STEP_COUNT - 1)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);
  const goTo = useCallback(
    (target: number) => setStep(Math.max(0, Math.min(target, STEP_COUNT - 1))),
    [],
  );

  const persist = useCallback(
    (status: "draft" | "completed") => {
      setSaveError(null);
      const toSave: LaudoData = { ...laudo, status };
      try {
        saveLaudo(toSave);
        setLaudo(toSave);
        return true;
      } catch (err) {
        setSaveError(err instanceof StorageQuotaError ? err.message : "Erro ao salvar o laudo.");
        return false;
      }
    },
    [laudo],
  );

  function saveDraft() {
    if (persist("draft")) navigate("/laudos");
  }

  function complete() {
    return persist("completed");
  }

  return {
    step,
    laudo,
    saveError,
    updateType,
    updateClient,
    updateProperty,
    updatePhotos,
    updateConclusion,
    updateNotes,
    next,
    back,
    goTo,
    saveDraft,
    complete,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- useLaudoForm`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing `ProgressBar` test**

`src/components/form/__tests__/ProgressBar.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "@/components/form/ProgressBar";

describe("ProgressBar", () => {
  it("renders all 6 step labels", () => {
    render(<ProgressBar currentStep={0} />);
    ["Tipo", "Cliente", "Imóvel", "Fotos", "Conclusão", "Revisão"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("shows a check icon for steps before the current one", () => {
    render(<ProgressBar currentStep={2} />);
    // steps 0 and 1 are completed -> render an svg check instead of their number
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    // step 2 (index 2, "current") shows its 1-based number "3"
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test -- ProgressBar`
Expected: FAIL — `Cannot find module '@/components/form/ProgressBar'`.

- [ ] **Step 7: Implement `ProgressBar`**

`src/components/form/ProgressBar.tsx`:
```tsx
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Tipo", "Cliente", "Imóvel", "Fotos", "Conclusão", "Revisão"];

interface ProgressBarProps {
  currentStep: number;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <ol className="mb-8 flex items-center">
      {STEP_LABELS.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  isActive && !isCompleted && "border-karrer-blue text-karrer-blue",
                  !isActive && !isCompleted && "border-slate-300 text-slate-400",
                )}
              >
                {isCompleted ? <Check size={16} /> : index + 1}
              </div>
              <span className="hidden text-xs text-slate-500 sm:block">{label}</span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div className={cn("mx-2 h-0.5 flex-1", isCompleted ? "bg-green-500" : "bg-slate-200")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test -- ProgressBar`
Expected: PASS (2 tests).

- [ ] **Step 9: Create typed step placeholders**

Each file below is a minimal stub matching the exact prop signature from the Interfaces block — replaced with the real implementation in Tasks 14–19. Example, `src/pages/steps/StepType.tsx`:
```tsx
import type { LaudoData, LaudoType } from "@/types/laudo";

export interface StepTypeProps {
  laudo: LaudoData;
  onSelectType: (type: LaudoType) => void;
}

export function StepType(_props: StepTypeProps) {
  return <div>StepType placeholder</div>;
}
```

Create the other 5 following the same pattern, one file each, using the prop shapes from the Interfaces block above:
- `src/pages/steps/StepClient.tsx` → `export function StepClient(_props: StepClientProps)`
- `src/pages/steps/StepProperty.tsx` → `export function StepProperty(_props: StepPropertyProps)`
- `src/pages/steps/StepPhotos.tsx` → `export function StepPhotos(_props: StepPhotosProps)`
- `src/pages/steps/StepConclusion.tsx` → `export function StepConclusion(_props: StepConclusionProps)`
- `src/pages/steps/StepReview.tsx` → `export function StepReview(_props: StepReviewProps)`

Each exports its own `<Name>Props` interface (named exactly `StepClientProps`, `StepPropertyProps`, etc.) matching the Interfaces block, and a component returning `<div>{"<Name>"} placeholder</div>`.

- [ ] **Step 10: Implement `NewLaudo` (replaces the Task 5 placeholder)**

`src/pages/NewLaudo.tsx`:
```tsx
import { useLaudoForm } from "@/hooks/useLaudoForm";
import { ProgressBar } from "@/components/form/ProgressBar";
import { StepType } from "@/pages/steps/StepType";
import { StepClient } from "@/pages/steps/StepClient";
import { StepProperty } from "@/pages/steps/StepProperty";
import { StepPhotos } from "@/pages/steps/StepPhotos";
import { StepConclusion } from "@/pages/steps/StepConclusion";
import { StepReview } from "@/pages/steps/StepReview";

export default function NewLaudo() {
  const form = useLaudoForm();

  return (
    <div className="mx-auto max-w-3xl">
      <ProgressBar currentStep={form.step} />

      {form.step === 0 && (
        <StepType
          laudo={form.laudo}
          onSelectType={(type) => {
            form.updateType(type);
            form.next();
          }}
        />
      )}
      {form.step === 1 && (
        <StepClient
          client={form.laudo.client}
          onChange={form.updateClient}
          onNext={form.next}
          onBack={form.back}
        />
      )}
      {form.step === 2 && (
        <StepProperty
          property={form.laudo.property}
          onChange={form.updateProperty}
          onNext={form.next}
          onBack={form.back}
        />
      )}
      {form.step === 3 && (
        <StepPhotos
          photos={form.laudo.photos}
          onChange={form.updatePhotos}
          onNext={form.next}
          onBack={form.back}
        />
      )}
      {form.step === 4 && (
        <StepConclusion
          conclusion={form.laudo.conclusion}
          notes={form.laudo.notes}
          onChangeConclusion={form.updateConclusion}
          onChangeNotes={form.updateNotes}
          onNext={form.next}
          onBack={form.back}
        />
      )}
      {form.step === 5 && (
        <StepReview
          laudo={form.laudo}
          saveError={form.saveError}
          onBack={form.back}
          onSaveDraft={form.saveDraft}
          onComplete={form.complete}
        />
      )}
    </div>
  );
}
```

Run: `npm run build`
Expected: build succeeds, no TS errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: wire NewLaudo shell with form state hook, progress bar, and typed step placeholders"
```

---

## Task 14: StepType (passo 1)

**Files:**
- Modify: `src/pages/steps/StepType.tsx` (replace placeholder from Task 13)
- Test: `src/pages/steps/__tests__/StepType.test.tsx`

**Interfaces:**
- Consumes: `SpotlightCard` (Task 11), `BorderBeam` (Task 10), `LaudoData`/`LaudoType` (Task 3).
- Produces: `StepType({ laudo, onSelectType })` matching the Task 13 signature exactly.

- [ ] **Step 1: Write the failing tests**

`src/pages/steps/__tests__/StepType.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { StepType } from "@/pages/steps/StepType";
import type { LaudoData } from "@/types/laudo";

const baseLaudo: LaudoData = {
  id: "1",
  type: "vistoria_cautelar",
  client: { name: "", document: "", address: "" },
  property: {
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    inspectionDate: "",
    artNumber: "",
    description: "",
  },
  photos: [],
  conclusion: "",
  status: "draft",
  createdAt: "",
  updatedAt: "",
};

describe("StepType", () => {
  it("renders the 3 laudo type cards", () => {
    render(<StepType laudo={baseLaudo} onSelectType={vi.fn()} />);
    expect(screen.getByText("Laudo de Vistoria Cautelar")).toBeInTheDocument();
    expect(screen.getByText("Laudo Técnico")).toBeInTheDocument();
    expect(screen.getByText("Orçamento")).toBeInTheDocument();
  });

  it("calls onSelectType with the clicked type", () => {
    const onSelectType = vi.fn();
    render(<StepType laudo={baseLaudo} onSelectType={onSelectType} />);
    fireEvent.click(screen.getByText("Orçamento"));
    expect(onSelectType).toHaveBeenCalledWith("orcamento");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- StepType`
Expected: FAIL — placeholder has no card text.

- [ ] **Step 3: Implement `StepType`**

`src/pages/steps/StepType.tsx`:
```tsx
import { ClipboardCheck, FileText, Calculator, type LucideIcon } from "lucide-react";
import type { LaudoData, LaudoType } from "@/types/laudo";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";

export interface StepTypeProps {
  laudo: LaudoData;
  onSelectType: (type: LaudoType) => void;
}

interface TypeOption {
  type: LaudoType;
  title: string;
  description: string;
  icon: LucideIcon;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: "vistoria_cautelar",
    title: "Laudo de Vistoria Cautelar",
    description: "Registro do estado de imóveis vizinhos antes de uma obra.",
    icon: ClipboardCheck,
  },
  {
    type: "laudo_tecnico",
    title: "Laudo Técnico",
    description: "Parecer técnico de engenharia sobre um imóvel.",
    icon: FileText,
  },
  {
    type: "orcamento",
    title: "Orçamento",
    description: "Proposta de serviços de engenharia.",
    icon: Calculator,
  },
];

export function StepType({ laudo, onSelectType }: StepTypeProps) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">
        Que tipo de documento você vai gerar?
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {TYPE_OPTIONS.map(({ type, title, description, icon: Icon }) => (
          <SpotlightCard
            key={type}
            onClick={() => onSelectType(type)}
            className={cn(laudo.type === type && "ring-2 ring-karrer-blue")}
          >
            <BorderBeam className="opacity-0 group-hover:opacity-100" />
            <Icon className="mb-3 text-karrer-blue" size={28} />
            <h3 className="mb-1 font-medium text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- StepType`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement StepType with spotlight cards and border beam"
```

---

## Task 15: StepClient (passo 2)

**Files:**
- Modify: `src/pages/steps/StepClient.tsx` (replace placeholder from Task 13)
- Test: `src/pages/steps/__tests__/StepClient.test.tsx`

**Interfaces:**
- Consumes: `Input`/`Button` (Task 2), `maskCpfCnpj` (Task 3), `ClientData` (Task 3).
- Produces: `StepClient({ client, onChange, onNext, onBack })` matching the Task 13 signature exactly.

- [ ] **Step 1: Write the failing tests**

`src/pages/steps/__tests__/StepClient.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { StepClient } from "@/pages/steps/StepClient";
import type { ClientData } from "@/types/laudo";

const emptyClient: ClientData = { name: "", document: "", address: "", email: "" };

describe("StepClient", () => {
  it("updates the name field via onChange", () => {
    const onChange = vi.fn();
    render(<StepClient client={emptyClient} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: "João Silva" } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyClient, name: "João Silva" });
  });

  it("masks the CPF/CNPJ field as the user types", () => {
    const onChange = vi.fn();
    render(<StepClient client={emptyClient} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/cpf\/cnpj/i), { target: { value: "12345678900" } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyClient, document: "123.456.789-00" });
  });

  it("blocks advancing and shows an error when name is empty", () => {
    const onNext = vi.fn();
    render(<StepClient client={emptyClient} onChange={vi.fn()} onNext={onNext} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText(/obrigatório/i)).toBeInTheDocument();
  });

  it("advances when name is filled", () => {
    const onNext = vi.fn();
    render(
      <StepClient
        client={{ ...emptyClient, name: "João Silva" }}
        onChange={vi.fn()}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it("calls onBack when clicking Voltar", () => {
    const onBack = vi.fn();
    render(<StepClient client={emptyClient} onChange={vi.fn()} onNext={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- StepClient`
Expected: FAIL — placeholder has no form fields.

- [ ] **Step 3: Implement `StepClient`**

`src/pages/steps/StepClient.tsx`:
```tsx
import { useState, type FormEvent } from "react";
import type { ClientData } from "@/types/laudo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { maskCpfCnpj } from "@/lib/masks";

export interface StepClientProps {
  client: ClientData;
  onChange: (client: ClientData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepClient({ client, onChange, onNext, onBack }: StepClientProps) {
  const [touched, setTouched] = useState(false);
  const isValid = client.name.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (isValid) onNext();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">Dados do cliente</h2>

      <label htmlFor="client-name" className="mb-1 block text-sm font-medium text-slate-700">
        Nome completo / Razão social
      </label>
      <Input
        id="client-name"
        value={client.name}
        onChange={(e) => onChange({ ...client, name: e.target.value })}
        className="mb-1"
      />
      <p className="mb-3 min-h-[1.25rem] text-sm text-red-600">
        {touched && !isValid ? "Este campo é obrigatório." : ""}
      </p>

      <label htmlFor="client-document" className="mb-1 block text-sm font-medium text-slate-700">
        CPF/CNPJ
      </label>
      <Input
        id="client-document"
        value={client.document}
        onChange={(e) => onChange({ ...client, document: maskCpfCnpj(e.target.value) })}
        className="mb-4"
      />

      <label htmlFor="client-address" className="mb-1 block text-sm font-medium text-slate-700">
        Endereço
      </label>
      <Input
        id="client-address"
        value={client.address}
        onChange={(e) => onChange({ ...client, address: e.target.value })}
        className="mb-4"
      />

      <label htmlFor="client-email" className="mb-1 block text-sm font-medium text-slate-700">
        Email (opcional)
      </label>
      <Input
        id="client-email"
        type="email"
        value={client.email ?? ""}
        onChange={(e) => onChange({ ...client, email: e.target.value })}
        className="mb-6"
      />

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit" className="bg-karrer-blue hover:bg-karrer-lightblue">
          Avançar
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- StepClient`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement StepClient with masked CPF/CNPJ and required-name validation"
```

---

## Task 16: StepProperty (passo 3)

**Files:**
- Modify: `src/pages/steps/StepProperty.tsx` (replace placeholder from Task 13)
- Modify: `src/test/setup.ts` (add jsdom polyfills Radix UI's `Select` needs)
- Test: `src/pages/steps/__tests__/StepProperty.test.tsx`

**Interfaces:**
- Consumes: `Input`/`Textarea`/`Select`+family (Task 2), `PropertyData` (Task 3).
- Produces: `StepProperty({ property, onChange, onNext, onBack })` matching the Task 13 signature exactly.

- [ ] **Step 1: Add Radix `Select` polyfills to the test setup**

Radix UI's `Select` calls `hasPointerCapture`/`releasePointerCapture`/`scrollIntoView`, which jsdom doesn't implement — without this, clicking the dropdown throws in tests. Append to `src/test/setup.ts`:
```ts
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
```

- [ ] **Step 2: Write the failing tests**

`src/pages/steps/__tests__/StepProperty.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { StepProperty } from "@/pages/steps/StepProperty";
import type { PropertyData } from "@/types/laudo";

const emptyProperty: PropertyData = {
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  inspectionDate: "",
  artNumber: "",
  description: "",
};

describe("StepProperty", () => {
  it("updates the address field via onChange", () => {
    const onChange = vi.fn();
    render(<StepProperty property={emptyProperty} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^endereço$/i), { target: { value: "Rua X, 100" } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyProperty, address: "Rua X, 100" });
  });

  it("selects a UF from the Estado dropdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StepProperty property={emptyProperty} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Santa Catarina" }));

    expect(onChange).toHaveBeenCalledWith({ ...emptyProperty, state: "SC" });
  });

  it("blocks advancing and shows an error when ART number is empty", () => {
    const onNext = vi.fn();
    render(<StepProperty property={emptyProperty} onChange={vi.fn()} onNext={onNext} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText(/obrigatório/i)).toBeInTheDocument();
  });

  it("advances when ART number is filled", () => {
    const onNext = vi.fn();
    render(
      <StepProperty
        property={{ ...emptyProperty, artNumber: "ART-123" }}
        onChange={vi.fn()}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- StepProperty`
Expected: FAIL — placeholder has no form fields.

- [ ] **Step 4: Implement `StepProperty`**

`src/pages/steps/StepProperty.tsx`:
```tsx
import { useState, type FormEvent } from "react";
import type { PropertyData } from "@/types/laudo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export interface StepPropertyProps {
  property: PropertyData;
  onChange: (property: PropertyData) => void;
  onNext: () => void;
  onBack: () => void;
}

const UFS: { value: string; label: string }[] = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

export function StepProperty({ property, onChange, onNext, onBack }: StepPropertyProps) {
  const [touched, setTouched] = useState(false);
  const isValid = property.artNumber.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (isValid) onNext();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">Dados do imóvel</h2>

      <label htmlFor="property-address" className="mb-1 block text-sm font-medium text-slate-700">
        Endereço
      </label>
      <Input
        id="property-address"
        value={property.address}
        onChange={(e) => onChange({ ...property, address: e.target.value })}
        className="mb-4"
      />

      <label htmlFor="property-neighborhood" className="mb-1 block text-sm font-medium text-slate-700">
        Bairro
      </label>
      <Input
        id="property-neighborhood"
        value={property.neighborhood}
        onChange={(e) => onChange({ ...property, neighborhood: e.target.value })}
        className="mb-4"
      />

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="property-city" className="mb-1 block text-sm font-medium text-slate-700">
            Cidade
          </label>
          <Input
            id="property-city"
            value={property.city}
            onChange={(e) => onChange({ ...property, city: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="property-state" className="mb-1 block text-sm font-medium text-slate-700">
            Estado
          </label>
          <Select value={property.state} onValueChange={(value) => onChange({ ...property, state: value })}>
            <SelectTrigger id="property-state">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {UFS.map((uf) => (
                <SelectItem key={uf.value} value={uf.value}>
                  {uf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label htmlFor="property-date" className="mb-1 block text-sm font-medium text-slate-700">
        Data da vistoria
      </label>
      <Input
        id="property-date"
        type="date"
        value={property.inspectionDate}
        onChange={(e) => onChange({ ...property, inspectionDate: e.target.value })}
        className="mb-4"
      />

      <label htmlFor="property-art" className="mb-1 block text-sm font-medium text-slate-700">
        Número ART
      </label>
      <Input
        id="property-art"
        value={property.artNumber}
        onChange={(e) => onChange({ ...property, artNumber: e.target.value })}
        className="mb-1"
      />
      <p className="mb-3 min-h-[1.25rem] text-sm text-red-600">
        {touched && !isValid ? "Este campo é obrigatório." : ""}
      </p>

      <label htmlFor="property-description" className="mb-1 block text-sm font-medium text-slate-700">
        Descrição do imóvel
      </label>
      <Textarea
        id="property-description"
        value={property.description}
        onChange={(e) => onChange({ ...property, description: e.target.value })}
        className="mb-6"
      />

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit" className="bg-karrer-blue hover:bg-karrer-lightblue">
          Avançar
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- StepProperty`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: implement StepProperty with UF select and required ART validation"
```

---

## Task 17: StepPhotos (passo 4)

**Files:**
- Modify: `src/pages/steps/StepPhotos.tsx` (replace placeholder from Task 13)
- Test: `src/pages/steps/__tests__/StepPhotos.test.tsx`

**Interfaces:**
- Consumes: `FileDropzone` (Task 12), `compressImageFile` (Task 7), `Badge`/`Input`/`Button` (Task 2), `PhotoItem` (Task 3).
- Produces: `StepPhotos({ photos, onChange, onNext, onBack })` matching the Task 13 signature exactly.

- [ ] **Step 1: Write the failing tests**

`src/pages/steps/__tests__/StepPhotos.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { StepPhotos } from "@/pages/steps/StepPhotos";
import * as imageCompression from "@/lib/imageCompression";
import type { PhotoItem } from "@/types/laudo";

function makeFile(name: string) {
  return new File(["fake"], name, { type: "image/jpeg" });
}

describe("StepPhotos", () => {
  beforeEach(() => {
    vi.spyOn(imageCompression, "compressImageFile").mockResolvedValue("data:image/jpeg;base64,FAKE");
  });

  it("compresses and adds dropped photos, numbered from 1", async () => {
    const onChange = vi.fn();
    render(<StepPhotos photos={[]} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);

    const dropzone = screen.getByRole("button", { name: /arraste fotos/i });
    fireEvent.drop(dropzone, { dataTransfer: { files: [makeFile("a.jpg"), makeFile("b.jpg")] } });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const [added] = onChange.mock.calls[0] as [PhotoItem[]];
    expect(added.map((p) => p.order)).toEqual([1, 2]);
    expect(added.every((p) => p.dataUrl === "data:image/jpeg;base64,FAKE")).toBe(true);
  });

  const existingPhotos: PhotoItem[] = [
    { id: "p1", dataUrl: "data:1", caption: "", order: 1 },
    { id: "p2", dataUrl: "data:2", caption: "", order: 2 },
  ];

  it("updates a photo's caption", () => {
    const onChange = vi.fn();
    render(<StepPhotos photos={existingPhotos} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);

    fireEvent.change(screen.getAllByPlaceholderText(/legenda/i)[0], { target: { value: "Fachada norte" } });

    expect(onChange).toHaveBeenCalledWith([
      { ...existingPhotos[0], caption: "Fachada norte" },
      existingPhotos[1],
    ]);
  });

  it("removes a photo and renumbers the rest", () => {
    const onChange = vi.fn();
    render(<StepPhotos photos={existingPhotos} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /remover foto 1/i }));

    expect(onChange).toHaveBeenCalledWith([{ ...existingPhotos[1], order: 1 }]);
  });

  it("removes all photos", () => {
    const onChange = vi.fn();
    render(<StepPhotos photos={existingPhotos} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /remover todas/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("calls onNext and onBack", () => {
    const onNext = vi.fn();
    const onBack = vi.fn();
    render(<StepPhotos photos={[]} onChange={vi.fn()} onNext={onNext} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onNext).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- StepPhotos`
Expected: FAIL — placeholder has no dropzone/list.

- [ ] **Step 3: Implement `StepPhotos`**

`src/pages/steps/StepPhotos.tsx`:
```tsx
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { compressImageFile } from "@/lib/imageCompression";
import type { PhotoItem } from "@/types/laudo";

export interface StepPhotosProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function renumber(photos: PhotoItem[]): PhotoItem[] {
  return photos.map((p, i) => ({ ...p, order: i + 1 }));
}

export function StepPhotos({ photos, onChange, onNext, onBack }: StepPhotosProps) {
  async function handleFilesSelected(files: File[]) {
    const newPhotos: PhotoItem[] = [];
    for (const file of files) {
      const dataUrl = await compressImageFile(file);
      newPhotos.push({ id: crypto.randomUUID(), dataUrl, caption: "", order: 0 });
    }
    onChange(renumber([...photos, ...newPhotos]));
  }

  function handleCaptionChange(id: string, caption: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  function handleRemove(id: string) {
    onChange(renumber(photos.filter((p) => p.id !== id)));
  }

  function handleRemoveAll() {
    onChange([]);
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">Fotos</h2>

      <FileDropzone onFilesSelected={handleFilesSelected} className="mb-4" />

      {photos.length > 0 && (
        <>
          <div className="mb-4 space-y-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-2"
              >
                <img src={photo.dataUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
                <Badge className="bg-karrer-blue">{photo.order}</Badge>
                <Input
                  value={photo.caption}
                  onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                  placeholder="Legenda da foto"
                  className="flex-1"
                />
                <button
                  type="button"
                  aria-label={`Remover foto ${photo.order}`}
                  onClick={() => handleRemove(photo.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={handleRemoveAll} className="mb-6">
            Remover todas
          </Button>
        </>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="button" onClick={onNext} className="bg-karrer-blue hover:bg-karrer-lightblue">
          Avançar
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- StepPhotos`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement StepPhotos with compression, numbering, and inline captions"
```

---

## Task 18: StepConclusion (passo 5)

**Files:**
- Modify: `src/pages/steps/StepConclusion.tsx` (replace placeholder from Task 13)
- Test: `src/pages/steps/__tests__/StepConclusion.test.tsx`

**Interfaces:**
- Consumes: `Textarea`/`Button`/`Tooltip`+family (Task 2).
- Produces: `StepConclusion({ conclusion, notes, onChangeConclusion, onChangeNotes, onNext, onBack })` matching the Task 13 signature exactly.

- [ ] **Step 1: Write the failing tests**

`src/pages/steps/__tests__/StepConclusion.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { StepConclusion } from "@/pages/steps/StepConclusion";

describe("StepConclusion", () => {
  it("updates the conclusion field via onChangeConclusion", () => {
    const onChangeConclusion = vi.fn();
    render(
      <StepConclusion
        conclusion=""
        notes=""
        onChangeConclusion={onChangeConclusion}
        onChangeNotes={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^conclusão$/i), { target: { value: "Tudo conforme." } });
    expect(onChangeConclusion).toHaveBeenCalledWith("Tudo conforme.");
  });

  it("updates the notes field via onChangeNotes", () => {
    const onChangeNotes = vi.fn();
    render(
      <StepConclusion
        conclusion="x"
        notes=""
        onChangeConclusion={vi.fn()}
        onChangeNotes={onChangeNotes}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    // exact match — a regex would also match the tooltip trigger's aria-label
    fireEvent.change(screen.getByLabelText("Notas Técnicas"), { target: { value: "Medição com trena." } });
    expect(onChangeNotes).toHaveBeenCalledWith("Medição com trena.");
  });

  it("renders a tooltip trigger explaining Notas Técnicas", () => {
    render(
      <StepConclusion
        conclusion=""
        notes=""
        onChangeConclusion={vi.fn()}
        onChangeNotes={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/o que são notas técnicas/i)).toBeInTheDocument();
  });

  it("blocks advancing and shows an error when conclusion is empty", () => {
    const onNext = vi.fn();
    render(
      <StepConclusion
        conclusion=""
        notes=""
        onChangeConclusion={vi.fn()}
        onChangeNotes={vi.fn()}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText(/obrigatório/i)).toBeInTheDocument();
  });

  it("advances when conclusion is filled", () => {
    const onNext = vi.fn();
    render(
      <StepConclusion
        conclusion="Tudo certo."
        notes=""
        onChangeConclusion={vi.fn()}
        onChangeNotes={vi.fn()}
        onNext={onNext}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(onNext).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- StepConclusion`
Expected: FAIL — placeholder has no form fields.

- [ ] **Step 3: Implement `StepConclusion`**

`src/pages/steps/StepConclusion.tsx`:
```tsx
import { useState, type FormEvent } from "react";
import { Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export interface StepConclusionProps {
  conclusion: string;
  notes?: string;
  onChangeConclusion: (v: string) => void;
  onChangeNotes: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepConclusion({
  conclusion,
  notes,
  onChangeConclusion,
  onChangeNotes,
  onNext,
  onBack,
}: StepConclusionProps) {
  const [touched, setTouched] = useState(false);
  const isValid = conclusion.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (isValid) onNext();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">Conclusão</h2>

      <label htmlFor="conclusion" className="mb-1 block text-sm font-medium text-slate-700">
        Conclusão
      </label>
      <Textarea
        id="conclusion"
        value={conclusion}
        onChange={(e) => onChangeConclusion(e.target.value)}
        className="mb-1"
        rows={6}
      />
      <p className="mb-4 min-h-[1.25rem] text-sm text-red-600">
        {touched && !isValid ? "Este campo é obrigatório." : ""}
      </p>

      <TooltipProvider>
        <div className="mb-1 flex items-center gap-2">
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            Notas Técnicas
          </label>
          <Tooltip>
            <TooltipTrigger type="button" aria-label="O que são Notas Técnicas?">
              <Info size={14} className="text-slate-400" />
            </TooltipTrigger>
            <TooltipContent>
              Observações internas, medições, referências de norma — aparecem no PDF antes da
              conclusão
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      <Textarea
        id="notes"
        value={notes ?? ""}
        onChange={(e) => onChangeNotes(e.target.value)}
        className="mb-2"
        rows={4}
      />
      <p className="mb-6 text-xs text-slate-400">
        Instrumentos, Glossário e Referências são incluídos automaticamente no PDF.
      </p>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit" className="bg-karrer-blue hover:bg-karrer-lightblue">
          Avançar
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- StepConclusion`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement StepConclusion with required conclusion and notes tooltip"
```

---

## Task 19: PDF fixed content — instruments, glossary, references

**Files:**
- Create: `src/lib/pdf/content/instruments.ts`
- Create: `src/lib/pdf/content/glossary.ts`
- Create: `src/lib/pdf/content/references.ts`
- Test: `src/lib/pdf/content/__tests__/fixed-content.test.ts`

**Interfaces:**
- Produces: `INSTRUMENTS: string[]`, `GLOSSARY: GlossaryTerm[]` (`interface GlossaryTerm { term: string; definition: string }`), `REFERENCES: string[]` — consumed by the drawing functions in Task 23 (`src/lib/pdf/sections/instruments.ts`, `glossary.ts`, `references.ts` — separate from this task's `src/lib/pdf/content/` data files, matching the spec's file layout where `sections/` holds drawing functions), and by `generateLaudo.ts` (Task 25).

Content source: `docs/superpowers/specs/2026-09-14-sistema-laudos-karrer-conteudo-fixo.md` (full text extracted from the reference PDF).

- [ ] **Step 1: Write the failing tests**

`src/lib/pdf/content/__tests__/fixed-content.test.ts`:
```ts
import { INSTRUMENTS } from "@/lib/pdf/content/instruments";
import { GLOSSARY } from "@/lib/pdf/content/glossary";
import { REFERENCES } from "@/lib/pdf/content/references";

describe("PDF fixed content", () => {
  it("has all 6 instruments", () => {
    expect(INSTRUMENTS).toHaveLength(6);
    expect(INSTRUMENTS).toContain("Fissurômetro");
  });

  it("has the full 63-term glossary in alphabetical order, A to V", () => {
    expect(GLOSSARY).toHaveLength(63);
    expect(GLOSSARY[0].term).toBe("ANOMALIA");
    expect(GLOSSARY[GLOSSARY.length - 1].term).toBe("VISTORIA CAUTELAR");
    expect(GLOSSARY.every((g) => g.term.length > 0 && g.definition.length > 0)).toBe(true);
  });

  it("has the 5 fixed references", () => {
    expect(REFERENCES).toHaveLength(5);
    expect(REFERENCES).toContain("ABNT NBR 6118");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- fixed-content`
Expected: FAIL — none of the 3 modules exist yet.

- [ ] **Step 3: Implement `src/lib/pdf/content/instruments.ts`**

```ts
export const INSTRUMENTS: string[] = [
  "Trena métrica fibra aberta 13mm x 30m",
  "Nível eletrônico digital",
  "Percussor manual de inspeção",
  "Trena eletrônica digital — Bosch GLM 50",
  "Trena métrica — Irwin 19mm x 5m",
  "Fissurômetro",
];
```

- [ ] **Step 4: Implement `src/lib/pdf/content/glossary.ts`**

```ts
export interface GlossaryTerm {
  term: string;
  definition: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "ANOMALIA", definition: "Irregularidade, anormalidade, exceção à regra." },
  {
    term: "ASSISTENTE TÉCNICO",
    definition:
      "Profissional legalmente habilitado pelos Conselhos Regionais de Engenharia e Agronomia, e pelos Conselhos e Arquitetura e Urbanismo, indicado e contratado pela parte para orientá-la, assistir aos trabalhos periciais em todas as fases da perícia e, quando necessário, emitir seu parecer técnico.",
  },
  {
    term: "ÁREA DE INFLUÊNCIA DO CANTEIRO DE OBRA",
    definition:
      "Perímetro dentro do qual estão contidos os imóveis que, por orientação de profissional competente e por definição do Contratante, serão vistoriados e descritos no laudo.",
  },
  {
    term: "AVARIA",
    definition: "Dano causado a qualquer bem, ocasionado por defeito ou por outra causa externa a ele.",
  },
  {
    term: "BEIRAL",
    definition: "Prolongamento do telhado para além da parede externa, protegendo-a da ação das chuvas.",
  },
  {
    term: "CAPILARIDADE",
    definition:
      'Nos tijolos, nas argamassas e nos concretos porosos, em contato com uma superfície úmida, a água sobe por veios ou canais por "ascensão capilar", até atingir o equilíbrio, que poderá variar a altura de acordo com os materiais envolvidos.',
  },
  {
    term: "CARBONATAÇÃO",
    definition:
      "É o processo pelo qual o concreto sofre a agressão por dióxido de carbono presente no meio, transformando o hidróxido de cálcio presente, em carbonato de cálcio mais água, gerando a diminuição da alcalinidade da peça e a redução de volume (retração por carbonatação).",
  },
  { term: "COBRIMENTO", definition: "Capeamento da armação em uma peça de concreto armado." },
  {
    term: "CONFORMIDADE",
    definition:
      "Atendimento a padrões estabelecidos e que podem ser os seguintes: projetos e memoriais descritivos; procedimentos executivos e de qualidade; boletins técnicos de produtos e procedimentos; dados de fabricantes de produtos / sistema / equipamentos / máquinas; normas técnicas.",
  },
  {
    term: "CONSERVAÇÃO",
    definition: "Ato de conservar, manter em bom estado, resistir ao desgaste causado pelo tempo.",
  },
  { term: "CONSTRUÇÃO", definition: "Ato, efeito, modo ou arte de construir. Edificação." },
  {
    term: "CONSTRUIR",
    definition:
      "Edificar, levantar prédios. Conjunto de materiais e serviços com ordenação, conforme projeto visando à sua transformação num bem.",
  },
  {
    term: "CONTRAVENTAMENTO",
    definition:
      "Sistema de ligação entre os elementos principais de uma estrutura com a finalidade de aumentar a rigidez da construção.",
  },
  {
    term: "CONTRAVERGA",
    definition: "Viga de concreto usada sob a janela para evitar a fissuração da parede.",
  },
  { term: "CORROSÃO", definition: "Ataque das armações através de processo de deterioração eletroquímica." },
  {
    term: "DANO",
    definition:
      "Ofensa ou diminuição do patrimônio moral ou material de alguém, resultante de delito extracontratual ou decorrente da instituição de servidão. De acordo com o Código de Defesa do Consumidor, são as consequências dos vícios e defeitos do produto ou serviço.",
  },
  {
    term: "DECADÊNCIA",
    definition:
      "Perda, perecimento ou extinção de direito em si, por consequência da inércia ou negligência no uso de prazo legal ou direito a que estava subordinado.",
  },
  {
    term: "DECREPITUDE",
    definition:
      "Depreciação de um bem pela idade, no decorrer da sua vida útil, em consequência de sua utilização, desgaste e manutenção normal.",
  },
  {
    term: "DEFEITO",
    definition:
      "Anomalia que pode causar danos efetivos ou representar ameaça potencial de afetar a saúde ou à segurança do dono ou consumidor, decorrente de falhas do projeto ou execução de um produto ou serviço, ou ainda, de informação incorreta ou inadequada de sua utilização ou manutenção.",
  },
  {
    term: "DEPRECIAÇÃO",
    definition: "Ação ou efeito de depreciar. Baixar de preço ou de valor. Desvalorização.",
  },
  {
    term: "DETERIORAÇÃO",
    definition:
      "Depreciação de um bem devido ao desgaste de seus componentes ou às falhas de funcionamento de sistemas, em razão de uso ou manutenção inadequados.",
  },
  {
    term: "DIVISA",
    definition:
      "Limite da propriedade que a separa da propriedade contígua, cuja definição é de acordo com a posição do observador, a qual deve ser obrigatoriamente explicitada.",
  },
  {
    term: "DOMÍNIO",
    definition:
      "Direito real que submete a propriedade, de maneira legal, absoluta e exclusiva, ao poder e vontade de alguém; é a propriedade plena.",
  },
  {
    term: "EFLORESCÊNCIA",
    definition:
      "São depósitos cristalinos de coloração branca, que vão para a superfície do revestimento, como, por exemplo, pisos (cerâmicos ou não), paredes e tetos, resultantes da migração de soluções aquosas, geradas a partir da dissolução de sais solúveis, componentes dos depósitos, que se evaporação posteriormente, deixando - no local de escorrimento - um material resultante.",
  },
  {
    term: "ENGENHARIA LEGAL",
    definition:
      "Ramo de especialização da engenharia dos profissionais registrados nos CREA's e nos CAU's que atuam na interface direito / engenharia, colaborando com juízes, advogados e as partes, para esclarecer aspectos técnico-legais envolvidos em demandas.",
  },
  {
    term: "ESTADO DE CONSERVAÇÃO",
    definition: "Situação física de um bem em decorrência de sua idade e condições de manutenção.",
  },
  {
    term: "ESTALACTITE",
    definition:
      "Depósitos brancos – bicarbonato de cálcio – formados nos tetos, provenientes, geralmente, da cal livre do cimento, que reage com a água e o CO2 do ar. É ocasionada, normalmente, por águas puras (chuva) que, por não conterem sais dissolvidos, tendem a dissolver a cal.",
  },
  {
    term: "ESTANQUEIDADE",
    definition: "Propriedade conferida pela impermeabilização, de impedir a passagem de fluídos.",
  },
  {
    term: "EXAME",
    definition:
      "Inspeção, por meio de perito, sobre pessoa, coisas, móveis e semoventes, para verificação de fatos ou circunstâncias que interessem à causa.",
  },
  {
    term: "FALHA",
    definition:
      "Anomalia caracterizada pela perda precoce de desempenho de elementos e sistemas construtivos com origem na Manutenção, Operação e Uso.",
  },
  {
    term: "FISSURAS, TRINCAS E RACHADURAS",
    definition:
      "Manifestações patológicas observadas nas edificações, e/ou terrenos, que ocorrem normalmente em alvenarias, lajes, vigas, pilares, pisos, muros dentre outros elementos. Geralmente são causadas por acréscimos de tensões no elemento e seus materiais componentes. Tais anomalias são indícios da ocorrência de que o elemento, e seus materiais, foram condicionados a esforços superiores às suas capacidades resistivas. A partir disso, a consequência deste fenômeno é uma abertura no elemento cuja caracterização é conforme a espessura correspondente.",
  },
  {
    term: "IDADE ESTIMADA",
    definition:
      "Idade atribuída ao bem considerando sua utilização, estado de conservação, partido arquitetônico e outras características relevantes.",
  },
  { term: "IMPERMEABILIZAÇÃO", definition: "Proteção mecânica das construções contra a passagem de fluídos." },
  {
    term: "INCÔMODO OU TRANSTORNO",
    definition:
      "Perturbação no uso do imóvel decorrente de ações externas com infringência do direito de vizinhança, de instituição de servidão, etc.",
  },
  { term: "INFILTRAÇÃO", definition: "Percolação de fluído através dos interstícios de corpos sólidos." },
  {
    term: "INSTALAÇÃO",
    definition: "Conjunto de equipamentos e componentes destinados a desempenhar uma utilidade ou um serviço auxiliar.",
  },
  {
    term: "LAUDO",
    definition:
      "Documento escrito e fundamentado, emitido por um especialista indicado por autoridade, relatando resultado de exames e vistorias, assim como eventuais avaliações com ele relacionado.",
  },
  { term: "LIDE", definition: "Conflito de interesses suscitado em juízo ou fora dele." },
  {
    term: "LIXIVIAÇÃO",
    definition:
      "É o processo pelo qual o concreto sofre a extração dos compostos solúveis, principalmente o hidróxido de cálcio presente no meio, através da dissolução deste em presença de água, gerando a diminuição da alcalinidade da peça.",
  },
  {
    term: "MANCHAS",
    definition:
      "São diferenças de tonalidades em uma peça ou em elemento como piso, parede, viga, pilar, muro, dentre outros, originadas por consequência de irregularidades no funcionamento da construção.",
  },
  {
    term: "MANUTENÇÃO",
    definition:
      "Conjunto de atividades a serem realizadas para conservar ou recuperar a capacidade funcional da edificação e de suas partes constituintes de atender as necessidades e segurança dos seus usuários.",
  },
  {
    term: "MASTIQUE",
    definition:
      "Material de consistência pastosa, com cargas adicionais a si, adquirindo o produto final, consistência adequada para ser aplicado em calafetações rígidas, plásticas ou elásticas (ABNT – NBR 8.083/83).",
  },
  {
    term: "MUTILAÇÃO",
    definition: "Depreciação de um bem devido à retirada de sistemas ou de componentes originalmente existentes.",
  },
  {
    term: "NICHO",
    definition: "Reentrância feita na parede para abrigar armários, prateleiras ou guardar eletrodomésticos.",
  },
  {
    term: "PADRÃO CONSTRUTIVO",
    definition:
      "Qualidade das benfeitorias em função das especificações dos projetos, materiais e mão de obra efetivamente utilizados na construção.",
  },
  {
    term: "PARECER TÉCNICO",
    definition:
      "Opinião, conselho ou esclarecimento técnico emitido por um profissional legalmente habilitado sobre assunto de sua especialidade.",
  },
  {
    term: "PATOLOGIAS",
    definition:
      "Danos e anomalias encontrados na edificação, e/ou terreno, que deixam o elemento em situação diferente da inicialmente concebida.",
  },
  {
    term: "PAVIMENTO",
    definition:
      "Conjunto de edificações cobertas ou descobertas situadas entre os planos de dois pisos sucessivos ou entre o do último piso e a cobertura.",
  },
  { term: "PERDA", definition: "Prejuízo, privação ou desaparecimento da posse ou da coisa possuída." },
  {
    term: "PÉ-DIREITO",
    definition: "Distância vertical entre o piso e o teto de uma edificação ou construção.",
  },
  {
    term: "PERÍCIA",
    definition: "Atividade que envolve apuração das causas que motivaram determinado evento ou asserção de direitos.",
  },
  {
    term: "PERITO",
    definition:
      "Profissional legalmente habilitado pelos Conselhos Regionais de Engenharia e Agronomia, e pelos Conselhos de Arquitetura e Urbanismo, com atribuições para proceder à perícia.",
  },
  { term: "PILAR", definition: "Elemento estrutural vertical de concreto, madeira, aço, pedra ou alvenaria." },
  {
    term: "PILOTIS",
    definition: "Conjunto de colunas de sustentação do prédio que deixa livre o pavimento térreo.",
  },
  {
    term: "PLATIBANDA",
    definition:
      "Moldura contínua, mais larga do que saliente, que contorna uma construção acima dos flechais, formando uma proteção ou camuflagem do telhado.",
  },
  {
    term: "PROPRIEDADE",
    definition:
      "Relação de direito entre a pessoa e a coisa certa e determinada, a de maneira absoluta, exclusiva e direta à sua vontade e poder. Quando a propriedade sofre limitação em alguns de seus direitos elementares em virtude de ônus real que sobre ela recai, é classificada como propriedade limitada ou nua-propriedade.",
  },
  { term: "PROPRIETÁRIO", definition: "Pessoa física ou jurídica que tem o direito de dispor da edificação." },
  {
    term: "RUPTURA",
    definition:
      "Seccionamento integral ou parcial de um elemento ou componente que reduz significativamente sua capacidade de resistência.",
  },
  {
    term: "TERRENO-MOTIVO",
    definition:
      "Futura obra ou intervenção vizinha à edificação e/ou terreno, a ser vistoriado, causador da necessidade de realização do trabalho, preventivo, em questão.",
  },
  {
    term: "USO",
    definition: "Finalidade da utilização do imóvel (residencial, comercial, industrial e outras).",
  },
  {
    term: "VÍCIOS",
    definition:
      "Anomalias que afetam o desempenho de produtos ou de serviços, ou os tornam inadequados aos fins a que se destinam, causando transtornos ou prejuízos materiais ao consumidor. Podem decorrer de falha de projeto ou de execução, ou ainda da informação defeituosa sobre sua utilização ou manutenção.",
  },
  {
    term: "VÍCIOS REDIBITÓRIOS",
    definition:
      "Vícios ocultos que diminuem o valor da coisa ou a tornam imprópria ao uso a que se destina, e que, se fossem do conhecimento prévio do adquirente, ensejariam pedido de abatimento do preço pago ou inviabilizariam a compra.",
  },
  {
    term: "VIDA ÚTIL",
    definition:
      "Intervalo de tempo ao longo do qual a edificação e suas partes constituintes atendem aos requisitos funcionais para os quais foram projetadas, obedecidos os planos de operação, uso e manutenção previstos.",
  },
  {
    term: "VISTORIA",
    definition:
      "Constatação de um fato, mediante exame circunstanciado e descrição minuciosa dos elementos que o constituem e/ou influenciam, sem a indagação das causas que o motivaram.",
  },
  {
    term: "VISTORIA CAUTELAR",
    definition:
      "Constatação mediante exame circunstanciado dos imóveis localizados na área de abrangência de um canteiro de obras com o propósito de caracterizar a sua tipologia, estado de conservação, padrão construtivo, idade aparente e eventuais anomalias e falhas, bem como outras características importantes, devendo conter o registro fotográfico das anomalias e falhas identificadas no imóvel vistoriado.",
  },
];
```

- [ ] **Step 5: Implement `src/lib/pdf/content/references.ts`**

```ts
export const REFERENCES: string[] = [
  "ABNT NBR 6118",
  "ABNT NBR 9575",
  "ABNT NBR 13749",
  "ABNT NBR 15575",
  "Resolução CONFEA n.º 1.025/09",
];
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- fixed-content`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add fixed PDF content (instruments, 63-term glossary, references)"
```

---

## Task 20: PDF drawing primitives — constants, cover, header, footer

**Files:**
- Create: `src/lib/pdf/constants.ts`
- Create: `src/lib/pdf/sections/cover.ts`
- Create: `src/lib/pdf/sections/header.ts`
- Create: `src/lib/pdf/sections/footer.ts`
- Test: `src/lib/pdf/sections/__tests__/cover-header-footer.test.ts`

**Interfaces:**
- Consumes: `LaudoData`/`LAUDO_TYPE_LABELS` from `@/types/laudo` (Task 3), `jsPDF` from `jspdf`.
- Produces: `KARRER_BLUE`, `KARRER_LIGHTBLUE`, `KARRER_NAVY`, `PAGE_WIDTH`, `PAGE_HEIGHT` from `@/lib/pdf/constants`; `drawCover(doc: jsPDF, laudo: LaudoData): void` from `@/lib/pdf/sections/cover`; `drawHeader(doc: jsPDF, sectionTitle: string, pageNumber: number): void` from `@/lib/pdf/sections/header`; `drawFooter(doc: jsPDF): void` from `@/lib/pdf/sections/footer` — all consumed by `generateLaudo.ts` (Task 25), which creates one `jsPDF` instance and calls these plus every other section drawer (Tasks 21–24) in the spec's fixed order.

- [ ] **Step 1: Write the failing tests**

`src/lib/pdf/sections/__tests__/cover-header-footer.test.ts`:
```ts
import { jsPDF } from "jspdf";
import { drawCover } from "@/lib/pdf/sections/cover";
import { drawHeader } from "@/lib/pdf/sections/header";
import { drawFooter } from "@/lib/pdf/sections/footer";
import type { LaudoData } from "@/types/laudo";

const sampleLaudo: LaudoData = {
  id: "1",
  type: "vistoria_cautelar",
  client: { name: "Cliente Teste", document: "123.456.789-00", address: "Rua A, 1" },
  property: {
    address: "Rua B, 2",
    neighborhood: "Centro",
    city: "Balneário Camboriú",
    state: "SC",
    inspectionDate: "2026-09-14",
    artNumber: "ART-001",
    description: "Casa térrea",
  },
  photos: [],
  conclusion: "Conclusão de teste",
  status: "draft",
  createdAt: "2026-09-14T10:00:00.000Z",
  updatedAt: "2026-09-14T10:00:00.000Z",
};

describe("drawCover", () => {
  it("draws the cover page without throwing and produces non-empty output", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    expect(() => drawCover(doc, sampleLaudo)).not.toThrow();
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(0);
  });
});

describe("drawHeader", () => {
  it("draws the section title band without throwing", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    expect(() => drawHeader(doc, "Identificação do Solicitante", 2)).not.toThrow();
  });
});

describe("drawFooter", () => {
  it("draws the engineer footer line without throwing", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    expect(() => drawFooter(doc)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- cover-header-footer`
Expected: FAIL — none of the modules exist yet.

- [ ] **Step 3: Implement `src/lib/pdf/constants.ts`**

```ts
export const KARRER_BLUE = "#1B3A6B";
export const KARRER_LIGHTBLUE = "#2E5FA3";
export const KARRER_NAVY = "#0D2040";
export const PAGE_WIDTH = 210; // A4, mm
export const PAGE_HEIGHT = 297; // A4, mm
```

- [ ] **Step 4: Implement `src/lib/pdf/sections/cover.ts`**

```ts
import type { jsPDF } from "jspdf";
import type { LaudoData } from "@/types/laudo";
import { LAUDO_TYPE_LABELS } from "@/types/laudo";
import { KARRER_BLUE, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/constants";

const SIDEBAR_WIDTH = 55;

export function drawCover(doc: jsPDF, laudo: LaudoData): void {
  doc.setFillColor(KARRER_BLUE);
  doc.rect(0, 0, SIDEBAR_WIDTH, PAGE_HEIGHT, "F");

  doc.setTextColor("#FFFFFF");
  doc.setFontSize(16);
  doc.text("KARRER SERVIÇOS DE ENGENHARIA", SIDEBAR_WIDTH / 2, PAGE_HEIGHT / 2, {
    angle: 90,
    align: "center",
  });

  doc.setTextColor(KARRER_BLUE);
  doc.setFontSize(20);
  doc.text(LAUDO_TYPE_LABELS[laudo.type], SIDEBAR_WIDTH + 15, 40);

  doc.setFontSize(11);
  doc.setTextColor("#334155");
  let y = 60;
  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, SIDEBAR_WIDTH + 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, SIDEBAR_WIDTH + 15, y + 6);
    y += 16;
  };
  line("Cliente", laudo.client.name);
  line("Imóvel", laudo.property.address);
  line("ART", laudo.property.artNumber);
  line("Data da vistoria", laudo.property.inspectionDate);

  doc.setFillColor(KARRER_BLUE);
  doc.rect(SIDEBAR_WIDTH, PAGE_HEIGHT - 20, PAGE_WIDTH - SIDEBAR_WIDTH, 20, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(9);
  doc.text(
    "Karrer Serviços de Engenharia Ltda — CREA/SC: 199052-0",
    SIDEBAR_WIDTH + 10,
    PAGE_HEIGHT - 10,
  );
}
```

- [ ] **Step 5: Implement `src/lib/pdf/sections/header.ts`**

```ts
import type { jsPDF } from "jspdf";
import { KARRER_BLUE, KARRER_LIGHTBLUE, PAGE_WIDTH } from "@/lib/pdf/constants";

export function drawHeader(doc: jsPDF, sectionTitle: string, pageNumber: number): void {
  doc.setFillColor(KARRER_BLUE);
  doc.rect(0, 0, PAGE_WIDTH, 14, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(10);
  doc.text("Karrer Serviços de Engenharia", 10, 9);
  doc.text(`Página ${pageNumber}`, PAGE_WIDTH - 10, 9, { align: "right" });

  doc.setFillColor(KARRER_LIGHTBLUE);
  doc.rect(0, 14, PAGE_WIDTH, 10, "F");
  doc.setFontSize(11);
  doc.text(sectionTitle, 10, 21);
}
```

- [ ] **Step 6: Implement `src/lib/pdf/sections/footer.ts`**

```ts
import type { jsPDF } from "jspdf";
import { KARRER_BLUE, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/constants";

export function drawFooter(doc: jsPDF): void {
  doc.setDrawColor(KARRER_BLUE);
  doc.setLineWidth(0.5);
  doc.line(10, PAGE_HEIGHT - 15, PAGE_WIDTH - 10, PAGE_HEIGHT - 15);

  doc.setTextColor("#64748B");
  doc.setFontSize(8);
  doc.text(
    "Bernardo Sieverdt Karrer — CREA/SC: 199052-0 — eng.bernardokarrer@hotmail.com",
    10,
    PAGE_HEIGHT - 10,
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run test -- cover-header-footer`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add PDF cover, header, and footer drawing functions"
```

---

## Task 21: PDF multi-page sections — page helper, photo grid, notes box

**Files:**
- Create: `src/lib/pdf/pageHelpers.ts`
- Create: `src/lib/pdf/sections/photos.ts`
- Create: `src/lib/pdf/sections/notes.ts`
- Test: `src/lib/pdf/sections/__tests__/photos-notes.test.ts`

**Interfaces:**
- Consumes: `drawHeader`/`drawFooter` (Task 20), `PhotoItem` (Task 3).
- Produces: `interface PageCursor { pageNumber: number }` and `newPage(doc: jsPDF, sectionTitle: string, cursor: PageCursor): void` from `@/lib/pdf/pageHelpers` (adds a page, bumps `cursor.pageNumber`, draws header+footer — every multi-page section function uses this instead of calling `doc.addPage()` directly); `drawPhotosSection(doc: jsPDF, photos: PhotoItem[], cursor: PageCursor): void` from `@/lib/pdf/sections/photos` (2-column grid, captions `"4.N — legenda"`); `drawNotesSection(doc: jsPDF, notes: string | undefined, cursor: PageCursor): void` from `@/lib/pdf/sections/notes` (no-op when `notes` is empty/undefined). Both consumed by `generateLaudo.ts` (Task 25).

- [ ] **Step 1: Write the failing tests**

`src/lib/pdf/sections/__tests__/photos-notes.test.ts`:
```ts
import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { newPage } from "@/lib/pdf/pageHelpers";
import { drawPhotosSection } from "@/lib/pdf/sections/photos";
import { drawNotesSection } from "@/lib/pdf/sections/notes";
import type { PhotoItem } from "@/types/laudo";

describe("newPage", () => {
  it("adds a page, increments the cursor, and draws header/footer without throwing", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor = { pageNumber: 1 };

    expect(() => newPage(doc, "Conclusão", cursor)).not.toThrow();
    expect(cursor.pageNumber).toBe(2);
    expect(doc.getNumberOfPages()).toBe(2);
  });
});

describe("drawPhotosSection", () => {
  const photos: PhotoItem[] = [
    { id: "1", dataUrl: "data:image/jpeg;base64,FAKE1", caption: "Fachada", order: 1 },
    { id: "2", dataUrl: "data:image/jpeg;base64,FAKE2", caption: "Fundos", order: 2 },
    { id: "3", dataUrl: "data:image/jpeg;base64,FAKE3", caption: "", order: 3 },
  ];

  it("lays out photos 2 per row and numbers captions as 4.N — legenda", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    vi.spyOn(doc, "addImage").mockReturnValue(doc);
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawPhotosSection(doc, photos, cursor);

    expect(doc.addImage).toHaveBeenCalledTimes(3);
    expect(textSpy).toHaveBeenCalledWith("4.1 — Fachada", expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("4.2 — Fundos", expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("4.3 — Sem legenda", expect.any(Number), expect.any(Number));
    expect(cursor.pageNumber).toBe(2);
  });
});

describe("drawNotesSection", () => {
  it("adds a page and draws the notes box when notes are present", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor = { pageNumber: 1 };

    drawNotesSection(doc, "Medição feita com trena a laser.", cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(doc.getNumberOfPages()).toBe(2);
  });

  it("does nothing when notes are empty or undefined", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cursor = { pageNumber: 1 };

    drawNotesSection(doc, "", cursor);
    drawNotesSection(doc, undefined, cursor);

    expect(cursor.pageNumber).toBe(1);
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- photos-notes`
Expected: FAIL — none of the 3 modules exist yet.

- [ ] **Step 3: Implement `src/lib/pdf/pageHelpers.ts`**

```ts
import type { jsPDF } from "jspdf";
import { drawHeader } from "@/lib/pdf/sections/header";
import { drawFooter } from "@/lib/pdf/sections/footer";

export interface PageCursor {
  pageNumber: number;
}

export function newPage(doc: jsPDF, sectionTitle: string, cursor: PageCursor): void {
  doc.addPage();
  cursor.pageNumber += 1;
  drawHeader(doc, sectionTitle, cursor.pageNumber);
  drawFooter(doc);
}
```

- [ ] **Step 4: Implement `src/lib/pdf/sections/photos.ts`**

```ts
import type { jsPDF } from "jspdf";
import type { PhotoItem } from "@/types/laudo";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";

const CONTENT_TOP = 30;
const CONTENT_BOTTOM = 275;
const COL_WIDTH = 90;
const ROW_HEIGHT = 90;
const IMAGE_SIZE = 80;
const LEFT_MARGIN = 15;
const SECTION_NUMBER = 4;

export function drawPhotosSection(doc: jsPDF, photos: PhotoItem[], cursor: PageCursor): void {
  newPage(doc, "Registro Fotográfico", cursor);

  let y = CONTENT_TOP;
  photos.forEach((photo, index) => {
    const col = index % 2;
    const x = LEFT_MARGIN + col * COL_WIDTH;

    if (col === 0 && index > 0 && y + ROW_HEIGHT > CONTENT_BOTTOM) {
      newPage(doc, "Registro Fotográfico", cursor);
      y = CONTENT_TOP;
    }

    doc.addImage(photo.dataUrl, "JPEG", x, y, IMAGE_SIZE, IMAGE_SIZE * 0.75);
    doc.setFontSize(9);
    doc.setTextColor("#334155");
    doc.text(
      `${SECTION_NUMBER}.${photo.order} — ${photo.caption || "Sem legenda"}`,
      x,
      y + IMAGE_SIZE * 0.75 + 5,
    );

    if (col === 1) y += ROW_HEIGHT;
  });
}
```

- [ ] **Step 5: Implement `src/lib/pdf/sections/notes.ts`**

```ts
import type { jsPDF } from "jspdf";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";

export function drawNotesSection(doc: jsPDF, notes: string | undefined, cursor: PageCursor): void {
  if (!notes || notes.trim().length === 0) return;

  newPage(doc, "Notas Técnicas do Engenheiro", cursor);

  const marginX = 15;
  const boxY = 30;
  const boxWidth = 180;
  const lines = doc.splitTextToSize(notes, boxWidth - 12);
  const boxHeight = Math.max(30, lines.length * 6 + 12);

  doc.setFillColor("#F8FAFC");
  doc.rect(marginX, boxY, boxWidth, boxHeight, "F");
  doc.setDrawColor("#1B3A6B");
  doc.setLineWidth(1.2); // ~4px border-left, converted to mm at 96dpi
  doc.line(marginX, boxY, marginX, boxY + boxHeight);

  doc.setTextColor("#334155");
  doc.setFontSize(10);
  doc.text(lines, marginX + 8, boxY + 10);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- photos-notes`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add PDF page helper, photo grid section, and notes box section"
```

---

## Task 22: PDF identification and conclusion sections

**Files:**
- Modify: `src/lib/pdf/pageHelpers.ts` (add `drawFieldList` shared helper)
- Create: `src/lib/pdf/sections/client.ts`
- Create: `src/lib/pdf/sections/property.ts`
- Create: `src/lib/pdf/sections/conclusion.ts`
- Test: `src/lib/pdf/sections/__tests__/client-property-conclusion.test.ts`

**Interfaces:**
- Consumes: `newPage`/`PageCursor` (Task 21), `ClientData`/`PropertyData` (Task 3).
- Produces: `drawFieldList(doc: jsPDF, fields: { label: string; value: string }[], startY: number): number` (returns the Y position after the last field) from `@/lib/pdf/pageHelpers`; `drawClientSection(doc, client: ClientData, cursor: PageCursor): void` from `@/lib/pdf/sections/client`; `drawPropertySection(doc, property: PropertyData, cursor: PageCursor): void` from `@/lib/pdf/sections/property`; `drawConclusionSection(doc, conclusion: string, cursor: PageCursor): void` from `@/lib/pdf/sections/conclusion` — all consumed by `generateLaudo.ts` (Task 25).

- [ ] **Step 1: Write the failing tests**

`src/lib/pdf/sections/__tests__/client-property-conclusion.test.ts`:
```ts
import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { drawClientSection } from "@/lib/pdf/sections/client";
import { drawPropertySection } from "@/lib/pdf/sections/property";
import { drawConclusionSection } from "@/lib/pdf/sections/conclusion";
import type { ClientData, PropertyData } from "@/types/laudo";

const client: ClientData = {
  name: "Maria Souza",
  document: "123.456.789-00",
  address: "Rua A, 1",
  email: "maria@ex.com",
};
const property: PropertyData = {
  address: "Rua B, 2",
  neighborhood: "Centro",
  city: "Balneário Camboriú",
  state: "SC",
  inspectionDate: "2026-09-14",
  artNumber: "ART-001",
  description: "Casa térrea de alvenaria.",
};

describe("drawClientSection", () => {
  it("adds a page and writes the client's fields", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawClientSection(doc, client, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith("Maria Souza", expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("123.456.789-00", expect.any(Number), expect.any(Number));
  });
});

describe("drawPropertySection", () => {
  it("adds a page and writes the property's fields and description", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawPropertySection(doc, property, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith("ART-001", expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("Balneário Camboriú/SC", expect.any(Number), expect.any(Number));
  });
});

describe("drawConclusionSection", () => {
  it("adds a page and writes the conclusion text", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawConclusionSection(doc, "Não foram identificados riscos.", cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith(
      expect.arrayContaining(["Não foram identificados riscos."]),
      expect.any(Number),
      expect.any(Number),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- client-property-conclusion`
Expected: FAIL — none of the 3 section modules exist yet.

- [ ] **Step 3: Add `drawFieldList` to `src/lib/pdf/pageHelpers.ts`**

Append to `src/lib/pdf/pageHelpers.ts`:
```ts
export function drawFieldList(
  doc: jsPDF,
  fields: { label: string; value: string }[],
  startY: number,
): number {
  let y = startY;
  fields.forEach(({ label, value }) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "—", 70, y);
    y += 8;
  });
  return y;
}
```

- [ ] **Step 4: Implement `src/lib/pdf/sections/client.ts`**

```ts
import type { jsPDF } from "jspdf";
import type { ClientData } from "@/types/laudo";
import { newPage, drawFieldList, type PageCursor } from "@/lib/pdf/pageHelpers";

export function drawClientSection(doc: jsPDF, client: ClientData, cursor: PageCursor): void {
  newPage(doc, "Identificação do Solicitante", cursor);
  drawFieldList(
    doc,
    [
      { label: "Nome / Razão Social", value: client.name },
      { label: "CPF/CNPJ", value: client.document },
      { label: "Endereço", value: client.address },
      { label: "Email", value: client.email ?? "" },
    ],
    35,
  );
}
```

- [ ] **Step 5: Implement `src/lib/pdf/sections/property.ts`**

```ts
import type { jsPDF } from "jspdf";
import type { PropertyData } from "@/types/laudo";
import { newPage, drawFieldList, type PageCursor } from "@/lib/pdf/pageHelpers";

export function drawPropertySection(doc: jsPDF, property: PropertyData, cursor: PageCursor): void {
  newPage(doc, "Identificação do Imóvel", cursor);
  const y = drawFieldList(
    doc,
    [
      { label: "Endereço", value: property.address },
      { label: "Bairro", value: property.neighborhood },
      { label: "Cidade/UF", value: `${property.city}/${property.state}` },
      { label: "Data da vistoria", value: property.inspectionDate },
      { label: "Número ART", value: property.artNumber },
    ],
    35,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Descrição do imóvel", 15, y + 4);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(property.description || "—", 180);
  doc.text(lines, 15, y + 12);
}
```

- [ ] **Step 6: Implement `src/lib/pdf/sections/conclusion.ts`**

```ts
import type { jsPDF } from "jspdf";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";

export function drawConclusionSection(doc: jsPDF, conclusion: string, cursor: PageCursor): void {
  newPage(doc, "Conclusão", cursor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#1E293B");
  const lines = doc.splitTextToSize(conclusion, 180);
  doc.text(lines, 15, 35);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run test -- client-property-conclusion`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add PDF client, property, and conclusion sections"
```

---

## Task 23: PDF list sections — instruments, glossary, references

**Files:**
- Modify: `src/lib/pdf/pageHelpers.ts` (add `drawBulletList` and `drawTermList` shared, paginating helpers)
- Create: `src/lib/pdf/sections/instruments.ts`
- Create: `src/lib/pdf/sections/glossary.ts`
- Create: `src/lib/pdf/sections/references.ts`
- Test: `src/lib/pdf/sections/__tests__/instruments-glossary-references.test.ts`

**Interfaces:**
- Consumes: `INSTRUMENTS`/`GLOSSARY`/`REFERENCES` from `@/lib/pdf/content/*` (Task 19), `newPage`/`PageCursor` (Task 21).
- Produces: `drawBulletList(doc: jsPDF, cursor: PageCursor, sectionTitle: string, items: string[]): void` and `drawTermList(doc: jsPDF, cursor: PageCursor, sectionTitle: string, terms: { term: string; definition: string }[]): void` from `@/lib/pdf/pageHelpers` (both paginate automatically when content overflows the page); `drawInstrumentsSection(doc, cursor)`, `drawGlossarySection(doc, cursor)`, `drawReferencesSection(doc, cursor)` from `@/lib/pdf/sections/instruments`, `glossary`, `references` respectively — all consumed by `generateLaudo.ts` (Task 25).

- [ ] **Step 1: Write the failing tests**

`src/lib/pdf/sections/__tests__/instruments-glossary-references.test.ts`:
```ts
import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { drawInstrumentsSection } from "@/lib/pdf/sections/instruments";
import { drawGlossarySection } from "@/lib/pdf/sections/glossary";
import { drawReferencesSection } from "@/lib/pdf/sections/references";
import { GLOSSARY } from "@/lib/pdf/content/glossary";

describe("drawInstrumentsSection", () => {
  it("adds a page and lists all instruments as bullets", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawInstrumentsSection(doc, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith(
      expect.arrayContaining(["• Fissurômetro"]),
      expect.any(Number),
      expect.any(Number),
    );
  });
});

describe("drawReferencesSection", () => {
  it("adds a page and lists all references as bullets", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawReferencesSection(doc, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith(
      expect.arrayContaining(["• ABNT NBR 6118"]),
      expect.any(Number),
      expect.any(Number),
    );
  });
});

describe("drawGlossarySection", () => {
  it("paginates across the full 63-term glossary and writes the first and last terms", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawGlossarySection(doc, cursor);

    expect(cursor.pageNumber).toBeGreaterThan(2); // 63 long definitions overflow more than one page
    expect(textSpy).toHaveBeenCalledWith(GLOSSARY[0].term, expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith(
      GLOSSARY[GLOSSARY.length - 1].term,
      expect.any(Number),
      expect.any(Number),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- instruments-glossary-references`
Expected: FAIL — none of the 3 section modules exist yet.

- [ ] **Step 3: Add `drawBulletList` and `drawTermList` to `src/lib/pdf/pageHelpers.ts`**

Append to `src/lib/pdf/pageHelpers.ts`:
```ts
export function drawBulletList(
  doc: jsPDF,
  cursor: PageCursor,
  sectionTitle: string,
  items: string[],
): void {
  newPage(doc, sectionTitle, cursor);
  let y = 30;
  doc.setFontSize(10);
  doc.setTextColor("#334155");
  items.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, 180);
    if (y + lines.length * 6 > 275) {
      newPage(doc, sectionTitle, cursor);
      y = 30;
    }
    doc.text(lines, 15, y);
    y += lines.length * 6 + 2;
  });
}

export function drawTermList(
  doc: jsPDF,
  cursor: PageCursor,
  sectionTitle: string,
  terms: { term: string; definition: string }[],
): void {
  newPage(doc, sectionTitle, cursor);
  let y = 30;
  terms.forEach(({ term, definition }) => {
    const defLines = doc.splitTextToSize(definition, 180);
    const blockHeight = 6 + defLines.length * 5 + 4;
    if (y + blockHeight > 275) {
      newPage(doc, sectionTitle, cursor);
      y = 30;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(term, 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(defLines, 15, y);
    y += defLines.length * 5 + 4;
  });
}
```

- [ ] **Step 4: Implement `src/lib/pdf/sections/instruments.ts`**

```ts
import type { jsPDF } from "jspdf";
import { drawBulletList, type PageCursor } from "@/lib/pdf/pageHelpers";
import { INSTRUMENTS } from "@/lib/pdf/content/instruments";

export function drawInstrumentsSection(doc: jsPDF, cursor: PageCursor): void {
  drawBulletList(doc, cursor, "Instrumentos Utilizados", INSTRUMENTS);
}
```

- [ ] **Step 5: Implement `src/lib/pdf/sections/glossary.ts`**

```ts
import type { jsPDF } from "jspdf";
import { drawTermList, type PageCursor } from "@/lib/pdf/pageHelpers";
import { GLOSSARY } from "@/lib/pdf/content/glossary";

export function drawGlossarySection(doc: jsPDF, cursor: PageCursor): void {
  drawTermList(doc, cursor, "Glossário de Patologias", GLOSSARY);
}
```

- [ ] **Step 6: Implement `src/lib/pdf/sections/references.ts`**

```ts
import type { jsPDF } from "jspdf";
import { drawBulletList, type PageCursor } from "@/lib/pdf/pageHelpers";
import { REFERENCES } from "@/lib/pdf/content/references";

export function drawReferencesSection(doc: jsPDF, cursor: PageCursor): void {
  drawBulletList(doc, cursor, "Referências", REFERENCES);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run test -- instruments-glossary-references`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add PDF instruments, glossary, and references list sections"
```

---

## Task 24: PDF summary (TOC) and signatures sections

**Files:**
- Modify: `src/lib/pdf/pageHelpers.ts` (extract `drawChrome` out of `newPage`, so the summary page — pre-reserved blank by the orchestrator — can have header/footer drawn without adding a new page)
- Create: `src/lib/pdf/sections/summary.ts`
- Create: `src/lib/pdf/sections/signatures.ts`
- Test: `src/lib/pdf/sections/__tests__/summary-signatures.test.ts`

**Interfaces:**
- Consumes: `drawHeader`/`drawFooter` (Task 20), `newPage`/`PageCursor` (Task 21), `LaudoData` (Task 3).
- Produces: `drawChrome(doc: jsPDF, sectionTitle: string, pageNumber: number): void` from `@/lib/pdf/pageHelpers` (draws header+footer on the **current** page — `newPage` now calls `doc.addPage()` then `drawChrome`, same external behavior as before); `interface SummaryEntry { title: string; page: number }` and `drawSummarySection(doc: jsPDF, entries: SummaryEntry[], pageNumber: number): void` from `@/lib/pdf/sections/summary` (draws on the current page — the orchestrator, Task 25, must `doc.setPage(2)` before calling it, since the summary's final page numbers aren't known until every other section has been drawn); `drawSignaturesSection(doc: jsPDF, laudo: LaudoData, cursor: PageCursor): void` from `@/lib/pdf/sections/signatures`.

- [ ] **Step 1: Write the failing tests**

`src/lib/pdf/sections/__tests__/summary-signatures.test.ts`:
```ts
import { jsPDF } from "jspdf";
import { vi } from "vitest";
import { drawSummarySection } from "@/lib/pdf/sections/summary";
import { drawSignaturesSection } from "@/lib/pdf/sections/signatures";
import type { LaudoData } from "@/types/laudo";

describe("drawSummarySection", () => {
  it("draws each entry's title and page number without adding a new page", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const pagesBefore = doc.getNumberOfPages();

    drawSummarySection(
      doc,
      [
        { title: "Identificação do Solicitante", page: 3 },
        { title: "Conclusão", page: 12 },
      ],
      1,
    );

    expect(doc.getNumberOfPages()).toBe(pagesBefore);
    expect(textSpy).toHaveBeenCalledWith(
      "Identificação do Solicitante",
      expect.any(Number),
      expect.any(Number),
    );
    expect(textSpy).toHaveBeenCalledWith("12", expect.any(Number), expect.any(Number), {
      align: "right",
    });
  });
});

const sampleLaudo: LaudoData = {
  id: "1",
  type: "vistoria_cautelar",
  client: { name: "Maria Souza", document: "", address: "" },
  property: {
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    inspectionDate: "",
    artNumber: "",
    description: "",
  },
  photos: [],
  conclusion: "",
  status: "draft",
  createdAt: "",
  updatedAt: "",
};

describe("drawSignaturesSection", () => {
  it("adds a page and draws both signature lines with names", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const textSpy = vi.spyOn(doc, "text");
    const cursor = { pageNumber: 1 };

    drawSignaturesSection(doc, sampleLaudo, cursor);

    expect(cursor.pageNumber).toBe(2);
    expect(textSpy).toHaveBeenCalledWith("Maria Souza", expect.any(Number), expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith(
      "Bernardo Sieverdt Karrer",
      expect.any(Number),
      expect.any(Number),
    );
    expect(textSpy).toHaveBeenCalledWith("CREA/SC: 199052-0", expect.any(Number), expect.any(Number));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- summary-signatures`
Expected: FAIL — neither module exists yet.

- [ ] **Step 3: Extract `drawChrome` in `src/lib/pdf/pageHelpers.ts`**

Replace the existing `newPage` function in `src/lib/pdf/pageHelpers.ts` with:
```ts
export function drawChrome(doc: jsPDF, sectionTitle: string, pageNumber: number): void {
  drawHeader(doc, sectionTitle, pageNumber);
  drawFooter(doc);
}

export function newPage(doc: jsPDF, sectionTitle: string, cursor: PageCursor): void {
  doc.addPage();
  cursor.pageNumber += 1;
  drawChrome(doc, sectionTitle, cursor.pageNumber);
}
```
(Keep the rest of the file — `PageCursor`, `drawFieldList`, `drawBulletList`, `drawTermList` — unchanged.)

Run: `npm run test -- photos-notes client-property-conclusion instruments-glossary-references`
Expected: PASS — confirms the refactor didn't change `newPage`'s external behavior.

- [ ] **Step 4: Implement `src/lib/pdf/sections/summary.ts`**

```ts
import type { jsPDF } from "jspdf";
import { drawChrome } from "@/lib/pdf/pageHelpers";

export interface SummaryEntry {
  title: string;
  page: number;
}

export function drawSummarySection(doc: jsPDF, entries: SummaryEntry[], pageNumber: number): void {
  drawChrome(doc, "Sumário", pageNumber);
  let y = 30;
  doc.setFontSize(11);
  doc.setTextColor("#1E293B");
  entries.forEach(({ title, page }) => {
    doc.text(title, 15, y);
    doc.text(String(page), 195, y, { align: "right" });
    y += 8;
  });
}
```

- [ ] **Step 5: Implement `src/lib/pdf/sections/signatures.ts`**

```ts
import type { jsPDF } from "jspdf";
import type { LaudoData } from "@/types/laudo";
import { newPage, type PageCursor } from "@/lib/pdf/pageHelpers";

export function drawSignaturesSection(doc: jsPDF, laudo: LaudoData, cursor: PageCursor): void {
  newPage(doc, "Assinaturas", cursor);

  const lineY = 120;
  doc.setDrawColor("#334155");
  doc.setLineWidth(0.3);

  doc.line(20, lineY, 90, lineY);
  doc.setFontSize(10);
  doc.text(laudo.client.name || "Contratante", 20, lineY + 6);
  doc.text("Contratante", 20, lineY + 11);

  doc.line(110, lineY, 180, lineY);
  doc.text("Bernardo Sieverdt Karrer", 110, lineY + 6);
  doc.text("CREA/SC: 199052-0", 110, lineY + 11);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- summary-signatures`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add PDF summary (TOC) and signatures sections"
```

---

## Task 25: generateLaudo.ts — full PDF orchestration

**Files:**
- Create: `src/lib/pdf/generateLaudo.ts`
- Test: `src/lib/pdf/__tests__/generateLaudo.test.ts`

**Interfaces:**
- Consumes: every `draw*Section` function from Tasks 20–24, `LaudoData` (Task 3).
- Produces: `generateLaudoPdf(laudo: LaudoData): jsPDF` and `downloadLaudoPdf(laudo: LaudoData): void` from `@/lib/pdf/generateLaudo` — consumed by `StepReview` (Task 26) and `LaudoDetail` (Task 30).

Two-pass page numbering: page 1 is the cover, page 2 is reserved blank for the summary. Every other section is drawn in spec order (2→10), and each section's **starting** page number is recorded as it's drawn. Only once every section has been drawn — so every page count is final — does the orchestrator jump back with `doc.setPage(2)` and draw the summary using the recorded numbers. This avoids a wasteful full second render pass.

- [ ] **Step 1: Write the failing tests**

`src/lib/pdf/__tests__/generateLaudo.test.ts`:
```ts
import { jsPDF } from "jspdf";
import { vi, beforeEach } from "vitest";
import { generateLaudoPdf, downloadLaudoPdf } from "@/lib/pdf/generateLaudo";
import type { LaudoData } from "@/types/laudo";

const sampleLaudo: LaudoData = {
  id: "1",
  type: "vistoria_cautelar",
  client: { name: "Maria Souza", document: "123.456.789-00", address: "Rua A, 1" },
  property: {
    address: "Rua B, 2",
    neighborhood: "Centro",
    city: "Balneário Camboriú",
    state: "SC",
    inspectionDate: "2026-09-14",
    artNumber: "ART-001",
    description: "Casa térrea.",
  },
  photos: [
    { id: "p1", dataUrl: "data:image/jpeg;base64,FAKE1", caption: "Fachada", order: 1 },
    { id: "p2", dataUrl: "data:image/jpeg;base64,FAKE2", caption: "Fundos", order: 2 },
  ],
  conclusion: "Nenhum risco identificado.",
  notes: "Medição feita com trena a laser.",
  status: "completed",
  createdAt: "2026-09-14T10:00:00.000Z",
  updatedAt: "2026-09-14T10:00:00.000Z",
};

describe("generateLaudoPdf", () => {
  beforeEach(() => {
    vi.spyOn(jsPDF.prototype, "addImage").mockReturnValue({} as jsPDF);
  });

  it("assembles a multi-page PDF (cover + summary + every section, glossary alone spans several pages)", () => {
    const doc = generateLaudoPdf(sampleLaudo);
    expect(doc.getNumberOfPages()).toBeGreaterThan(10);
  });

  it("lists every fixed section in the summary, including Notas Técnicas when notes are present", () => {
    const textSpy = vi.spyOn(jsPDF.prototype, "text");
    generateLaudoPdf(sampleLaudo);

    // x=15 is unique to drawSummarySection's title column (the per-section
    // header band draws its title at x=10), so this only matches the TOC line.
    [
      "Identificação do Solicitante",
      "Identificação do Imóvel",
      "Registro Fotográfico",
      "Notas Técnicas do Engenheiro",
      "Instrumentos Utilizados",
      "Glossário de Patologias",
      "Conclusão",
      "Referências",
      "Assinaturas",
    ].forEach((title) => {
      expect(textSpy).toHaveBeenCalledWith(title, 15, expect.any(Number));
    });
  });

  it("omits Notas Técnicas entirely (header band and summary) when notes are empty", () => {
    const textSpy = vi.spyOn(jsPDF.prototype, "text");
    generateLaudoPdf({ ...sampleLaudo, notes: "" });

    const notesCalls = textSpy.mock.calls.filter(([arg]) => arg === "Notas Técnicas do Engenheiro");
    expect(notesCalls).toHaveLength(0);
  });
});

describe("downloadLaudoPdf", () => {
  it("calls doc.save with a filesystem-safe filename derived from the property address", () => {
    const saveSpy = vi.spyOn(jsPDF.prototype, "save").mockImplementation(() => {});
    vi.spyOn(jsPDF.prototype, "addImage").mockReturnValue({} as jsPDF);

    downloadLaudoPdf(sampleLaudo);

    expect(saveSpy).toHaveBeenCalledWith("laudo-Rua_B_2.pdf");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- generateLaudo`
Expected: FAIL — `Cannot find module '@/lib/pdf/generateLaudo'`.

- [ ] **Step 3: Implement `src/lib/pdf/generateLaudo.ts`**

```ts
import { jsPDF } from "jspdf";
import type { LaudoData } from "@/types/laudo";
import type { PageCursor } from "@/lib/pdf/pageHelpers";
import { drawCover } from "@/lib/pdf/sections/cover";
import { drawClientSection } from "@/lib/pdf/sections/client";
import { drawPropertySection } from "@/lib/pdf/sections/property";
import { drawPhotosSection } from "@/lib/pdf/sections/photos";
import { drawNotesSection } from "@/lib/pdf/sections/notes";
import { drawInstrumentsSection } from "@/lib/pdf/sections/instruments";
import { drawGlossarySection } from "@/lib/pdf/sections/glossary";
import { drawConclusionSection } from "@/lib/pdf/sections/conclusion";
import { drawReferencesSection } from "@/lib/pdf/sections/references";
import { drawSignaturesSection } from "@/lib/pdf/sections/signatures";
import { drawSummarySection, type SummaryEntry } from "@/lib/pdf/sections/summary";

export function generateLaudoPdf(laudo: LaudoData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cursor: PageCursor = { pageNumber: 1 };

  drawCover(doc, laudo);

  doc.addPage(); // page 2, reserved blank for the summary
  cursor.pageNumber = 2;

  const entries: SummaryEntry[] = [];
  const track = (title: string, draw: () => void) => {
    const startPage = cursor.pageNumber + 1; // the section's own newPage() bumps first
    draw();
    entries.push({ title, page: startPage });
  };

  track("Identificação do Solicitante", () => drawClientSection(doc, laudo.client, cursor));
  track("Identificação do Imóvel", () => drawPropertySection(doc, laudo.property, cursor));
  track("Registro Fotográfico", () => drawPhotosSection(doc, laudo.photos, cursor));

  if (laudo.notes && laudo.notes.trim().length > 0) {
    track("Notas Técnicas do Engenheiro", () => drawNotesSection(doc, laudo.notes, cursor));
  }

  track("Instrumentos Utilizados", () => drawInstrumentsSection(doc, cursor));
  track("Glossário de Patologias", () => drawGlossarySection(doc, cursor));
  track("Conclusão", () => drawConclusionSection(doc, laudo.conclusion, cursor));
  track("Referências", () => drawReferencesSection(doc, cursor));
  track("Assinaturas", () => drawSignaturesSection(doc, laudo, cursor));

  doc.setPage(2);
  drawSummarySection(doc, entries, 2);
  doc.setPage(doc.getNumberOfPages());

  return doc;
}

export function downloadLaudoPdf(laudo: LaudoData): void {
  const doc = generateLaudoPdf(laudo);
  const safeName = `laudo-${laudo.property.address || laudo.id}.pdf`.replace(/[^\w.-]+/g, "_");
  doc.save(safeName);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- generateLaudo`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS — every test written in Tasks 1–25 still passes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: assemble full PDF generation pipeline with two-pass summary numbering"
```

---

## Task 26: StepReview (passo 6)

**Files:**
- Modify: `src/pages/steps/StepReview.tsx` (replace placeholder from Task 13)
- Test: `src/pages/steps/__tests__/StepReview.test.tsx`

**Interfaces:**
- Consumes: `Badge`/`Button` (Task 2), `ShimmerButton` (Task 10), `downloadLaudoPdf` (Task 25), `LAUDO_TYPE_LABELS`/`LaudoData` (Task 3).
- Produces: `StepReview({ laudo, saveError, onBack, onSaveDraft, onComplete })` matching the Task 13 signature exactly. "Gerar PDF" calls `onComplete()`; only calls `downloadLaudoPdf` when it returns `true` (a `false` means `saveDraft`-style persistence failed — e.g. `StorageQuotaError` — and `saveError` is already populated for display).

- [ ] **Step 1: Write the failing tests**

`src/pages/steps/__tests__/StepReview.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { StepReview } from "@/pages/steps/StepReview";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { LaudoData } from "@/types/laudo";

const laudo: LaudoData = {
  id: "1",
  type: "laudo_tecnico",
  client: { name: "Maria Souza", document: "123.456.789-00", address: "Rua A, 1" },
  property: {
    address: "Rua B, 2",
    neighborhood: "Centro",
    city: "BC",
    state: "SC",
    inspectionDate: "2026-09-14",
    artNumber: "ART-001",
    description: "",
  },
  photos: [{ id: "p1", dataUrl: "data:1", caption: "", order: 1 }],
  conclusion: "Tudo certo.",
  status: "draft",
  createdAt: "",
  updatedAt: "",
};

describe("StepReview", () => {
  it("renders a summary of each section", () => {
    render(
      <StepReview laudo={laudo} saveError={null} onBack={vi.fn()} onSaveDraft={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.getByText("Laudo Técnico")).toBeInTheDocument();
    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    expect(screen.getByText("1 foto(s) anexada(s)")).toBeInTheDocument();
    expect(screen.getByText("Tudo certo.")).toBeInTheDocument();
  });

  it("calls onSaveDraft when clicking Salvar rascunho", () => {
    const onSaveDraft = vi.fn();
    render(
      <StepReview laudo={laudo} saveError={null} onBack={vi.fn()} onSaveDraft={onSaveDraft} onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /salvar rascunho/i }));
    expect(onSaveDraft).toHaveBeenCalled();
  });

  it("completes and downloads the PDF when clicking Gerar PDF and completion succeeds", () => {
    const onComplete = vi.fn().mockReturnValue(true);
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    render(
      <StepReview laudo={laudo} saveError={null} onBack={vi.fn()} onSaveDraft={vi.fn()} onComplete={onComplete} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /gerar pdf/i }));

    expect(onComplete).toHaveBeenCalled();
    expect(downloadSpy).toHaveBeenCalledWith(laudo);
  });

  it("does not download when completion fails (e.g. storage quota)", () => {
    const onComplete = vi.fn().mockReturnValue(false);
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    render(
      <StepReview
        laudo={laudo}
        saveError="Espaço cheio."
        onBack={vi.fn()}
        onSaveDraft={vi.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /gerar pdf/i }));

    expect(downloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Espaço cheio.")).toBeInTheDocument();
  });

  it("calls onBack when clicking Voltar", () => {
    const onBack = vi.fn();
    render(
      <StepReview laudo={laudo} saveError={null} onBack={onBack} onSaveDraft={vi.fn()} onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- StepReview`
Expected: FAIL — placeholder has no summary/buttons.

- [ ] **Step 3: Implement `StepReview`**

`src/pages/steps/StepReview.tsx`:
```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { LAUDO_TYPE_LABELS, type LaudoData } from "@/types/laudo";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";

export interface StepReviewProps {
  laudo: LaudoData;
  saveError: string | null;
  onBack: () => void;
  onSaveDraft: () => void;
  onComplete: () => boolean;
}

export function StepReview({ laudo, saveError, onBack, onSaveDraft, onComplete }: StepReviewProps) {
  function handleGeneratePdf() {
    const success = onComplete();
    if (success) {
      downloadLaudoPdf(laudo);
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-karrer-navy">Revisão</h2>

      <div className="mb-6 space-y-3">
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Tipo</h3>
          <Badge className="bg-karrer-blue">{LAUDO_TYPE_LABELS[laudo.type]}</Badge>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Cliente</h3>
          <p className="text-sm text-slate-600">{laudo.client.name || "—"}</p>
          <p className="text-sm text-slate-500">{laudo.client.document}</p>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Imóvel</h3>
          <p className="text-sm text-slate-600">{laudo.property.address || "—"}</p>
          <p className="text-sm text-slate-500">ART {laudo.property.artNumber}</p>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Fotos</h3>
          <p className="text-sm text-slate-600">{laudo.photos.length} foto(s) anexada(s)</p>
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Conclusão</h3>
          <p className="text-sm text-slate-600">{laudo.conclusion || "—"}</p>
        </section>
      </div>

      {saveError && <p className="mb-4 text-sm text-red-600">{saveError}</p>}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onSaveDraft}>
            Salvar rascunho
          </Button>
          <ShimmerButton onClick={handleGeneratePdf} background="#1B3A6B">
            Gerar PDF
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- StepReview`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement StepReview with summary cards and PDF generation"
```

---

## Task 27: Dashboard — stats, recent laudos, empty state

**Files:**
- Create: `src/components/laudo/LaudoListItem.tsx` (shared row component — reused by `LaudoList`, Task 29)
- Modify: `src/pages/Dashboard.tsx` (replace placeholder from Task 5)
- Test: `src/pages/__tests__/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `AnimatedCard` (Task 11), `SparklesText` (Task 10), `getLaudos`/`deleteLaudo` (Task 8), `downloadLaudoPdf` (Task 25), `Dialog`/`Badge`/`Button` (Task 2).
- Produces: `LaudoListItem({ laudo: LaudoData; onDelete: (id: string) => void })` from `@/components/laudo/LaudoListItem` — a row with view/download/delete actions and a delete-confirmation dialog, reused as-is by `LaudoList` (Task 29). Default export `Dashboard`.

**Scope decision** (not spelled out in the spec, resolved here to fit the two separate sidebar items): `Dashboard` shows the 4 stat cards plus up to 5 most-recently-updated laudos, no search. `LaudoList` ("Meus Laudos", Task 29) shows the full list with real-time search. Both share `LaudoListItem` for consistent row rendering.

- [ ] **Step 1: Write the failing tests**

`src/pages/__tests__/Dashboard.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Dashboard from "@/pages/Dashboard";
import { saveLaudo } from "@/lib/storage";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { LaudoData } from "@/types/laudo";

function makeLaudo(overrides: Partial<LaudoData> = {}): LaudoData {
  return {
    id: crypto.randomUUID(),
    type: "vistoria_cautelar",
    client: { name: "Cliente 1", document: "", address: "" },
    property: {
      address: "Rua X",
      neighborhood: "",
      city: "",
      state: "",
      inspectionDate: "",
      artNumber: "",
      description: "",
    },
    photos: [],
    conclusion: "",
    status: "draft",
    createdAt: "2026-09-14T10:00:00.000Z",
    updatedAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("Dashboard", () => {
  beforeEach(() => localStorage.clear());

  it("shows the empty state when there are no laudos", () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });

  it("shows correct stat counts and the recent laudo list", () => {
    saveLaudo(makeLaudo({ id: "1", status: "completed" }));
    saveLaudo(makeLaudo({ id: "2", status: "draft" }));
    saveLaudo(makeLaudo({ id: "3", status: "draft" }));

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(screen.getByTestId("stat-total")).toHaveTextContent("3");
    expect(screen.getByTestId("stat-completed")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-drafts")).toHaveTextContent("2");
    expect(screen.getAllByText("Cliente 1")).toHaveLength(3);
  });

  it("downloads the PDF when clicking the download action", () => {
    saveLaudo(makeLaudo({ id: "1" }));
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));
    expect(downloadSpy).toHaveBeenCalled();
  });

  it("deletes a laudo after confirming the dialog", () => {
    saveLaudo(makeLaudo({ id: "1" }));
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /excluir laudo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- Dashboard`
Expected: FAIL — placeholder has none of this.

- [ ] **Step 3: Implement `LaudoListItem`**

`src/components/laudo/LaudoListItem.tsx`:
```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LAUDO_TYPE_LABELS, type LaudoData } from "@/types/laudo";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";

export interface LaudoListItemProps {
  laudo: LaudoData;
  onDelete: (id: string) => void;
}

export function LaudoListItem({ laudo, onDelete }: LaudoListItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div>
        <p className="font-medium text-slate-800">{laudo.client.name || "Sem nome"}</p>
        <p className="text-sm text-slate-500">
          {LAUDO_TYPE_LABELS[laudo.type]} — {laudo.property.address || "Sem endereço"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Badge className={laudo.status === "completed" ? "bg-green-600" : "bg-amber-500"}>
          {laudo.status === "completed" ? "Concluído" : "Rascunho"}
        </Badge>

        <Link
          to={`/laudos/${laudo.id}`}
          aria-label="Ver laudo"
          className="text-slate-400 hover:text-karrer-blue"
        >
          <Eye size={18} />
        </Link>
        <button
          type="button"
          aria-label="Baixar PDF"
          onClick={() => downloadLaudoPdf(laudo)}
          className="text-slate-400 hover:text-karrer-blue"
        >
          <Download size={18} />
        </button>
        <button
          type="button"
          aria-label="Excluir laudo"
          onClick={() => setConfirmOpen(true)}
          className="text-slate-400 hover:text-red-600"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir laudo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onDelete(laudo.id);
                setConfirmOpen(false);
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Implement `Dashboard`**

`src/pages/Dashboard.tsx`:
```tsx
import { useEffect, useState } from "react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { SparklesText } from "@/components/ui/sparkles-text";
import { LaudoListItem } from "@/components/laudo/LaudoListItem";
import { getLaudos, deleteLaudo } from "@/lib/storage";
import type { LaudoData } from "@/types/laudo";

export default function Dashboard() {
  const [laudos, setLaudos] = useState<LaudoData[]>([]);

  useEffect(() => {
    setLaudos(getLaudos());
  }, []);

  function handleDelete(id: string) {
    deleteLaudo(id);
    setLaudos(getLaudos());
  }

  const total = laudos.length;
  const completed = laudos.filter((l) => l.status === "completed").length;
  const drafts = laudos.filter((l) => l.status === "draft").length;
  const lastGenerated = laudos
    .filter((l) => l.status === "completed")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const recent = [...laudos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-karrer-navy">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AnimatedCard>
          <p className="text-sm text-slate-500">Total</p>
          <p data-testid="stat-total" className="text-2xl font-semibold text-karrer-navy">
            {total}
          </p>
        </AnimatedCard>
        <AnimatedCard>
          <p className="text-sm text-slate-500">Concluídos</p>
          <p data-testid="stat-completed" className="text-2xl font-semibold text-karrer-navy">
            {completed}
          </p>
        </AnimatedCard>
        <AnimatedCard>
          <p className="text-sm text-slate-500">Rascunhos</p>
          <p data-testid="stat-drafts" className="text-2xl font-semibold text-karrer-navy">
            {drafts}
          </p>
        </AnimatedCard>
        <AnimatedCard>
          <p className="text-sm text-slate-500">Último gerado</p>
          <p data-testid="stat-last" className="text-sm font-medium text-karrer-navy">
            {lastGenerated ? new Date(lastGenerated.updatedAt).toLocaleDateString("pt-BR") : "—"}
          </p>
        </AnimatedCard>
      </div>

      {laudos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center">
          <SparklesText className="text-lg text-karrer-navy">Crie seu primeiro laudo</SparklesText>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((laudo) => (
            <LaudoListItem key={laudo.id} laudo={laudo} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- Dashboard`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: implement Dashboard with stats, recent laudos, and shared LaudoListItem"
```

---

## Task 28: LaudoList — full searchable list ("Meus Laudos")

**Files:**
- Modify: `src/pages/LaudoList.tsx` (replace placeholder from Task 5)
- Test: `src/pages/__tests__/LaudoList.test.tsx`

**Interfaces:**
- Consumes: `LaudoListItem` (Task 27), `Input` (Task 2), `SparklesText` (Task 10), `getLaudos`/`deleteLaudo` (Task 8), `LAUDO_TYPE_LABELS` (Task 3).
- Produces: default export `LaudoList`.

- [ ] **Step 1: Write the failing tests**

`src/pages/__tests__/LaudoList.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LaudoList from "@/pages/LaudoList";
import { saveLaudo } from "@/lib/storage";
import type { LaudoData } from "@/types/laudo";

function makeLaudo(overrides: Partial<LaudoData> = {}): LaudoData {
  return {
    id: crypto.randomUUID(),
    type: "vistoria_cautelar",
    client: { name: "João Pereira", document: "", address: "" },
    property: {
      address: "Rua das Flores, 10",
      neighborhood: "",
      city: "",
      state: "",
      inspectionDate: "",
      artNumber: "",
      description: "",
    },
    photos: [],
    conclusion: "",
    status: "draft",
    createdAt: "2026-09-14T10:00:00.000Z",
    updatedAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("LaudoList", () => {
  beforeEach(() => localStorage.clear());

  it("shows the empty state when there are no laudos", () => {
    render(<MemoryRouter><LaudoList /></MemoryRouter>);
    expect(screen.getByText("Crie seu primeiro laudo")).toBeInTheDocument();
  });

  it("lists all laudos by default", () => {
    saveLaudo(makeLaudo({ id: "1", client: { name: "João Pereira", document: "", address: "" } }));
    saveLaudo(makeLaudo({ id: "2", client: { name: "Ana Lima", document: "", address: "" } }));
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    expect(screen.getByText("João Pereira")).toBeInTheDocument();
    expect(screen.getByText("Ana Lima")).toBeInTheDocument();
  });

  it("filters in real time by client name", () => {
    saveLaudo(makeLaudo({ id: "1", client: { name: "João Pereira", document: "", address: "" } }));
    saveLaudo(makeLaudo({ id: "2", client: { name: "Ana Lima", document: "", address: "" } }));
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/buscar laudos/i), { target: { value: "ana" } });

    expect(screen.queryByText("João Pereira")).not.toBeInTheDocument();
    expect(screen.getByText("Ana Lima")).toBeInTheDocument();
  });

  it("filters in real time by property address", () => {
    const base = makeLaudo();
    saveLaudo({ ...base, id: "1", property: { ...base.property, address: "Rua das Flores, 10" } });
    saveLaudo({ ...base, id: "2", property: { ...base.property, address: "Avenida Central, 500" } });
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/buscar laudos/i), { target: { value: "central" } });

    expect(screen.getByText(/Avenida Central, 500/)).toBeInTheDocument();
    expect(screen.queryByText(/Rua das Flores, 10/)).not.toBeInTheDocument();
  });

  it("shows a no-results message when the search matches nothing", () => {
    saveLaudo(makeLaudo());
    render(<MemoryRouter><LaudoList /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/buscar laudos/i), { target: { value: "zzz-nao-existe" } });

    expect(screen.getByText(/nenhum laudo encontrado/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- LaudoList`
Expected: FAIL — placeholder has none of this.

- [ ] **Step 3: Implement `LaudoList`**

`src/pages/LaudoList.tsx`:
```tsx
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { SparklesText } from "@/components/ui/sparkles-text";
import { LaudoListItem } from "@/components/laudo/LaudoListItem";
import { LAUDO_TYPE_LABELS, type LaudoData } from "@/types/laudo";
import { getLaudos, deleteLaudo } from "@/lib/storage";

export default function LaudoList() {
  const [laudos, setLaudos] = useState<LaudoData[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLaudos(getLaudos());
  }, []);

  function handleDelete(id: string) {
    deleteLaudo(id);
    setLaudos(getLaudos());
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return laudos;
    return laudos.filter((l) =>
      [l.client.name, l.property.address, LAUDO_TYPE_LABELS[l.type]]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [laudos, query]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-karrer-navy">Meus Laudos</h1>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por cliente, endereço ou tipo"
        className="mb-6"
        aria-label="Buscar laudos"
      />

      {laudos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center">
          <SparklesText className="text-lg text-karrer-navy">Crie seu primeiro laudo</SparklesText>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum laudo encontrado para "{query}".</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((laudo) => (
            <LaudoListItem key={laudo.id} laudo={laudo} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- LaudoList`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement LaudoList with real-time search"
```

---

## Task 29: LaudoDetail — view, download, edit notes, delete

**Files:**
- Modify: `src/pages/LaudoDetail.tsx` (replace placeholder from Task 5)
- Test: `src/pages/__tests__/LaudoDetail.test.tsx`

**Interfaces:**
- Consumes: `getLaudo`/`saveLaudo`/`deleteLaudo` (Task 8), `downloadLaudoPdf` (Task 25), `Badge`/`Button`/`Textarea`/`Dialog`+family (Task 2), `useParams`/`useNavigate` from `react-router-dom`.
- Produces: default export `LaudoDetail`. Reads `:id` from the route (wired in Task 5's `App.tsx`).

- [ ] **Step 1: Write the failing tests**

`src/pages/__tests__/LaudoDetail.test.tsx`:
```tsx
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import LaudoDetail from "@/pages/LaudoDetail";
import { saveLaudo, getLaudo } from "@/lib/storage";
import * as pdfModule from "@/lib/pdf/generateLaudo";
import type { LaudoData } from "@/types/laudo";

function makeLaudo(overrides: Partial<LaudoData> = {}): LaudoData {
  return {
    id: "laudo-1",
    type: "laudo_tecnico",
    client: { name: "Carlos Dias", document: "", address: "" },
    property: {
      address: "Rua Y, 20",
      neighborhood: "",
      city: "",
      state: "",
      inspectionDate: "",
      artNumber: "ART-99",
      description: "",
    },
    photos: [],
    conclusion: "Está tudo certo.",
    notes: "",
    status: "draft",
    createdAt: "2026-09-14T10:00:00.000Z",
    updatedAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/laudos/${id}`]}>
      <Routes>
        <Route path="/laudos/:id" element={<LaudoDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LaudoDetail", () => {
  beforeEach(() => localStorage.clear());

  it("shows a not-found message for an unknown id", () => {
    renderDetail("does-not-exist");
    expect(screen.getByText(/laudo não encontrado/i)).toBeInTheDocument();
  });

  it("renders the laudo's details", () => {
    saveLaudo(makeLaudo());
    renderDetail("laudo-1");
    expect(screen.getByText("Carlos Dias")).toBeInTheDocument();
    expect(screen.getByText("Está tudo certo.")).toBeInTheDocument();
    expect(screen.getByText("ART-99")).toBeInTheDocument();
  });

  it("downloads the PDF when clicking Baixar PDF", () => {
    saveLaudo(makeLaudo());
    const downloadSpy = vi.spyOn(pdfModule, "downloadLaudoPdf").mockImplementation(() => {});
    renderDetail("laudo-1");

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));
    expect(downloadSpy).toHaveBeenCalled();
  });

  it("edits and saves the technical notes", () => {
    saveLaudo(makeLaudo({ notes: "Nota original" }));
    renderDetail("laudo-1");

    fireEvent.click(screen.getByRole("button", { name: /editar notas/i }));
    const textarea = screen.getByDisplayValue("Nota original");
    fireEvent.change(textarea, { target: { value: "Nota atualizada" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar notas/i }));

    expect(screen.getByText("Nota atualizada")).toBeInTheDocument();
    expect(getLaudo("laudo-1")?.notes).toBe("Nota atualizada");
  });

  it("deletes the laudo after confirming the dialog", () => {
    saveLaudo(makeLaudo());
    renderDetail("laudo-1");

    fireEvent.click(screen.getByRole("button", { name: /excluir laudo/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(getLaudo("laudo-1")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- LaudoDetail`
Expected: FAIL — placeholder has none of this.

- [ ] **Step 3: Implement `LaudoDetail`**

`src/pages/LaudoDetail.tsx`:
```tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LAUDO_TYPE_LABELS, type LaudoData } from "@/types/laudo";
import { getLaudo, saveLaudo, deleteLaudo } from "@/lib/storage";
import { downloadLaudoPdf } from "@/lib/pdf/generateLaudo";

export default function LaudoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [laudo, setLaudo] = useState<LaudoData | undefined>(undefined);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (id) setLaudo(getLaudo(id));
  }, [id]);

  if (!laudo) {
    return <p className="text-sm text-slate-500">Laudo não encontrado.</p>;
  }

  function handleStartEditNotes() {
    setNotesDraft(laudo!.notes ?? "");
    setEditingNotes(true);
  }

  function handleSaveNotes() {
    const updated = { ...laudo!, notes: notesDraft };
    saveLaudo(updated);
    setLaudo(updated);
    setEditingNotes(false);
  }

  function handleDelete() {
    deleteLaudo(laudo!.id);
    navigate("/laudos");
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-karrer-navy">{laudo.client.name || "Sem nome"}</h1>
        <Badge className={laudo.status === "completed" ? "bg-green-600" : "bg-amber-500"}>
          {laudo.status === "completed" ? "Concluído" : "Rascunho"}
        </Badge>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-500">Tipo</dt>
          <dd className="font-medium text-slate-800">{LAUDO_TYPE_LABELS[laudo.type]}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Imóvel</dt>
          <dd className="font-medium text-slate-800">{laudo.property.address || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">ART</dt>
          <dd className="font-medium text-slate-800">{laudo.property.artNumber || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Fotos</dt>
          <dd className="font-medium text-slate-800">{laudo.photos.length}</dd>
        </div>
      </dl>

      <div className="mb-6">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Conclusão</h2>
        <p className="text-sm text-slate-600">{laudo.conclusion || "—"}</p>
      </div>

      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Notas Técnicas</h2>
          {!editingNotes && (
            <Button type="button" variant="outline" onClick={handleStartEditNotes}>
              Editar notas
            </Button>
          )}
        </div>
        {editingNotes ? (
          <>
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingNotes(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveNotes}
                className="bg-karrer-blue hover:bg-karrer-lightblue"
              >
                Salvar notas
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">{laudo.notes || "—"}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={() => downloadLaudoPdf(laudo)}
          className="bg-karrer-blue hover:bg-karrer-lightblue"
        >
          Baixar PDF
        </Button>
        <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)}>
          Excluir laudo
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir laudo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- LaudoDetail`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement LaudoDetail with PDF download, notes editing, and delete"
```

---

## Task 30: README, final env docs, and full verification

**Files:**
- Create: `README.md`
- Verify: `.env.example` (created in Task 1 — confirm it still matches `src/lib/auth.ts`'s expected variable names)

**Interfaces:**
- No new code interfaces — this task documents the system built in Tasks 1–29 and runs a final end-to-end verification pass.

- [ ] **Step 1: Write `README.md`**

```markdown
# Sistema de Laudos Técnicos — Karrer Engenharia

Aplicação web 100% client-side para geração de laudos técnicos de engenharia
(vistoria cautelar, laudo técnico, orçamento), com PDF gerado no navegador e
histórico salvo em `localStorage`. Sem backend, sem banco de dados.

## Rodar localmente

\`\`\`bash
npm install
cp .env.example .env
# edite .env com seu usuário e hash de senha (veja "Como gerar o hash da senha")
npm run dev
\`\`\`

## Como gerar o hash da senha

O login usa usuário + senha definidos em `.env` (`VITE_APP_USERNAME`,
`VITE_APP_PASSWORD_HASH`). A senha nunca fica em texto puro no projeto — só o
hash.

No console do navegador (ou no Node):
\`\`\`js
btoa(encodeURIComponent("sua-senha-aqui"))
\`\`\`
Copie o resultado para `VITE_APP_PASSWORD_HASH` no `.env`.

## Trocar a senha

1. Gere um novo hash com o comando acima.
2. Atualize `VITE_APP_PASSWORD_HASH` no `.env` (local) e nas variáveis de
   ambiente do projeto no Vercel (produção).
3. Faça um novo deploy (ou reinicie o servidor local) para o novo hash valer.

## Deploy no Vercel

1. Suba o projeto para um repositório Git.
2. Importe o repositório no Vercel.
3. Em Settings → Environment Variables, configure `VITE_APP_USERNAME` e
   `VITE_APP_PASSWORD_HASH`.
4. O `vercel.json` já contém o rewrite de SPA necessário — nenhuma
   configuração adicional é exigida.

## Testes

\`\`\`bash
npm run test
\`\`\`

## Sobre os dados

Todos os laudos — incluindo as fotos, já comprimidas no navegador antes de
salvar — ficam no `localStorage` do navegador usado. Não há sincronização
entre dispositivos ou navegadores diferentes: é a mesma máquina/navegador
que gera e mantém o histórico.
\`\`\`
(Write the file without the outer code-fence — the ```` ```markdown ```` wrapper above is only to delimit these instructions.)

- [ ] **Step 2: Confirm `.env.example` still matches what `src/lib/auth.ts` reads**

Open `.env.example` (from Task 1) and `src/lib/auth.ts` (from Task 4) side by side; confirm the two variable names are identical: `VITE_APP_USERNAME`, `VITE_APP_PASSWORD_HASH`. Fix either file if they've drifted.

- [ ] **Step 3: Run the full automated verification**

```bash
npm run build
npm run test
```
Expected: both succeed — `build` with no TypeScript errors, `test` with every test from Tasks 1–29 passing.

- [ ] **Step 4: Manual smoke test in a real browser**

```bash
npm run dev
```
Open the printed local URL and walk the golden path once:
1. Log in with the username/password you set in `.env`.
2. Dashboard shows the empty state ("Crie seu primeiro laudo").
3. Click "Novo Laudo", pick a type, fill client/property, drop 1–2 photos, fill a caption, write a conclusion, review, click "Gerar PDF" — confirm a PDF downloads and opens with a cover page, populated summary, your photo(s), and the fixed glossary/instruments/references sections.
4. Back on the Dashboard, confirm the stat counts updated and the laudo appears in the list.
5. Open the laudo's detail page, edit its Notas Técnicas, save, and re-download the PDF — confirm the notes box appears before the conclusion.
6. Resize the browser to a phone width — confirm the sidebar becomes a hamburger-triggered drawer.
7. Log out via the sidebar's confirmation dialog, confirm you're redirected to `/login`.

This step has no automated assertion — it's the one pass that checks the actual generated PDF's visual layout against the reference PDF's structure, which the unit tests (mocking jsPDF's drawing calls) cannot verify.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: add README with setup, password rotation, and Vercel deploy instructions"
```

---

## Self-Review Notes

- **Spec coverage:** every section of the design spec maps to a task — auth (4–6), storage + image compression (7–8), layout (9), Magic UI components (10–12), 6-step form (13–18, 26), all 10 PDF sections in the spec's fixed order (19–25), dashboard/list/detail (27–29), deploy docs (30). The `.env.example`/README/`vercel.json` requirements are covered in Tasks 1 and 30.
- **Placeholder scan:** no task step describes behavior without showing the code; every "later task" cross-reference names an exact task number, and all such references were re-checked against the final task order after two renumbering passes during planning (shadcn moved to Task 2; PDF generation moved ahead of StepReview since StepReview depends on `generateLaudoPdf`).
- **Type consistency:** `LaudoData`/`ClientData`/`PropertyData`/`PhotoItem` (Task 3) are the single source of truth for every field name used in Tasks 13–29; the 6 step components' prop shapes are declared once in Task 13's Interfaces block and every implementing task (14–18, 26) matches it exactly; `PageCursor` (Task 21) and its `newPage`/`drawChrome` helpers are threaded unchanged through every PDF section task (20–25).

