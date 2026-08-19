import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Target,
  Trophy,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { challengesQuery, goalsQuery, transactionsQuery } from "@/lib/queries";
import { formatCurrency, formatDate, percent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | FinTrack" },
      {
        name: "description",
        content: "Visão geral do seu saldo, receitas, despesas, metas e desafios financeiros.",
      },
      { property: "og:title", content: "Dashboard | FinTrack" },
      { property: "og:description", content: "Acompanhe suas finanças pessoais em um só lugar." },
    ],
  }),
  component: DashboardPage,
});

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function DashboardPage() {
  const transactions = useQuery(transactionsQuery);
  const goals = useQuery(goalsQuery);
  const challenges = useQuery(challengesQuery);

  const isLoading = transactions.isLoading || goals.isLoading || challenges.isLoading;
  const error = transactions.error || goals.error || challenges.error;

  const list = transactions.data ?? [];
  const receitas = list.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0);
  const despesas = list.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
  const saldo = receitas - despesas;

  const activeGoals = (goals.data ?? []).filter((g) => g.current_amount < g.target_amount);
  const activeChallenges = (challenges.data ?? []).filter((c) => c.status === "ativo");

  const monthly = buildMonthly(list);
  const evolution = buildEvolution(monthly);

  return (
    <AppShell title="Dashboard" description="Resumo das suas finanças">
      {isLoading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => transactions.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Saldo atual"
              value={formatCurrency(saldo)}
              icon={Wallet}
              tone={saldo >= 0 ? "primary" : "danger"}
            />
            <StatCard
              label="Receitas"
              value={formatCurrency(receitas)}
              icon={ArrowUpCircle}
              tone="success"
            />
            <StatCard
              label="Despesas"
              value={formatCurrency(despesas)}
              icon={ArrowDownCircle}
              tone="danger"
            />
            <StatCard label="Metas ativas" value={String(activeGoals.length)} icon={Target} />
            <StatCard
              label="Desafios ativos"
              value={String(activeChallenges.length)}
              icon={Trophy}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card-surface p-5">
              <h2 className="text-sm font-semibold">Receitas x Despesas</h2>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
              <div className="mt-4 h-64">
                {monthly.length === 0 ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                        }}
                      />
                      <Bar dataKey="receitas" name="Receitas" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="despesas" name="Despesas" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="card-surface p-5">
              <h2 className="text-sm font-semibold">Evolução financeira</h2>
              <p className="text-xs text-muted-foreground">Saldo acumulado</p>
              <div className="mt-4 h-64">
                {evolution.length === 0 ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolution}>
                      <defs>
                        <linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="saldo"
                        name="Saldo"
                        stroke="var(--chart-5)"
                        strokeWidth={2}
                        fill="url(#saldoFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          <section className="card-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Últimas movimentações</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/movimentacoes">Ver todas</Link>
              </Button>
            </div>
            {list.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma movimentação registrada ainda.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {list.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
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
                        <p className="truncate text-sm font-medium">
                          {t.description || t.category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.category} · {formatDate(t.date)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        t.type === "receita" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {t.type === "receita" ? "+" : "-"} {formatCurrency(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Metas em andamento</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/metas">Ver metas</Link>
                </Button>
              </div>
              {activeGoals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma meta em andamento.
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {activeGoals.slice(0, 3).map((g) => (
                    <li key={g.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{g.name}</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}
                        </span>
                      </div>
                      <Progress
                        value={percent(g.current_amount, g.target_amount)}
                        className="mt-2 h-2"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {percent(g.current_amount, g.target_amount).toFixed(0)}% · prazo{" "}
                        {formatDate(g.deadline)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Desafios ativos</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/desafios">Ver desafios</Link>
                </Button>
              </div>
              {activeChallenges.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum desafio ativo.
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {activeChallenges.slice(0, 3).map((c) => (
                    <li key={c.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{c.name}</span>
                        <Badge variant="secondary">{c.period}</Badge>
                      </div>
                      <Progress
                        value={percent(c.current_amount, c.target_amount)}
                        className="mt-2 h-2"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {percent(c.current_amount, c.target_amount).toFixed(0)}% · até{" "}
                        {formatDate(c.end_date)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {list.length === 0 ? (
            <EmptyState
              title="Comece registrando suas movimentações"
              description="Adicione receitas e despesas para ver seu saldo e seus gráficos ganharem vida."
              action={
                <Button asChild>
                  <Link to="/movimentacoes">Nova movimentação</Link>
                </Button>
              }
            />
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
      Sem dados suficientes para exibir o gráfico
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "primary" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "danger"
        ? "bg-destructive/10 text-destructive"
        : tone === "primary"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground";
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`flex size-8 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

interface MonthPoint {
  key: string;
  label: string;
  receitas: number;
  despesas: number;
}

function buildMonthly(list: { date: string; type: string; amount: number }[]): MonthPoint[] {
  if (list.length === 0) return [];
  const map = new Map<string, MonthPoint>();
  for (const t of list) {
    const key = t.date.slice(0, 7);
    const monthIndex = Number(key.slice(5, 7)) - 1;
    const current =
      map.get(key) ??
      ({ key, label: `${MONTHS[monthIndex]}/${key.slice(2, 4)}`, receitas: 0, despesas: 0 } as MonthPoint);
    if (t.type === "receita") current.receitas += t.amount;
    else current.despesas += t.amount;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
}

function buildEvolution(monthly: MonthPoint[]) {
  let acc = 0;
  return monthly.map((m) => {
    acc += m.receitas - m.despesas;
    return { label: m.label, saldo: Number(acc.toFixed(2)) };
  });
}
