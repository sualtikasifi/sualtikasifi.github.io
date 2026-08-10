import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND_GREEN: [number, number, number] = [22, 101, 52];
const TEXT_DARK: [number, number, number] = [23, 23, 23];

// jsPDF'in gomulu (Helvetica) fontlari yalnizca WinAnsi kodlamasini destekler:
// ö/ü/ç dogru basiliyor ama i (noktasiz), s, g Turkce karakterleri
// desteklenmiyor ve kirik/eksik gorunuyor - PDF ciktisinda bu harfleri
// en yakin ASCII karsiliklarina ceviriyoruz.
const TR_FONT_FALLBACK: Record<string, string> = {
  ı: "i",
  İ: "I",
  ş: "s",
  Ş: "S",
  ğ: "g",
  Ğ: "G",
};

function tr(text: string): string {
  return text.replace(/[ışŞğĞİ]/g, (ch) => TR_FONT_FALLBACK[ch] ?? ch);
}

function trCell(cell: string | number): string | number {
  return typeof cell === "string" ? tr(cell) : cell;
}

function trRow(row: (string | number)[]): (string | number)[] {
  return row.map(trCell);
}

// jspdf-autotable, her cagrida jsPDF orneginin uzerine calisma zamaninda
// "lastAutoTable" ekler ama bunu tip tanimlarina dahil etmiyor - bir
// sonraki tablonun/metnin nereden baslayacagini bulmak icin kullaniyoruz.
function lastTableEndY(doc: jsPDF, fallback: number): number {
  const withLastTable = doc as unknown as { lastAutoTable?: { finalY: number } };
  return withLastTable.lastAutoTable?.finalY ?? fallback;
}

export interface OpuBatchPdfInput {
  filename: string;
  batchDateLabel: string;
  generatedAtLabel: string;
  technicianNames: string[];
  summary: { label: string; value: string }[];
  donorHeaders: string[];
  donorRows: (string | number)[][];
  notes?: string | null;
}

export function exportOpuBatchReportToPdf(input: OpuBatchPdfInput): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  doc.setFillColor(...BRAND_GREEN);
  doc.rect(0, 0, pageWidth, 74, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(tr("Marder Çiftlik — OPU Günü Raporu"), marginX, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(tr(`${input.batchDateLabel}  ·  Oluşturulma: ${input.generatedAtLabel}`), marginX, 50);
  doc.text(
    tr(
      `Veteriner Hekim/Tekniker: ${input.technicianNames.length > 0 ? input.technicianNames.join(", ") : "Belirtilmemiş"}`
    ),
    marginX,
    65
  );

  doc.setTextColor(...TEXT_DARK);

  let cursorY = 96;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(tr("Özet"), marginX, cursorY);
  cursorY += 8;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [[tr("Gösterge"), tr("Değer")]],
    body: input.summary.map((s) => trRow([s.label, s.value])),
    theme: "grid",
    headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: { 1: { halign: "right" } },
  });

  cursorY = lastTableEndY(doc, cursorY) + 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(tr("Donör Bazlı Toplama (Verim)"), marginX, cursorY);
  cursorY += 8;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [input.donorHeaders.map(tr)],
    body: input.donorRows.map(trRow),
    theme: "grid",
    headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  if (input.notes) {
    const finalY = lastTableEndY(doc, cursorY) + 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(tr(`Not: ${input.notes}`), marginX, finalY, { maxWidth: pageWidth - marginX * 2 });
  }

  doc.save(input.filename);
}
