export interface RecencyGroup<T> {
  label: string;
  items: T[];
}

/**
 * Buckets items by date into "This week" first, then descending "Month
 * Year" groups — the Gmail/Slack-style recency grouping used across the
 * diagrams/flashcards/folders list pages. `items` must already be sorted
 * newest-first; each group preserves that order.
 * @param items Items to bucket, sorted newest-first.
 * @param getDate Reads the date (ISO string or Date) to bucket by.
 * @returns Ordered groups, "This week" first if non-empty.
 */
export function groupByRecency<T>(items: T[], getDate: (item: T) => string | Date): RecencyGroup<T>[] {
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const thisWeek: T[] = [];
  const monthGroups = new Map<string, T[]>();

  for (const item of items) {
    const date = new Date(getDate(item));
    if (date >= startOfWeek) {
      thisWeek.push(item);
      continue;
    }
    const label = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const bucket = monthGroups.get(label);
    if (bucket) bucket.push(item);
    else monthGroups.set(label, [item]);
  }

  const groups: RecencyGroup<T>[] = [];
  if (thisWeek.length > 0) groups.push({ label: "This week", items: thisWeek });
  for (const [label, bucketItems] of monthGroups) {
    groups.push({ label, items: bucketItems });
  }
  return groups;
}
