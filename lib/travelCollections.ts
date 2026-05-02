export function formatTripDateValue(value?: string | null) {
  const date = parseDateOnly(value);
  if (!date) return null;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTripDateRange(startDate?: string | null, endDate?: string | null) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start && !end) return null;
  if (start && !end) return `Starts ${formatTripDateValue(startDate)}`;
  if (!start && end) return `Ends ${formatTripDateValue(endDate)}`;

  const sameYear = start!.getFullYear() === end!.getFullYear();
  const sameMonth = sameYear && start!.getMonth() === end!.getMonth();

  if (sameMonth) {
    return `${new Intl.DateTimeFormat('en-US', {
      month: 'short',
    }).format(start!)} ${start!.getDate()}-${end!.getDate()}, ${start!.getFullYear()}`;
  }

  if (sameYear) {
    return `${new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(start!)} - ${new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(end!)}`;
  }

  return `${formatTripDateValue(startDate)} - ${formatTripDateValue(endDate)}`;
}

export function toIsoDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  const [year, month, day] = normalized.split('-').map((entry) => Number(entry));
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}
