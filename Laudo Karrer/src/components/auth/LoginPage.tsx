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
