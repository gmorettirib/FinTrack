import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Challenge, Goal, Transaction } from "./finance-types";

export const transactionsQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as Transaction[];
  },
});

export const goalsQuery = queryOptions({
  queryKey: ["goals"],
  queryFn: async (): Promise<Goal[]> => {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .order("deadline", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      ...row,
      target_amount: Number(row.target_amount),
      current_amount: Number(row.current_amount),
    })) as Goal[];
  },
});

export const challengesQuery = queryOptions({
  queryKey: ["challenges"],
  queryFn: async (): Promise<Challenge[]> => {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .order("end_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      ...row,
      target_amount: Number(row.target_amount),
      current_amount: Number(row.current_amount),
    })) as Challenge[];
  },
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error("Sessão expirada.");
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: user.id,
      email: data?.email || user.email || "",
      full_name: data?.full_name || (user.user_metadata?.["full_name"] as string) || "",
    };
  },
});
