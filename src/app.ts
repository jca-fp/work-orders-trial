import type { IncomingMessage, ServerResponse } from 'node:http';
import { notifyClient } from './notify.js';
import { renderPage } from './page.js';
import { sortWorkOrders } from './sort.js';
import type { WorkOrderStore } from './store.js';
import type { Status, WorkOrder } from './types.js';

const STATUSES: readonly string[] = ['open', 'in_progress', 'closed'] satisfies Status[];

function send(res: ServerResponse, status: number, type: string, body: string): void {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

function isStatus(value: string): value is Status {
  return STATUSES.includes(value);
}

/** Reads ?status=. Returns 'all' when it is missing or "all", the status when it is known, and null otherwise. */
function readStatusFilter(url: URL): Status | 'all' | null {
  const value = url.searchParams.get('status');
  if (value === null || value === 'all') return 'all';
  return isStatus(value) ? value : null;
}

async function listOrders(store: WorkOrderStore, filter: Status | 'all'): Promise<WorkOrder[]> {
  const orders = sortWorkOrders(await store.list());
  return filter === 'all' ? orders : orders.filter((order) => order.status === filter);
}

/** Builds the request handler. The store is passed in so tests can run without a database. */
export function createApp(store: WorkOrderStore) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/') {
        const filter = readStatusFilter(url);
        if (filter === null) return send(res, 400, 'text/plain', 'Unknown status');
        return send(res, 200, 'text/html; charset=utf-8', renderPage(await listOrders(store, filter), filter));
      }
      if (req.method === 'GET' && url.pathname === '/api/work-orders') {
        const filter = readStatusFilter(url);
        if (filter === null) return send(res, 400, 'text/plain', 'Unknown status');
        return send(res, 200, 'application/json', JSON.stringify(await listOrders(store, filter)));
      }
      const close = /^\/work-orders\/(\d+)\/close$/.exec(url.pathname);
      if (req.method === 'POST' && close) {
        const order = await store.close(Number(close[1]));
        if (!order) return send(res, 404, 'text/plain', 'No such work order');
        notifyClient(order);
        res.writeHead(303, { location: '/' });
        res.end();
        return;
      }
      send(res, 404, 'text/plain', 'Not found');
    } catch (error) {
      console.error(error);
      send(res, 500, 'text/plain', 'Something went wrong');
    }
  };
}
