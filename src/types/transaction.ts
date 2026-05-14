export type TransactionType = "income" | "expense";

export interface AddTransactionParams {
  accountId?: string;
  userId?: string;
  name: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  note?: string;
  attachmentUrl?: string;
  isRecurring: boolean;
  createdAt?: Date;
}

export interface TransactionDetailModel {
  transaction_id: string;
  amount: number;
  category_name: string;
  category_icon?: string;
  category_color?: string;
  transaction_name: string;
  account_name: string;
  account_color?: string;
  transaction_type: TransactionType;
  created_at: string;
  note?: string;
  is_recurring: boolean;
  attachment_url?: string;
}

export type Transaction = {
  id: string;
  amount: number;
  category: string;
  categoryIcon?: string;
  categoryColor?: string;
  name: string;
  accountName?: string;
  accountColor?: string;
  type?: string;
  date: string;
  note: string;
  isRecurring?: boolean;
};
