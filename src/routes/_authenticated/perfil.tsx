import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil | FinTrack" },
      {
        name: "description",
        content: "Gerencie seu nome, veja seu e-mail, altere a senha e saia da conta.",
      },
      { property: "og:title", content: "Perfil | FinTrack" },
      { property: "og:description", content: "Gerencie os dados da sua conta FinTrack." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(profileQuery);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (data) setFullName(data.full_name);
  }, [data]);

  const nameMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!name.trim()) throw new Error("Informe seu nome.");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão expirada.");
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", userData.user.id);
      if (updateError) throw new Error(updateError.message);
      await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Nome atualizado!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
      if (password !== confirmPassword) throw new Error("As senhas não coincidem.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
    },
    onSuccess: () => {
      setPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta.");
    navigate({ to: "/login", replace: true });
  }

  return (
    <AppShell title="Perfil" description="Dados da sua conta">
      {isLoading ? (
        <LoadingState rows={2} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (
        <div className="grid max-w-3xl gap-4">
          <section className="card-surface p-6">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="size-7" />
              </span>
              <div>
                <p className="text-lg font-semibold">{data?.full_name || "Sem nome"}</p>
                <p className="text-sm text-muted-foreground">{data?.email}</p>
              </div>
            </div>
          </section>

          <section className="card-surface space-y-4 p-6">
            <div>
              <h2 className="font-semibold">Informações pessoais</h2>
              <p className="text-sm text-muted-foreground">Atualize o nome exibido no app.</p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                nameMutation.mutate(fullName);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" value={data?.email ?? ""} disabled readOnly />
              </div>
              <Button type="submit" disabled={nameMutation.isPending}>
                {nameMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Salvar alterações
              </Button>
            </form>
          </section>

          <section className="card-surface space-y-4 p-6">
            <div>
              <h2 className="font-semibold">Alterar senha</h2>
              <p className="text-sm text-muted-foreground">Use pelo menos 6 caracteres.</p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                passwordMutation.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" variant="secondary" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Alterar senha
              </Button>
            </form>
          </section>

          <section className="card-surface flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Sair da conta</h2>
              <p className="text-sm text-muted-foreground">
                Você precisará entrar novamente para acessar seus dados.
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sair
            </Button>
          </section>
        </div>
      )}
    </AppShell>
  );
}
