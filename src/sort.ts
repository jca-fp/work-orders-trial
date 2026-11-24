import { BUSINESS_TIME_ZONE, todayIn } from './dates.js';
import type { Status, WorkOrder } from './types.js';

const STATUS_RANK: Record<Status, number> = { in_progress: 0, open: 1, closed: 2 };

/**
 * An open or in-progress order is overdue once its due date has passed.
 * `today` is a calendar date, YYYY-MM-DD, in the business's time zone.
 * An order due today is not overdue yet. A closed order is never overdue.
 */
export function isOverdue(order: WorkOrder, today: string): boolean {
  return order.status !== 'closed' && order.dueDate < today;
}

/**
 * Ordering rules for the list:
 * 0. Overdue orders come first, as a group.
 * 1. Orders in progress come first, then open orders, then closed orders.
 * 2. Inside each status, the earliest due date comes first.
 * 3. Ties keep the lower id first.
 * Inside the overdue group, rules 1 to 3 apply: in progress first, then the most overdue.
 */
export function sortWorkOrders(orders: WorkOrder[], today: string = todayIn(BUSINESS_TIME_ZONE)): WorkOrder[] {
  const group = (order: WorkOrder): number => (isOverdue(order, today) ? 0 : 1);
  return [...orders].sort(
    (a, b) =>
      group(a) - group(b) ||
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.dueDate.localeCompare(b.dueDate) ||
      a.id - b.id,
  );
}
