import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/diego/Documents/excel/outputs/hogar_finanzas_simple";
const outputPath = `${outputDir}/Finanzas_Hogar_Simple.xlsx`;
const workbook = Workbook.create();

const ROWS = 500;
const startRow = 6;
const endRow = startRow + ROWS - 1;
const currency = '$#,##0.00;[Red]-$#,##0.00;"-"';
const pct = "0.0%";
const dateFmt = "dd/mm/yyyy";
const dark = "#12324A";
const blue = "#2563EB";
const green = "#16A34A";
const amber = "#F59E0B";
const red = "#DC2626";

const sheets = {};
["Dashboard", "Movimientos", "Pagos recurrentes", "Mercado"].forEach((name) => {
  sheets[name] = workbook.worksheets.add(name);
  sheets[name].showGridLines = false;
});

function title(sheet, text, range, subtitle = "") {
  const r = sheet.getRange(range);
  r.merge();
  r.values = [[text]];
  r.format = { fill: dark, font: { bold: true, color: "#FFFFFF", size: 19 }, verticalAlignment: "middle" };
  r.format.rowHeightPx = 42;
  if (subtitle) {
    const lastCol = range.split(":")[1].replace(/[0-9]/g, "");
    const sub = sheet.getRange(`A2:${lastCol}2`);
    sub.merge();
    sub.values = [[subtitle]];
    sub.format = { fill: "#E2E8F0", font: { color: "#334155", italic: true }, verticalAlignment: "middle" };
    sub.format.rowHeightPx = 26;
  }
}

function header(range) {
  range.format = {
    fill: dark,
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    wrapText: true,
  };
  range.format.borders = { preset: "all", style: "thin", color: "#FFFFFF" };
}

function body(range) {
  range.format = {
    fill: "#FFFFFF",
    font: { color: "#0F172A" },
    verticalAlignment: "middle",
    wrapText: true,
  };
  range.format.borders = { preset: "all", style: "thin", color: "#E2E8F0" };
}

function setWidths(sheet, widths) {
  widths.forEach((w, i) => {
    sheet.getRangeByIndexes(0, i, 1, 1).format.columnWidthPx = w;
  });
}

function table(sheet, range, name) {
  const t = sheet.tables.add(range, true, name);
  t.style = "TableStyleMedium2";
  t.showFilterButton = true;
  return t;
}

function listValidation(sheet, range, values) {
  sheet.getRange(range).dataValidation = { rule: { type: "list", values } };
}

function monthDate(monthNum) {
  return new Date(2026, monthNum - 1, 1);
}

function cfExpression(range, formula, fill, font) {
  range.conditionalFormats.add("expression", { formula, format: { fill, font: { color: font, bold: true } } });
}

// Movimientos
{
  const s = sheets["Movimientos"];
  title(s, "Movimientos", "A1:E1", "Registra aquí todos los ingresos y gastos. El Dashboard se filtra por el mes seleccionado.");
  s.getRange("A5:E5").values = [["Fecha", "Tipo", "Categoría", "Descripción", "Monto"]];
  header(s.getRange("A5:E5"));
  const sample = [
    [new Date(2026, 0, 5), "Ingreso", "Salario", "Salario enero", 2500],
    [new Date(2026, 0, 5), "Fijo", "Renta", "Renta enero", 800],
    [new Date(2026, 0, 8), "Variable", "Mercado", "Walmart", 120],
    [new Date(2026, 0, 12), "Variable", "Helado", "Heladería", 5],
    [new Date(2026, 1, 5), "Ingreso", "Salario", "Salario febrero", 2500],
    [new Date(2026, 1, 5), "Fijo", "Renta", "Renta febrero", 800],
    [new Date(2026, 1, 10), "Fijo", "Internet", "Internet febrero", 35],
    [new Date(2026, 1, 14), "Variable", "Mercado", "Supermercado", 165],
    [new Date(2026, 2, 5), "Ingreso", "Salario", "Salario marzo", 2500],
    [new Date(2026, 2, 5), "Fijo", "Renta", "Renta marzo", 800],
    [new Date(2026, 2, 15), "Fijo", "Luz", "Factura luz", 40],
    [new Date(2026, 2, 20), "Variable", "Restaurante", "Cena familiar", 48],
    [new Date(2026, 3, 5), "Ingreso", "Salario", "Salario abril", 2500],
    [new Date(2026, 3, 5), "Fijo", "Renta", "Renta abril", 800],
    [new Date(2026, 3, 18), "Variable", "Mercado", "Compra mensual", 210],
  ];
  s.getRange(`A6:E${endRow}`).values = Array.from({ length: ROWS }, (_, i) => sample[i] ?? [null, "", "", "", null]);
  body(s.getRange(`A6:E${endRow}`));
  table(s, `A5:E${endRow}`, "tblMovimientos");
  s.getRange(`A6:A${endRow}`).format.numberFormat = dateFmt;
  s.getRange(`E6:E${endRow}`).format.numberFormat = currency;
  listValidation(s, `B6:B${endRow}`, ["Ingreso", "Fijo", "Variable"]);
  listValidation(s, `C6:C${endRow}`, ["Salario", "Renta", "Internet", "Luz", "Agua", "Gas", "Teléfono", "Mercado", "Transporte", "Salud", "Entretenimiento", "Restaurante", "Helado", "Otros"]);
  cfExpression(s.getRange(`A6:E${endRow}`), `=$B6="Ingreso"`, "#DCFCE7", "#166534");
  cfExpression(s.getRange(`A6:E${endRow}`), `=$B6="Fijo"`, "#DBEAFE", "#1E40AF");
  cfExpression(s.getRange(`A6:E${endRow}`), `=$B6="Variable"`, "#FEF3C7", "#92400E");
  setWidths(s, [105, 105, 145, 280, 120]);
  s.freezePanes.freezeRows(5);
}

// Pagos recurrentes
{
  const s = sheets["Pagos recurrentes"];
  title(s, "Pagos recurrentes", "A1:C1", "Pagos que se repiten cada mes. El Dashboard muestra los próximos del mes seleccionado.");
  s.getRange("A5:C5").values = [["Concepto", "Monto", "Día de pago"]];
  header(s.getRange("A5:C5"));
  const sample = [["Renta", 800, 5], ["Internet", 35, 10], ["Luz", 40, 15], ["Teléfono", 30, 20]];
  s.getRange(`A6:C${endRow}`).values = Array.from({ length: ROWS }, (_, i) => sample[i] ?? ["", null, null]);
  body(s.getRange(`A6:C${endRow}`));
  table(s, `A5:C${endRow}`, "tblPagosRecurrentes");
  s.getRange(`B6:B${endRow}`).format.numberFormat = currency;
  s.getRange(`C6:C${endRow}`).dataValidation = { rule: { type: "whole", operator: "between", formula1: 1, formula2: 31 } };
  setWidths(s, [220, 120, 110]);
  s.freezePanes.freezeRows(5);
}

// Mercado
{
  const s = sheets["Mercado"];
  title(s, "Mercado", "A1:D1", "Lista simple de productos. Los marcados como Comprar aparecen en el Dashboard.");
  s.getRange("A5:D5").values = [["Producto", "Última compra", "Estado", "Orden comprar"]];
  header(s.getRange("A5:D5"));
  const sample = [
    ["Leche", new Date(2026, 5, 1), "Comprar"],
    ["Arroz", new Date(2026, 4, 25), "Disponible"],
    ["Huevos", new Date(2026, 4, 28), "Comprar"],
    ["Papel higiénico", new Date(2026, 4, 20), "Comprar"],
    ["Café", new Date(2026, 5, 3), "Disponible"],
  ];
  s.getRange(`A6:D${endRow}`).values = Array.from({ length: ROWS }, (_, i) => [...(sample[i] ?? ["", null, ""]), ""]);
  s.getRange("D6").formulas = [[`=IF(C6="Comprar",COUNTIF($C$6:C6,"Comprar"),"")`]];
  s.getRange(`D6:D${endRow}`).fillDown();
  body(s.getRange(`A6:D${endRow}`));
  table(s, `A5:D${endRow}`, "tblMercado");
  s.getRange(`B6:B${endRow}`).format.numberFormat = dateFmt;
  listValidation(s, `C6:C${endRow}`, ["Comprar", "Disponible"]);
  cfExpression(s.getRange(`A6:C${endRow}`), `=$C6="Comprar"`, "#FEF3C7", "#92400E");
  cfExpression(s.getRange(`A6:C${endRow}`), `=$C6="Disponible"`, "#DCFCE7", "#166534");
  s.getRange(`D5:D${endRow}`).format = { fill: "#FFFFFF", font: { color: "#FFFFFF" } };
  setWidths(s, [220, 130, 120, 4]);
  s.freezePanes.freezeRows(5);
}

// Dashboard
{
  const s = sheets["Dashboard"];
  title(s, "Dashboard", "A1:N1", "Vista mensual simple: elige el mes y todo se actualiza.");
  s.getRange("A3:B4").values = [["Selector de mes", "Enero"], ["", ""]];
  header(s.getRange("A3:B3"));
  body(s.getRange("A4:B4"));
  s.getRange("B3").dataValidation = { rule: { type: "list", values: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"] } };
  s.getRange("B4").formulas = [["=MATCH(B3,{\"Enero\",\"Febrero\",\"Marzo\",\"Abril\",\"Mayo\",\"Junio\",\"Julio\",\"Agosto\",\"Septiembre\",\"Octubre\",\"Noviembre\",\"Diciembre\"},0)"]];
  s.getRange("A4:B4").format = { fill: "#FFFFFF", font: { color: "#FFFFFF" } };
  s.getRange("A4:B4").format.rowHeightPx = 4;

  s.getRange("A6:H8").values = [
    ["Ingresos del mes", "Gastos fijos", "Gastos variables", "Dinero disponible", "Total gastos", "% gastado", "Pagos del mes", "Productos por comprar"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
  ];
  header(s.getRange("A6:H6"));
  body(s.getRange("A7:H8"));
  s.getRange("A7:H7").formulas = [[
    `=SUMIFS(Movimientos!$E$${startRow}:$E$${endRow},Movimientos!$B$${startRow}:$B$${endRow},"Ingreso",Movimientos!$A$${startRow}:$A$${endRow},">="&DATE(2026,$B$4,1),Movimientos!$A$${startRow}:$A$${endRow},"<"&EDATE(DATE(2026,$B$4,1),1))`,
    `=SUMIFS(Movimientos!$E$${startRow}:$E$${endRow},Movimientos!$B$${startRow}:$B$${endRow},"Fijo",Movimientos!$A$${startRow}:$A$${endRow},">="&DATE(2026,$B$4,1),Movimientos!$A$${startRow}:$A$${endRow},"<"&EDATE(DATE(2026,$B$4,1),1))`,
    `=SUMIFS(Movimientos!$E$${startRow}:$E$${endRow},Movimientos!$B$${startRow}:$B$${endRow},"Variable",Movimientos!$A$${startRow}:$A$${endRow},">="&DATE(2026,$B$4,1),Movimientos!$A$${startRow}:$A$${endRow},"<"&EDATE(DATE(2026,$B$4,1),1))`,
    "=A7-B7-C7",
    "=B7+C7",
    "=IFERROR(E7/A7,0)",
    `=COUNT('Pagos recurrentes'!$C$${startRow}:$C$${endRow})`,
    `=COUNTIF(Mercado!$C$${startRow}:$C$${endRow},"Comprar")`,
  ]];
  s.getRange("A8:H8").values = [["💰", "🏠", "🛒", "✅", "📊", "📌", "📅", "🛒"]];
  s.getRange("A7:E7").format.numberFormat = currency;
  s.getRange("F7").format.numberFormat = pct;
  s.getRange("A7:H8").format = { font: { bold: true, size: 14 }, horizontalAlignment: "center", verticalAlignment: "middle" };
  s.getRange("A8:H8").format.font.size = 18;
  s.getRange("A7:H8").format.borders = { preset: "all", style: "thin", color: "#E2E8F0" };

  s.getRange("A11:C25").values = [["Categoría", "Gasto del mes", "% total"], ...["Renta", "Internet", "Luz", "Agua", "Gas", "Teléfono", "Mercado", "Transporte", "Salud", "Entretenimiento", "Restaurante", "Helado", "Otros"].map((x) => [x, "", ""])];
  header(s.getRange("A11:C11"));
  body(s.getRange("A12:C25"));
  s.getRange("B12").formulas = [[`=SUMIFS(Movimientos!$E$${startRow}:$E$${endRow},Movimientos!$C$${startRow}:$C$${endRow},A12,Movimientos!$B$${startRow}:$B$${endRow},"<>Ingreso",Movimientos!$A$${startRow}:$A$${endRow},">="&DATE(2026,$B$4,1),Movimientos!$A$${startRow}:$A$${endRow},"<"&EDATE(DATE(2026,$B$4,1),1))`]];
  s.getRange("B12:B25").fillDown();
  s.getRange("C12").formulas = [["=IFERROR(B12/SUM($B$12:$B$25),0)"]];
  s.getRange("C12:C25").fillDown();
  s.getRange("B12:B25").format.numberFormat = currency;
  s.getRange("C12:C25").format.numberFormat = pct;

  s.getRange("E11:G13").values = [["Tipo", "Monto", "%"], ["Fijo", "", ""], ["Variable", "", ""]];
  header(s.getRange("E11:G11"));
  body(s.getRange("E12:G13"));
  s.getRange("F12:G13").formulas = [["=$B$7", "=IFERROR(F12/$E$7,0)"], ["=$C$7", "=IFERROR(F13/$E$7,0)"]];
  s.getRange("F12:F13").format.numberFormat = currency;
  s.getRange("G12:G13").format.numberFormat = pct;

  s.getRange("I11:L15").values = [["Mes", "Ingresos", "Gastos", "Disponible"], ["Enero", "", "", ""], ["Febrero", "", "", ""], ["Marzo", "", "", ""], ["Abril", "", "", ""]];
  header(s.getRange("I11:L11"));
  body(s.getRange("I12:L15"));
  s.getRange("N11:R15").values = [["Mes", "MesNum", "Ingresos", "Gastos", "Disponible"], ["Enero", 1, "", "", ""], ["Febrero", 2, "", "", ""], ["Marzo", 3, "", "", ""], ["Abril", 4, "", "", ""]];
  s.getRange("P12:R12").formulas = [[
    `=SUMIFS(Movimientos!$E$${startRow}:$E$${endRow},Movimientos!$B$${startRow}:$B$${endRow},"Ingreso",Movimientos!$A$${startRow}:$A$${endRow},">="&DATE(2026,O12,1),Movimientos!$A$${startRow}:$A$${endRow},"<"&EDATE(DATE(2026,O12,1),1))`,
    `=SUMIFS(Movimientos!$E$${startRow}:$E$${endRow},Movimientos!$B$${startRow}:$B$${endRow},"<>Ingreso",Movimientos!$A$${startRow}:$A$${endRow},">="&DATE(2026,O12,1),Movimientos!$A$${startRow}:$A$${endRow},"<"&EDATE(DATE(2026,O12,1),1))`,
    "=P12-Q12",
  ]];
  s.getRange("P12:R15").fillDown();
  s.getRange("J12:L15").formulas = [["=P12", "=Q12", "=R12"], ["=P13", "=Q13", "=R13"], ["=P14", "=Q14", "=R14"], ["=P15", "=Q15", "=R15"]];
  s.getRange("J12:L15").format.numberFormat = currency;
  s.getRange("N11:R15").format = { fill: "#FFFFFF", font: { color: "#FFFFFF" } };

  s.getRange("A29:C39").values = [["Próximos pagos del mes", "Monto", "Día"], ...Array.from({ length: 10 }, () => ["", "", ""])];
  header(s.getRange("A29:C29"));
  body(s.getRange("A30:C39"));
  for (let i = 0; i < 10; i++) {
    const r = 30 + i;
    const src = startRow + i;
    s.getRange(`A${r}:C${r}`).formulas = [[
      `=IF('Pagos recurrentes'!A${src}="","",'Pagos recurrentes'!A${src})`,
      `=IF('Pagos recurrentes'!A${src}="","",'Pagos recurrentes'!B${src})`,
      `=IF('Pagos recurrentes'!A${src}="","",'Pagos recurrentes'!C${src})`,
    ]];
  }
  s.getRange("B30:B39").format.numberFormat = currency;

  s.getRange("E29:G39").values = [["Productos para comprar", "Última compra", "Estado"], ...Array.from({ length: 10 }, () => ["", "", ""])];
  header(s.getRange("E29:G29"));
  body(s.getRange("E30:G39"));
  for (let i = 0; i < 10; i++) {
    const r = 30 + i;
    const k = i + 1;
    s.getRange(`E${r}:G${r}`).formulas = [[
      `=IFERROR(INDEX(Mercado!$A$${startRow}:$A$${endRow},MATCH(${k},Mercado!$D$${startRow}:$D$${endRow},0)),"")`,
      `=IFERROR(INDEX(Mercado!$B$${startRow}:$B$${endRow},MATCH(${k},Mercado!$D$${startRow}:$D$${endRow},0)),"")`,
      `=IF(E${r}="","","Comprar")`,
    ]];
  }
  s.getRange("F30:F39").format.numberFormat = dateFmt;

  const c1 = s.charts.add("doughnut", s.getRange("A11:B25"));
  c1.title = "Gastos por categoría del mes";
  c1.hasLegend = true;
  c1.setPosition("I19", "N34");

  const c2 = s.charts.add("bar", s.getRange("E11:F13"));
  c2.title = "Gastos fijos vs variables";
  c2.hasLegend = false;
  c2.yAxis = { numberFormatCode: "$#,##0" };
  c2.setPosition("E15", "H27");

  const c3 = s.charts.add("line", s.getRange("I11:L15"));
  c3.title = "Comparación mensual";
  c3.hasLegend = true;
  c3.xAxis = { axisType: "textAxis" };
  c3.yAxis = { numberFormatCode: "$#,##0" };
  c3.setPosition("I35", "N50");

  setWidths(s, [165, 120, 95, 130, 170, 120, 90, 120, 120, 110, 110, 110, 8, 8, 8, 8, 8, 8]);
  s.freezePanes.freezeRows(3);
}

for (const s of Object.values(sheets)) {
  try {
    s.getUsedRange().format.font.name = "Aptos";
  } catch {}
}

await fs.mkdir(outputDir, { recursive: true });

const dashboard = await workbook.inspect({
  kind: "table",
  range: "Dashboard!A1:N40",
  include: "values,formulas",
  tableMaxRows: 40,
  tableMaxCols: 14,
  maxChars: 9000,
});
console.log(dashboard.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
  maxChars: 4000,
});
console.log(errors.ndjson);

for (const name of Object.keys(sheets)) {
  const preview = await workbook.render({ sheetName: name, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/${name.replace(/[\\/:*?"<>|]/g, "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`SAVED ${outputPath}`);
