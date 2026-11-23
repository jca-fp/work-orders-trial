import { formatDueDate } from './dates.js';
import type { Status, WorkOrder } from './types.js';

const STATUS_LABEL: Record<Status, string> = { open: 'Open', in_progress: 'In progress', closed: 'Closed' };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

function row(order: WorkOrder): string {
  const action =
    order.status === 'closed'
      ? ''
      : `<form method="post" action="/work-orders/${order.id}/close"><button>Close</button></form>`;
  return `<tr data-status="${order.status}">
      <td>#${order.id}</td>
      <td>${escapeHtml(order.title)}</td>
      <td>${escapeHtml(order.client)}</td>
      <td>${STATUS_LABEL[order.status]}</td>
      <td>${formatDueDate(order.dueDate)}</td>
      <td>${action}</td>
    </tr>`;
}

export function renderPage(orders: WorkOrder[]): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Work orders</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 56rem; padding: 0 1rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    tr[data-status="closed"] { color: #888; }
  </style>
</head>
<body>
  <h1>Work orders</h1>
  <table>
    <thead><tr><th>No.</th><th>Title</th><th>Client</th><th>Status</th><th>Due</th><th></th></tr></thead>
    <tbody>
    ${orders.map(row).join('\n    ')}
    </tbody>
  </table>
</body>
</html>`;
}
