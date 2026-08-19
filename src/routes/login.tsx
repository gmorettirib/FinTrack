import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PiggyBank, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | FinTrack" },
      {
        name: "description",
        content: "Acesse sua conta FinTrack e acompanhe receitas, despesas, metas e desafios.",
      },
      { property: "og:title", content: "Entrar | FinTrack" },
      {
        property: "og:description",
        content: "Acesse sua conta FinTrack e acompanhe suas finanças pessoais.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("E-mail ou senha inválidos.");
      toast.error("Não foi possível entrar.");
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <PiggyBank className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">FinTrack</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cofrinho virtual para acompanhamento de finanças
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-surface space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Entrar
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/cadastro" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
