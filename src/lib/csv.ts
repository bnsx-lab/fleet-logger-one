// Exportação CSV robusta. Escapa aspas, quebras de linha, vírgulas e ponto-e-vírgulas.
const escapeField = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",;\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => unknown;
};

export const buildCsv = <T,>(rows: T[], columns: CsvColumn<T>[]): string => {
  const head = columns.map((c) => escapeField(c.header)).join(";");
  const body = rows
    .map((r) => columns.map((c) => escapeField(c.accessor(r))).join(";"))
    .join("\n");
  return `${head}\n${body}`;
};

export const downloadCsv = (filename: string, csv: string) => {
  // BOM para Excel reconhecer UTF-8
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberar memória
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
