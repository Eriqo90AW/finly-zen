export const formatRupiah = (amount: number | null | undefined): string => {
  if (amount == null) return "Rp0";
  return "Rp" + new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatRupiahShort = (amount: number | null | undefined): string => {
  if (amount == null) return "Rp0";
  if (amount >= 1000000) {
    const value = amount / 1000000;
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2);
    return "Rp" + formatted.replace(".", ",") + "jt";
  }
  if (amount >= 1000) {
    const value = amount / 1000;
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2);
    return "Rp" + formatted.replace(".", ",") + "rb";
  }
  return "Rp" + amount.toString();
};

export const formatMonth = (date: Date): string => {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
};

export const formatDateDetail = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  const timeStr = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
  return `${dateStr} ${timeStr} WIB`;
};

export const formatIconName = (name: string | undefined): string => {
  if (!name) return "";
  // Removes "Rounded", "Outlined", "Sharp" etc. if you want generic icons
  // or converts PascalCase to snake_case for the Material Icons font
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/Rounded|Outlined|Sharp/g, "")
    .toLowerCase();
};
