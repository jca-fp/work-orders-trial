export type Status = 'open' | 'in_progress' | 'closed';

export interface WorkOrder {
  id: number;
  title: string;
  client: string;
  status: Status;
  /** Calendar date, written YYYY-MM-DD. It has no time and no time zone. */
  dueDate: string;
}
