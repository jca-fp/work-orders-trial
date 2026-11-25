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

const CHOICES: [Status | 'all', string][] = [
  ['all', 'All'],
  ['in_progress', STATUS_LABEL.in_progress],
  ['open', STATUS_LABEL.open],
  ['closed', STATUS_LABEL.closed],
];

/** The address of the list for a status, keeping the client search when there is one. */
function listHref(status: Status | 'all', client: string): string {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (client !== '') params.set('client', client);
  const query = params.toString();
  return query === '' ? '/' : `/?${query}`;
}

function filterControl(filter: Status | 'all', client: string): string {
  const links = CHOICES.map(
    ([choice, label]) =>
      `<a href="${escapeHtml(listHref(choice, client))}"${choice === filter ? ' aria-current="page"' : ''}>${label}</a>`,
  );
  return `<nav aria-label="Filter by status">${links.join(' | ')}</nav>`;
}

function searchControl(filter: Status | 'all', client: string): string {
  const status = filter === 'all' ? '' : `\n    <input type="hidden" name="status" value="${filter}">`;
  return `<form role="search" method="get" action="/">
    <label>Client <input type="search" name="client" value="${escapeHtml(client)}"></label>${status}
    <button>Search</button>
  </form>`;
}

export function renderPage(orders: WorkOrder[], filter: Status | 'all' = 'all', client = ''): string {
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
    form[role="search"] { margin-bottom: 0.5rem; }
    nav a[aria-current="page"] { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Work orders</h1>
  ${searchControl(filter, client)}
  ${filterControl(filter, client)}
  <p class="count">${orders.length} ${orders.length === 1 ? 'order' : 'orders'} listed</p>
  <table>
    <thead><tr><th>No.</th><th>Title</th><th>Client</th><th>Status</th><th>Due</th><th></th></tr></thead>
    <tbody>
    ${orders.map(row).join('\n    ')}
    </tbody>
  </table>
</body>
</html>`;
}
