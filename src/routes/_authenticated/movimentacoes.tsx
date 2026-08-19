import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { transactionsQuery } from "@/lib/queries";
import { CATEGORIES, type Transaction, type TransactionType } from "@/lib/finance-types";
import { formatCurrency, formatDate, toISODate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  head: () => ({
    meta: [
      { title: "Movimentações | FinTrack" },
      {
        name: "description",
        content: "Cadastre, edite, filtre e organize todas as suas receitas e despesas.",
      },
      { property: "og:title", content: "Movimentações | FinTrack" },
      { property: "og:description", content: "Controle completo das suas receitas e despesas." },
    ],
  }),
  component: TransactionsPage,
});

type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

interface FormState {
  id?: string;
  type: TransactionType;
  amount: string;
  date: string;
  description: string;
  category: string;
}

const emptyForm = (): FormState => ({
  type: "despesa",
  amount: "",
  date: toISODate(),
  description: "",
  category: "Outros",
});

function TransactionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(transactionsQuery);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"todos" | TransactionType>("todos");
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [sort, setSort] = useState<SortKey>("date_desc");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormState) => {
      const amount = Number(values.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor válido.");
      const payload = {
        type: values.type,
        amount,
        date: values.date,
        description: values.description.trim(),
        category: values.category,
      };
      if (values.id) {
        const { error: updateError } = await supabase
          .from("transactions")
          .update(payload)
          .eq("id", values.id);
        if (updateError) throw new Error(updateError.message);
        return "updated" as const;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão expirada.");
      const { error: insertError } = await supabase
        .from("transactions")
        .insert({ ...payload, user_id: userData.user.id });
      if (insertError) throw new Error(insertError.message);
      return "created" as const;
    },
    onSuccess: (result) => {
      invalidate();
      setOpen(false);
      setForm(emptyForm());
      toast.success(result === "created" ? "Movimentação adicionada!" : "Movimentação atualizada!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from("transactions").delete().eq("id", id);
      if (deleteError) throw new Error(deleteError.message);
    },
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success("Movimentação excluída.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const list = useMemo(() => {
    let result = [...(data ?? [])];
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(term) || t.category.toLowerCase().includes(term),
      );
    }
    if (typeFilter !== "todos") result = result.filter((t) => t.type === typeFilter);
    if (categoryFilter !== "todas") result = result.filter((t) => t.category === categoryFilter);
    result.sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return a.date.localeCompare(b.date);
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        default:
          return b.date.localeCompare(a.date);
      }
    });
    return result;
  }, [data, search, typeFilter, categoryFilter, sort]);

  const totals = useMemo(() => {
    const receitas = list.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0);
    const despesas = list.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [list]);

  function openCreate() {
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(t: Transaction) {
    setForm({
      id: t.id,
      type: t.type,
      amount: String(t.amount),
      date: t.date.slice(0, 10),
      description: t.description,
      category: t.category,
    });
    setOpen(true);
  }

  return (
    <AppShell
      title="Movimentações"
      description="Todas as suas receitas e despesas"
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nova movimentação
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryTile label="Receitas" value={formatCurrency(totals.receitas)} tone="success" />
          <SummaryTile label="Despesas" value={formatCurrency(totals.despesas)} tone="danger" />
          <SummaryTile label="Saldo" value={formatCurrency(totals.saldo)} tone="primary" />
        </div>

        <div className="card-surface flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por descrição ou categoria"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Data (mais recente)</SelectItem>
                <SelectItem value="date_asc">Data (mais antiga)</SelectItem>
                <SelectItem value="amount_desc">Valor (maior)</SelectItem>
                <SelectItem value="amount_asc">Valor (menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <LoadingState rows={5} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            title={data && data.length > 0 ? "Nenhum resultado" : "Nenhuma movimentação ainda"}
            description={
              data && data.length > 0
                ? "Ajuste a pesquisa ou os filtros para encontrar o que procura."
                : "Registre sua primeira receita ou despesa para começar."
            }
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                Nova movimentação
              </Button>
            }
          />
        ) : (
          <ul className="card-surface divide-y divide-border">
            {list.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                      t.type === "receita"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {t.type === "receita" ? (
                      <TrendingUp className="size-4" />
                    ) : (
                      <TrendingDown className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.description || t.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.category} · {formatDate(t.date)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={`mr-2 text-sm font-semibold ${
                      t.type === "receita" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {t.type === "receita" ? "+" : "-"} {formatCurrency(t.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(t)}
                    aria-label="Editar movimentação"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(t)}
                    aria-label="Excluir movimentação"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar movimentação" : "Nova movimentação"}</DialogTitle>
            <DialogDescription>
              Preencha os dados da sua receita ou despesa.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(form);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as TransactionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex.: Mercado do mês"
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
            <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O saldo e os gráficos serão atualizados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "danger" | "primary";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-primary";
  return (
    <div className="card-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
