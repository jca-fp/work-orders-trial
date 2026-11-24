import { describe, expect, it } from 'vitest';
import { sortWorkOrders } from '../src/sort.js';
import { isOverdue } from '../src/sort.js';
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

describe('overdue orders', () => {
  const today = '2026-11-24';

  it('counts an order due yesterday as overdue, but not one due today or tomorrow', () => {
    expect(isOverdue(order(1, 'open', '2026-11-23'), today)).toBe(true);
    expect(isOverdue(order(2, 'in_progress', '2026-11-23'), today)).toBe(true);
    expect(isOverdue(order(3, 'open', '2026-11-24'), today)).toBe(false);
    expect(isOverdue(order(4, 'open', '2026-11-25'), today)).toBe(false);
  });

  it('never counts a closed order as overdue', () => {
    expect(isOverdue(order(1, 'closed', '2020-01-01'), today)).toBe(false);
  });

  it('lists an open order due yesterday before in-progress orders due today and tomorrow', () => {
    const sorted = sortWorkOrders(
      [
        order(1, 'in_progress', '2026-11-25'), // due tomorrow
        order(2, 'in_progress', '2026-11-24'), // due today
        order(3, 'open', '2026-11-23'), // due yesterday
        order(4, 'open', '2026-11-24'), // due today
        order(5, 'open', '2026-11-25'), // due tomorrow
      ],
      today,
    );
    expect(sorted.map((o) => o.id)).toEqual([3, 2, 1, 4, 5]);
  });

  it('puts the most overdue first inside a status', () => {
    const sorted = sortWorkOrders(
      [order(1, 'open', '2026-11-23'), order(2, 'open', '2026-10-01'), order(3, 'open', '2026-11-20')],
      today,
    );
    expect(sorted.map((o) => o.id)).toEqual([2, 3, 1]);
  });

  it('lists overdue orders in progress before overdue open ones', () => {
    const sorted = sortWorkOrders(
      [order(1, 'open', '2026-11-01'), order(2, 'in_progress', '2026-11-23'), order(3, 'open', '2026-11-25')],
      today,
    );
    expect(sorted.map((o) => o.id)).toEqual([2, 1, 3]);
  });

  it('keeps closed orders last, however old their due date', () => {
    const sorted = sortWorkOrders(
      [order(1, 'closed', '2019-01-01'), order(2, 'open', '2026-11-25'), order(3, 'open', '2026-11-23')],
      today,
    );
    expect(sorted.map((o) => o.id)).toEqual([3, 2, 1]);
  });

  it('keeps the lower id first on a tie and does not change its input', () => {
    const input = [order(2, 'open', '2026-11-23'), order(1, 'open', '2026-11-23'), order(3, 'open', '2026-11-25')];
    expect(sortWorkOrders(input, today).map((o) => o.id)).toEqual([1, 2, 3]);
    expect(input.map((o) => o.id)).toEqual([2, 1, 3]);
  });
});
