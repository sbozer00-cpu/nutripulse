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
  // weights only affect score calculation
  weights: {
    // calories should be "close to target", not "more is better"
    kcal: 0.8,

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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

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

// Merge defaults into existing settings so old users won't break
function deepMergeDefaults(base, defaults) {
  const out = Array.isArray(base) ? [...base] : { ...(base || {}) };
  for (const [k, v] of Object.entries(defaults)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMergeDefaults(out[k], v);
    } else {
      if (out[k] === undefined || out[k] === null || out[k] === "") out[k] = v;
    }
  }
  return out;
}

function ensureSettings() {
  const current = loadJSON(LS.settings, null);
  const merged = deepMergeDefaults(current, DEFAULT_SETTINGS);

  // sanitize threshold
  merged.scoreThreshold = clamp(Number(merged.scoreThreshold ?? 0.7), 0, 0.99);

  saveJSON(LS.settings, merged);
  return merged;
}

function entriesAll() {
  const arr = loadJSON(LS.entries, []);
  return Array.isArray(arr) ? arr : [];
}

function entriesForDate(dateISO) {
  return entriesAll().filter((e) => e && e.dateISO === dateISO);
}

function safeUUID() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function foodById(id) {
  return FOODS.find((f) => f.id === id);
}

function calcTotals(entries) {
  const totals = {};
  NUTRIENTS.forEach((n) => (totals[n.key] = 0));

  for (const e of entries) {
    const f = foodById(e.foodId);
    if (!f) continue;

    const grams = Number(e.grams) || 0;
    if (grams <= 0) continue;

    const factor = grams / 100;

    const p = f.per100g || {};
    totals.kcal += (p.kcal || 0) * factor;
    totals.protein += (p.protein || 0) * factor;
    totals.carbs += (p.carbs || 0) * factor;
    totals.fat += (p.fat || 0) * factor;
    totals.fiber += (p.fiber || 0) * factor;

    const m = f.micros || {};
    for (const k of Object.keys(m)) {
      totals[k] = (totals[k] || 0) + (m[k] || 0) * factor;
    }
  }

  return totals;
}

// ---------- SCORE (1..10) ----------
function nutrientCredit(consumed, goal, threshold) {
  if (!goal || goal <= 0) return 1;
  const p = consumed / goal;

  if (p < threshold) return 0;
  if (p >= 1) return 1;

  return (p - threshold) / (1 - threshold); // 0..1
}

// calories: best when close to target (symmetrical)
function caloriesCredit(consumed, goal) {
  if (!goal || goal <= 0) return 1;

  const diff = Math.abs(consumed - goal);

  const full = goal * 0.12; // <= 12% deviation => ~perfect
  const zero = goal * 0.35; // >= 35% deviation => 0

  if (diff <= full) return 1;
  if (diff >= zero) return 0;

  return 1 - (diff - full) / (zero - full); // 1..0
}

function calcDailyScore(totals, settings) {
  const t = settings.targets || {};
  const w = settings.weights || {};
  const th = settings.scoreThreshold ?? 0.7;

  let sum = 0;
  let wsum = 0;

  for (const [key, weightRaw] of Object.entries(w)) {
    const weight = Number(weightRaw) || 0;
    if (weight <= 0) continue;

    const consumed = Number(totals[key] || 0);
    const goal = Number(t[key] || 0);

    let credit = 0;
    if (key === "kcal") credit = caloriesCredit(consumed, goal);
    else credit = nutrientCredit(consumed, goal, th);

    sum += credit * weight;
    wsum += weight;
  }

  const avg = wsum ? sum / wsum : 0;      // 0..1
  return 1 + 9 * clamp(avg, 0, 1);        // 1..10
}

// ---------- FORMAT ----------
function fmt(n, digits = 0) {
  const x = Number(n);
  if (!isFinite(x)) return "0";
  return x.toFixed(digits);
}

function digitsForKey(key) {
  if (key === "kcal") return 0;
  if (key === "protein" || key === "carbs" || key === "fat" || key === "fiber") return 1;
  if (key === "vitaminB12_ug") return 1;
  return 0;
}

// ---------- UI RENDER ----------
function renderSettingsForm(settings) {
  const wrap = $("settingsForm");
  if (!wrap) return;

  wrap.innerHTML = "";

  for (const n of NUTRIENTS) {
    const v = settings.targets?.[n.key];
    const div = document.createElement("div");
    div.innerHTML = `
      <label class="label">${n.label} (${n.unit})</label>
      <input type="number" step="any" data-target="${n.key}" value="${v}">
    `;
    wrap.appendChild(div);
  }
}

function statusForProgress(p, threshold = 0.7) {
  if (p >= 1) return { icon: "✅", cls: "ok" };
  if (p >= threshold) return { icon: "⚠️", cls: "near" };
  return { icon: "❌", cls: "low" };
}

function barColor(p, threshold = 0.7) {
  if (p >= 1) return "var(--green)";
  if (p >= threshold) return "var(--amber)";
  return "var(--red)";
}

function renderNutrientTable(totals, settings) {
  const wrap = $("nutrientTable");
  if (!wrap) return;

  const t = settings.targets || {};
  const th = settings.scoreThreshold ?? 0.7;

  const rows = [];
  rows.push(`
    <div class="trow head">
      <div>רכיב</div><div>נצרך</div><div>יעד</div><div>%</div><div>סטטוס</div>
    </div>
  `);

  for (const n of NUTRIENTS) {
    const goal = Number(t[n.key] ?? 0);
    const consumed = Number(totals[n.key] ?? 0);

    const p = goal > 0 ? consumed / goal : 0;
    const pct = goal > 0 ? Math.round(p * 100) : 0;

    const st = statusForProgress(p, th);
    const digits = digitsForKey(n.key);

    const consumedStr = fmt(consumed, digits);
    const goalStr = fmt(goal, digits);

    const barW = clamp(p, 0, 1) * 100;

    rows.push(`
      <div class="trow">
        <div>${n.label}</div>
        <div>${consumedStr} ${n.unit}</div>
        <div>${goalStr} ${n.unit}</div>
        <div>
          <div class="progress">
            <div class="bar" style="width:${barW}%;background:${barColor(p, th)}"></div>
          </div>
          <div style="margin-top:6px;color:var(--muted);font-size:12px">${pct}%</div>
        </div>
        <div class="status ${st.cls}">${st.icon}</div>
      </div>
    `);
  }

  wrap.innerHTML = rows.join("");
}

function renderGaps(totals, settings) {
  const el = $("gaps");
  if (!el) return;

  const t = settings.targets || {};
  const keys = [
    "protein",
    "fiber",
    "vitaminC_mg",
    "calcium_mg",
    "iron_mg",
    "magnesium_mg",
    "potassium_mg",
    "vitaminB12_ug",
    "folate_ug",
    "vitaminA_ug",
  ];

  const gaps = [];

  for (const k of keys) {
    const goal = Number(t[k] || 0);
    const consumed = Number(totals[k] || 0);
    if (goal <= 0) continue;

    if (consumed < goal) {
      const n = NUTRIENTS.find((x) => x.key === k);
      const diff = goal - consumed;
      const unit = n?.unit || "";
      const pretty = fmt(diff, digitsForKey(k));
      gaps.push({ label: n?.label || k, diff: pretty, unit });
    }
  }

  if (gaps.length === 0) {
    el.innerHTML = "נראה טוב — הגעת ליעדים ברוב הרכיבים ✅";
    return;
  }

  el.innerHTML = `<ul>${gaps.map(g => `<li><strong>${g.label}</strong>: חסר בערך ${g.diff} ${g.unit}</li>`).join("")}</ul>`;
}

function renderKPIs(totals) {
  if ($("kcalTotal")) $("kcalTotal").textContent = Math.round(totals.kcal || 0);
  if ($("proteinTotal")) $("proteinTotal").textContent = fmt(totals.protein || 0, 1);
  if ($("fiberTotal")) $("fiberTotal").textContent = fmt(totals.fiber || 0, 1);
}

// score is 1..10; show — if no entries that day
function renderScore(score10, hasEntries) {
  const el = $("dailyScore");
  if (!el) return;

  if (!hasEntries) {
    el.textContent = "—";
    return;
  }
  el.textContent = clamp(score10, 1, 10).toFixed(1);
}

function tagText(food) {
  if (!food) return "";
  if (food.healthTag === "green") return "🍏 ירוק (יומיומי)";
  if (food.healthTag === "red") return "🍰 אדום (פינוק)";
  return "• ניטרלי";
}

function healthClass(food) {
  if (!food) return "";
  if (food.healthTag === "green") return "green";
  if (food.healthTag === "red") return "red";
  return "";
}

function renderSelectedFood(food) {
  const box = $("selectedFood");
  if (!box) return;

  if (!food) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  box.classList.remove("hidden");

  const cls = healthClass(food);
  const p = food.per100g || { kcal: 0, protein: 0 };

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
      <div>
        <div class="name ${cls}" style="font-size:16px;font-weight:800">${food.name}</div>
        <div class="tag ${cls}" style="margin-top:4px">${tagText(food)} • ${food.healthNote || ""}</div>
      </div>
      <div style="color:var(--muted);font-size:12px;text-align:left">
        ל-100g: ${p.kcal ?? 0}kcal, P${p.protein ?? 0}g
      </div>
    </div>
    ${food.servingGrams ? `<div class="note" style="margin-top:8px">מנה נוחה: ${food.servingGrams}g</div>` : ""}
  `;
}

function renderTodayList(entries) {
  const wrap = $("todayList");
  if (!wrap) return;

  if (!entries.length) {
    wrap.innerHTML = `<div class="note">אין רשומות עדיין. הוסף מזון כדי להתחיל.</div>`;
    return;
  }

  const html = entries
    .slice()
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
    .map((e) => {
      const f = foodById(e.foodId);
      const cls = healthClass(f);
      const icon = f?.healthTag === "green" ? "🍏" : f?.healthTag === "red" ? "🍰" : "•";

      const grams = Number(e.grams || 0);
      const kcal = f ? (Number(f.per100g?.kcal || 0) * (grams / 100)) : 0;

      return `
        <div class="item">
          <div>
            <div class="name ${cls}">${icon} ${f?.name || "מזון לא מוכר"}</div>
            <div class="meta">${e.time || ""} • ${grams}g • ~${Math.round(kcal)} kcal</div>
          </div>
          <div class="right">
            <button class="btn del" data-del="${e.id}">מחק</button>
          </div>
        </div>
      `;
    })
    .join("");

  wrap.innerHTML = html;

  wrap.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => deleteEntry(btn.getAttribute("data-del")));
  });
}

function upsertRecent(foodId) {
  const recent = loadJSON(LS.recent, []);
  const list = Array.isArray(recent) ? recent : [];
  const filtered = list.filter((x) => x !== foodId);
  filtered.unshift(foodId);
  saveJSON(LS.recent, filtered.slice(0, 10));
}

function addEntry(dateISO) {
  const grams = Number($("gramsInput")?.value);
  if (!selectedFoodId || !grams || grams <= 0) return;

  const all = entriesAll();
  all.push({
    id: safeUUID(),
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
  const all = entriesAll().filter((e) => e?.id !== id);
  saveJSON(LS.entries, all);
  refresh();
}

function renderFoodResults(query) {
  const ul = $("foodResults");
  if (!ul) return;

  ul.innerHTML = "";
  if (!query || query.trim().length < 1) return;

  const q = query.trim().toLowerCase();
  const results = FOODS
    .filter((f) => (f?.name || "").toLowerCase().includes(q))
    .slice(0, 12);

  for (const f of results) {
    const li = document.createElement("li");

    const cls = f.healthTag === "green" ? "green" : (f.healthTag === "red" ? "red" : "");
    const label = f.healthTag === "green" ? "ירוק" : (f.healthTag === "red" ? "אדום" : "ניטרלי");

    li.innerHTML = `<span>${f.name}</span><span class="tag ${cls}">${label}</span>`;

    li.addEventListener("click", () => {
      selectedFoodId = f.id;
      $("foodSearch").value = f.name;
      ul.innerHTML = "";

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

      if (data.settings) saveJSON(LS.settings, deepMergeDefaults(data.settings, DEFAULT_SETTINGS));
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
  const dateISO = $("datePicker")?.value || todayISO();

  const entries = entriesForDate(dateISO);
  const totals = calcTotals(entries);

  const hasEntries = entries.length > 0;
  const score10 = calcDailyScore(totals, settings);

  renderKPIs(totals);
  renderScore(score10, hasEntries);
  renderNutrientTable(totals, settings);
  renderGaps(totals, settings);
  renderTodayList(entries);
}

async function loadFoods() {
  try {
    const res = await fetch("data/foods.json", { cache: "no-store" });
    const json = await res.json();
    FOODS = Array.isArray(json) ? json.filter((f) => f && f.id && f.name && f.per100g) : [];
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

  $("addBtn").disabled = true;
  $("addBtn").addEventListener("click", () => addEntry(dp.value));

  // Enter adds entry
  $("gramsInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEntry(dp.value);
    }
  });

  document.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("gramsInput").value = btn.dataset.g;
      $("gramsInput").focus();
    });
  });

  const settings = ensureSettings();
  renderSettingsForm(settings);

  $("saveSettings").addEventListener("click", () => {
    const s = ensureSettings();
    document.querySelectorAll("[data-target]").forEach((inp) => {
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

(async function init() {
  ensureSettings();
  await loadFoods();
  wireUI();
  refresh();
})();
