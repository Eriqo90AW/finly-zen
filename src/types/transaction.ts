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
  category_id?: string;
  transaction_name: string;
  account_name: string;
  account_color?: string;
  account_id?: string;
  transaction_type: TransactionType;
  created_at: string;
  note?: string;
  is_recurring: boolean;
  attachment_url?: string;
  user_id?: string;
}

export type Transaction = {
  id: string;
  amount: number;
  category: string;
  categoryIcon?: string;
  categoryColor?: string;
  categoryId?: string;
  name: string;
  accountName?: string;
  accountColor?: string;
  accountId?: string;
  type: TransactionType;
  date: string;
  note: string;
  isRecurring?: boolean;
};

export interface UpdateTransactionParams {
  id: string;
  type: TransactionType;
  amount: number;
  name: string;
  categoryId: string;
  accountId: string;
  date: Date;
  isRecurring: boolean;
  note?: string;
  userId?: string;
  attachmentUrl?: string;
}

export interface AddTransferParams {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note?: string;
  createdAt?: Date;
  userId?: string;
}

export interface TransferRecord {
  id: string;
  transactionIds: string[];
  fromAccountId?: string;
  fromAccountName: string;
  fromAccountColor?: string;
  toAccountId?: string;
  toAccountName: string;
  toAccountColor?: string;
  amount: number;
  date: string;
  note?: string;
  isRecurring: boolean;
}

