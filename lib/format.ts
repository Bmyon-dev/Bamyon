export function formatNaira(amount: number): string {
  return "₦" + Math.round(amount).toLocaleString("en-NG");
}

export function formatDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function daysLeft(expiry: number | null | undefined): number | null {
  if (!expiry) return null;
  const diff = expiry - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isPlanActive(expiry: number | null | undefined): boolean {
  if (!expiry) return false;
  return expiry > Date.now();
}
