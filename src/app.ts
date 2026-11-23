import type { IncomingMessage, ServerResponse } from 'node:http';
import { notifyClient } from './notify.js';
import { renderPage } from './page.js';
import { sortWorkOrders } from './sort.js';
import type { WorkOrderStore } from './store.js';

function send(res: ServerResponse, status: number, type: string, body: string): void {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

/** Builds the request handler. The store is passed in so tests can run without a database. */
export function createApp(store: WorkOrderStore) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/') {
        return send(res, 200, 'text/html; charset=utf-8', renderPage(sortWorkOrders(await store.list())));
      }
      if (req.method === 'GET' && url.pathname === '/api/work-orders') {
        return send(res, 200, 'application/json', JSON.stringify(sortWorkOrders(await store.list())));
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
