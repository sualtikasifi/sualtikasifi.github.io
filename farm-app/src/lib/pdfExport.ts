import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND_GREEN: [number, number, number] = [22, 101, 52];
const TEXT_DARK: [number, number, number] = [23, 23, 23];
const MARGIN_X = 40;

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

// Marka basligini (yesil serit + baslik + alt bilgi satirlari) cizer ve
// icerigin baslayacagi Y konumunu dondurur.
function drawReportHeader(doc: jsPDF, title: string, subtitleLines: string[]): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerHeight = 50 + subtitleLines.length * 15;

  doc.setFillColor(...BRAND_GREEN);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(tr(title), MARGIN_X, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  subtitleLines.forEach((line, i) => doc.text(tr(line), MARGIN_X, 50 + i * 15));

  doc.setTextColor(...TEXT_DARK);
  return headerHeight + 22;
}

function drawSectionTitle(doc: jsPDF, cursorY: number, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(tr(title), MARGIN_X, cursorY);
  return cursorY + 8;
}

// Bir sonraki bolum en az bir baslik + bir kac satirlik yer kaplayacaksa ve
// sayfada bu kadar yer kalmadiysa yeni sayfaya gecer - coklu tablolu uzun
// raporlarda bolum basliklarinin sayfa altina sikismasini engeller.
function ensureSpace(doc: jsPDF, cursorY: number, needed = 70): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (cursorY + needed > pageHeight - 30) {
    doc.addPage();
    return 40;
  }
  return cursorY;
}

function drawTable(
  doc: jsPDF,
  startY: number,
  head: string[],
  body: (string | number)[][],
  options?: { fontSize?: number; rightAlignFrom?: number; centerAlignFrom?: number }
): number {
  const { rightAlignFrom, centerAlignFrom } = options ?? {};
  const alignFrom = rightAlignFrom ?? centerAlignFrom;
  const halign = rightAlignFrom !== undefined ? ("right" as const) : ("center" as const);
  autoTable(doc, {
    startY,
    margin: { left: MARGIN_X, right: MARGIN_X },
    head: [head.map(tr)],
    body: body.map(trRow),
    theme: "grid",
    headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: options?.fontSize ?? 9, cellPadding: 4 },
    columnStyles:
      alignFrom !== undefined
        ? Object.fromEntries(head.slice(alignFrom).map((_, i) => [i + alignFrom, { halign }]))
        : undefined,
  });
  return lastTableEndY(doc, startY);
}

// Serbest metni (AI analizi gibi) sayfa genisligine gore satirlara boler ve
// gerektiginde yeni sayfaya gecerek yazar.
function drawWrappedText(doc: jsPDF, startY: number, text: string, options?: { fontSize?: number }): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - MARGIN_X * 2;
  const fontSize = options?.fontSize ?? 9;
  const lineHeight = fontSize * 1.35;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  let cursorY = startY;
  for (const paragraph of tr(text).split("\n")) {
    const lines: string[] = paragraph.trim() === "" ? [""] : doc.splitTextToSize(paragraph, maxWidth);
    for (const line of lines) {
      cursorY = ensureSpace(doc, cursorY, lineHeight + 10);
      doc.text(line, MARGIN_X, cursorY);
      cursorY += lineHeight;
    }
  }
  return cursorY;
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
  aiAnalysis?: string | null;
}

export function exportOpuBatchReportToPdf(input: OpuBatchPdfInput): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  let cursorY = drawReportHeader(doc, "Marder Çiftlik — OPU Günü Raporu", [
    `${input.batchDateLabel}  ·  Oluşturulma: ${input.generatedAtLabel}`,
    `Veteriner Hekim/Tekniker: ${input.technicianNames.length > 0 ? input.technicianNames.join(", ") : "Belirtilmemiş"}`,
  ]);

  cursorY = drawSectionTitle(doc, cursorY, "Özet");
  cursorY =
    drawTable(
      doc,
      cursorY,
      ["Gösterge", "Değer"],
      input.summary.map((s) => [s.label, s.value]),
      { fontSize: 10, rightAlignFrom: 1 }
    ) + 26;

  cursorY = drawSectionTitle(doc, cursorY, "Donör Bazlı Toplama (Verim)");
  cursorY = drawTable(doc, cursorY, input.donorHeaders, input.donorRows, { centerAlignFrom: 1 });

  if (input.aiAnalysis) {
    cursorY = ensureSpace(doc, cursorY, 60) + 26;
    cursorY = drawSectionTitle(doc, cursorY, "AI OPU Asistan Analizi");
    cursorY = drawWrappedText(doc, cursorY + 4, input.aiAnalysis);
  }

  if (input.notes) {
    const finalY = cursorY + 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(tr(`Not: ${input.notes}`), MARGIN_X, finalY, { maxWidth: pageWidth - MARGIN_X * 2 });
  }

  doc.save(input.filename);
}

export interface DonorYieldPdfInput {
  filename: string;
  generatedAtLabel: string;
  dateRangeLabel: string;
  headers: string[];
  rows: (string | number)[][];
}

export function exportDonorYieldReportToPdf(input: DonorYieldPdfInput): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let cursorY = drawReportHeader(doc, "Marder Çiftlik — Donör Verimleri Raporu", [
    `${input.dateRangeLabel}  ·  Oluşturulma: ${input.generatedAtLabel}`,
  ]);

  cursorY = drawSectionTitle(doc, cursorY, "Donör Verimleri");
  drawTable(doc, cursorY, input.headers, input.rows, { rightAlignFrom: 1 });

  doc.save(input.filename);
}

export interface OpuStatsPdfInput {
  filename: string;
  generatedAtLabel: string;
  dateRangeLabel: string;
  summary: { label: string; value: string }[];
  batchHeaders: string[];
  batchRows: (string | number)[][];
  technicianHeaders: string[];
  technicianRows: (string | number)[][];
  donorHeaders: string[];
  donorRows: (string | number)[][];
}

export function exportOpuStatsReportToPdf(input: OpuStatsPdfInput): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let cursorY = drawReportHeader(doc, "Marder Çiftlik — OPU İstatistikleri Raporu", [
    `${input.dateRangeLabel}  ·  Oluşturulma: ${input.generatedAtLabel}`,
  ]);

  cursorY = drawSectionTitle(doc, cursorY, "Genel Özet");
  cursorY =
    drawTable(
      doc,
      cursorY,
      ["Gösterge", "Değer"],
      input.summary.map((s) => [s.label, s.value]),
      { fontSize: 10, rightAlignFrom: 1 }
    ) + 26;

  cursorY = ensureSpace(doc, cursorY);
  cursorY = drawSectionTitle(doc, cursorY, "Gün Bazlı Havuz Performansı");
  cursorY = drawTable(doc, cursorY, input.batchHeaders, input.batchRows, { fontSize: 8 }) + 26;

  cursorY = ensureSpace(doc, cursorY);
  cursorY = drawSectionTitle(doc, cursorY, "Veteriner Hekim/Tekniker Başarı Oranları");
  cursorY = drawTable(doc, cursorY, input.technicianHeaders, input.technicianRows) + 26;

  cursorY = ensureSpace(doc, cursorY);
  cursorY = drawSectionTitle(doc, cursorY, "Donör Verimleri");
  drawTable(doc, cursorY, input.donorHeaders, input.donorRows, { fontSize: 8 });

  doc.save(input.filename);
}

export interface OpuDaysPdfInput {
  filename: string;
  generatedAtLabel: string;
  headers: string[];
  rows: (string | number)[][];
}

export function exportOpuDaysReportToPdf(input: OpuDaysPdfInput): void {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });

  const cursorY = drawReportHeader(doc, "Marder Çiftlik — OPU Günleri Raporu", [
    `Oluşturulma: ${input.generatedAtLabel}`,
  ]);
  const titleY = drawSectionTitle(doc, cursorY, "Gün Bazlı Özet");
  drawTable(doc, titleY, input.headers, input.rows, { fontSize: 8 });

  doc.save(input.filename);
}
