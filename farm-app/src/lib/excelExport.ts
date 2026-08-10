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

export async function exportRowsToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  columnWidths?: number[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Marder Çiftlik Yönetimi";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName);
  styleDataSheet(sheet, headers, rows, { columnWidths });

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
