export function money(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(value || 0));
}

export function dateTime(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

export function dateOnly(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export function queryString(values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
