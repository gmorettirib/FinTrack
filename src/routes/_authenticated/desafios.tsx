import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { challengesQuery } from "@/lib/queries";
import { PERIODS, type Challenge } from "@/lib/finance-types";
import { daysUntil, formatCurrency, formatDate, percent, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/desafios")({
  head: () => ({
    meta: [
      { title: "Desafios | FinTrack" },
      {
        name: "description",
        content: "Crie desafios de economia com prazo e acompanhe o progresso até concluir.",
      },
      { property: "og:title", content: "Desafios | FinTrack" },
      { property: "og:description", content: "Desafios de economia com progresso automático." },
    ],
  }),
  component: ChallengesPage,
});

interface ChallengeForm {
  id?: string;
  name: string;
  target_amount: string;
  current_amount: string;
  period: string;
  start_date: string;
  end_date: string;
}

const emptyForm = (): ChallengeForm => ({
  name: "",
  target_amount: "",
  current_amount: "0",
  period: "mensal",
  start_date: toISODate(),
  end_date: toISODate(new Date(Date.now() + 30 * 86400000)),
});

const STATUS_LABEL: Record<Challenge["status"], string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  expirado: "Expirado",
};

function ChallengesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(challengesQuery);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ChallengeForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (values: ChallengeForm) => {
      const target = Number(values.target_amount);
      const current = Number(values.current_amount || 0);
      if (!Number.isFinite(target) || target <= 0) throw new Error("Informe um valor objetivo válido.");
      if (values.end_date < values.start_date)
        throw new Error("A data final deve ser posterior à data inicial.");
      const payload = {
        name: values.name.trim(),
        target_amount: target,
        current_amount: current,
        period: values.period,
        start_date: values.start_date,
        end_date: values.end_date,
      };
      if (values.id) {
        const { error: updateError } = await supabase
          .from("challenges")
          .update(payload)
          .eq("id", values.id);
        if (updateError) throw new Error(updateError.message);
        return "updated" as const;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão expirada.");
      const { error: insertError } = await supabase
        .from("challenges")
        .insert({ ...payload, user_id: userData.user.id });
      if (insertError) throw new Error(insertError.message);
      return "created" as const;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      setOpen(false);
      setForm(emptyForm());
      toast.success(result === "created" ? "Desafio criado!" : "Desafio atualizado!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from("challenges").delete().eq("id", id);
      if (deleteError) throw new Error(deleteError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      setDeleteTarget(null);
      toast.success("Desafio excluído.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(challenge: Challenge) {
    setForm({
      id: challenge.id,
      name: challenge.name,
      target_amount: String(challenge.target_amount),
      current_amount: String(challenge.current_amount),
      period: challenge.period,
      start_date: challenge.start_date.slice(0, 10),
      end_date: challenge.end_date.slice(0, 10),
    });
    setOpen(true);
  }

  return (
    <AppShell
      title="Desafios"
      description="Desafios de economia com prazo definido"
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Novo desafio
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState rows={3} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="Nenhum desafio criado"
          description="Que tal um desafio de economizar R$ 500,00 neste mês?"
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Novo desafio
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((challenge) => {
            const pct = percent(challenge.current_amount, challenge.target_amount);
            const remaining = daysUntil(challenge.end_date);
            return (
              <article key={challenge.id} className="card-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Trophy className="size-5" />
                    </span>
                    <div>
                      <h2 className="font-semibold">{challenge.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(challenge.start_date)} — {formatDate(challenge.end_date)} ·{" "}
                        {challenge.period}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(challenge)}
                      aria-label="Editar desafio"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(challenge)}
                      aria-label="Excluir desafio"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <p className="text-lg font-semibold">{formatCurrency(challenge.current_amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    de {formatCurrency(challenge.target_amount)}
                  </p>
                </div>
                <Progress value={pct} className="mt-2 h-2.5" />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {pct.toFixed(0)}% ·{" "}
                    {challenge.status === "ativo"
                      ? `faltam ${Math.max(remaining, 0)} dia${remaining === 1 ? "" : "s"}`
                      : `encerrado em ${formatDate(challenge.end_date)}`}
                  </span>
                  <Badge
                    variant={
                      challenge.status === "concluido"
                        ? "default"
                        : challenge.status === "expirado"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {STATUS_LABEL[challenge.status]}
                  </Badge>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar desafio" : "Novo desafio"}</DialogTitle>
            <DialogDescription>
              O status vira "Concluído" automaticamente ao atingir o objetivo.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(form);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="challenge-name">Nome</Label>
              <Input
                id="challenge-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Economizar no delivery"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="challenge-target">Valor objetivo (R$)</Label>
                <Input
                  id="challenge-target"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.target_amount}
                  onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="challenge-current">Valor atual (R$)</Label>
                <Input
                  id="challenge-current"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.current_amount}
                  onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">Data inicial</Label>
                <Input
                  id="start"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="end">Data final</Label>
                <Input
                  id="end"
                  type="date"
                  required
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir desafio?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
