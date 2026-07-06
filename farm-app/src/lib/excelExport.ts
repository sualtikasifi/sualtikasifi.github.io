import ExcelJS from "exceljs";

const BRAND_GREEN = "FF166534";
const HEADER_TEXT = "FFFFFFFF";
const BAND_FILL = "FFF3F4F6";
const BORDER_COLOR = "FFD4D4D4";

const THIN_BORDER = {
  top: { style: "thin" as const, color: { argb: BORDER_COLOR } },
  left: { style: "thin" as const, color: { argb: BORDER_COLOR } },
  bottom: { style: "thin" as const, color: { argb: BORDER_COLOR } },
  right: { style: "thin" as const, color: { argb: BORDER_COLOR } },
};

function styleDataSheet(
  sheet: ExcelJS.Worksheet,
  headers: string[],
  rows: (string | number | null)[][],
  opts: { percentColumns?: number[]; columnWidths?: number[] } = {}
) {
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_GREEN } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 22;

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.addRow(row.map((v) => v ?? ""));
    excelRow.eachCell((cell, colNumber) => {
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle" };
      if (rowIndex % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_FILL } };
      }
      if (opts.percentColumns?.includes(colNumber - 1)) {
        cell.numFmt = "0.0%";
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
    });
  });

  sheet.columns.forEach((col, i) => {
    col.width = opts.columnWidths?.[i] ?? Math.max(12, Math.min(28, (headers[i]?.length ?? 12) + 4));
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
}

export interface OpuReportKeyValue {
  label: string;
  value: string | number;
  percent?: boolean;
}

export interface OpuReportInput {
  filename: string;
  reportTitle: string;
  generatedAtLabel: string;
  dateRangeLabel: string;
  summary: OpuReportKeyValue[];
  sessionHeaders: string[];
  sessionRows: (string | number | null)[][];
  sessionPercentColumns: number[];
  technicianHeaders: string[];
  technicianRows: (string | number | null)[][];
  technicianPercentColumns: number[];
  donorHeaders: string[];
  donorRows: (string | number | null)[][];
}

export async function exportOpuReportToExcel(input: OpuReportInput): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Marder Çiftlik Yönetimi";
  workbook.created = new Date();

  // --- Özet ---
  const summarySheet = workbook.addWorksheet("Özet");
  summarySheet.mergeCells("A1:B1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = input.reportTitle;
  titleCell.font = { bold: true, size: 16, color: { argb: BRAND_GREEN } };
  titleCell.alignment = { vertical: "middle" };
  summarySheet.getRow(1).height = 28;

  summarySheet.mergeCells("A2:B2");
  const subtitleCell = summarySheet.getCell("A2");
  subtitleCell.value = `${input.dateRangeLabel} · Oluşturulma: ${input.generatedAtLabel}`;
  subtitleCell.font = { italic: true, size: 10, color: { argb: "FF737373" } };

  summarySheet.addRow([]);
  const summaryHeaderRow = summarySheet.addRow(["Gösterge", "Değer"]);
  summaryHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_GREEN } };
    cell.border = THIN_BORDER;
  });

  input.summary.forEach((kv, i) => {
    const row = summarySheet.addRow([kv.label, kv.value]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).border = THIN_BORDER;
    row.getCell(2).border = THIN_BORDER;
    row.getCell(2).alignment = { horizontal: "right" };
    if (kv.percent) row.getCell(2).numFmt = "0.0%";
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_FILL } };
      });
    }
  });
  summarySheet.getColumn(1).width = 32;
  summarySheet.getColumn(2).width = 20;

  // --- OPU Seansları ---
  const sessionSheet = workbook.addWorksheet("OPU Seansları");
  styleDataSheet(sessionSheet, input.sessionHeaders, input.sessionRows, {
    percentColumns: input.sessionPercentColumns,
  });

  // --- Veteriner Performansı ---
  const techSheet = workbook.addWorksheet("Veteriner Performansı");
  styleDataSheet(techSheet, input.technicianHeaders, input.technicianRows, {
    percentColumns: input.technicianPercentColumns,
  });

  // --- Donör Verimleri ---
  const donorSheet = workbook.addWorksheet("Donör Verimleri");
  styleDataSheet(donorSheet, input.donorHeaders, input.donorRows, {});

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = input.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportRowsToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
