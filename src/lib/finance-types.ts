export type TransactionType = "receita" | "despesa";

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  category: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  created_at: string;
}

export interface Challenge {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  period: string;
  start_date: string;
  end_date: string;
  status: "ativo" | "concluido" | "expirado";
  created_at: string;
}

export const CATEGORIES = [
  "Salário",
  "Freelance",
  "Alimentação",
  "Moradia",
  "Transporte",
  "Educação",
  "Lazer",
  "Saúde",
  "Contas",
  "Outros",
] as const;

export const PERIODS = ["semanal", "mensal", "trimestral", "anual"] as const;
