const LS = {
  entries: "nutripulse_entries",
  settings: "nutripulse_settings",
  favorites: "nutripulse_favorites",
  recent: "nutripulse_recent",
};

const NUTRIENTS = [
  { key: "kcal", label: "קלוריות", unit: "kcal", group: "macro" },
  { key: "protein", label: "חלבון", unit: "g", group: "macro" },
  { key: "carbs", label: "פחמימות", unit: "g", group: "macro" },
  { key: "fat", label: "שומן", unit: "g", group: "macro" },
  { key: "fiber", label: "סיבים", unit: "g", group: "macro" },

  { key: "vitaminC_mg", label: "ויטמין C", unit: "mg", group: "micro" },
  { key: "vitaminA_ug", label: "ויטמין A", unit: "µg", group: "micro" },
  { key: "vitaminB12_ug", label: "ויטמין B12", unit: "µg", group: "micro" },
  { key: "folate_ug", label: "חומצה פולית", unit: "µg", group: "micro" },

  { key: "calcium_mg", label: "סידן", unit: "mg", group: "micro" },
  { key: "iron_mg", label: "ברזל", unit: "mg", group: "micro" },
  { key: "magnesium_mg", label: "מגנזיום", unit: "mg", group: "micro" },
  { key: "potassium_mg", label: "אשלגן", unit: "mg", group: "micro" },
];

const DEFAULT_SETTINGS = {
  targets: {
    kcal: 2300,
    protein: 130,
    carbs: 250,
    fat: 80,
    fiber: 30,

    vitaminC_mg: 90,
    vitaminA_ug: 900,
    vitaminB12_ug: 2.4,
    folate_ug: 400,

    calcium_mg: 1000,
    iron_mg: 8,
    magnesium_mg: 400,
    potassium_mg: 3400,
  },
  weights: {
    protein: 2.0,
    fiber: 1.5,

    vitaminC_mg: 1.0,
    vitaminA_ug: 1.0,
    vitaminB12_ug: 1.0,
    folate_ug: 1.0,

    calcium_mg: 1.0,
    iron_mg: 1.0,
    magnesium_mg: 1.0,
    potassium_mg: 1.0,
  },
  scoreThreshold: 0.7,
};

let FOODS = [];
let selectedFoodId = null;

const $ = (id) => document.getElementById(id);

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureSettings() {
  const s = loadJSON(LS.settings, null);
  if (!s) saveJSON(LS.settings, DEFAULT_SETTINGS);
  return loadJSON(LS.settings, DEFAULT_SETTINGS);
}

function entriesAll() {
  return loadJSON(LS.entries, []);
}

function entriesForDate(dateISO) {
  return entriesAll().filter(e => e.dateISO === dateISO);
}

function foodById(id) {
  return FOODS.find(f => f.id === id);
}

function calcTotals(entries) {
  const totals = {};
  NUTRIENTS.forEach(n => totals[n.key] = 0);

  for (const e of entries) {
    const f = foodById(e.foodId);
    if (!f) continue;
    const factor = (Number(e.grams) || 0) / 100;

    totals.kcal += (f.per100g?.kcal || 0) * factor;
    totals.protein += (f.per100g?.protein || 0) * factor;
    totals.carbs += (f.per100g?.carbs || 0) * factor;
    totals.fat += (f.per100g?.fat || 0) * factor;
    totals.fiber += (f.per100g?.fiber || 0) * factor;

    const m = f.micros || {};
    for (const k of Object.keys(m)) {
      totals[k] = (totals[k] || 0) + (m[k] || 0) * factor;
    }
  }
  return totals;
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function nutrientScore(consumed, goal, threshold) {
  if (!goal || goal <= 0) return 100;
  const p = consumed / goal;
  if (p < threshold) return 0;
  if (p >= 1) return 100;
  return ((p - threshold) / (1 - threshold)) * 100;
}

function calcDailyScore(totals, settings) {
  const t = settings.targets;
  const w = settings.weights;
  const th = settings.scoreThreshold ?? 0.7;

  let sum = 0;
  let wsum = 0;

  for (const key of Object.keys(w)) {
    const weight = w[key];
    const consumed = totals[key] || 0;
    const goal = t[key] || 0;
    const s = nutrientScore(consumed, goal, th);
    sum += s * weight;
    wsum += weight;
  }
  return wsum ? (sum / wsum) : 0;
}

function fmt(n, digits = 0) {
  if (!isFinite(n)) return "0";
  return Number(n).toFixed(digits);
}

function renderSettingsForm(settings) {
  const wrap = $("settingsForm");
  wrap.innerHTML = "";

  const addField = (key, label, unit) => {
    const v = settings.targets[key];
    const div = document.createElement("div");
    div.innerHTML = `
      <label class="label">${label} (${unit})</label>
      <input type="number" step="any" data-target="${key}" value="${v}">
    `;
    wrap.appendChild(div);
  };

  const macro = [
    ["kcal","קלוריות","kcal"],
    ["protein","חלבון","g"],
    ["carbs","פחמימות","g"],
    ["fat","שומן","g"],
    ["fiber","סיבים","g"],
  ];
  const micro = [
    ["vitaminC_mg","ויטמין C","mg"],
    ["vitaminA_ug","ויטמין A","µg"],
    ["vitaminB12_ug","ויטמין B12","µg"],
    ["folate_ug","חומצה פולית","µg"],
    ["calcium_mg","סידן","mg"],
    ["iron_mg","ברזל","mg"],
    ["magnesium_mg","מגנזיום","mg"],
    ["potassium_mg","אשלגן","mg"],
  ];

  macro.forEach(x => addField(x[0], x[1], x[2]));
  micro.forEach(x => addField(x[0], x[1], x[2]));
}

function statusForProgress(p) {
  if (p >= 1) return { icon:"✅", text:"OK", cls:"ok" };
  if (p >= 0.7) return { icon:"⚠️", text:"קרוב", cls:"near" };
  return { icon:"❌", text:"חסר", cls:"low" };
}

function barColor(progress) {
  if (progress >= 1) return "var(--green)";
  if (progress >= 0.7) return "var(--amber)";
  return "var(--red)";
}

function renderNutrientTable(totals, settings) {
  const t = settings.targets;

  const rows = [];
  rows.push(`
    <div class="trow head">
      <div>רכיב</div><div>נצרך</div><div>יעד</div><div>%</div><div>סטטוס</div>
    </div>
  `);

  for (const n of NUTRIENTS) {
    const goal = t[n.key] ?? 0;
    const consumed = totals[n.key] ?? 0;

    const p = goal > 0 ? (consumed / goal) : 0;
    const progress = clamp(p, 0, 1.2);

    const st = statusForProgress(p);
    const pct = goal > 0 ? Math.round(p * 100) : 0;

    const digits = 0;
    const consumedStr = fmt(consumed, (n.key === "vitaminB12_ug") ? 1 : digits);
    const goalStr = fmt(goal, (n.key === "vitaminB12_ug") ? 1 : digits);

    rows.push(`
      <div class="trow">
        <div>${n.label}</div>
        <div>${consumedStr} ${n.unit}</div>
        <div>${goalStr} ${n.unit}</div>
        <div>
          <div class="progress"><div class="bar" style="width:${clamp(progress,0,1)*100}%;background:${barColor(p)}"></div></div>
          <div style="margin-top:6px;color:var(--muted);font-size:12px">${pct}%</div>
        </div>
        <div class="status">${st.icon}</div>
      </div>
    `);
  }

  $("nutrientTable").innerHTML = rows.join("");
}

function renderGaps(totals, settings) {
  const t = settings.targets;
  const gaps = [];

  const keys = ["protein","fiber","vitaminC_mg","calcium_mg","iron_mg","magnesium_mg","potassium_mg","vitaminB12_ug","folate_ug","vitaminA_ug"];
  for (const k of keys) {
    const goal = t[k] || 0;
    const consumed = totals[k] || 0;
    if (goal <= 0) continue;
    if (consumed < goal) {
      const n = NUTRIENTS.find(x => x.key === k);
      const diff = goal - consumed;
      const unit = n?.unit || "";
      const pretty = (k === "vitaminB12_ug") ? fmt(diff, 1) : fmt(diff, 0);
      gaps.push({ key:k, label:n?.label || k, diff:pretty, unit });
    }
  }

  if (gaps.length === 0) {
    $("gaps").innerHTML = "נראה טוב — הגעת ליעדים ברוב הרכיבים ✅";
    return;
  }

  const items = gaps.map(g => `<li><strong>${g.label}</strong>: חסר בערך ${g.diff} ${g.unit}</li>`).join("");
  $("gaps").innerHTML = `<ul>${items}</ul>`;
}

function renderKPIs(totals) {
  $("kcalTotal").textContent = Math.round(totals.kcal || 0);
  $("proteinTotal").textContent = fmt(totals.protein || 0, 0);
  $("fiberTotal").textContent = fmt(totals.fiber || 0, 0);
}

function renderScore(score) {
  $("dailyScore").textContent = isFinite(score) ? Math.round(score) : "—";
}

function tagText(food) {
  if (!food) return "";
  if (food.healthTag === "green") return "🍏 ירוק (יומיומי)";
  if (food.healthTag === "red") return "🍰 אדום (פינוק)";
  return "";
}

function renderSelectedFood(food) {
  const box = $("selectedFood");
  if (!food) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");

  const cls = food.healthTag === "green" ? "green" : (food.healthTag === "red" ? "red" : "");
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
      <div>
        <div class="name ${cls}" style="font-size:16px;font-weight:800">${food.name}</div>
        <div class="tag ${cls}" style="margin-top:4px">${tagText(food)} • ${food.healthNote || ""}</div>
      </div>
      <div style="color:var(--muted);font-size:12px;text-align:left">
        ל-100g: ${food.per100g.kcal}kcal, P${food.per100g.protein}g
      </div>
    </div>
    ${food.servingGrams ? `<div class="note" style="margin-top:8px">מנה נוחה: ${food.servingGrams}g</div>` : ""}
  `;
}

function renderTodayList(entries) {
  const wrap = $("todayList");
  if (!entries.length) {
    wrap.innerHTML = `<div class="note">אין רשומות עדיין. הוסף מזון כדי להתחיל.</div>`;
    return;
  }
  const html = entries
    .slice()
    .sort((a,b) => (a.time||"").localeCompare(b.time||""))
    .map(e => {
      const f = foodById(e.foodId);
      const cls = f?.healthTag === "green" ? "green" : (f?.healthTag === "red" ? "red" : "");
      const tag = f?.healthTag === "green" ? "🍏" : (f?.healthTag === "red" ? "🍰" : "•");
      const kcal = f ? (f.per100g.kcal * (e.grams/100)) : 0;
      return `
        <div class="item">
          <div>
            <div class="name ${cls}">${tag} ${f?.name || "מזון לא מוכר"}</div>
            <div class="meta">${e.time || ""} • ${e.grams}g • ~${Math.round(kcal)} kcal</div>
          </div>
          <div class="right">
            <button class="btn del" data-del="${e.id}">מחק</button>
          </div>
        </div>
      `;
    })
    .join("");
  wrap.innerHTML = html;

  wrap.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => deleteEntry(btn.getAttribute("data-del")));
  });
}

function upsertRecent(foodId) {
  const recent = loadJSON(LS.recent, []);
  const filtered = recent.filter(x => x !== foodId);
  filtered.unshift(foodId);
  saveJSON(LS.recent, filtered.slice(0, 10));
}

function addEntry(dateISO) {
  const grams = Number($("gramsInput").value);
  if (!selectedFoodId || !grams || grams <= 0) return;

  const all = entriesAll();
  all.push({
    id: crypto.randomUUID(),
    dateISO,
    time: nowTime(),
    foodId: selectedFoodId,
    grams: Math.round(grams),
  });
  saveJSON(LS.entries, all);
  upsertRecent(selectedFoodId);

  $("gramsInput").value = "";
  refresh();
}

function deleteEntry(id) {
  const all = entriesAll().filter(e => e.id !== id);
  saveJSON(LS.entries, all);
  refresh();
}

function renderFoodResults(query) {
  const ul = $("foodResults");
  ul.innerHTML = "";
  if (!query || query.trim().length < 1) return;

  const q = query.trim().toLowerCase();
  const results = FOODS
    .filter(f => f.name.toLowerCase().includes(q))
    .slice(0, 12);

  for (const f of results) {
    const li = document.createElement("li");
    const cls = f.healthTag === "green" ? "green" : "red";
    li.innerHTML = `<span>${f.name}</span><span class="tag ${cls}">${f.healthTag === "green" ? "ירוק" : "אדום"}</span>`;
    li.addEventListener("click", () => {
      selectedFoodId = f.id;
      $("foodSearch").value = f.name;
      $("foodResults").innerHTML = "";
      renderSelectedFood(f);
      $("addBtn").disabled = false;

      $("gramsInput").value = f.servingGrams ? String(f.servingGrams) : "100";
      $("gramsInput").focus();
    });
    ul.appendChild(li);
  }
}

function exportJSON() {
  const payload = {
    exportedAt: new Date().toISOString(),
    settings: loadJSON(LS.settings, DEFAULT_SETTINGS),
    entries: entriesAll(),
    favorites: loadJSON(LS.favorites, []),
    recent: loadJSON(LS.recent, []),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `nutripulse-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.settings) saveJSON(LS.settings, data.settings);
      if (Array.isArray(data.entries)) saveJSON(LS.entries, data.entries);
      if (Array.isArray(data.favorites)) saveJSON(LS.favorites, data.favorites);
      if (Array.isArray(data.recent)) saveJSON(LS.recent, data.recent);
      refresh();
      alert("ייבוא הצליח ✅");
    } catch {
      alert("קובץ לא תקין");
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!confirm("לאפס הכל? זה ימחק רשומות ויעדים מהדפדפן.")) return;
  localStorage.removeItem(LS.entries);
  localStorage.removeItem(LS.settings);
  localStorage.removeItem(LS.favorites);
  localStorage.removeItem(LS.recent);
  ensureSettings();
  refresh();
}

function refresh() {
  const settings = ensureSettings();
  const dateISO = $("datePicker").value || todayISO();
  const entries = entriesForDate(dateISO);
  const totals = calcTotals(entries);

  const score = calcDailyScore(totals, settings);

  renderKPIs(totals);
  renderScore(score);
  renderNutrientTable(totals, settings);
  renderGaps(totals, settings);
  renderTodayList(entries);
}

async function loadFoods() {
  try {
    const res = await fetch("data/foods.json", { cache: "no-store" });
    FOODS = await res.json();
  } catch (e) {
    console.error("Failed to load foods.json", e);
    FOODS = [];
  }
}

function wireUI() {
  const dp = $("datePicker");
  dp.value = todayISO();
  dp.addEventListener("change", refresh);

  $("foodSearch").addEventListener("input", (e) => renderFoodResults(e.target.value));

  $("addBtn").addEventListener("click", () => addEntry(dp.value));

  document.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      $("gramsInput").value = btn.dataset.g;
      $("gramsInput").focus();
    });
  });

  const settings = ensureSettings();
  renderSettingsForm(settings);
  $("saveSettings").addEventListener("click", () => {
    const s = ensureSettings();
    document.querySelectorAll("[data-target]").forEach(inp => {
      const k = inp.getAttribute("data-target");
      s.targets[k] = Number(inp.value);
    });
    saveJSON(LS.settings, s);
    refresh();
    alert("נשמר ✅");
  });

  $("exportBtn").addEventListener("click", exportJSON);
  $("importFile").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importJSON(f);
    e.target.value = "";
  });
  $("resetBtn").addEventListener("click", resetAll);
}

(async function init(){
  ensureSettings();
  await loadFoods();
  wireUI();
  refresh();
})();
