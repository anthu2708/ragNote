export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const created = new Date(dateString);
  const delta = (now.getTime() - created.getTime()) / 1000;
  const m = 60, h = 3600, d = 86400, mo = 2592000, y = 31536000;
  if (delta >= y) return `${Math.floor(delta / y)} year${Math.floor(delta / y) > 1 ? "s" : ""} ago`;
  if (delta >= mo) return `${Math.floor(delta / mo)} month${Math.floor(delta / mo) > 1 ? "s" : ""} ago`;
  if (delta >= d) return `${Math.floor(delta / d)} day${Math.floor(delta / d) > 1 ? "s" : ""} ago`;
  if (delta >= h) return `${Math.floor(delta / h)} hour${Math.floor(delta / h) > 1 ? "s" : ""} ago`;
  if (delta >= m) return `${Math.floor(delta / m)} minute${Math.floor(delta / m) > 1 ? "s" : ""} ago`;
  return "just now";
}
