export function formatAed(fils: number): string {
  const aed = fils / 100;
  return `AED ${aed.toLocaleString("en-US", { minimumFractionDigits: aed % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
