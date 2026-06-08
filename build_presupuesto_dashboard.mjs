import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/presupuesto_dashboard";
const outputPath = `${outputDir}/Presupuesto_Dashboard_Mensual.xlsx`;

await fs.mkdir(outputDir, { recursive: true });

const wb = Workbook.create();
const dashboard = wb.worksheets.add("Dashboard");
const mov = wb.worksheets.add("Movimientos");
const pagos = wb.worksheets.add("Pagos recurrentes");
const mercado = wb.worksheets.add("Mercado");

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const moneyFmt = "$#,##0.00";
const dateFmt = "dd/mm/yyyy";
const palette = {
  ink: "#17202A",
  muted: "#5F6B7A",
  bg: "#F5F7FA",
  panel: "#FFFFFF",
  line: "#D8DEE8",
  primary: "#1F6F78",
  secondary: "#2E8B57",
  accent: "#D9A441",
  danger: "#C94C4C",
  softBlue: "#E7F1F3",
  softGreen: "#EAF6EF",
  softGold: "#FFF6DF",
  softRed: "#FCECEC",
  header: "#0F3D4A",
};

function styleSheetBase(sheet, width = 22, maxCol = "L") {
  sheet.showGridLines = false;
  sheet.getRange(`A:${maxCol}`).format = {
    font: { name: "Aptos", size: 10, color: palette.ink },
  };
  sheet.getRange(`A:${maxCol}`).format.columnWidth = width;
}

function setWidths(sheet, widths) {
  for (const [col, px] of Object.entries(widths)) {
    sheet.getRange(`${col}:${col}`).format.columnWidthPx = px;
  }
}

function sectionHeader(range, fill = palette.header) {
  range.format = {
    fill,
    font: { bold: true, color: "#FFFFFF" },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function panel(range) {
  range.format = {
    fill: palette.panel,
    borders: { preset: "all", style: "thin", color: palette.line },
  };
}

styleSheetBase(dashboard, 22, "L");
styleSheetBase(mov, 22, "E");
styleSheetBase(pagos, 22, "C");
styleSheetBase(mercado, 22, "C");

// Movimientos
mov.getRange("A1:E1").values = [["Fecha", "Tipo", "Categoría", "Descripción", "Monto"]];
mov.getRange("A2:E20").values = [
  [new Date(2026, 0, 5), "Fijo", "Renta", "Renta enero", 800],
  [new Date(2026, 0, 8), "Variable", "Mercado", "Walmart", 120],
  [new Date(2026, 0, 12), "Variable", "Helado", "Heladería", 5],
  [new Date(2026, 0, 15), "Ingreso", "Salario", "Pago nómina", 2400],
  [new Date(2026, 1, 5), "Fijo", "Renta", "Renta febrero", 800],
  [new Date(2026, 1, 10), "Fijo", "Internet", "Internet febrero", 35],
  [new Date(2026, 1, 16), "Variable", "Mercado", "Supermercado", 145],
  [new Date(2026, 1, 18), "Variable", "Transporte", "Gasolina", 70],
  [new Date(2026, 1, 28), "Ingreso", "Salario", "Pago nómina", 2400],
  [new Date(2026, 2, 5), "Fijo", "Renta", "Renta marzo", 800],
  [new Date(2026, 2, 12), "Variable", "Mercado", "Compra semanal", 130],
  [new Date(2026, 2, 20), "Variable", "Ocio", "Cena", 55],
  [new Date(2026, 2, 30), "Ingreso", "Salario", "Pago nómina", 2400],
  [new Date(2026, 3, 5), "Fijo", "Renta", "Renta abril", 800],
  [new Date(2026, 3, 11), "Variable", "Mercado", "Mercado abril", 155],
  [new Date(2026, 3, 14), "Variable", "Salud", "Farmacia", 32],
  [new Date(2026, 3, 30), "Ingreso", "Salario", "Pago nómina", 2400],
  [new Date(2026, 5, 1), "Ingreso", "Salario", "Pago nómina junio", 2400],
  [new Date(2026, 5, 3), "Variable", "Mercado", "Compra mensual", 165],
];
mov.getRange("A1:E1").format = {
  fill: palette.header,
  font: { bold: true, color: "#FFFFFF" },
};
mov.getRange("A2:A200").format.numberFormat = dateFmt;
mov.getRange("E2:E200").format.numberFormat = moneyFmt;
mov.getRange("A1:E200").format.borders = { preset: "all", style: "thin", color: palette.line };
mov.getRange("A:E").format.wrapText = false;
setWidths(mov, { A: 110, B: 100, C: 130, D: 220, E: 110 });
mov.tables.add("A1:E200", true, "MovimientosTabla").style = "TableStyleMedium2";
mov.freezePanes.freezeRows(1);
mov.getRange("B2:B200").dataValidation = { rule: { type: "list", values: ["Ingreso", "Fijo", "Variable"] } };
mov.getRange("C2:C200").dataValidation = {
  rule: { type: "list", values: ["Salario", "Renta", "Internet", "Luz", "Mercado", "Transporte", "Salud", "Ocio", "Helado", "Otros"] },
};

// Pagos recurrentes
pagos.getRange("A1:C1").values = [["Concepto", "Monto", "Día de pago"]];
pagos.getRange("A2:C8").values = [
  ["Renta", 800, 5],
  ["Internet", 35, 10],
  ["Luz", 40, 15],
  ["Teléfono", 28, 18],
  ["Seguro", 55, 22],
  ["Streaming", 14, 25],
  ["Gimnasio", 30, 28],
];
pagos.getRange("A1:C1").format = {
  fill: palette.header,
  font: { bold: true, color: "#FFFFFF" },
};
pagos.getRange("B2:B100").format.numberFormat = moneyFmt;
pagos.getRange("C2:C100").format.numberFormat = "0";
pagos.getRange("A1:C100").format.borders = { preset: "all", style: "thin", color: palette.line };
pagos.tables.add("A1:C100", true, "PagosRecurrentesTabla").style = "TableStyleMedium4";
setWidths(pagos, { A: 180, B: 110, C: 120 });
pagos.freezePanes.freezeRows(1);
pagos.getRange("C2:C100").dataValidation = { rule: { type: "whole", operator: "between", formula1: 1, formula2: 31 } };

// Mercado
mercado.getRange("A1:C1").values = [["Producto", "Última compra", "Estado"]];
mercado.getRange("A2:C13").values = [
  ["Leche", new Date(2026, 5, 1), "Comprar"],
  ["Arroz", new Date(2026, 4, 25), "Disponible"],
  ["Huevos", new Date(2026, 4, 28), "Comprar"],
  ["Papel higiénico", new Date(2026, 4, 20), "Comprar"],
  ["Café", new Date(2026, 5, 2), "Disponible"],
  ["Aceite", new Date(2026, 4, 21), "Comprar"],
  ["Pasta", new Date(2026, 5, 3), "Disponible"],
  ["Jabón", new Date(2026, 4, 29), "Comprar"],
  ["Detergente", new Date(2026, 5, 5), "Disponible"],
  ["Fruta", new Date(2026, 5, 4), "Comprar"],
  ["Verduras", new Date(2026, 5, 4), "Comprar"],
  ["Yogur", new Date(2026, 5, 1), "Disponible"],
];
mercado.getRange("A1:C1").format = {
  fill: palette.header,
  font: { bold: true, color: "#FFFFFF" },
};
mercado.getRange("B2:B100").format.numberFormat = dateFmt;
mercado.getRange("A1:C100").format.borders = { preset: "all", style: "thin", color: palette.line };
mercado.tables.add("A1:C100", true, "MercadoTabla").style = "TableStyleMedium7";
mercado.getRange("C2:C100").dataValidation = { rule: { type: "list", values: ["Comprar", "Disponible"] } };
mercado.getRange("A2:C100").conditionalFormats.add("containsText", {
  text: "Comprar",
  format: { fill: palette.softRed, font: { bold: true, color: palette.danger } },
});
setWidths(mercado, { A: 190, B: 130, C: 120 });
mercado.freezePanes.freezeRows(1);

// Dashboard shell
dashboard.getRange("A1:L1").merge();
dashboard.getRange("A1").values = [["Dashboard financiero mensual"]];
dashboard.getRange("A1").format = {
  fill: palette.header,
  font: { bold: true, color: "#FFFFFF", size: 20 },
  alignment: { horizontal: "left", vertical: "center" },
};
dashboard.getRange("A1:L1").format.rowHeightPx = 42;
dashboard.getRange("A2:L38").format.fill = palette.bg;
setWidths(dashboard, {
  A: 32, B: 170, C: 130, D: 130, E: 26, F: 150,
  G: 130, H: 130, I: 28, J: 150, K: 130, L: 130,
  N: 150, O: 130, P: 130, Q: 130, R: 150, S: 130, T: 130,
});

dashboard.getRange("B3:C4").format = {
  fill: palette.panel,
  borders: { preset: "all", style: "thin", color: palette.line },
};
dashboard.getRange("B3").values = [["Mes seleccionado"]];
dashboard.getRange("C3").values = [["Junio"]];
dashboard.getRange("B4").values = [["Año"]];
dashboard.getRange("C4").values = [[2026]];
dashboard.getRange("B3:B4").format = { font: { bold: true, color: palette.muted }, fill: palette.softBlue };
dashboard.getRange("C3:C4").format = { font: { bold: true, color: palette.ink }, fill: palette.panel };
dashboard.getRange("C3").dataValidation = { rule: { type: "list", values: monthNames } };
dashboard.getRange("D3").formulas = [["=MATCH(C3,{\"Enero\",\"Febrero\",\"Marzo\",\"Abril\",\"Mayo\",\"Junio\",\"Julio\",\"Agosto\",\"Septiembre\",\"Octubre\",\"Noviembre\",\"Diciembre\"},0)"]];
dashboard.getRange("D3").format = { font: { color: palette.bg }, fill: palette.bg };

// KPI cards
const kpiRows = [
  ["B6:C8", "Ingresos", "C7", "=SUMIFS(Movimientos!$E$2:$E$200,Movimientos!$B$2:$B$200,\"Ingreso\",Movimientos!$A$2:$A$200,\">=\"&DATE($C$4,$D$3,1),Movimientos!$A$2:$A$200,\"<\"&EDATE(DATE($C$4,$D$3,1),1))", palette.softGreen],
  ["F6:G8", "Gastos fijos", "G7", "=SUMIFS(Movimientos!$E$2:$E$200,Movimientos!$B$2:$B$200,\"Fijo\",Movimientos!$A$2:$A$200,\">=\"&DATE($C$4,$D$3,1),Movimientos!$A$2:$A$200,\"<\"&EDATE(DATE($C$4,$D$3,1),1))", palette.softGold],
  ["J6:K8", "Gastos variables", "K7", "=SUMIFS(Movimientos!$E$2:$E$200,Movimientos!$B$2:$B$200,\"Variable\",Movimientos!$A$2:$A$200,\">=\"&DATE($C$4,$D$3,1),Movimientos!$A$2:$A$200,\"<\"&EDATE(DATE($C$4,$D$3,1),1))", palette.softRed],
  ["B10:C12", "Dinero disponible", "C11", "=C7-G7-K7", palette.softBlue],
];
for (const [block, label, valueCell, formula, fill] of kpiRows) {
  panel(dashboard.getRange(block));
  const topLeft = block.split(":")[0];
  dashboard.getRange(topLeft).values = [[label]];
  dashboard.getRange(topLeft).format = { fill, font: { bold: true, color: palette.muted, size: 11 } };
  dashboard.getRange(valueCell).formulas = [[formula]];
  dashboard.getRange(valueCell).format = { fill: palette.panel, font: { bold: true, color: palette.ink, size: 16 }, numberFormat: moneyFmt };
}
dashboard.getRange("C7:C11").format.numberFormat = moneyFmt;
dashboard.getRange("G7").format.numberFormat = moneyFmt;
dashboard.getRange("K7").format.numberFormat = moneyFmt;

// Dashboard visible lists
dashboard.getRange("B14:D14").merge();
dashboard.getRange("B14").values = [["Próximos pagos del mes"]];
sectionHeader(dashboard.getRange("B14:D14"));
dashboard.getRange("B15:D15").values = [["Concepto", "Fecha", "Monto"]];
dashboard.getRange("B15:D15").format = { fill: palette.softBlue, font: { bold: true, color: palette.ink } };
dashboard.getRange("B16:B25").formulas = Array.from({ length: 10 }, (_, i) => [`=IF('Pagos recurrentes'!A${i + 2}=\"\",\"\",'Pagos recurrentes'!A${i + 2})`]);
dashboard.getRange("C16:C25").formulas = Array.from({ length: 10 }, (_, i) => [`=IF('Pagos recurrentes'!A${i + 2}=\"\",\"\",DATE($C$4,$D$3,'Pagos recurrentes'!C${i + 2}))`]);
dashboard.getRange("D16:D25").formulas = Array.from({ length: 10 }, (_, i) => [`=IF('Pagos recurrentes'!A${i + 2}=\"\",\"\",'Pagos recurrentes'!B${i + 2})`]);
dashboard.getRange("B15:D25").format.borders = { preset: "all", style: "thin", color: palette.line };
dashboard.getRange("C16:C25").format.numberFormat = dateFmt;
dashboard.getRange("D16:D25").format.numberFormat = moneyFmt;
dashboard.getRange("B16:D25").format.fill = palette.panel;

dashboard.getRange("F14:H14").merge();
dashboard.getRange("F14").values = [["Productos para comprar"]];
sectionHeader(dashboard.getRange("F14:H14"), palette.secondary);
dashboard.getRange("F15:H15").values = [["Producto", "Última compra", "Estado"]];
dashboard.getRange("F15:H15").format = { fill: palette.softGreen, font: { bold: true, color: palette.ink } };
dashboard.getRange("F16:F25").formulas = Array.from({ length: 10 }, (_, i) => [`=IF(Mercado!C${i + 2}=\"Comprar\",Mercado!A${i + 2},\"\")`]);
dashboard.getRange("G16:G25").formulas = Array.from({ length: 10 }, (_, i) => [`=IF(Mercado!C${i + 2}=\"Comprar\",Mercado!B${i + 2},\"\")`]);
dashboard.getRange("H16:H25").formulas = Array.from({ length: 10 }, (_, i) => [`=IF(Mercado!C${i + 2}=\"Comprar\",\"Comprar\",\"\")`]);
dashboard.getRange("F15:H25").format.borders = { preset: "all", style: "thin", color: palette.line };
dashboard.getRange("G16:G25").format.numberFormat = dateFmt;
dashboard.getRange("F16:H25").format.fill = palette.panel;

// Helper tables for charts
dashboard.getRange("N1:T1").values = [["MesNum", "Categoría", "Gasto", "Tipo", "Monto", "Mes", "Total gastos"]];
dashboard.getRange("N2:N13").values = monthNames.map((_, i) => [i + 1]);
dashboard.getRange("S2:S13").values = monthNames.map(m => [m]);
dashboard.getRange("T2:T13").formulas = monthNames.map((_, i) => [`=SUMIFS(Movimientos!$E$2:$E$200,Movimientos!$B$2:$B$200,\"<>Ingreso\",Movimientos!$A$2:$A$200,\">=\"&DATE($C$4,${i + 1},1),Movimientos!$A$2:$A$200,\"<\"&EDATE(DATE($C$4,${i + 1},1),1))`]);
dashboard.getRange("O2:O11").values = [["Renta"], ["Internet"], ["Luz"], ["Mercado"], ["Transporte"], ["Salud"], ["Ocio"], ["Helado"], ["Seguro"], ["Otros"]];
dashboard.getRange("P2:P11").formulas = [
  ["=SUMIFS(Movimientos!$E$2:$E$200,Movimientos!$C$2:$C$200,O2,Movimientos!$B$2:$B$200,\"<>Ingreso\",Movimientos!$A$2:$A$200,\">=\"&DATE($C$4,$D$3,1),Movimientos!$A$2:$A$200,\"<\"&EDATE(DATE($C$4,$D$3,1),1))"],
];
dashboard.getRange("P2:P11").fillDown();
dashboard.getRange("Q1:R1").values = [["Tipo", "Monto"]];
dashboard.getRange("Q2:Q3").values = [["Fijos"], ["Variables"]];
dashboard.getRange("R2:R3").formulas = [["=G7"], ["=K7"]];
dashboard.getRange("N1:T13").format = { fill: "#FFFFFF", font: { color: "#FFFFFF" } };
dashboard.getRange("P2:P11").format.numberFormat = moneyFmt;
dashboard.getRange("R2:R3").format.numberFormat = moneyFmt;
dashboard.getRange("T2:T13").format.numberFormat = moneyFmt;
dashboard.getRange("N:T").format.columnWidthPx = 2;

// Charts
const catChart = dashboard.charts.add("bar", dashboard.getRange("O1:P11"));
catChart.title = "Gastos por categoría del mes";
catChart.hasLegend = false;
catChart.xAxis = { axisType: "textAxis" };
catChart.yAxis = { numberFormatCode: "$#,##0" };
catChart.setPosition("J14", "L25");

const typeChart = dashboard.charts.add("doughnut", dashboard.getRange("Q1:R3"));
typeChart.title = "Fijos vs variables";
typeChart.hasLegend = true;
typeChart.setPosition("B27", "D38");

const trendChart = dashboard.charts.add("line", dashboard.getRange("S1:T13"));
trendChart.title = "Comparación mensual de gastos";
trendChart.hasLegend = false;
trendChart.xAxis = { axisType: "textAxis" };
trendChart.yAxis = { numberFormatCode: "$#,##0" };
trendChart.setPosition("F27", "L38");

// Finish dashboard visual polish
dashboard.getRange("B15:H25").format.font = { size: 9, color: palette.ink };
dashboard.getRange("B14:H14").format.rowHeightPx = 25;
dashboard.getRange("B16:H25").format.rowHeightPx = 20;
dashboard.getRange("B3:D4").format.rowHeightPx = 24;
dashboard.getRange("B6:K12").format.borders = { preset: "all", style: "thin", color: palette.line };
dashboard.freezePanes.freezeRows(1);

// Inspect and render for verification
const dashboardCheck = await wb.inspect({
  kind: "table",
  range: "Dashboard!B3:K25",
  include: "values,formulas",
  tableMaxRows: 25,
  tableMaxCols: 10,
  maxChars: 6000,
});
console.log(dashboardCheck.ndjson);

const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
  maxChars: 4000,
});
console.log(errors.ndjson);

for (const sheetName of ["Dashboard", "Movimientos", "Pagos recurrentes", "Mercado"]) {
  const preview = await wb.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/${sheetName.replaceAll(" ", "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const exported = await SpreadsheetFile.exportXlsx(wb);
await exported.save(outputPath);
console.log(`Saved ${outputPath}`);
