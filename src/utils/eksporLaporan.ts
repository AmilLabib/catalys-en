// Ekspor laporan keuangan ke Excel (.xlsx) dan PDF. Library dimuat saat
// tombol ditekan supaya tidak memperberat halaman.
import type { Laporan } from "../data/laporan";
import { labelPeriode } from "../data/laporan";
import { susunCalk, susunTabel, type Baris } from "../data/laporanTabel";

export const namaFile = (lap: Laporan, ext: string) =>
  `Laporan-Keuangan_${lap.entitas.replace(/\s+/g, "-")}_${lap.periode ? `${lap.periode.dari}_sd_${lap.periode.sampai}` : lap.tahun}.${ext}`;

const rp = (v: number | undefined) => {
  if (v === undefined) return "";
  const s = Math.abs(Math.round(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return v < 0 ? `(${s})` : s;
};

export async function eksporExcel(lap: Laporan, namaUsaha: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  for (const t of susunTabel(lap)) {
    const rows: (string | number)[][] = [
      [namaUsaha],
      [t.judul],
      [`${lap.entitas} · ${labelPeriode(lap)}`],
      ["(dalam Rupiah)"],
      [],
      ["Keterangan", t.kolom[0], t.key === "ekuitas" ? "" : t.kolom[1]],
      ...t.baris.map((b: Baris) => [
        (b.tipe === "baris" ? "    " : "") + b.label,
        b.nilai ?? "",
        b.lalu ?? "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 52 }, { wch: 20 }, { wch: 20 }];
    // format angka ribuan, negatif dalam kurung
    for (let r = 6; r < rows.length; r++) {
      for (const c of [1, 2]) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref] && typeof ws[ref].v === "number") ws[ref].z = "#,##0;(#,##0)";
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, t.judul.replace("Laporan ", "").slice(0, 31));
  }

  const calk = susunCalk(lap, namaUsaha).flatMap((c) => [[c.judul], ...c.isi.map((x) => [x]), []]);
  const wsCalk = XLSX.utils.aoa_to_sheet([[namaUsaha], ["Catatan atas Laporan Keuangan"], [], ...calk]);
  wsCalk["!cols"] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(wb, wsCalk, "CALK");

  XLSX.writeFile(wb, namaFile(lap, "xlsx"));
}

export async function eksporPdf(lap: Laporan, namaUsaha: string) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const lebar = doc.internal.pageSize.getWidth();

  susunTabel(lap).forEach((t, idx) => {
    if (idx > 0) doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(namaUsaha, lebar / 2, 48, { align: "center" });
    doc.setFontSize(12);
    doc.text(t.judul, lebar / 2, 66, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${lap.entitas} · ${labelPeriode(lap)} · dalam Rupiah`, lebar / 2, 82, { align: "center" });

    const satuKolom = t.key === "ekuitas";
    autoTable(doc, {
      startY: 96,
      head: [satuKolom ? ["Keterangan", t.kolom[0]] : ["Keterangan", t.kolom[0], t.kolom[1]]],
      body: t.baris.map((b) => {
        const label = (b.tipe === "baris" ? "   " : "") + b.label;
        return satuKolom ? [label, rp(b.nilai)] : [label, rp(b.nilai), rp(b.lalu)];
      }),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [1, 42, 61], textColor: 255, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const b = t.baris[data.row.index];
        if (b.tipe === "judul" || b.tipe === "subjudul") data.cell.styles.fontStyle = "bold";
        if (b.tipe === "total") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [225, 236, 243];
        }
        if (b.tipe === "subtotal") data.cell.styles.fontStyle = "bold";
      },
    });
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Catatan atas Laporan Keuangan", lebar / 2, 48, { align: "center" });
  let y = 76;
  for (const c of susunCalk(lap, namaUsaha)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(c.judul, 48, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const p of c.isi) {
      const lines = doc.splitTextToSize(p, lebar - 96);
      doc.text(lines, 48, y);
      y += lines.length * 12 + 4;
    }
    y += 8;
  }

  doc.save(namaFile(lap, "pdf"));
}
