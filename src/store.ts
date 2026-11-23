import pg from 'pg';
import type { WorkOrder } from './types.js';

export interface WorkOrderStore {
  list(): Promise<WorkOrder[]>;
  /** Closes the order and returns it, or returns null when the id does not exist. */
  close(id: number): Promise<WorkOrder | null>;
}

/** Keeps orders in memory. Used by the tests. */
export class MemoryStore implements WorkOrderStore {
  private orders: WorkOrder[];

  constructor(orders: WorkOrder[]) {
    this.orders = orders.map((order) => ({ ...order }));
  }

  async list(): Promise<WorkOrder[]> {
    return this.orders.map((order) => ({ ...order }));
  }

  async close(id: number): Promise<WorkOrder | null> {
    const order = this.orders.find((candidate) => candidate.id === id);
    if (!order) return null;
    order.status = 'closed';
    return { ...order };
  }
}

const COLUMNS = `id, title, client, status, to_char(due_date, 'YYYY-MM-DD') AS "dueDate"`;

/** Reads and writes orders in Postgres. Used by the running application. */
export class PostgresStore implements WorkOrderStore {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async list(): Promise<WorkOrder[]> {
    const result = await this.pool.query<WorkOrder>(`SELECT ${COLUMNS} FROM work_orders`);
    return result.rows;
  }

  async close(id: number): Promise<WorkOrder | null> {
    const result = await this.pool.query<WorkOrder>(
      `UPDATE work_orders SET status = 'closed' WHERE id = $1 RETURNING ${COLUMNS}`,
      [id],
    );
    return result.rows[0] ?? null;
  }
}
