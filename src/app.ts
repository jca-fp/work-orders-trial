import type { IncomingMessage, ServerResponse } from 'node:http';
import { BUSINESS_TIME_ZONE, todayIn } from './dates.js';
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

/** Reads ?client=, trimmed. Missing or blank means no search. Any text is a valid search. */
function readClientSearch(url: URL): string {
  return url.searchParams.get('client')?.trim() ?? '';
}

/** True when the client name contains the search, ignoring case. An empty search matches every order. */
function matchesClient(order: WorkOrder, search: string): boolean {
  return search === '' || order.client.toLowerCase().includes(search.toLowerCase());
}

interface ListFilter {
  status: Status | 'all';
  client: string;
}

/**
 * Returns the orders that match the filter, sorted, how many of all orders are open or in progress,
 * and today's date in the business's time zone.
 */
async function listOrders(
  store: WorkOrderStore,
  filter: ListFilter,
  now: Date,
): Promise<{ orders: WorkOrder[]; openCount: number; today: string }> {
  const all = await store.list();
  const today = todayIn(BUSINESS_TIME_ZONE, now);
  const orders = sortWorkOrders(all, today).filter(
    (order) => (filter.status === 'all' || order.status === filter.status) && matchesClient(order, filter.client),
  );
  return { orders, openCount: all.filter((order) => order.status !== 'closed').length, today };
}

/**
 * Builds the request handler. The store is passed in so tests can run without a database.
 * `now` gives the current time; tests pass a fixed one.
 */
export function createApp(store: WorkOrderStore, now: () => Date = () => new Date()) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/') {
        const status = readStatusFilter(url);
        if (status === null) return send(res, 400, 'text/plain', 'Unknown status');
        const client = readClientSearch(url);
        const { orders, openCount, today } = await listOrders(store, { status, client }, now());
        return send(res, 200, 'text/html; charset=utf-8', renderPage(orders, status, client, openCount, today));
      }
      if (req.method === 'GET' && url.pathname === '/api/work-orders') {
        const status = readStatusFilter(url);
        if (status === null) return send(res, 400, 'text/plain', 'Unknown status');
        const { orders } = await listOrders(store, { status, client: readClientSearch(url) }, now());
        return send(res, 200, 'application/json', JSON.stringify(orders));
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
