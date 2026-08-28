export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalDatetimeValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function fromLocalDatetimeValue(value: string): string {
  // datetime-local gives "YYYY-MM-DDTHH:mm" in the browser's local timezone.
  // Parsing that string as a Date treats it as local time; toISOString() converts
  // to the UTC Instant the API requires.
  if (!value) return '';
  const date = new Date(value);
  return date.toISOString();
}
