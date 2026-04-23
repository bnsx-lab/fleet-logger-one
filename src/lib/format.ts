export const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  // Para DATE puro (YYYY-MM-DD) evita timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  return new Date(iso).toLocaleDateString("pt-BR");
};

export const formatNumber = (n: number | null | undefined) => {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("pt-BR");
};
