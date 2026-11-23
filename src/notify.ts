import { appendFileSync } from 'node:fs';
import type { WorkOrder } from './types.js';

export const OUTBOX_FILE = process.env.OUTBOX_FILE ?? 'outbox.log';

/**
 * Stand-in for "email the client that the order is closed".
 * It never sends anything. It writes one line to a file, and only when
 * SEND_EMAIL is exactly "true". Returns whether a line was written.
 */
export function notifyClient(order: WorkOrder, file: string = OUTBOX_FILE): boolean {
  if (process.env.SEND_EMAIL !== 'true') return false;
  appendFileSync(file, `EMAIL to ${order.client}: work order #${order.id} "${order.title}" is closed\n`);
  return true;
}
