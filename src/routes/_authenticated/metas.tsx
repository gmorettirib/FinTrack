import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Target } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { goalsQuery } from "@/lib/queries";
import type { Goal } from "@/lib/finance-types";
import { daysUntil, formatCurrency, formatDate, percent, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas | FinTrack" },
      {
        name: "description",
        content: "Defina metas financeiras, acompanhe o progresso e o prazo de cada objetivo.",
      },
      { property: "og:title", content: "Metas | FinTrack" },
      { property: "og:description", content: "Acompanhe o progresso das suas metas financeiras." },
    ],
  }),
  component: GoalsPage,
});

interface GoalForm {
  id?: string;
  name: string;
  target_amount: string;
  current_amount: string;
  deadline: string;
}

const emptyForm = (): GoalForm => ({
  name: "",
  target_amount: "",
  current_amount: "0",
  deadline: toISODate(),
});

function GoalsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(goalsQuery);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<GoalForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (values: GoalForm) => {
      const target = Number(values.target_amount);
      const current = Number(values.current_amount || 0);
      if (!Number.isFinite(target) || target <= 0) throw new Error("Informe um valor objetivo válido.");
      if (current < 0) throw new Error("O valor atual não pode ser negativo.");
      const payload = {
        name: values.name.trim(),
        target_amount: target,
        current_amount: current,
        deadline: values.deadline,
      };
      if (values.id) {
        const { error: updateError } = await supabase.from("goals").update(payload).eq("id", values.id);
        if (updateError) throw new Error(updateError.message);
        return "updated" as const;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão expirada.");
      const { error: insertError } = await supabase
        .from("goals")
        .insert({ ...payload, user_id: userData.user.id });
      if (insertError) throw new Error(insertError.message);
      return "created" as const;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setOpen(false);
      setForm(emptyForm());
      toast.success(result === "created" ? "Meta criada!" : "Meta atualizada!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from("goals").delete().eq("id", id);
      if (deleteError) throw new Error(deleteError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setDeleteTarget(null);
      toast.success("Meta excluída.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(goal: Goal) {
    setForm({
      id: goal.id,
      name: goal.name,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      deadline: goal.deadline.slice(0, 10),
    });
    setOpen(true);
  }

  return (
    <AppShell
      title="Metas"
      description="Seus objetivos financeiros"
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nova meta
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState rows={3} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="Nenhuma meta criada"
          description="Defina um objetivo, como uma viagem ou uma reserva de emergência."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nova meta
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((goal) => {
            const pct = percent(goal.current_amount, goal.target_amount);
            const remaining = daysUntil(goal.deadline);
            const done = goal.current_amount >= goal.target_amount;
            const expired = !done && remaining < 0;
            return (
              <article key={goal.id} className="card-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Target className="size-5" />
                    </span>
                    <div>
                      <h2 className="font-semibold">{goal.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        Prazo: {formatDate(goal.deadline)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(goal)} aria-label="Editar meta">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(goal)}
                      aria-label="Excluir meta"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <p className="text-lg font-semibold">{formatCurrency(goal.current_amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    de {formatCurrency(goal.target_amount)}
                  </p>
                </div>
                <Progress value={pct} className="mt-2 h-2.5" />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{pct.toFixed(0)}% concluído</span>
                  <Badge variant={done ? "default" : expired ? "destructive" : "secondary"}>
                    {done
                      ? "Concluída"
                      : expired
                        ? "Prazo vencido"
                        : `Faltam ${remaining} dia${remaining === 1 ? "" : "s"}`}
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
            <DialogTitle>{form.id ? "Editar meta" : "Nova meta"}</DialogTitle>
            <DialogDescription>Defina o objetivo e acompanhe o progresso.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(form);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Reserva de emergência"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target">Valor objetivo (R$)</Label>
                <Input
                  id="target"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.target_amount}
                  onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current">Valor atual (R$)</Label>
                <Input
                  id="current"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.current_amount}
                  onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Data limite</Label>
              <Input
                id="deadline"
                type="date"
                required
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
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
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
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
