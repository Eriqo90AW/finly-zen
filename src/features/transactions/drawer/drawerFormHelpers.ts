import type { Category } from "../../../types";

export type DrawerTransactionType = "expense" | "income" | "transfer";

export interface DrawerFocusRefs {
  getAmountInput: () => HTMLInputElement | undefined;
  getMerchantInput: () => HTMLInputElement | undefined;
  getCategoryContainer: () => HTMLDivElement | undefined;
  getAccountContainer: () => HTMLDivElement | undefined;
}

export interface TransactionFormErrors {
  amount?: string;
  merchant?: string;
  categoryId?: string;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
}

export const EXPENSE_SUGGESTIONS = [
  "Grabfood",
  "Parkir",
  "Bensin",
  "Sarapan",
  "Makan Siang",
  "Grabbike",
  "Indomaret",
];

// Exclude 'Debt' and 'income' appropriately.
// Income allows 'Income' + 'Transfer'; expense allows everything except 'Income'/'Debt'.
export function filterCategoriesByType(
  categories: Category[],
  type: DrawerTransactionType,
): Category[] {
  if (type === "income") {
    return categories.filter((c) => {
      const n = c.name.toLowerCase();
      return n === "income" || n === "transfer";
    });
  }
  return categories.filter(
    (c) =>
      c.name.toLowerCase() !== "income" && c.name.toLowerCase() !== "debt",
  );
}

export function pickDefaultCategoryId(
  categories: Category[],
  type: DrawerTransactionType,
  currentCategoryId: string,
): string | null {
  if (type === "transfer" || categories.length === 0) return null;

  const currentCatName = categories
    .find((c) => c.id === currentCategoryId)
    ?.name.toLowerCase();

  if (type === "income") {
    if (
      !currentCategoryId ||
      (currentCatName !== "income" && currentCatName !== "transfer")
    ) {
      const incomeCat = categories.find(
        (c) => c.name.toLowerCase() === "income",
      );
      return incomeCat ? incomeCat.id : null;
    }
    return null;
  }

  if (
    !currentCategoryId ||
    currentCatName === "income" ||
    currentCatName === "debt"
  ) {
    const foodCat = categories.find((c) => c.name.toLowerCase() === "food");
    if (foodCat) return foodCat.id;
    const firstExpense = categories.find(
      (c) =>
        c.name.toLowerCase() !== "income" && c.name.toLowerCase() !== "debt",
    );
    return firstExpense ? firstExpense.id : null;
  }

  return null;
}

export function validateTransferForm(input: {
  amount: string;
  fromAccountId: string;
  toAccountId: string;
}): TransactionFormErrors {
  const errors: TransactionFormErrors = {};
  const parsedAmount = Number.parseFloat(input.amount);

  if (!input.amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.amount = "Please enter a valid transfer amount";
  }
  if (!input.fromAccountId) {
    errors.fromAccountId = "Please select a source account";
  }
  if (!input.toAccountId) {
    errors.toAccountId = "Please select a destination account";
  } else if (input.fromAccountId === input.toAccountId) {
    errors.toAccountId = "Source and destination accounts must be different";
  }

  return errors;
}

export function validateRegularForm(input: {
  amount: string;
  merchant: string;
  categoryId: string;
  accountId: string;
}): TransactionFormErrors {
  const errors: TransactionFormErrors = {};
  const parsedAmount = Number.parseFloat(input.amount);

  if (!input.amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.amount = "Please enter an amount greater than 0";
  }
  if (!input.merchant.trim()) {
    errors.merchant = "Please enter a transaction name / merchant";
  }
  if (!input.categoryId) {
    errors.categoryId = "Please select a category";
  }
  if (!input.accountId) {
    errors.accountId = "Please select an account";
  }

  return errors;
}
