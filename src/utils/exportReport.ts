// Export financial reports to Excel (.xlsx) and PDF. Libraries are loaded when
// the button is pressed so they don't weigh down the page.
import type { Report } from "../data/reports";
import { periodLabel } from "../data/reports";
import { buildNotes, buildTables, type Row } from "../data/reportTables";

export const fileName = (rep: Report, ext: string) =>
  `Financial-Report_${rep.entity.replace(/\s+/g, "-")}_${rep.period ? `${rep.period.from}_to_${rep.period.to}` : rep.year}.${ext}`;

const rp = (v: number | undefined) => {
  if (v === undefined) return "";
  const s = Math.abs(Math.round(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return v < 0 ? `(${s})` : s;
};

export async function exportExcel(rep: Report, businessName: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  for (const t of buildTables(rep)) {
    const rows: (string | number)[][] = [
      [businessName],
      [t.title],
      [`${rep.entity} · ${periodLabel(rep)}`],
      ["(in Rupiah)"],
      [],
      ["Description", t.columns[0], t.key === "equity" ? "" : t.columns[1]],
      ...t.rows.map((b: Row) => [
        (b.type === "row" ? "    " : "") + b.label,
        b.value ?? "",
        b.prev ?? "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 52 }, { wch: 20 }, { wch: 20 }];
    // thousands number format, negatives in parentheses
    for (let r = 6; r < rows.length; r++) {
      for (const c of [1, 2]) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref] && typeof ws[ref].v === "number") ws[ref].z = "#,##0;(#,##0)";
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, t.title.replace(/^Statement of /, "").slice(0, 31));
  }

  const notes = buildNotes(rep, businessName).flatMap((c) => [[c.title], ...c.items.map((x) => [x]), []]);
  const wsNotes = XLSX.utils.aoa_to_sheet([[businessName], ["Notes to the Financial Statements"], [], ...notes]);
  wsNotes["!cols"] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(wb, wsNotes, "Notes");

  XLSX.writeFile(wb, fileName(rep, "xlsx"));
}

export async function exportPdf(rep: Report, businessName: string) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();

  buildTables(rep).forEach((t, idx) => {
    if (idx > 0) doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(businessName, width / 2, 48, { align: "center" });
    doc.setFontSize(12);
    doc.text(t.title, width / 2, 66, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${rep.entity} · ${periodLabel(rep)} · in Rupiah`, width / 2, 82, { align: "center" });

    const singleColumn = t.key === "equity";
    autoTable(doc, {
      startY: 96,
      head: [singleColumn ? ["Description", t.columns[0]] : ["Description", t.columns[0], t.columns[1]]],
      body: t.rows.map((b) => {
        const label = (b.type === "row" ? "   " : "") + b.label;
        return singleColumn ? [label, rp(b.value)] : [label, rp(b.value), rp(b.prev)];
      }),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [1, 42, 61], textColor: 255, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const b = t.rows[data.row.index];
        if (b.type === "title" || b.type === "subtitle") data.cell.styles.fontStyle = "bold";
        if (b.type === "total") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [225, 236, 243];
        }
        if (b.type === "subtotal") data.cell.styles.fontStyle = "bold";
      },
    });
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Notes to the Financial Statements", width / 2, 48, { align: "center" });
  let y = 76;
  for (const c of buildNotes(rep, businessName)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(c.title, 48, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const p of c.items) {
      const lines = doc.splitTextToSize(p, width - 96);
      doc.text(lines, 48, y);
      y += lines.length * 12 + 4;
    }
    y += 8;
  }

  doc.save(fileName(rep, "pdf"));
}
