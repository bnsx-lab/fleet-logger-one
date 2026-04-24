import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfColumn<T> = {
  header: string;
  accessor: (row: T) => string | number;
};

export const exportPdf = <T,>(
  filename: string,
  title: string,
  rows: T[],
  columns: PdfColumn<T>[],
  subtitle?: string,
) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  // Cabeçalho
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("ASERP — " + title, 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  const now = new Date().toLocaleString("pt-BR");
  doc.text(`Gerado em ${now}${subtitle ? " · " + subtitle : ""}`, 40, 58);
  doc.text(`Total de registros: ${rows.length}`, 40, 72);

  autoTable(doc, {
    startY: 90,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(c.accessor(r) ?? ""))),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [241, 105, 28], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 40, right: 40 },
  });

  doc.save(filename);
};
