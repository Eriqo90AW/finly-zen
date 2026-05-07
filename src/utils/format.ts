export const formatRupiah = (amount: number): string => {
  return "Rp" + new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatRupiahShort = (amount: number): string => {
  if (amount >= 1000000) {
    const value = amount / 1000000;
    return "Rp" + value.toString().replace(".", ",") + "jt";
  }
  if (amount >= 1000) {
    const value = amount / 1000;
    return "Rp" + value.toString().replace(".", ",") + "rb";
  }
  return "Rp" + amount.toString();
};

export const formatMonth = (date: Date): string => {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
};

