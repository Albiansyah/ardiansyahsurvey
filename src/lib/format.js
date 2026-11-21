export const formatWibDateTime = (value = new Date()) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short"
  }).format(new Date(value));

export const formatShortWib = (value) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));

export const getWibPeriod = () =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    month: "long",
    year: "numeric"
  }).format(new Date());

export const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const rawValues = [lat1, lon1, lat2, lon2];
  if (rawValues.some((value) => value === null || value === undefined || value === "")) return null;
  const values = rawValues.map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const toRad = (value) => value * Math.PI / 180;
  const [aLat, aLon, bLat, bLon] = values;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
