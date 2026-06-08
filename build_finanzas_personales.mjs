import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/finanzas_personales";
const outputPath = `${outputDir}/finanzas_personales_hogar.xlsx`;

const wb = Workbook.create();
const dashboard = wb.worksheets.add("Dashboard");
const movimientos = wb.worksheets.add("Movimientos");
const fijos = wb.worksheets.add("Gastos Fijos");
const mercado = wb.worksheets.add("Mercado");

const colors = {
  bg: "#F7F8FA",
  ink: "#172033",
  muted: "#667085",
  line: "#D9E1EC",
  card: "#FFFFFF",
  primary: "#2563EB",
  primarySoft: "#DBEAFE",
  teal: "#0F766E",
  tealSoft: "#CCFBF1",
  yellow: "#FEF3C7",
  red: "#FEE2E2",
  redInk: "#991B1B",
  green: "#DCFCE7",
  greenInk: "#166534",
  orangeInk: "#92400E",
  slate: "#344054",
};

function styleTitle(sheet, range, title, subtitle = "") {
  const r = sheet.getRange(range);
  r.merge();
  sheet.getRange(range.split(":")[0]).values = [[title + (subtitle ? `\n${subtitle}` : "")]];
  r.format = {
    fill: colors.ink,
    font: { bold: true, color: "#FFFFFF", size: 18 },
    wrapText: true,
    horizontalAlignment: "left",
    verticalAlignment: "middle",
  };
}

function setWidths(sheet, widths) {
  widths.forEach((px, i) => {
    sheet.getRangeByIndexes(0, i, 1, 1).format.columnWidthPx = px;
  });
}

function setRowPx(sheet, startRow, endRow, px) {
  for (let row = startRow; row <= endRow; row++) {
    sheet.getRangeByIndexes(row - 1, 0, 1, 1).format.rowHeightPx = px;
  }
}

function header(range) {
  range.format = {
    fill: colors.ink,
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    borders: { preset: "all", style: "thin", color: colors.line },
  };
}

function section(range, text, fill = colors.primarySoft, fontColor = colors.ink) {
  range.merge();
  range.getCell(0, 0).values = [[text]];
  range.format = {
    fill,
    font: { bold: true, color: fontColor, size: 12 },
    horizontalAlignment: "left",
    verticalAlignment: "middle",
    borders: { preset: "outside", style: "thin", color: colors.line },
  };
}

function card(sheet, range, labelCell, valueCell, label, formula, fill, accent) {
  const box = sheet.getRange(range);
  box.format = {
    fill,
    borders: { preset: "outside", style: "medium", color: accent },
    verticalAlignment: "middle",
  };
  sheet.getRange(labelCell).merge();
  sheet.getRange(labelCell.split(":")[0]).values = [[label]];
  sheet.getRange(labelCell).format = {
    fill,
    font: { bold: true, color: colors.muted, size: 10 },
    horizontalAlignment: "center",
  };
  sheet.getRange(valueCell).merge();
  sheet.getRange(valueCell.split(":")[0]).formulas = [[formula]];
  sheet.getRange(valueCell).format = {
    fill,
    font: { bold: true, color: colors.ink, size: 16 },
    numberFormat: "$#,##0.00",
    horizontalAlignment: "center",
  };
}

for (const s of [dashboard, movimientos, fijos, mercado]) {
  s.showGridLines = false;
}

// Movimientos
setWidths(movimientos, [115, 115, 150, 250, 115, 115]);
styleTitle(movimientos, "A1:F2", "Movimientos", "Registra ingresos y gastos variables. El mes se calcula automáticamente.");
movimientos.getRange("A4:F4").values = [["Fecha", "Tipo", "Categoría", "Descripción", "Monto", "Mes"]];
header(movimientos.getRange("A4:F4"));
movimientos.getRange("A5:F16").values = [
  [new Date("2026-06-01"), "Ingreso", "Otros", "Salario", 2500, null],
  [new Date("2026-06-02"), "Gasto", "Mercado", "Supermercado semanal", 82.35, null],
  [new Date("2026-06-03"), "Gasto", "Transporte", "Gasolina", 45, null],
  [new Date("2026-06-04"), "Gasto", "Comidas", "Cena fuera", 28.5, null],
  [new Date("2026-06-05"), "Gasto", "Mascotas", "Alimento mascota", 31.9, null],
  [new Date("2026-06-06"), "Gasto", "Salud", "Farmacia", 18.75, null],
  [new Date("2026-06-07"), "Gasto", "Entretenimiento", "Cine", 22, null],
  [new Date("2026-06-08"), "Gasto", "Mercado", "Frutas y verduras", 36.2, null],
  [new Date("2026-05-01"), "Ingreso", "Otros", "Salario", 2500, null],
  [new Date("2026-05-10"), "Gasto", "Mercado", "Compra mensual", 145.8, null],
  [new Date("2026-05-15"), "Gasto", "Ropa", "Camisa", 39.9, null],
  [new Date("2026-05-21"), "Gasto", "Otros", "Regalo", 25, null],
];
movimientos.getRange("F5").formulas = [["=IF(A5=\"\",\"\",CHOOSE(MONTH(A5),\"enero\",\"febrero\",\"marzo\",\"abril\",\"mayo\",\"junio\",\"julio\",\"agosto\",\"septiembre\",\"octubre\",\"noviembre\",\"diciembre\"))"]];
movimientos.getRange("F5:F204").fillDown();
movimientos.getRange("A5:A204").format.numberFormat = "dd/mm/yyyy";
movimientos.getRange("E5:E204").format.numberFormat = "$#,##0.00";
movimientos.getRange("A4:F204").format.borders = { preset: "all", style: "thin", color: colors.line };
movimientos.getRange("A5:F204").format.fill = "#FFFFFF";
movimientos.tables.add("A4:F204", true, "tblMovimientos").style = "TableStyleMedium2";
movimientos.getRange("B5:B204").dataValidation = { rule: { type: "list", values: ["Ingreso", "Gasto"] } };
movimientos.getRange("C5:C204").dataValidation = {
  rule: { type: "list", values: ["Mercado", "Transporte", "Comidas", "Entretenimiento", "Salud", "Mascotas", "Ropa", "Otros"] },
};
movimientos.freezePanes.freezeRows(4);

// Gastos Fijos
setWidths(fijos, [190, 115, 105, 145, 125, 120]);
styleTitle(fijos, "A1:F2", "Gastos Fijos", "Pagos recurrentes separados de tus gastos variables.");
fijos.getRange("A4:F4").values = [["Concepto", "Monto", "Día de pago", "Fecha de vencimiento", "Días restantes", "Estado"]];
header(fijos.getRange("A4:F4"));
fijos.getRange("A5:D12").values = [
  ["Renta", 850, 1, new Date("2026-06-01")],
  ["Internet", 45, 10, new Date("2026-06-10")],
  ["Teléfono", 30, 15, new Date("2026-06-15")],
  ["Gimnasio", 35, 20, new Date("2026-06-20")],
  ["Streaming", 18, 22, new Date("2026-06-22")],
  ["Seguro", 120, 25, new Date("2026-06-25")],
  ["Agua", 28, 28, new Date("2026-06-28")],
  ["Electricidad", 65, 30, new Date("2026-06-30")],
];
fijos.getRange("E5").formulas = [["=IF(D5=\"\",\"\",D5-TODAY())"]];
fijos.getRange("E5:E104").fillDown();
fijos.getRange("F5").formulas = [["=IF(A5=\"\",\"\",IF(E5<5,\"Urgente\",IF(E5<=10,\"Próximo\",\"OK\")))"]];
fijos.getRange("F5:F104").fillDown();
fijos.getRange("B5:B104").format.numberFormat = "$#,##0.00";
fijos.getRange("D5:D104").format.numberFormat = "dd/mm/yyyy";
fijos.getRange("A4:F104").format.borders = { preset: "all", style: "thin", color: colors.line };
fijos.getRange("A5:F104").format.fill = "#FFFFFF";
fijos.tables.add("A4:F104", true, "tblGastosFijos").style = "TableStyleMedium4";
fijos.getRange("F5:F104").conditionalFormats.add("containsText", { text: "OK", format: { fill: colors.green, font: { color: colors.greenInk, bold: true } } });
fijos.getRange("F5:F104").conditionalFormats.add("containsText", { text: "Próximo", format: { fill: colors.yellow, font: { color: colors.orangeInk, bold: true } } });
fijos.getRange("F5:F104").conditionalFormats.add("containsText", { text: "Urgente", format: { fill: colors.red, font: { color: colors.redInk, bold: true } } });
fijos.freezePanes.freezeRows(4);

// Mercado
setWidths(mercado, [175, 135, 135, 145, 130, 130, 115]);
styleTitle(mercado, "A1:G2", "Mercado", "Inventario básico del hogar y lista automática de reposición.");
mercado.getRange("A4:G4").values = [["Producto", "Categoría", "Último precio pagado", "Fecha última compra", "Cantidad actual", "Cantidad mínima", "Reponer"]];
header(mercado.getRange("A4:G4"));
mercado.getRange("A5:F16").values = [
  ["Leche", "Lácteos", 2.5, new Date("2026-06-05"), 1, 2],
  ["Huevos", "Despensa", 4, new Date("2026-06-03"), 12, 6],
  ["Arroz", "Despensa", 3.2, new Date("2026-05-29"), 1, 1],
  ["Café", "Despensa", 6.8, new Date("2026-06-01"), 0, 1],
  ["Papel higiénico", "Limpieza", 7.9, new Date("2026-05-28"), 3, 4],
  ["Detergente", "Limpieza", 5.5, new Date("2026-05-25"), 1, 1],
  ["Yogur", "Lácteos", 3.7, new Date("2026-06-06"), 4, 3],
  ["Pollo", "Carnes", 9.6, new Date("2026-06-04"), 1, 2],
  ["Pan", "Despensa", 1.9, new Date("2026-06-07"), 2, 2],
  ["Pasta", "Despensa", 2.1, new Date("2026-06-02"), 5, 3],
  ["Jabón", "Higiene", 2.8, new Date("2026-05-30"), 1, 2],
  ["Aceite", "Despensa", 5.2, new Date("2026-05-21"), 1, 1],
];
mercado.getRange("G5").formulas = [["=IF(A5=\"\",\"\",IF(E5<=F5,\"Sí\",\"No\"))"]];
mercado.getRange("G5:G104").fillDown();
mercado.getRange("C5:C104").format.numberFormat = "$#,##0.00";
mercado.getRange("D5:D104").format.numberFormat = "dd/mm/yyyy";
mercado.getRange("A4:G104").format.borders = { preset: "all", style: "thin", color: colors.line };
mercado.getRange("A5:G104").format.fill = "#FFFFFF";
mercado.tables.add("A4:G104", true, "tblMercado").style = "TableStyleMedium9";
mercado.getRange("G5:G104").conditionalFormats.add("containsText", { text: "Sí", format: { fill: colors.red, font: { color: colors.redInk, bold: true } } });
mercado.getRange("G5:G104").conditionalFormats.add("containsText", { text: "No", format: { fill: colors.green, font: { color: colors.greenInk, bold: true } } });
mercado.freezePanes.freezeRows(4);

// Dashboard
setWidths(dashboard, [34, 150, 150, 20, 150, 150, 100, 120, 155, 155, 155, 155, 155]);
dashboard.getRange("A1:M40").format.fill = colors.bg;
styleTitle(dashboard, "B2:M3", "Dashboard de Finanzas Personales", "Resumen mensual, próximos pagos y lista automática de compras pendientes.");
dashboard.getRange("B5").values = [["Mes seleccionado"]];
dashboard.getRange("B5").format = { fill: colors.primarySoft, font: { bold: true, color: colors.ink }, horizontalAlignment: "center" };
dashboard.getRange("C5").values = [["junio"]];
dashboard.getRange("C5").dataValidation = {
  rule: { type: "list", values: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] },
};
dashboard.getRange("C5").format = { fill: "#FFFFFF", font: { bold: true, color: colors.primary }, horizontalAlignment: "center", borders: { preset: "outside", style: "thin", color: colors.line } };

card(dashboard, "B7:C9", "B7:C7", "B8:C9", "Ingresos del mes", '=SUMIFS(Movimientos!$E$5:$E$204,Movimientos!$B$5:$B$204,"Ingreso",Movimientos!$F$5:$F$204,$C$5)', colors.card, colors.primary);
card(dashboard, "E7:F9", "E7:F7", "E8:F9", "Gastos variables", '=SUMIFS(Movimientos!$E$5:$E$204,Movimientos!$B$5:$B$204,"Gasto",Movimientos!$F$5:$F$204,$C$5)', colors.card, "#7C3AED");
card(dashboard, "H7:I9", "H7:I7", "H8:I9", "Gastos fijos", "=SUM('Gastos Fijos'!$B$5:$B$104)", colors.card, colors.teal);
card(dashboard, "K7:M9", "K7:M7", "K8:M9", "Total mercado", '=SUMIFS(Movimientos!$E$5:$E$204,Movimientos!$B$5:$B$204,"Gasto",Movimientos!$C$5:$C$204,"Mercado",Movimientos!$F$5:$F$204,$C$5)', colors.card, "#F59E0B");
card(dashboard, "B11:C13", "B11:C11", "B12:C13", "Dinero disponible", "=B8-H8-E8", colors.tealSoft, colors.teal);

section(dashboard.getRange("E11:I11"), "Próximos pagos");
dashboard.getRange("E12:H12").values = [["Concepto", "Fecha de pago", "Monto", "Estado"]];
header(dashboard.getRange("E12:H12"));
dashboard.getRange("E13:H20").formulas = [
  ["='Gastos Fijos'!A5", "=TEXT('Gastos Fijos'!D5,\"dd/mm/yyyy\")", "='Gastos Fijos'!B5", "='Gastos Fijos'!F5"],
  ["='Gastos Fijos'!A6", "=TEXT('Gastos Fijos'!D6,\"dd/mm/yyyy\")", "='Gastos Fijos'!B6", "='Gastos Fijos'!F6"],
  ["='Gastos Fijos'!A7", "=TEXT('Gastos Fijos'!D7,\"dd/mm/yyyy\")", "='Gastos Fijos'!B7", "='Gastos Fijos'!F7"],
  ["='Gastos Fijos'!A8", "=TEXT('Gastos Fijos'!D8,\"dd/mm/yyyy\")", "='Gastos Fijos'!B8", "='Gastos Fijos'!F8"],
  ["='Gastos Fijos'!A9", "=TEXT('Gastos Fijos'!D9,\"dd/mm/yyyy\")", "='Gastos Fijos'!B9", "='Gastos Fijos'!F9"],
  ["='Gastos Fijos'!A10", "=TEXT('Gastos Fijos'!D10,\"dd/mm/yyyy\")", "='Gastos Fijos'!B10", "='Gastos Fijos'!F10"],
  ["='Gastos Fijos'!A11", "=TEXT('Gastos Fijos'!D11,\"dd/mm/yyyy\")", "='Gastos Fijos'!B11", "='Gastos Fijos'!F11"],
  ["='Gastos Fijos'!A12", "=TEXT('Gastos Fijos'!D12,\"dd/mm/yyyy\")", "='Gastos Fijos'!B12", "='Gastos Fijos'!F12"],
];
dashboard.getRange("F13:F20").setNumberFormat("dd/mm/yyyy");
dashboard.getRange("G13:G20").setNumberFormat("$#,##0.00");
dashboard.getRange("E12:H20").format.borders = { preset: "all", style: "thin", color: colors.line };
dashboard.getRange("E13:H20").format.fill = "#FFFFFF";
dashboard.getRange("H13:H20").conditionalFormats.add("containsText", { text: "OK", format: { fill: colors.green, font: { color: colors.greenInk, bold: true } } });
dashboard.getRange("H13:H20").conditionalFormats.add("containsText", { text: "Próximo", format: { fill: colors.yellow, font: { color: colors.orangeInk, bold: true } } });
dashboard.getRange("H13:H20").conditionalFormats.add("containsText", { text: "Urgente", format: { fill: colors.red, font: { color: colors.redInk, bold: true } } });

section(dashboard.getRange("K11:M11"), "Lista de compras pendientes", colors.red);
dashboard.getRange("K12:M12").values = [["Producto", "Actual / mínimo", "Estado"]];
header(dashboard.getRange("K12:M12"));
for (let r = 13; r <= 22; r++) {
  const source = r - 8;
  dashboard.getRange(`K${r}:M${r}`).formulas = [[
    `=IF(Mercado!G${source}="Sí",Mercado!A${source},"")`,
    `=IF(Mercado!G${source}="Sí",Mercado!E${source}&" / "&Mercado!F${source},"")`,
    `=IF(Mercado!G${source}="Sí","RECOMPRAR","")`,
  ]];
}
dashboard.getRange("K12:M22").format.borders = { preset: "all", style: "thin", color: colors.line };
dashboard.getRange("K13:M22").format.fill = "#FFFFFF";
dashboard.getRange("M13:M22").conditionalFormats.add("containsText", { text: "RECOMPRAR", format: { fill: colors.red, font: { color: colors.redInk, bold: true } } });

section(dashboard.getRange("B16:C16"), "Comparación");
dashboard.getRange("B17:C19").values = [["Tipo", "Monto"], ["Gastos fijos", null], ["Gastos variables", null]];
dashboard.getRange("C18").formulas = [["=H8"]];
dashboard.getRange("C19").formulas = [["=E8"]];
dashboard.getRange("B17:C19").format.borders = { preset: "all", style: "thin", color: colors.line };
dashboard.getRange("B17:C17").format = { fill: colors.ink, font: { bold: true, color: "#FFFFFF" } };
dashboard.getRange("C18:C19").format.numberFormat = "$#,##0.00";

section(dashboard.getRange("B22:C22"), "Gastos por categoría");
dashboard.getRange("B23:C30").values = [
  ["Categoría", "Monto"],
  ["Mercado", null],
  ["Transporte", null],
  ["Comidas", null],
  ["Entretenimiento", null],
  ["Salud", null],
  ["Mascotas", null],
  ["Otros", null],
];
for (let r = 24; r <= 30; r++) {
  dashboard.getRange(`C${r}`).formulas = [[`=SUMIFS(Movimientos!$E$5:$E$204,Movimientos!$B$5:$B$204,"Gasto",Movimientos!$C$5:$C$204,B${r},Movimientos!$F$5:$F$204,$C$5)`]];
}
dashboard.getRange("B23:C30").format.borders = { preset: "all", style: "thin", color: colors.line };
dashboard.getRange("B23:C23").format = { fill: colors.ink, font: { bold: true, color: "#FFFFFF" } };
dashboard.getRange("C24:C30").format.numberFormat = "$#,##0.00";

const chartCat = dashboard.charts.add("bar", dashboard.getRange("B23:C30"));
chartCat.title = "¿En qué estoy gastando?";
chartCat.hasLegend = false;
chartCat.yAxis = { numberFormatCode: "$#,##0" };
chartCat.setPosition("E22", "I36");

const chartComp = dashboard.charts.add("doughnut", dashboard.getRange("B17:C19"));
chartComp.title = "Fijos vs variables";
chartComp.hasLegend = true;
chartComp.setPosition("K24", "M36");

dashboard.freezePanes.freezeRows(5);
// Final visual polish and fixed row heights avoid oversized merged rows.
setRowPx(dashboard, 1, 40, 24);
setRowPx(dashboard, 2, 3, 34);
setRowPx(dashboard, 7, 13, 28);
setRowPx(dashboard, 22, 36, 22);
for (const sheet of [movimientos, fijos, mercado]) {
  setRowPx(sheet, 1, 104, 22);
  setRowPx(sheet, 1, 2, 34);
  setRowPx(sheet, 4, 4, 26);
}

await fs.mkdir(outputDir, { recursive: true });

const dashCheck = await wb.inspect({
  kind: "table",
  range: "Dashboard!B2:M30",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 13,
  maxChars: 6000,
});
console.log(dashCheck.ndjson);

const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
  maxChars: 2000,
});
console.log(errors.ndjson);

for (const sheetName of ["Dashboard", "Movimientos", "Gastos Fijos", "Mercado"]) {
  const png = await wb.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/${sheetName.replaceAll(" ", "_").toLowerCase()}.png`, new Uint8Array(await png.arrayBuffer()));
}

const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputPath);
console.log(`SAVED ${outputPath}`);
