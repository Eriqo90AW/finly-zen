import { supabase } from './supabase';

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

/**
 * Adds a new transaction and returns the detailed view of the created transaction.
 */
export async function addTransaction(params: AddTransactionParams): Promise<TransactionDetailModel> {
  try {
    // 1. Prepare the data object (mapping camelCase params to snake_case DB columns)
    const data = {
      account_id: params.accountId,
      user_id: params.userId,
      name: params.name,
      type: params.type,
      amount: params.amount,
      category_id: params.categoryId,
      note: params.note,
      attachment_url: params.attachmentUrl,
      is_recurring: params.isRecurring,
      // Supabase expects ISO strings for timestamp columns
      created_at: params.createdAt ? params.createdAt.toISOString() : undefined, 
    };

    // 2. Insert into 'transactions' table and select the generated ID
    const { data: insertData, error: insertError } = await supabase
      .from('transactions')
      .insert(data)
      .select('id')
      .single();

    if (insertError) throw insertError;

    const newTransactionId = insertData.id;

    // 3. Fetch the detailed record from the view
    const { data: viewData, error: viewError } = await supabase
      .from('view_transactions_detailed')
      .select()
      .eq('transaction_id', newTransactionId)
      .single();

    if (viewError) throw viewError;

    // 4. Return the data
    return viewData as TransactionDetailModel;

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    console.error('Failed to add transaction:', e);
    throw new Error(`Failed to add transaction: ${errorMessage}`);
  }
}
