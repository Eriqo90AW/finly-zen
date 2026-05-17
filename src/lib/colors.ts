// Helper to generate a deterministic color from a string (the ticker)
export const getAssetColor = (ticker: string): string => {
  const colors = [
    "#3B82F6", // Classic Blue
    "#10B981", // Emerald Green
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#F97316", // Orange
    "#14B8A6", // Teal
    "#6366F1", // Indigo
    "#A855F7", // Violet
    "#D946EF", // Fuchsia
    "#84CC16", // Lime
    "#EAB308", // Yellow
    "#F43F5E", // Rose
    "#0EA5E9", // Sky
    "#22C55E", // Green
    "#E11D48", // Crimson
    "#4F46E5", // Royal Indigo
    "#D97706", // Burnt Orange
    "#059669", // Forest Mint
    "#0891B2", // Dark Cyan
    "#7C3AED", // Deep Violet
    "#C026D3", // Dark Magenta
    "#2563EB", // Bright Blue
    "#EA580C", // Rust
    "#16A34A", // Mid Green
    "#DB2777", // Deep Pink
    "#4B5563", // Slate
    "#6B7280", // Gray
    "#9CA3AF", // Light Slate
    "#D98880", // Pastel Salmon
    "#F1948A", // Peach Rose
    "#C39BD3", // Wisteria Purple
    "#7FB3D5", // Soft Sky
    "#76D7C4", // Mint Turquoise
    "#F7DC6F", // Golden Yellow
    "#F8C471", // Apricot Orange
    "#85C1E9", // Pale Blue
    "#A9DFBF", // Sage
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
