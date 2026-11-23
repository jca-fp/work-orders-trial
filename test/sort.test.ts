import { describe, expect, it } from 'vitest';
import { sortWorkOrders } from '../src/sort.js';
import type { Status, WorkOrder } from '../src/types.js';

function order(id: number, status: Status, dueDate: string): WorkOrder {
  return { id, title: `Order ${id}`, client: 'Test client', status, dueDate };
}

describe('sortWorkOrders', () => {
  it('lists orders in progress, then open, then closed', () => {
    const sorted = sortWorkOrders([
      order(1, 'closed', '2026-03-01'),
      order(2, 'open', '2026-03-01'),
      order(3, 'in_progress', '2026-03-01'),
    ]);
    expect(sorted.map((o) => o.status)).toEqual(['in_progress', 'open', 'closed']);
  });

  it('always lists closed orders after open ones, however old their due date', () => {
    const sorted = sortWorkOrders([
      order(1, 'closed', '2020-01-01'),
      order(2, 'open', '2026-12-31'),
      order(3, 'in_progress', '2026-06-15'),
      order(4, 'closed', '2019-05-05'),
    ]);
    expect(sorted.map((o) => o.id)).toEqual([3, 2, 4, 1]);
  });

  it('puts the earliest due date first inside a status', () => {
    const sorted = sortWorkOrders([
      order(1, 'open', '2026-03-10'),
      order(2, 'open', '2026-03-02'),
      order(3, 'open', '2026-03-05'),
    ]);
    expect(sorted.map((o) => o.id)).toEqual([2, 3, 1]);
  });

  it('keeps the lower id first on a tie, and does not change its input', () => {
    const input = [order(2, 'open', '2026-03-02'), order(1, 'open', '2026-03-02')];
    expect(sortWorkOrders(input).map((o) => o.id)).toEqual([1, 2]);
    expect(input.map((o) => o.id)).toEqual([2, 1]);
  });
});
