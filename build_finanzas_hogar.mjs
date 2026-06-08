import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/diego/Documents/excel/outputs/hogar_finanzas";
const outputPath = `${outputDir}/Gestion_Financiera_Hogar.xlsx`;
const workbook = Workbook.create();

const ROWS = 500;
const startRow = 6;
const endRow = startRow + ROWS - 1;
const currency = '$#,##0.00;[Red]-$#,##0.00;"-"';
const pct = '0.0%';
const dateFmt = 'yyyy-mm-dd';
const dark = "#16324F";
const blue = "#2563EB";
const teal = "#0F766E";
const green = "#16A34A";
const yellow = "#F59E0B";
const red = "#DC2626";
const gray = "#64748B";
const pale = "#F8FAFC";
const grid = "#CBD5E1";

const sheets = {};
[
  "Dashboard General",
  "Registro de Ingresos",
  "Registro de Gastos",
  "Calendario de Pagos",
  "Control de Tarjetas de Crédito",
  "Control de Deudas y Cuotas",
  "Ahorro Mensual",
  "Fondo de Emergencia",
  "Metas Financieras",
  "Lista de Mercado",
  "Tareas y Pendientes del Hogar",
  "Presupuesto Mensual",
  "Proyección Financiera",
  "Configuración",
].forEach((name) => {
  sheets[name] = workbook.worksheets.add(name);
  sheets[name].showGridLines = false;
});

function title(sheet, text, range = "A1:H1", subtitle = "") {
  const r = sheet.getRange(range);
  r.merge();
  r.values = [[text]];
  r.format = { fill: dark, font: { bold: true, color: "#FFFFFF", size: 18 }, horizontalAlignment: "left", verticalAlignment: "middle" };
  r.format.rowHeightPx = 38;
  if (subtitle) {
    const cols = range.split(":")[1].replace(/[0-9]/g, "");
    const sub = sheet.getRange(`A2:${cols}2`);
    sub.merge();
    sub.values = [[subtitle]];
    sub.format = { fill: "#E2E8F0", font: { color: "#334155", italic: true }, verticalAlignment: "middle" };
    sub.format.rowHeightPx = 26;
  }
}

function styleHeader(range) {
  range.format = { fill: dark, font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "middle", wrapText: true };
  range.format.borders = { preset: "all", style: "thin", color: "#FFFFFF" };
}

function styleBody(range) {
  range.format = { fill: "#FFFFFF", font: { color: "#0F172A" }, verticalAlignment: "middle", wrapText: true };
  range.format.borders = { preset: "all", style: "thin", color: "#E2E8F0" };
}

function setWidths(sheet, widths) {
  widths.forEach((w, i) => {
    sheet.getRangeByIndexes(0, i, 1, 1).format.columnWidthPx = w;
  });
}

function addTable(sheet, range, name) {
  const table = sheet.tables.add(range, true, name);
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;
  return table;
}

function valList(sheet, range, source) {
  sheet.getRange(range).dataValidation = { rule: { type: "list", formula1: source } };
}

function cfText(range, text, fill, font = "#0F172A") {
  range.conditionalFormats.add("containsText", { text, format: { fill, font: { color: font, bold: true } } });
}

function cfFormula(range, formula, fill, font = "#0F172A") {
  range.conditionalFormats.add("expression", { formula, format: { fill, font: { color: font, bold: true } } });
}

function monthNames(count = 12) {
  const now = new Date();
  const y = now.getFullYear();
  return Array.from({ length: count }, (_, i) => new Date(y, i, 1));
}

function monthLabel(d) {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[d.getMonth()]} ${d.getFullYear()}`;
}

// Configuración
{
  const s = sheets["Configuración"];
  title(s, "Configuración", "A1:J1", "Edita estas listas para actualizar los menús desplegables y objetivos del sistema.");
  const blocks = [
    ["Categorías de ingreso", ["Salario", "Negocio", "Freelance", "Inversiones", "Alquileres", "Bonificaciones", "Otros"]],
    ["Categorías de gasto", ["Renta/Hipoteca", "Agua", "Electricidad", "Gas", "Internet", "Teléfono", "Mercado", "Transporte", "Combustible", "Salud", "Educación", "Mascotas", "Entretenimiento", "Impuestos", "Seguros", "Mantenimiento", "Suscripciones", "Otros"]],
    ["Subcategorías", ["Alquiler", "Servicios", "Supermercado", "Transporte público", "Gasolina", "Medicamentos", "Colegio", "Veterinario", "Ocio", "Streaming", "Reparaciones", "Emergencia", "Otros"]],
    ["Responsables", ["Persona 1", "Persona 2", "Familia"]],
    ["Métodos de pago", ["Efectivo", "Débito", "Crédito", "Transferencia", "Pago automático", "Otros"]],
    ["Estados pago", ["Pagado", "Pendiente"]],
    ["Frecuencias", ["Semanal", "Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"]],
    ["Prioridades", ["Alta", "Media", "Baja"]],
    ["Estados tarea", ["Pendiente", "En proceso", "Completada"]],
    ["Categorías metas", ["Viajes", "Casa", "Vehículo", "Estudios", "Negocio", "Jubilación", "Otros"]],
  ];
  blocks.forEach(([head, items], idx) => {
    const col = idx;
    s.getCell(3, col).values = [[head]];
    s.getCell(3, col).format = { fill: dark, font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", wrapText: true };
    items.forEach((item, r) => s.getCell(4 + r, col).values = [[item]]);
    s.getRangeByIndexes(4, col, Math.max(items.length, 20), 1).format.borders = { preset: "all", style: "thin", color: "#E2E8F0" };
    s.getRangeByIndexes(0, col, 1, 1).format.columnWidthPx = 145;
  });
  s.getRange("A28:D34").values = [
    ["Objetivo financiero", "Valor", "Unidad", "Notas"],
    ["Meses fondo emergencia base", 3, "meses", "Mínimo recomendado"],
    ["Meses fondo emergencia ideal", 6, "meses", "Cobertura saludable"],
    ["Meses fondo emergencia excelente", 12, "meses", "Cobertura robusta"],
    ["Uso saludable tarjeta", 0.3, "% del límite", "Alerta verde hasta 30%"],
    ["Uso atención tarjeta", 0.5, "% del límite", "Alerta amarilla hasta 50%"],
    ["Uso riesgo tarjeta", 0.8, "% del límite", "Alerta roja desde 80%"],
  ];
  styleHeader(s.getRange("A28:D28"));
  styleBody(s.getRange("A29:D34"));
  s.getRange("B32:B34").format.numberFormat = pct;
  s.freezePanes.freezeRows(3);
}

// Registro de Ingresos
{
  const s = sheets["Registro de Ingresos"];
  title(s, "Registro de Ingresos", "A1:F1", "Captura todos los ingresos familiares. El dashboard calcula automáticamente el mes actual y el resumen anual.");
  const headers = [["Fecha", "Fuente de ingreso", "Categoría", "Descripción", "Monto", "Observaciones"]];
  s.getRange("A5:F5").values = headers;
  styleHeader(s.getRange("A5:F5"));
  const sample = [
    [new Date(2026, 5, 1), "Empresa", "Salario", "Nómina mensual", 4200, ""],
    [new Date(2026, 5, 8), "Cliente freelance", "Freelance", "Proyecto web", 650, "Ingreso variable"],
    [new Date(2026, 5, 15), "Cuenta inversión", "Inversiones", "Dividendos", 120, ""],
  ];
  s.getRange(`A6:F${endRow}`).values = Array.from({ length: ROWS }, (_, i) => sample[i] ?? [null, "", "", "", null, ""]);
  styleBody(s.getRange(`A6:F${endRow}`));
  addTable(s, `A5:F${endRow}`, "tblIngresos");
  s.getRange(`A6:A${endRow}`).format.numberFormat = dateFmt;
  s.getRange(`E6:E${endRow}`).format.numberFormat = currency;
  valList(s, `C6:C${endRow}`, "'Configuración'!$A$5:$A$25");
  setWidths(s, [105, 150, 130, 220, 110, 220]);
  s.freezePanes.freezeRows(5);
}

// Registro de Gastos
{
  const s = sheets["Registro de Gastos"];
  title(s, "Registro de Gastos", "A1:I1", "Registra gastos pagados y pendientes por categoría, responsable y método de pago.");
  s.getRange("A5:I5").values = [["Fecha", "Categoría", "Subcategoría", "Descripción", "Monto", "Método de pago", "Responsable", "Estado", "Observaciones"]];
  styleHeader(s.getRange("A5:I5"));
  const sample = [
    [new Date(2026, 5, 2), "Renta/Hipoteca", "Alquiler", "Pago vivienda", 1450, "Transferencia", "Familia", "Pagado", ""],
    [new Date(2026, 5, 4), "Mercado", "Supermercado", "Compra semanal", 185, "Débito", "Persona 1", "Pagado", ""],
    [new Date(2026, 5, 10), "Electricidad", "Servicios", "Factura eléctrica", 115, "Pago automático", "Familia", "Pendiente", ""],
    [new Date(2026, 5, 12), "Transporte", "Transporte público", "Abono mensual", 80, "Débito", "Persona 2", "Pagado", ""],
    [new Date(2026, 5, 18), "Suscripciones", "Streaming", "Plataformas", 42, "Crédito", "Familia", "Pendiente", ""],
  ];
  s.getRange(`A6:I${endRow}`).values = Array.from({ length: ROWS }, (_, i) => sample[i] ?? [null, "", "", "", null, "", "", "", ""]);
  styleBody(s.getRange(`A6:I${endRow}`));
  addTable(s, `A5:I${endRow}`, "tblGastos");
  s.getRange(`A6:A${endRow}`).format.numberFormat = dateFmt;
  s.getRange(`E6:E${endRow}`).format.numberFormat = currency;
  valList(s, `B6:B${endRow}`, "'Configuración'!$B$5:$B$30");
  valList(s, `C6:C${endRow}`, "'Configuración'!$C$5:$C$30");
  valList(s, `F6:F${endRow}`, "'Configuración'!$E$5:$E$25");
  valList(s, `G6:G${endRow}`, "'Configuración'!$D$5:$D$25");
  valList(s, `H6:H${endRow}`, "'Configuración'!$F$5:$F$10");
  cfText(s.getRange(`H6:H${endRow}`), "Pagado", "#DCFCE7", "#166534");
  cfText(s.getRange(`H6:H${endRow}`), "Pendiente", "#FEF3C7", "#92400E");
  setWidths(s, [105, 145, 145, 230, 110, 145, 120, 115, 220]);
  s.freezePanes.freezeRows(5);
}

// Calendario de Pagos
{
  const s = sheets["Calendario de Pagos"];
  title(s, "Calendario de Pagos", "A1:G1", "Control de vencimientos recurrentes y alertas automáticas.");
  s.getRange("A5:G5").values = [["Concepto", "Categoría", "Fecha de vencimiento", "Monto", "Frecuencia", "Estado", "Días restantes"]];
  styleHeader(s.getRange("A5:G5"));
  const sample = [
    ["Renta", "Renta/Hipoteca", new Date(2026, 5, 30), 1450, "Mensual", "Pendiente"],
    ["Internet", "Internet", new Date(2026, 5, 20), 55, "Mensual", "Pendiente"],
    ["Seguro hogar", "Seguros", new Date(2026, 6, 5), 320, "Anual", "Pendiente"],
    ["Teléfono", "Teléfono", new Date(2026, 5, 12), 70, "Mensual", "Pagado"],
  ];
  const rows = Array.from({ length: ROWS }, (_, i) => {
    const r = sample[i] ?? ["", "", null, null, "", ""];
    return [...r, ""];
  });
  s.getRange(`A6:G${endRow}`).values = rows;
  s.getRange(`G6`).formulas = [["=IF(OR(C6=\"\",F6=\"Pagado\"),\"\",C6-TODAY())"]];
  s.getRange(`G6:G${endRow}`).fillDown();
  styleBody(s.getRange(`A6:G${endRow}`));
  addTable(s, `A5:G${endRow}`, "tblPagos");
  s.getRange(`C6:C${endRow}`).format.numberFormat = dateFmt;
  s.getRange(`D6:D${endRow}`).format.numberFormat = currency;
  s.getRange(`G6:G${endRow}`).format.numberFormat = "0";
  valList(s, `B6:B${endRow}`, "'Configuración'!$B$5:$B$30");
  valList(s, `E6:E${endRow}`, "'Configuración'!$G$5:$G$15");
  valList(s, `F6:F${endRow}`, "'Configuración'!$F$5:$F$10");
  cfFormula(s.getRange(`A6:G${endRow}`), `=AND($F6<>"Pagado",$C6<TODAY(),$C6<>"")`, "#FEE2E2", "#991B1B");
  cfFormula(s.getRange(`A6:G${endRow}`), `=AND($F6<>"Pagado",$C6>=TODAY(),$C6<=TODAY()+30)`, "#FEF3C7", "#92400E");
  cfFormula(s.getRange(`A6:G${endRow}`), `=$F6="Pagado"`, "#DCFCE7", "#166534");
  setWidths(s, [170, 145, 130, 110, 120, 110, 110]);
  s.freezePanes.freezeRows(5);
}

// Tarjetas de Crédito
{
  const s = sheets["Control de Tarjetas de Crédito"];
  title(s, "Control de Tarjetas de Crédito", "A1:K1", "Seguimiento de límite, utilización, pagos y alertas.");
  s.getRange("A5:K5").values = [["Banco", "Tarjeta", "Límite de crédito", "Saldo utilizado", "Crédito disponible", "Fecha de corte", "Fecha de pago", "Pago mínimo", "Pago recomendado", "Tasa de interés", "% utilizado"]];
  styleHeader(s.getRange("A5:K5"));
  const sample = [
    ["Banco A", "Visa", 6000, 1820, "", new Date(2026, 5, 22), new Date(2026, 5, 29), 95, 450, 0.249, ""],
    ["Banco B", "Mastercard", 3500, 980, "", new Date(2026, 5, 18), new Date(2026, 5, 25), 60, 250, 0.285, ""],
  ];
  s.getRange(`A6:K${endRow}`).values = Array.from({ length: ROWS }, (_, i) => sample[i] ?? ["", "", null, null, "", null, null, null, null, null, ""]);
  s.getRange("E6").formulas = [["=IF(C6=\"\",\"\",C6-D6)"]];
  s.getRange(`E6:E${endRow}`).fillDown();
  s.getRange("K6").formulas = [["=IFERROR(D6/C6,\"\")"]];
  s.getRange(`K6:K${endRow}`).fillDown();
  styleBody(s.getRange(`A6:K${endRow}`));
  addTable(s, `A5:K${endRow}`, "tblTarjetas");
  s.getRange(`C6:E${endRow}`).format.numberFormat = currency;
  s.getRange(`H6:I${endRow}`).format.numberFormat = currency;
  s.getRange(`F6:G${endRow}`).format.numberFormat = dateFmt;
  s.getRange(`J6:K${endRow}`).format.numberFormat = pct;
  cfFormula(s.getRange(`A6:K${endRow}`), `=AND($K6<>"",$K6>=0.8)`, "#FEE2E2", "#991B1B");
  cfFormula(s.getRange(`A6:K${endRow}`), `=AND($K6>=0.5,$K6<0.8)`, "#FFEDD5", "#9A3412");
  cfFormula(s.getRange(`A6:K${endRow}`), `=AND($K6>=0.3,$K6<0.5)`, "#FEF3C7", "#92400E");
  cfFormula(s.getRange(`A6:K${endRow}`), `=AND($K6<0.3,$K6<>"")`, "#DCFCE7", "#166534");
  setWidths(s, [120, 125, 120, 120, 125, 115, 115, 110, 125, 110, 100]);
  s.freezePanes.freezeRows(5);
}

// Deudas
{
  const s = sheets["Control de Deudas y Cuotas"];
  title(s, "Control de Deudas y Cuotas", "A1:L1", "Seguimiento de préstamos, cuotas, porcentaje cancelado y finalización estimada.");
  s.getRange("A5:L5").values = [["Nombre de la deuda", "Acreedor", "Monto inicial", "Saldo pendiente", "Cuota mensual", "Fecha de pago", "Cuotas pagadas", "Cuotas restantes", "Tasa de interés", "% cancelado", "Fecha estimada finalización", "Progreso"]];
  styleHeader(s.getRange("A5:L5"));
  const sample = [
    ["Préstamo auto", "Financiera", 18000, 9600, 420, new Date(2026, 5, 15), 20, 23, 0.075, "", "", ""],
    ["Crédito personal", "Banco A", 6500, 4100, 260, new Date(2026, 5, 28), 9, 16, 0.118, "", "", ""],
  ];
  s.getRange(`A6:L${endRow}`).values = Array.from({ length: ROWS }, (_, i) => sample[i] ?? ["", "", null, null, null, null, null, null, null, "", "", ""]);
  s.getRange("J6").formulas = [["=IFERROR((C6-D6)/C6,\"\")"]];
  s.getRange(`J6:J${endRow}`).fillDown();
  s.getRange("K6").formulas = [["=IF(OR(F6=\"\",H6=\"\"),\"\",EDATE(F6,H6))"]];
  s.getRange(`K6:K${endRow}`).fillDown();
  s.getRange("L6").formulas = [["=J6"]];
  s.getRange(`L6:L${endRow}`).fillDown();
  styleBody(s.getRange(`A6:L${endRow}`));
  addTable(s, `A5:L${endRow}`, "tblDeudas");
  s.getRange(`C6:E${endRow}`).format.numberFormat = currency;
  s.getRange(`F6:F${endRow}`).format.numberFormat = dateFmt;
  s.getRange(`I6:J${endRow}`).format.numberFormat = pct;
  s.getRange(`K6:K${endRow}`).format.numberFormat = dateFmt;
  s.getRange(`L6:L${endRow}`).format.numberFormat = pct;
  s.getRange(`L6:L${endRow}`).conditionalFormats.add("dataBar", { color: green });
  setWidths(s, [160, 130, 115, 115, 110, 110, 110, 110, 105, 100, 145, 120]);
  s.freezePanes.freezeRows(5);
}

// Ahorro Mensual
{
  const s = sheets["Ahorro Mensual"];
  title(s, "Ahorro Mensual", "A1:G1", "Metas de ahorro mensuales, ahorro real y cumplimiento.");
  s.getRange("A5:G5").values = [["Mes", "Ingreso total", "Meta de ahorro", "Ahorro real", "Diferencia", "% cumplimiento", "Tendencia"]];
  styleHeader(s.getRange("A5:G5"));
  const months = monthNames(36);
  s.getRange(`A6:G41`).values = months.map((m) => [m, "", 800, "", "", "", ""]);
  s.getRange("B6").formulas = [[`=SUMIFS('Registro de Ingresos'!$E$${startRow}:$E$${endRow},'Registro de Ingresos'!$A$${startRow}:$A$${endRow},">="&A6,'Registro de Ingresos'!$A$${startRow}:$A$${endRow},"<"&EDATE(A6,1))`]];
  s.getRange("D6").formulas = [[`=B6-SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$A$${startRow}:$A$${endRow},">="&A6,'Registro de Gastos'!$A$${startRow}:$A$${endRow},"<"&EDATE(A6,1),'Registro de Gastos'!$H$${startRow}:$H$${endRow},"Pagado")`]];
  s.getRange("E6").formulas = [["=D6-C6"]];
  s.getRange("F6").formulas = [["=IFERROR(D6/C6,\"\")"]];
  s.getRange("G6").formulas = [["=IF(ROW()=6,\"Base\",IF(D6>D5,\"Sube\",IF(D6<D5,\"Baja\",\"Estable\")))"]];
  s.getRange("B6:G41").fillDown();
  styleBody(s.getRange("A6:G41"));
  addTable(s, "A5:G41", "tblAhorroMensual");
  s.getRange("A6:A41").format.numberFormat = "mmm yyyy";
  s.getRange("B6:E41").format.numberFormat = currency;
  s.getRange("F6:F41").format.numberFormat = pct;
  setWidths(s, [115, 130, 130, 130, 130, 120, 110]);
  s.freezePanes.freezeRows(5);
}

// Fondo de Emergencia
{
  const s = sheets["Fondo de Emergencia"];
  title(s, "Fondo de Emergencia", "A1:H1", "Aportes y cobertura en meses de gastos esenciales.");
  s.getRange("A5:C5").values = [["Fecha", "Aporte", "Saldo acumulado"]];
  styleHeader(s.getRange("A5:C5"));
  const sample = [[new Date(2026, 5, 3), 500, ""], [new Date(2026, 5, 17), 300, ""]];
  s.getRange(`A6:C${endRow}`).values = Array.from({ length: ROWS }, (_, i) => sample[i] ?? [null, null, ""]);
  s.getRange("C6").formulas = [["=IF(A6=\"\",\"\",SUM($B$6:B6))"]];
  s.getRange(`C6:C${endRow}`).fillDown();
  styleBody(s.getRange(`A6:C${endRow}`));
  addTable(s, `A5:C${endRow}`, "tblFondoEmergencia");
  s.getRange(`A6:A${endRow}`).format.numberFormat = dateFmt;
  s.getRange(`B6:C${endRow}`).format.numberFormat = currency;
  s.getRange("E5:H12").values = [
    ["Indicador", "Valor", "Meta", "% alcanzado"],
    ["Gasto esencial mensual", "", "Base", ""],
    ["Meta 3 meses", "", "", ""],
    ["Meta 6 meses", "", "", ""],
    ["Meta 12 meses", "", "", ""],
    ["Saldo actual", "", "", ""],
    ["Meses cubiertos", "", "", ""],
    ["Tiempo estimado 6 meses", "", "", ""],
  ];
  styleHeader(s.getRange("E5:H5"));
  styleBody(s.getRange("E6:H12"));
  s.getRange("F6").formulas = [[`=SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$B$${startRow}:$B$${endRow},"Renta/Hipoteca",'Registro de Gastos'!$H$${startRow}:$H$${endRow},"Pagado")+SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$B$${startRow}:$B$${endRow},"Agua",'Registro de Gastos'!$H$${startRow}:$H$${endRow},"Pagado")+SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$B$${startRow}:$B$${endRow},"Electricidad",'Registro de Gastos'!$H$${startRow}:$H$${endRow},"Pagado")+SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$B$${startRow}:$B$${endRow},"Gas",'Registro de Gastos'!$H$${startRow}:$H$${endRow},"Pagado")+SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$B$${startRow}:$B$${endRow},"Mercado",'Registro de Gastos'!$H$${startRow}:$H$${endRow},"Pagado")`]];
  s.getRange("F7:F9").formulas = [["=F6*3"], ["=F6*6"], ["=F6*12"]];
  s.getRange("F10").formulas = [[`=MAX($C$6:$C$${endRow})`]];
  s.getRange("F11").formulas = [["=IFERROR(F10/F6,0)"]];
  s.getRange("F12").formulas = [["=IFERROR(MAX(0,(F8-F10)/AVERAGEIF($B$6:$B$505,\">0\")) ,\"\")"]];
  s.getRange("G7:G9").values = [[3], [6], [12]];
  s.getRange("H7:H9").formulas = [["=IFERROR($F$10/F7,0)"], ["=IFERROR($F$10/F8,0)"], ["=IFERROR($F$10/F9,0)"]];
  s.getRange("F6:F10").format.numberFormat = currency;
  s.getRange("F11").format.numberFormat = '0.0 "meses"';
  s.getRange("F12").format.numberFormat = '0.0 "meses"';
  s.getRange("H7:H9").format.numberFormat = pct;
  s.getRange("H7:H9").conditionalFormats.add("dataBar", { color: green });
  setWidths(s, [110, 110, 130, 30, 190, 130, 90, 120]);
  s.freezePanes.freezeRows(5);
}

// Metas Financieras
{
  const s = sheets["Metas Financieras"];
  title(s, "Metas Financieras", "A1:I1", "Objetivos familiares con avance, brecha y fecha estimada de cumplimiento.");
  s.getRange("A5:I5").values = [["Nombre de la meta", "Categoría", "Monto objetivo", "Monto acumulado", "Diferencia", "Fecha objetivo", "% completado", "Aporte mensual", "Fecha estimada cumplimiento"]];
  styleHeader(s.getRange("A5:I5"));
  const sample = [
    ["Vacaciones familiares", "Viajes", 5000, 1200, "", new Date(2027, 6, 1), "", 350, ""],
    ["Entrada vivienda", "Casa", 30000, 8200, "", new Date(2029, 0, 1), "", 600, ""],
  ];
  s.getRange(`A6:I${endRow}`).values = Array.from({ length: ROWS }, (_, i) => sample[i] ?? ["", "", null, null, "", null, "", null, ""]);
  s.getRange("E6").formulas = [["=IF(C6=\"\",\"\",C6-D6)"]];
  s.getRange(`E6:E${endRow}`).fillDown();
  s.getRange("G6").formulas = [["=IFERROR(D6/C6,\"\")"]];
  s.getRange(`G6:G${endRow}`).fillDown();
  s.getRange("I6").formulas = [["=IF(OR(E6<=0,H6<=0),\"\",EDATE(TODAY(),ROUNDUP(E6/H6,0)))"]];
  s.getRange(`I6:I${endRow}`).fillDown();
  styleBody(s.getRange(`A6:I${endRow}`));
  addTable(s, `A5:I${endRow}`, "tblMetas");
  valList(s, `B6:B${endRow}`, "'Configuración'!$J$5:$J$20");
  s.getRange(`C6:E${endRow}`).format.numberFormat = currency;
  s.getRange(`H6:H${endRow}`).format.numberFormat = currency;
  s.getRange(`F6:F${endRow}`).format.numberFormat = dateFmt;
  s.getRange(`G6:G${endRow}`).format.numberFormat = pct;
  s.getRange(`I6:I${endRow}`).format.numberFormat = dateFmt;
  s.getRange(`G6:G${endRow}`).conditionalFormats.add("dataBar", { color: green });
  setWidths(s, [180, 115, 120, 125, 115, 115, 110, 115, 150]);
  s.freezePanes.freezeRows(5);
}

// Lista de Mercado
{
  const s = sheets["Lista de Mercado"];
  title(s, "Lista de Mercado", "A1:F1", "Planificador de compras con estimado, comprado y pendientes.");
  s.getRange("A5:F5").values = [["Producto", "Categoría", "Cantidad", "Precio estimado", "Comprado", "Prioridad"]];
  styleHeader(s.getRange("A5:F5"));
  const sample = [["Leche", "Mercado", 2, 3.2, true, "Alta"], ["Arroz", "Mercado", 1, 4.5, false, "Media"], ["Detergente", "Limpieza", 1, 8, false, "Baja"]];
  s.getRange(`A6:F${endRow}`).values = Array.from({ length: ROWS }, (_, i) => sample[i] ?? ["", "", null, null, false, ""]);
  styleBody(s.getRange(`A6:F${endRow}`));
  addTable(s, `A5:F${endRow}`, "tblMercado");
  valList(s, `F6:F${endRow}`, "'Configuración'!$H$5:$H$10");
  s.getRange(`D6:D${endRow}`).format.numberFormat = currency;
  s.getRange("H5:I8").values = [["Indicador", "Valor"], ["Total estimado", ""], ["Total comprado", ""], ["Pendientes", ""]];
  styleHeader(s.getRange("H5:I5"));
  styleBody(s.getRange("H6:I8"));
  s.getRange("I6:I8").formulas = [[`=SUM($D$6:$D$${endRow})`], [`=SUMIF($E$6:$E$${endRow},TRUE,$D$6:$D$${endRow})`], [`=COUNTIFS($A$6:$A$${endRow},"<>",$E$6:$E$${endRow},FALSE)`]];
  s.getRange("I6:I7").format.numberFormat = currency;
  setWidths(s, [170, 120, 90, 120, 100, 100, 30, 150, 120]);
  s.freezePanes.freezeRows(5);
}

// Tareas
{
  const s = sheets["Tareas y Pendientes del Hogar"];
  title(s, "Tareas y Pendientes del Hogar", "A1:F1", "Tareas familiares, vencimientos y estado de avance.");
  s.getRange("A5:F5").values = [["Tarea", "Categoría", "Responsable", "Fecha límite", "Prioridad", "Estado"]];
  styleHeader(s.getRange("A5:F5"));
  const sample = [["Revisar seguro", "Finanzas", "Persona 1", new Date(2026, 5, 25), "Alta", "Pendiente"], ["Cambiar filtro", "Mantenimiento", "Persona 2", new Date(2026, 5, 14), "Media", "En proceso"], ["Organizar recibos", "Administración", "Familia", new Date(2026, 5, 9), "Baja", "Completada"]];
  s.getRange(`A6:F${endRow}`).values = Array.from({ length: ROWS }, (_, i) => sample[i] ?? ["", "", "", null, "", ""]);
  styleBody(s.getRange(`A6:F${endRow}`));
  addTable(s, `A5:F${endRow}`, "tblTareas");
  valList(s, `C6:C${endRow}`, "'Configuración'!$D$5:$D$25");
  valList(s, `E6:E${endRow}`, "'Configuración'!$H$5:$H$10");
  valList(s, `F6:F${endRow}`, "'Configuración'!$I$5:$I$10");
  s.getRange(`D6:D${endRow}`).format.numberFormat = dateFmt;
  cfFormula(s.getRange(`A6:F${endRow}`), `=AND($F6<>"Completada",$D6<TODAY(),$D6<>"")`, "#FEE2E2", "#991B1B");
  cfText(s.getRange(`F6:F${endRow}`), "Completada", "#DCFCE7", "#166534");
  s.getRange("H5:I8").values = [["Indicador", "Valor"], ["Pendientes", ""], ["Completadas", ""], ["Vencidas", ""]];
  styleHeader(s.getRange("H5:I5"));
  styleBody(s.getRange("H6:I8"));
  s.getRange("I6:I8").formulas = [[`=COUNTIFS($F$6:$F$${endRow},"<>Completada",$A$6:$A$${endRow},"<>")`], [`=COUNTIF($F$6:$F$${endRow},"Completada")`], [`=COUNTIFS($F$6:$F$${endRow},"<>Completada",$D$6:$D$${endRow},"<"&TODAY(),$D$6:$D$${endRow},"<>")`]];
  setWidths(s, [210, 130, 120, 115, 95, 120, 30, 150, 90]);
  s.freezePanes.freezeRows(5);
}

// Presupuesto Mensual
{
  const s = sheets["Presupuesto Mensual"];
  title(s, "Presupuesto Mensual", "A1:E1", "Presupuesto planificado frente a gasto real por categoría.");
  s.getRange("A5:E5").values = [["Categoría", "Presupuesto planificado", "Gasto real", "Diferencia", "% utilizado"]];
  styleHeader(s.getRange("A5:E5"));
  const cats = ["Renta/Hipoteca", "Agua", "Electricidad", "Gas", "Internet", "Teléfono", "Mercado", "Transporte", "Combustible", "Salud", "Educación", "Mascotas", "Entretenimiento", "Impuestos", "Seguros", "Mantenimiento", "Suscripciones", "Otros"];
  const planned = [1500, 60, 120, 55, 60, 75, 650, 120, 180, 200, 350, 90, 250, 150, 180, 160, 80, 200];
  s.getRange("A6:E23").values = cats.map((c, i) => [c, planned[i], "", "", ""]);
  s.getRange("C6").formulas = [[`=SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$B$${startRow}:$B$${endRow},A6,'Registro de Gastos'!$A$${startRow}:$A$${endRow},">="&EOMONTH(TODAY(),-1)+1,'Registro de Gastos'!$A$${startRow}:$A$${endRow},"<="&EOMONTH(TODAY(),0))`]];
  s.getRange("C6:C23").fillDown();
  s.getRange("D6").formulas = [["=B6-C6"]];
  s.getRange("D6:D23").fillDown();
  s.getRange("E6").formulas = [["=IFERROR(C6/B6,\"\")"]];
  s.getRange("E6:E23").fillDown();
  styleBody(s.getRange("A6:E23"));
  addTable(s, "A5:E23", "tblPresupuesto");
  s.getRange("B6:D23").format.numberFormat = currency;
  s.getRange("E6:E23").format.numberFormat = pct;
  s.getRange("E6:E23").conditionalFormats.add("dataBar", { color: blue });
  cfFormula(s.getRange("A6:E23"), `=$E6>1`, "#FEE2E2", "#991B1B");
  setWidths(s, [160, 155, 120, 120, 105]);
  const chart = s.charts.add("bar", s.getRange("A5:C23"));
  chart.title = "Presupuesto vs Gasto Real";
  chart.hasLegend = true;
  chart.yAxis = { numberFormatCode: "$#,##0" };
  chart.setPosition("G5", "N22");
  s.freezePanes.freezeRows(5);
}

// Proyección Financiera
{
  const s = sheets["Proyección Financiera"];
  title(s, "Proyección Financiera", "A1:H1", "Proyección automática de 3, 6 y 12 meses basada en promedios actuales.");
  s.getRange("A5:H5").values = [["Mes", "Ingreso proyectado", "Gasto proyectado", "Ahorro proyectado", "Deuda pendiente proyectada", "Patrimonio proyectado", "Ahorro acumulado", "Escenario"]];
  styleHeader(s.getRange("A5:H5"));
  const months = Array.from({ length: 12 }, (_, i) => new Date(2026, 5 + i, 1));
  s.getRange("A6:H17").values = months.map((m, i) => [m, "", "", "", "", "", "", i < 3 ? "3 meses" : i < 6 ? "6 meses" : "12 meses"]);
  s.getRange("B6").formulas = [[`=IFERROR(AVERAGEIF('Ahorro Mensual'!$B$6:$B$41,">0"),0)`]];
  s.getRange("C6").formulas = [[`=IFERROR(AVERAGEIF('Presupuesto Mensual'!$C$6:$C$23,">0"),SUM('Presupuesto Mensual'!$B$6:$B$23))`]];
  s.getRange("D6").formulas = [["=B6-C6"]];
  s.getRange("E6").formulas = [[`=MAX(0,SUM('Control de Deudas y Cuotas'!$D$${startRow}:$D$${endRow})-SUM('Control de Deudas y Cuotas'!$E$${startRow}:$E$${endRow})*ROWS($A$6:A6))`]];
  s.getRange("F6").formulas = [["=G6-E6"]];
  s.getRange("G6").formulas = [[`=MAX('Fondo de Emergencia'!$C$6:$C$${endRow})+SUM($D$6:D6)`]];
  s.getRange("B6:G17").fillDown();
  styleBody(s.getRange("A6:H17"));
  addTable(s, "A5:H17", "tblProyeccion");
  s.getRange("A6:A17").format.numberFormat = "mmm yyyy";
  s.getRange("B6:G17").format.numberFormat = currency;
  s.getRange("J5:K9").values = [["Indicador", "Valor"], ["Promedio ingresos", ""], ["Promedio gastos", ""], ["Fecha libertad de deudas", ""], ["Crecimiento ahorro 12m", ""]];
  styleHeader(s.getRange("J5:K5"));
  styleBody(s.getRange("J6:K9"));
  s.getRange("K6:K9").formulas = [[`=B6`], [`=C6`], [`=IFERROR(INDEX($A$6:$A$17,MATCH(0,$E$6:$E$17,0)),"Más de 12 meses")`], [`=G17-MAX('Fondo de Emergencia'!$C$6:$C$${endRow})`]];
  s.getRange("K6:K7").format.numberFormat = currency;
  s.getRange("K9").format.numberFormat = currency;
  const chart1 = s.charts.add("line", s.getRange("A5:F17"));
  chart1.title = "Flujo de Caja y Patrimonio Proyectado";
  chart1.hasLegend = true;
  chart1.xAxis = { axisType: "textAxis" };
  chart1.yAxis = { numberFormatCode: "$#,##0" };
  chart1.setPosition("J11", "Q28");
  setWidths(s, [105, 135, 135, 135, 155, 145, 135, 105, 30, 180, 130]);
  s.freezePanes.freezeRows(5);
}

// Dashboard
{
  const s = sheets["Dashboard General"];
  title(s, "Dashboard General", "A1:N1", "Panel ejecutivo conectado a ingresos, gastos, pagos, ahorros, deudas, tarjetas, metas y proyecciones.");
  s.getRange("A3:B12").values = [
    ["Indicador", "Valor"],
    ["Ingresos del mes", ""],
    ["Gastos del mes", ""],
    ["Ahorro del mes", ""],
    ["Balance disponible", ""],
    ["Total de deudas pendientes", ""],
    ["Total de ahorro acumulado", ""],
    ["Fondo de emergencia acumulado", ""],
    ["Próximos pagos 30 días", ""],
    ["Gastos pendientes", ""],
  ];
  s.getRange("D3:E7").values = [
    ["Indicador", "Valor"],
    ["Cumplimiento presupuesto", ""],
    ["Salud financiera", ""],
    ["Meses fondo emergencia", ""],
    ["Uso promedio tarjetas", ""],
  ];
  styleHeader(s.getRange("A3:B3"));
  styleHeader(s.getRange("D3:E3"));
  styleBody(s.getRange("A4:B12"));
  styleBody(s.getRange("D4:E7"));
  const f = [
    `=SUMIFS('Registro de Ingresos'!$E$${startRow}:$E$${endRow},'Registro de Ingresos'!$A$${startRow}:$A$${endRow},">="&EOMONTH(TODAY(),-1)+1,'Registro de Ingresos'!$A$${startRow}:$A$${endRow},"<="&EOMONTH(TODAY(),0))`,
    `=SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$A$${startRow}:$A$${endRow},">="&EOMONTH(TODAY(),-1)+1,'Registro de Gastos'!$A$${startRow}:$A$${endRow},"<="&EOMONTH(TODAY(),0),'Registro de Gastos'!$H$${startRow}:$H$${endRow},"Pagado")`,
    "=B4-B5",
    `=B6-SUMIFS('Calendario de Pagos'!$D$${startRow}:$D$${endRow},'Calendario de Pagos'!$C$${startRow}:$C$${endRow},">="&TODAY(),'Calendario de Pagos'!$C$${startRow}:$C$${endRow},"<="&TODAY()+30,'Calendario de Pagos'!$F$${startRow}:$F$${endRow},"Pendiente")`,
    `=SUM('Control de Deudas y Cuotas'!$D$${startRow}:$D$${endRow})`,
    `=MAX('Fondo de Emergencia'!$C$${startRow}:$C$${endRow})+SUM('Metas Financieras'!$D$${startRow}:$D$${endRow})`,
    `=MAX('Fondo de Emergencia'!$C$${startRow}:$C$${endRow})`,
    `=SUMIFS('Calendario de Pagos'!$D$${startRow}:$D$${endRow},'Calendario de Pagos'!$C$${startRow}:$C$${endRow},">="&TODAY(),'Calendario de Pagos'!$C$${startRow}:$C$${endRow},"<="&TODAY()+30,'Calendario de Pagos'!$F$${startRow}:$F$${endRow},"Pendiente")`,
    `=SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$H$${startRow}:$H$${endRow},"Pendiente")`,
  ];
  s.getRange("B4:B12").formulas = f.map((x) => [x]);
  s.getRange("E4:E7").formulas = [
    ["=IFERROR(1-SUM('Presupuesto Mensual'!$C$6:$C$23)/SUM('Presupuesto Mensual'!$B$6:$B$23),0)"],
    ["=IF(AND(B6>0,E6>=3,E7<0.5),\"Verde\",IF(OR(B6<0,E6<1,E7>=0.8),\"Rojo\",\"Amarillo\"))"],
    ["='Fondo de Emergencia'!$F$11"],
    [`=IFERROR(AVERAGE('Control de Tarjetas de Crédito'!$K$${startRow}:$K$${endRow}),0)`],
  ];
  s.getRange("B4:B12").format.numberFormat = currency;
  s.getRange("E4").format.numberFormat = pct;
  s.getRange("E6").format.numberFormat = '0.0 "meses"';
  s.getRange("E7").format.numberFormat = pct;
  cfText(s.getRange("E5"), "Verde", "#DCFCE7", "#166534");
  cfText(s.getRange("E5"), "Amarillo", "#FEF3C7", "#92400E");
  cfText(s.getRange("E5"), "Rojo", "#FEE2E2", "#991B1B");
  cfFormula(s.getRange("B4:B12"), `=B4<0`, "#FEE2E2", "#991B1B");
  s.getRange("A15:C33").values = [["Categoría", "Gasto mes", "% total"], ...["Renta/Hipoteca", "Agua", "Electricidad", "Gas", "Internet", "Teléfono", "Mercado", "Transporte", "Combustible", "Salud", "Educación", "Mascotas", "Entretenimiento", "Impuestos", "Seguros", "Mantenimiento", "Suscripciones", "Otros"].map((c) => [c, "", ""])];
  styleHeader(s.getRange("A15:C15"));
  styleBody(s.getRange("A16:C33"));
  s.getRange("B16").formulas = [[`=SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$B$${startRow}:$B$${endRow},A16,'Registro de Gastos'!$A$${startRow}:$A$${endRow},">="&EOMONTH(TODAY(),-1)+1,'Registro de Gastos'!$A$${startRow}:$A$${endRow},"<="&EOMONTH(TODAY(),0))`]];
  s.getRange("B16:B33").fillDown();
  s.getRange("C16").formulas = [["=IFERROR(B16/SUM($B$16:$B$33),0)"]];
  s.getRange("C16:C33").fillDown();
  s.getRange("B16:B33").format.numberFormat = currency;
  s.getRange("C16:C33").format.numberFormat = pct;
  const dashMonths = monthNames(12);
  s.getRange("E15:I27").values = [["Mes", "Ingresos", "Gastos", "Ahorro", "Fecha base"], ...dashMonths.map((m) => [monthLabel(m), "", "", "", m])];
  styleHeader(s.getRange("E15:H15"));
  styleBody(s.getRange("E16:H27"));
  s.getRange("I15:I27").format = { fill: "#FFFFFF", font: { color: "#FFFFFF" } };
  s.getRange("F16").formulas = [[`=SUMIFS('Registro de Ingresos'!$E$${startRow}:$E$${endRow},'Registro de Ingresos'!$A$${startRow}:$A$${endRow},">="&I16,'Registro de Ingresos'!$A$${startRow}:$A$${endRow},"<"&EDATE(I16,1))`]];
  s.getRange("G16").formulas = [[`=SUMIFS('Registro de Gastos'!$E$${startRow}:$E$${endRow},'Registro de Gastos'!$A$${startRow}:$A$${endRow},">="&I16,'Registro de Gastos'!$A$${startRow}:$A$${endRow},"<"&EDATE(I16,1),'Registro de Gastos'!$H$${startRow}:$H$${endRow},"Pagado")`]];
  s.getRange("H16").formulas = [["=F16-G16"]];
  s.getRange("F16:H27").fillDown();
  s.getRange("I16:I27").format.numberFormat = "mmm yyyy";
  s.getRange("F16:H27").format.numberFormat = currency;
  s.getRange("J3:N8").values = [["Resumen anual", "Ingresos", "Gastos", "Ahorro", "Balance"], ["Año actual", "", "", "", ""], ["Promedio mensual", "", "", "", ""], ["Mejor mes ahorro", "", "", "", ""], ["Peor mes ahorro", "", "", "", ""], ["Pagos 30 días", "", "", "", ""]];
  styleHeader(s.getRange("J3:N3"));
  styleBody(s.getRange("J4:N8"));
  s.getRange("K4:N8").formulas = [
    [`=SUM(F16:F27)`, `=SUM(G16:G27)`, `=SUM(H16:H27)`, `=K4-L4`],
    [`=AVERAGE(F16:F27)`, `=AVERAGE(G16:G27)`, `=AVERAGE(H16:H27)`, `=K5-L5`],
    [`=INDEX(E16:E27,MATCH(MAX(H16:H27),H16:H27,0))`, "", `=MAX(H16:H27)`, ""],
    [`=INDEX(E16:E27,MATCH(MIN(H16:H27),H16:H27,0))`, "", `=MIN(H16:H27)`, ""],
    [`=B11`, "", "", ""],
  ];
  s.getRange("K4:N8").format.numberFormat = currency;
  s.getRange("K6:K7").format.numberFormat = "mmm yyyy";
  s.getRange("P15:R27").values = [["Mes", "Ahorro real", "Meta de ahorro"], ...dashMonths.map((m, i) => [monthLabel(m), "", ""])];
  s.getRange("Q16").formulas = [["=H16"]];
  s.getRange("Q16:Q27").fillDown();
  s.getRange("R16").formulas = [["='Ahorro Mensual'!C6"]];
  s.getRange("R16:R27").fillDown();
  s.getRange("P15:R27").format = { fill: "#FFFFFF", font: { color: "#FFFFFF" } };
  s.getRange("Q16:R27").format.numberFormat = currency;
  setWidths(s, [170, 130, 90, 110, 120, 120, 120, 120, 8, 140, 110, 110, 110, 110, 8, 8, 8, 8]);
  const ch1 = s.charts.add("doughnut", s.getRange("A15:B33"));
  ch1.title = "Gastos por Categoría";
  ch1.hasLegend = true;
  ch1.setPosition("J10", "N24");
  const ch2 = s.charts.add("line", s.getRange("E15:H27"));
  ch2.title = "Ingresos vs Gastos y Ahorro";
  ch2.hasLegend = true;
  ch2.xAxis = { axisType: "textAxis" };
  ch2.yAxis = { numberFormatCode: "$#,##0" };
  ch2.setPosition("A35", "H52");
  const ch3 = s.charts.add("line", s.getRange("P15:R27"));
  ch3.title = "Evolución de Ahorro";
  ch3.hasLegend = true;
  ch3.xAxis = { axisType: "textAxis" };
  ch3.yAxis = { numberFormatCode: "$#,##0" };
  ch3.setPosition("J26", "N42");
  s.freezePanes.freezeRows(3);
}

// Final styling pass
for (const s of Object.values(sheets)) {
  try {
    s.getUsedRange().format.font.name = "Aptos";
  } catch {}
}

await fs.mkdir(outputDir, { recursive: true });

const dashboardCheck = await workbook.inspect({
  kind: "table",
  range: "'Dashboard General'!A1:N20",
  include: "values,formulas",
  tableMaxRows: 22,
  tableMaxCols: 14,
  maxChars: 8000,
});
console.log(dashboardCheck.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
  maxChars: 4000,
});
console.log(errors.ndjson);

for (const sheetName of Object.keys(sheets)) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/${sheetName.replace(/[\\/:*?"<>|]/g, "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(`SAVED ${outputPath}`);
