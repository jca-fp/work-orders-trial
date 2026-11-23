import type { Status, WorkOrder } from './types.js';

const STATUS_RANK: Record<Status, number> = { in_progress: 0, open: 1, closed: 2 };

/**
 * Ordering rules for the list:
 * 1. Orders in progress come first, then open orders, then closed orders.
 * 2. Inside each status, the earliest due date comes first.
 * 3. Ties keep the lower id first.
 */
export function sortWorkOrders(orders: WorkOrder[]): WorkOrder[] {
  return [...orders].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.dueDate.localeCompare(b.dueDate) ||
      a.id - b.id,
  );
}
