export function getDaysLeft(dateKey: string, today = new Date()): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(year, month - 1, day) - start) / 86400000);
}

export function classifyExpiry<T extends { expiryDate: string }>(items: T[], today = new Date()) {
  const expired = items.filter((item) => getDaysLeft(item.expiryDate, today) < 0);
  const upcoming = items.filter((item) => {
    const days = getDaysLeft(item.expiryDate, today);
    return days >= 0 && days <= 3;
  }).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  return { expired, upcoming };
}
