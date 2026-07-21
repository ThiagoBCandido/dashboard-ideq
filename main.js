"use strict";

/* ===== CONFIG ===== */

var ALIASES = {
  patrimonyNotebook: ["patrimonio_notebook_", "patrimonio notebook", "patrimonionotebook"],
  patrimonyMonitor: ["patrimonio_monitor_se_tiver_", "patrimonio monitor se tiver", "patrimoniomonitorsetiver", "patrimonio monitor"],
  collaborator: ["colaborador", "responsavel", "responsável", "usuario", "usuário", "funcionario", "funcionário"],
  item: ["item", "tipo", "tipoequipamento", "tipo de equipamento", "categoria", "categoriaequipamento"],
  machine: ["maquina_ou_acessorio", "maquina ou acessorio", "máquina ou acessório", "maquina", "máquina", "descricao", "descrição"],
  model: ["modelo", "model"],
  brand: ["marca", "fabricante"],
  condition: ["estado", "condicao", "condição"],
  unit: ["unidade", "filial", "local", "localizacao", "localização"],
  quantity: ["quantidade", "qtd", "qtde", "quant"],
  notes: ["observacao", "observação", "observacoes", "observações", "comentario", "comentário", "nota", "notas"],
  sector: ["setor", "departamento", "area", "área"],
  serial: ["numerodeserie", "número de série", "numero de serie", "serial", "serialnumber", "sn"]
};

var PATTERN_MAPS = {
  otherCategory: [
    [/teclado|keyboard/, "Teclados"], [/mousepad/, "Mousepads"], [/mouse/, "Mouses"],
    [/headset|fone/, "Headsets"], [/dock|docking|hub/, "Dock Stations"],
    [/fonte|carregador|power supply/, "Fontes"], [/adaptador|cabo|hdmi|vga|usb/, "Adaptadores e cabos"],
    [/celular|smartphone|iphone|android/, "Celulares"], [/impressora|printer|scanner/, "Impressoras"],
    [/nobreak|no-break|estabilizador/, "Nobreaks"], [/mochila|bolsa|case|maleta/, "Bolsas e mochilas"],
    [/ssd|hd externo|pendrive|disco|memoria|memória/, "Armazenamento"]
  ],
  status: [
    [/troca|substituicao|substituição|trocar/, "Troca/venda"],
    [/conserto|manutencao|manutenção|reparo|assistencia|assistência/, "Em manutenção"],
    [/lento|travando|defeito|problema|bateria estufada|quebrado|falha/, "Com problemas"],
    [/em uso|ativo|operacional/, "Ativo"],
    [/inativo|baixado|descartado/, "Inativo"],
    [/disponivel|disponível|estoque|livre|novo|conservado/, "Disponível"]
  ],
  notebookStatus: [
    [/troca|substituicao|substituição|trocar/, "Troca/venda"],
    [/conserto|manutencao|manutenção|reparo|assistencia|assistência/, "Em manutenção"],
    [/lento|travando|defeito|problema|bateria estufada|quebrado|falha/, "Com problemas"]
  ]
};

var STATUS_CLASSES = {
  "ativo": "status-active", "disponivel": "status-available", "inativo": "status-inactive",
  "em manutencao": "status-maintenance", "troca/venda": "status-replacement",
  "com problemas": "status-problem", "em uso": "status-use", "bom estado": "status-stock"
};

var QUICK_FILTERS = {
  active: function (s) { return s === "Ativo" || s === "Em uso"; },
  inactive: function (s) { return s === "Inativo"; },
  maintenance: function (s) { return s === "Em manutenção"; },
  replacement: function (s) { return s === "Troca/venda"; }
};

var FILTER_CONFIG = [
  { id: "categoryFilter", prop: "category", placeholder: "Todas as categorias" },
  { id: "statusFilter", prop: "status", placeholder: "Todos os status", dynamic: true },
  { id: "collaboratorFilter", prop: "collaborator", placeholder: "Todos os colaboradores" },
  { id: "sectorFilter", prop: "sector", placeholder: "Todos os setores" },
  { id: "locationFilter", prop: "unit", placeholder: "Todas as unidades" }
];

var KPI_CONFIG = [
  { fn: function (a) { return a; } },
  { fn: function (a) { return a.filter(function (x) { return x.category === "Notebooks"; }); } },
  { fn: function (a) { return a.filter(function (x) { return x.category === "Monitores"; }); } },
  { fn: function (a) { return uniqueValues(a, "collaborator"); } },
  { fn: function (a) { return a.filter(function (x) { return x.status === "Ativo" || x.notebookStatus === "Em uso"; }); } },
  { fn: function (a) { return a.filter(function (x) { return x.notebookStatus === "Bom estado"; }); } },
  { fn: function (a) { return a.filter(function (x) { return x.status === "Disponível" || x.notebookStatus === "Bom estado"; }); } },
  { fn: function (a) { return a.filter(function (x) { return x.status === "Em manutenção" || x.notebookStatus === "Em manutenção"; }); } },
  { fn: function (a) { return a.filter(function (x) { return x.status === "Troca/venda" || x.notebookStatus === "Troca/venda"; }); } },
  { fn: function (a) { return a.filter(function (x) { return x.category === "Notebooks" && x.notebookStatus === "Com problemas"; }); } },
  { fn: function (a) { return a.filter(function (x) { return x.category === "Monitores" && x.status === "Com problemas"; }); } }
];

var NOTEBOOK_SUMMARY_CONFIG = [
  { label: "Estoque geral", fn: function (a) { return a; } },
  { label: "Em uso", fn: function (a) { return a.filter(function (x) { return x.notebookStatus === "Em uso"; }); } },
  { label: "Ativos", fn: function (a) { return a.filter(function (x) { return x.status === "Ativo"; }); } },
  { label: "Inativos", fn: function (a) { return a.filter(function (x) { return x.notebookStatus === "Inativo"; }); } },
  { label: "Estoque ativo", fn: isWithoutOwner, warning: true },
  { label: "Bom estado", fn: function (a) { return a.filter(function (x) { return x.notebookStatus === "Bom estado"; }); } },
  { label: "Com problemas", fn: function (a) { return a.filter(function (x) { return x.notebookStatus === "Com problemas"; }); }, alert: true },
  { label: "Troca/venda", fn: function (a) { return a.filter(function (x) { return x.notebookStatus === "Troca/venda"; }); }, alert: true },
  { label: "Em manutenção", fn: function (a) { return a.filter(function (x) { return x.notebookStatus === "Em manutenção"; }); }, warning: true }
];

var MONITOR_SUMMARY_CONFIG = [
  { label: "Estoque geral", fn: function (a) { return a; } },
  { label: "Ativos", fn: function (a) { return a.filter(function (x) { return x.status === "Ativo"; }); } },
  { label: "Inativos", fn: function (a) { return a.filter(function (x) { return x.status === "Inativo"; }); } },
  { label: "Vinculados", fn: function (a) { return a.filter(function (x) { return !isWithoutOwner(x); }); } },
  { label: "Estoque ativo", fn: isWithoutOwner, warning: true },
  { label: "Em manutenção", fn: function (a) { return a.filter(function (x) { return x.status === "Em manutenção"; }); }, warning: true },
  { label: "Troca/venda", fn: function (a) { return a.filter(function (x) { return x.status === "Troca/venda"; }); }, alert: true }
];

var PATRIMONY_CARDS_CONFIG = [
  { label: "Patrimônios duplicados", fn: function (a) { return findDuplicates(a.filter(function (x) { return !isEmptyValue(x.patrimony); }).map(function (x) { return x.patrimony; })).length; } },
  { label: "Patrimônios inexistentes", fn: function (a) { return a.filter(function (x) { return isEmptyValue(x.patrimony); }).length; } },
  { label: "Sem responsável", fn: function (a) { return a.filter(isWithoutOwner).length; } },
  { label: "Sem localização", fn: function (a) { return a.filter(function (x) { return isEmptyValue(x.unit); }).length; } },
  { label: "Sem número de série", fn: function (a) { return a.filter(function (x) { return isEmptyValue(x.serial); }).length; } },
  { label: "Inativos", fn: function (a) { return a.filter(function (x) { return x.status === "Inativo" || x.notebookStatus === "Inativo"; }).length; } },
  { label: "Em manutenção", fn: function (a) { return a.filter(function (x) { return x.status === "Em manutenção" || x.notebookStatus === "Em manutenção"; }).length; } }
];

var NOTEBOOK_HEADERS = ["Patrimônio do notebook", "Monitor relacionado", "Modelo", "Marca", "Número de série", "Status da linha", "Situação do notebook", "Colaborador responsável", "Setor", "Unidade", "Observações"];
var MONITOR_HEADERS = ["Patrimônio do monitor", "Notebook relacionado", "Modelo", "Marca", "Número de série", "Status", "Colaborador responsável", "Setor", "Unidade", "Observações"];
var ALL_HEADERS = ["Tipo", "Patrimônio", "Patrimônio relacionado", "Categoria", "Situação", "Modelo", "Marca", "Número de série", "Colaborador", "Setor", "Unidade", "Quantidade", "Observações"];
var UNASSIGNED_HEADERS = ["Tipo", "Patrimônio", "Patrimônio relacionado", "Situação", "Modelo", "Unidade", "Observações"];

/* ===== STATE ===== */

var state = { rows: [], assets: [], filteredAssets: [], columns: [], sourceName: "" };

/* ===== INIT ===== */

document.getElementById("importButton").addEventListener("click", function () { document.getElementById("fileInput").click(); });
document.getElementById("emptyImportButton").addEventListener("click", function () { document.getElementById("fileInput").click(); });
document.getElementById("fileInput").addEventListener("change", handleFileImport);
document.getElementById("globalSearch").addEventListener("input", applyFilters);
document.querySelectorAll(".filter-select").forEach(function (el) { el.addEventListener("change", applyFilters); });
document.querySelectorAll(".tab").forEach(function (tab) { tab.addEventListener("click", function () { switchView(tab.dataset.view); }); });

/* ===== UTIL ===== */

function $(id) { return document.getElementById(id); }
function normalizeKey(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase(); }
function normalizeText(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function formatNumber(v) { return Number(v || 0).toLocaleString("pt-BR"); }
function display(v) { return escapeHtml(v || "Não informado"); }
function escapeHtml(v) { return String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function emptyHtml(msg) { return '<div class="empty-cell">' + escapeHtml(msg) + '</div>'; }
function isEmptyValue(v) { var n = normalizeText(v); return !n || ["-", "—", "nao informado", "não informado", "n/a", "null", "undefined"].indexOf(n) >= 0; }
function isWithoutOwner(a) { return isEmptyValue(a.collaborator); }
function countBy(items, fn) { return items.filter(fn).length; }
function valueFrom(raw, col) { return col ? cleanValue(raw[col]) : ""; }
function cleanValue(v) { if (v === null || v === undefined) return ""; var r = String(v).trim(); return (r === "—" || r === "-" || r.toLowerCase() === "null") ? "" : r; }
function parseQuantity(v) { if (isEmptyValue(v)) return 0; var n = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""); var p = parseFloat(n); return isNaN(p) ? 0 : p; }
function matchPattern(text, patterns) { for (var i = 0; i < patterns.length; i++) { if (patterns[i][0].test(text)) return patterns[i][1]; } return null; }

function groupBy(items, prop) {
  return items.reduce(function (g, i) { var k = i[prop] || "Outros"; if (!g[k]) g[k] = []; g[k].push(i); return g; }, {});
}

function uniqueValues(items, prop) {
  return Array.from(new Set(items.map(function (i) { return i[prop]; }).filter(function (v) { return !isEmptyValue(v); }))).sort(function (a, b) { return String(a).localeCompare(String(b), "pt-BR"); });
}

function findDuplicates(vals) {
  var c = {};
  vals.forEach(function (v) { c[v] = (c[v] || 0) + 1; });
  return Object.keys(c).filter(function (v) { return c[v] > 1; });
}

/* ===== IMPORT ===== */

function handleFileImport(event) {
  var file = event.target.files[0];
  if (!file) return;

  var ext = file.name.split(".").pop().toLowerCase();
  if (["xlsx", "xls", "csv"].indexOf(ext) === -1) { showToast("Formato inválido. Use XLSX, XLS ou CSV."); event.target.value = ""; return; }
  if (typeof XLSX === "undefined") { showToast("A biblioteca de leitura da planilha não foi carregada."); event.target.value = ""; return; }

  setLoading(true);
  var reader = new FileReader();

  reader.onload = function (e) {
    try {
      var wb = XLSX.read(e.target.result, { type: ext === "csv" ? "string" : "array", raw: false, cellDates: true });
      if (!wb.SheetNames || !wb.SheetNames.length) throw new Error("Nenhuma aba encontrada.");

      var allRows = [];
      wb.SheetNames.forEach(function (sn) {
        var ws = wb.Sheets[sn];
        if (!ws) return;
        XLSX.utils.sheet_to_json(ws, { defval: "", raw: false, blankrows: false }).forEach(function (r) { r.__aba_origem = sn; allRows.push(r); });
      });

      if (!allRows.length) throw new Error("Nenhum registro encontrado.");
      processImport(allRows, file.name);
    } catch (err) {
      console.error("Erro na importação:", err);
      setLoading(false);
      showToast("Não foi possível ler a planilha. Verifique se a primeira linha contém os cabeçalhos.");
    }
    event.target.value = "";
  };

  reader.onerror = function () { setLoading(false); event.target.value = ""; showToast("Não foi possível abrir o arquivo."); };
  if (ext === "csv") reader.readAsText(file, "UTF-8"); else reader.readAsArrayBuffer(file);
}

function processImport(allRows, fileName) {
  var requiredKeys = ["patrimonionotebook", "patrimoniomonitorsetiver", "item", "maquinaouacessorio", "maquina"];
  var inv = allRows.filter(function (r) {
    var keys = Object.keys(r).map(normalizeKey);
    return requiredKeys.some(function (k) { return keys.indexOf(k) >= 0; });
  });

  if (!inv.length) { setLoading(false); showToast("Nenhuma aba de inventário foi encontrada."); return; }

  state.sourceName = fileName;
  state.rows = inv.map(normalizeRow);
  state.assets = expandRowsIntoAssets(state.rows);
  state.filteredAssets = state.assets.slice();
  state.columns = collectColumns(inv);

  $("emptyState").hidden = true;
  $("rawColumns").hidden = false;
  $("sourceText").innerHTML = "Arquivo atual: <strong>" + escapeHtml(fileName) + "</strong>";

  populateFilters();
  renderAll();
  setLoading(false);
  showToast(formatNumber(state.rows.length) + " linhas importadas e " + formatNumber(state.assets.length) + " ativos identificados.");
}

/* ===== DATA NORMALIZATION ===== */

function resolveFields(columns) {
  var fields = {};
  Object.keys(ALIASES).forEach(function (f) { fields[f] = findColumn(columns, ALIASES[f]); });
  return fields;
}

function findColumn(columns, names) {
  var nc = columns.map(function (c) { return { original: c, normalized: normalizeKey(c) }; });
  var nn = names.map(normalizeKey);
  var exact = nc.find(function (c) { return nn.indexOf(c.normalized) >= 0; });
  if (exact) return exact.original;
  var partial = nc.find(function (c) { return nn.some(function (n) { return c.normalized.indexOf(n) >= 0 || n.indexOf(c.normalized) >= 0; }); });
  return partial ? partial.original : "";
}

function normalizeRow(raw) {
  var columns = Object.keys(raw);
  var fields = resolveFields(columns);
  var row = {};
  columns.forEach(function (c) { row[c] = cleanValue(raw[c]); });

  row.__raw = raw;
  row.__fields = fields;
  row.__sheet = valueFrom(raw, "__aba_origem");
  row.__patrimonyNotebook = valueFrom(raw, fields.patrimonyNotebook);
  row.__patrimonyMonitor = valueFrom(raw, fields.patrimonyMonitor);
  row.__item = valueFrom(raw, fields.item);
  row.__machine = valueFrom(raw, fields.machine);
  row.__model = valueFrom(raw, fields.model) || row.__machine;
  row.__brand = valueFrom(raw, fields.brand);
  row.__condition = valueFrom(raw, fields.condition);
  row.__collaborator = valueFrom(raw, fields.collaborator);
  row.__unit = valueFrom(raw, fields.unit);
  row.__quantity = parseQuantity(valueFrom(raw, fields.quantity));
  row.__notes = valueFrom(raw, fields.notes) || getAdditionalNotes(raw, fields);
  row.__sector = valueFrom(raw, fields.sector);
  row.__serial = valueFrom(raw, fields.serial);
  row.__status = detectStatus(row);

  return row;
}

function getAdditionalNotes(raw, fields) {
  var excluded = Object.keys(fields).map(function (k) { return fields[k]; }).concat(["__aba_origem"]).filter(Boolean);
  return Object.keys(raw).filter(function (k) { return excluded.indexOf(k) === -1 && cleanValue(raw[k]); }).map(function (k) { return k + ": " + cleanValue(raw[k]); }).join(" | ");
}

function detectOtherCategory(row) {
  var text = normalizeText([row.__item, row.__machine, row.__model, row.__brand].join(" "));
  return matchPattern(text, PATTERN_MAPS.otherCategory) || row.__item || "Outros";
}

function detectStatus(row) {
  var text = normalizeText([row.__notes, row.__condition, row.__item, row.__machine].join(" "));
  return matchPattern(text, PATTERN_MAPS.status) || "Não informado";
}

function getNotebookStatus(asset) {
  var combined = normalizeText(asset.notes) + " " + normalizeText(asset.status);
  var matched = matchPattern(combined, PATTERN_MAPS.notebookStatus);
  if (matched) return matched;
  if (!isEmptyValue(asset.collaborator) || /em uso|uso/.test(normalizeText(asset.notes)) || normalizeText(asset.status) === "ativo") return "Em uso";
  return "Bom estado";
}

/* ===== ASSET CREATION ===== */

function expandRowsIntoAssets(rows) {
  var assets = [];
  rows.forEach(function (row, index) {
    if (!isEmptyValue(row.__patrimonyNotebook)) assets.push(createAsset(row, "Notebooks", row.__patrimonyNotebook, index));
    if (!isEmptyValue(row.__patrimonyMonitor)) assets.push(createAsset(row, "Monitores", row.__patrimonyMonitor, index));
    if (isEmptyValue(row.__patrimonyNotebook) && isEmptyValue(row.__patrimonyMonitor)) assets.push(createAsset(row, detectOtherCategory(row), "", index));
  });
  return assets;
}

function createAsset(row, category, patrimony, sourceRow) {
  var asset = {
    id: sourceRow + "-" + category + "-" + patrimony, sourceRow: sourceRow, category: category, patrimony: patrimony,
    notebookPatrimony: row.__patrimonyNotebook, monitorPatrimony: row.__patrimonyMonitor,
    item: row.__item, machine: row.__machine, model: row.__model, brand: row.__brand, condition: row.__condition,
    status: row.__status, collaborator: row.__collaborator, sector: row.__sector, unit: row.__unit,
    quantity: row.__quantity, serial: row.__serial, notes: row.__notes, sheet: row.__sheet, raw: row.__raw
  };
  asset.notebookStatus = category === "Notebooks" ? getNotebookStatus(asset) : "";
  return asset;
}

/* ===== FILTERS ===== */

function applyFilters() {
  var vals = {};
  ["globalSearch", "categoryFilter", "statusFilter", "collaboratorFilter", "sectorFilter", "locationFilter", "quickFilter"].forEach(function (id) {
    vals[id] = id === "globalSearch" ? normalizeText($(id).value) : normalizeText($(id).value);
  });

  state.filteredAssets = state.assets.filter(function (a) {
    var searchable = normalizeText([a.patrimony, a.notebookPatrimony, a.monitorPatrimony, a.category, a.notebookStatus, a.item, a.machine, a.model, a.brand, a.serial, a.collaborator, a.sector, a.unit, a.status, a.condition, a.notes].join(" "));
    var cur = a.category === "Notebooks" ? a.notebookStatus : a.status;

    if (vals.globalSearch && searchable.indexOf(vals.globalSearch) === -1) return false;
    if (vals.categoryFilter && normalizeText(a.category) !== vals.categoryFilter) return false;
    if (vals.statusFilter && normalizeText(cur) !== vals.statusFilter) return false;
    if (vals.collaboratorFilter && normalizeText(a.collaborator) !== vals.collaboratorFilter) return false;
    if (vals.sectorFilter && normalizeText(a.sector) !== vals.sectorFilter) return false;
    if (vals.locationFilter && normalizeText(a.unit) !== vals.locationFilter) return false;
    if (vals.quickFilter === "without-owner" && !isWithoutOwner(a)) return false;
    if (vals.quickFilter && vals.quickFilter !== "without-owner" && !(QUICK_FILTERS[vals.quickFilter] || function () { return false; })(cur)) return false;

    return true;
  });

  renderAll();
}

function populateFilters() {
  FILTER_CONFIG.forEach(function (cfg) {
    var values;
    if (cfg.dynamic) {
      values = uniqueValues(state.assets.map(function (a) { return { status: a.category === "Notebooks" ? a.notebookStatus : a.status }; }), "status");
    } else {
      values = uniqueValues(state.assets, cfg.prop);
    }
    populateSelect(cfg.id, values, cfg.placeholder);
  });
  $("rawColumnsList").innerHTML = state.columns.map(function (c) { return '<span class="pill">' + escapeHtml(c) + "</span>"; }).join("");
}

function populateSelect(id, values, placeholder) {
  var sel = $(id);
  var prev = sel.value;
  sel.innerHTML = '<option value="">' + escapeHtml(placeholder) + "</option>";
  values.forEach(function (v) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); });
  if (Array.from(sel.options).some(function (o) { return o.value === prev; })) sel.value = prev;
}

/* ===== RENDER ===== */

function renderAll() {
  var assets = state.filteredAssets;
  var notebooks = assets.filter(function (a) { return a.category === "Notebooks"; });
  var monitors = assets.filter(function (a) { return a.category === "Monitores"; });

  renderKpis(assets);
  renderExecutive(assets);
  renderSummarySection("notebook", notebooks, NOTEBOOK_SUMMARY_CONFIG);
  renderSummarySection("monitor", monitors, MONITOR_SUMMARY_CONFIG);
  $("notebookTable").innerHTML = assetTableHtml(notebooks, true);
  $("monitorTable").innerHTML = assetTableHtml(monitors, false);
  renderOtherEquipment(assets);
  renderPeople(assets);
  renderPatrimony(assets);
  renderAllAssets(assets);
  $("recordCount").textContent = formatNumber(assets.length) + " ativos filtrados";
}

function renderKpis(assets) {
  document.querySelectorAll("#kpis [data-kpi-value]").forEach(function (el, i) {
    var result = KPI_CONFIG[i].fn(assets);
    el.textContent = formatNumber(Array.isArray(result) ? result.length : result);
  });
}

function renderSummarySection(prefix, assets, config) {
  var attr = "data-" + prefix + "-summary";
  document.querySelectorAll("[" + attr + "]").forEach(function (el) {
    var idx = Number(el.getAttribute(attr));
    el.textContent = formatNumber(config[idx].fn(assets).length);
  });
}

function renderExecutive(assets) {
  $("executiveCount").textContent = formatNumber(assets.length) + " ativos";
  renderCategoryGrid("executiveCategories", assets, "Nenhum ativo encontrado.");
}

function renderOtherEquipment(assets) {
  var other = assets.filter(function (a) { return a.category !== "Notebooks" && a.category !== "Monitores"; });
  $("otherCount").textContent = formatNumber(other.length) + " equipamentos";
  renderCategoryGrid("otherCategories", other, "Nenhum equipamento adicional encontrado.");
}

function renderCategoryGrid(elementId, assets, emptyMsg) {
  var grouped = groupBy(assets, "category");
  var cats = Object.keys(grouped).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
  $(elementId).innerHTML = cats.map(function (c) { return categoryCardHtml(c, grouped[c]); }).join("") || emptyHtml(emptyMsg);
}

function categoryCardHtml(category, assets) {
  var isNb = category === "Notebooks";
  var stats = [
    ["Em uso", isNb ? "notebookStatus===Em uso" : "status===Ativo"],
    [isNb ? "Bom estado" : "Disponível", isNb ? "notebookStatus===Bom estado" : "status===Disponível"],
    ["Inativo", isNb ? "notebookStatus===Inativo" : "status===Inativo"],
    ["Sem responsável", "withoutOwner"]
  ];

  var statsHtml = stats.map(function (s) {
    var val;
    if (s[1] === "withoutOwner") val = countBy(assets, isWithoutOwner);
    else {
      var parts = s[1].split("==");
      var prop = parts[0], target = parts[1];
      val = countBy(assets, function (a) { return (isNb ? a[prop] : a[prop]) === target; });
    }
    return '<div class="category-stat"><strong>' + formatNumber(val) + '</strong><span>' + escapeHtml(s[0]) + '</span></div>';
  }).join("");

  return '<article class="category-card"><h3>' + escapeHtml(category) + '</h3><div class="category-total">' + formatNumber(assets.length) + '</div><div class="category-stats">' + statsHtml + '</div></article>';
}

/* ===== TABLES ===== */

function badgeHtml(status) {
  var value = status || "Não informado";
  return '<span class="status ' + (STATUS_CLASSES[normalizeText(value)] || "status-default") + '">' + escapeHtml(value) + '</span>';
}

function tableRowHtml(cells) { return "<tr>" + cells.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }

function tableHtml(headers, body, emptyMsg) {
  if (!body) return emptyHtml(emptyMsg || "Nenhum registro encontrado.");
  return '<div class="table-scroll"><table><thead><tr>' + headers.map(function (h) { return "<th>" + escapeHtml(h) + "</th>"; }).join("") + "</tr></thead><tbody>" + body + "</tbody></table></div>";
}

function assetTableHtml(assets, isNb) {
  if (!assets.length) return emptyHtml("Nenhum registro encontrado.");
  var headers = isNb ? NOTEBOOK_HEADERS : MONITOR_HEADERS;
  var body = assets.map(function (a) {
    var cells = [display(a.patrimony), display(isNb ? a.monitorPatrimony : a.notebookPatrimony), display(a.model), display(a.brand), display(a.serial), badgeHtml(a.status)];
    if (isNb) cells.push(badgeHtml(a.notebookStatus));
    cells.push(display(a.collaborator), display(a.sector), display(a.unit), display(a.notes));
    return tableRowHtml(cells);
  }).join("");
  return tableHtml(headers, body);
}

function renderAllAssets(assets) {
  $("allCount").textContent = formatNumber(assets.length) + " ativos";
  if (!assets.length) { $("allTable").innerHTML = emptyHtml("Nenhum ativo encontrado."); return; }
  var body = assets.map(function (a) {
    var sit = a.category === "Notebooks" ? a.notebookStatus : a.status;
    var rel = a.category === "Monitores" ? a.notebookPatrimony : a.monitorPatrimony;
    return tableRowHtml([display(a.category), display(a.patrimony), display(rel), display(a.category), badgeHtml(sit), display(a.model), display(a.brand), display(a.serial), display(a.collaborator), display(a.sector), display(a.unit), formatNumber(a.quantity), display(a.notes)]);
  }).join("");
  $("allTable").innerHTML = tableHtml(ALL_HEADERS, body);
}

/* ===== PEOPLE ===== */

function renderPeople(assets) {
  var people = {};
  var unassigned = [];
  assets.forEach(function (a) {
    if (isWithoutOwner(a)) { unassigned.push(a); return; }
    if (!people[a.collaborator]) people[a.collaborator] = [];
    people[a.collaborator].push(a);
  });

  var names = Object.keys(people).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
  $("peopleCount").textContent = formatNumber(names.length) + " colaboradores";
  $("peopleCards").innerHTML = names.map(function (n) { return buildPersonCard(n, people[n]); }).join("") || emptyHtml("Nenhum colaborador identificado.");
  $("unassignedTable").innerHTML = tableHtml(UNASSIGNED_HEADERS, unassigned.map(buildUnassignedRow).join(""), "Nenhum equipamento sem responsável.");
}

function buildPersonCard(name, assets) {
  var chips = assets.slice(0, 12).map(function (a) { return '<span class="asset-chip">' + escapeHtml(a.patrimony || a.category || a.model || "Ativo") + "</span>"; }).join("");
  if (assets.length > 12) chips += '<span class="asset-chip">+' + formatNumber(assets.length - 12) + " outros</span>";
  return '<article class="person-card"><h3>' + escapeHtml(name) + '</h3><div class="person-count">' + formatNumber(assets.length) + ' equipamento(s)</div><div class="person-assets">' + chips + "</div></article>";
}

function buildUnassignedRow(a) {
  var sit = a.category === "Notebooks" ? a.notebookStatus : a.status;
  var rel = a.category === "Monitores" ? a.notebookPatrimony : a.monitorPatrimony;
  return tableRowHtml([display(a.category), display(a.patrimony), display(rel), badgeHtml(sit), display(a.model), display(a.unit), display(a.notes)]);
}

/* ===== PATRIMONY ===== */

function renderPatrimony(assets) {
  $("patrimonyCards").innerHTML = PATRIMONY_CARDS_CONFIG.map(function (cfg) {
    return '<article class="patrimony-card"><strong>' + formatNumber(cfg.fn(assets)) + '</strong><span>' + escapeHtml(cfg.label) + '</span></article>';
  }).join("");
  $("patrimonyTable").innerHTML = emptyHtml("As pendências patrimoniais serão exibidas aqui.");
}

/* ===== MISC ===== */

function setLoading(v) { $("loading").classList.toggle("show", v); }

function collectColumns(rows) {
  var cols = {};
  rows.forEach(function (r) { Object.keys(r).forEach(function (c) { if (c !== "__aba_origem") cols[c] = true; }); });
  return Object.keys(cols);
}

function switchView(name) {
  document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.view === name); });
  document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
}

function showToast(msg) {
  var t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = "position:fixed;z-index:10001;right:20px;bottom:20px;max-width:360px;padding:12px 16px;border-radius:8px;background:#1f2937;color:#fff;font-size:13px;box-shadow:0 5px 18px rgba(0,0,0,.2)";
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 3500);
}