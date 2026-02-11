/**
 * NutriPulse Pro - app.js
 * גרסה: 2.0 (כולל Smart Coach)
 * * מבנה הקוד:
 * 1. CONFIG: הגדרות וקבועים
 * 2. UTILS: פונקציות עזר
 * 3. STORAGE: ניהול LocalStorage
 * 4. DOMAIN: לוגיקה עסקית (חישובים, טיפים)
 * 5. STATE: ניהול המצב הנוכחי של האפליקציה
 * 6. UI: ניהול התצוגה וה-DOM
 * 7. APP: אתחול ואירועים
 */

/* =========================================
   1. CONFIG & CONSTANTS
   ========================================= */
const CONFIG = {
    LS_KEYS: {
        entries: "nutripulse_entries",
        settings: "nutripulse_settings",
        favorites: "nutripulse_favorites",
        recent: "nutripulse_recent",
    },
    NUTRIENTS: [
        { key: "kcal", label: "קלוריות", unit: "kcal", group: "macro", digits: 0 },
        { key: "protein", label: "חלבון", unit: "g", group: "macro", digits: 1 },
        { key: "carbs", label: "פחמימות", unit: "g", group: "macro", digits: 1 },
        { key: "fat", label: "שומן", unit: "g", group: "macro", digits: 1 },
        { key: "fiber", label: "סיבים", unit: "g", group: "macro", digits: 1 },

        { key: "vitaminC_mg", label: "ויטמין C", unit: "mg", group: "micro", digits: 0 },
        { key: "vitaminA_ug", label: "ויטמין A", unit: "µg", group: "micro", digits: 0 },
        { key: "vitaminB12_ug", label: "ויטמין B12", unit: "µg", group: "micro", digits: 2 },
        { key: "folate_ug", label: "חומצה פולית", unit: "µg", group: "micro", digits: 0 },

        { key: "calcium_mg", label: "סידן", unit: "mg", group: "micro", digits: 0 },
        { key: "iron_mg", label: "ברזל", unit: "mg", group: "micro", digits: 1 },
        { key: "magnesium_mg", label: "מגנזיום", unit: "mg", group: "micro", digits: 0 },
        { key: "potassium_mg", label: "אשלגן", unit: "mg", group: "micro", digits: 0 },
    ],
    DEFAULTS: {
        targets: {
            kcal: 2300, protein: 130, carbs: 250, fat: 80, fiber: 30,
            vitaminC_mg: 90, vitaminA_ug: 900, vitaminB12_ug: 2.4, folate_ug: 400,
            calcium_mg: 1000, iron_mg: 8, magnesium_mg: 400, potassium_mg: 3400,
        },
        weights: {
            kcal: 0.8, protein: 2.0, fiber: 1.5,
            vitaminC_mg: 1.0, vitaminA_ug: 1.0, vitaminB12_ug: 1.0, folate_ug: 1.0,
            calcium_mg: 1.0, iron_mg: 1.0, magnesium_mg: 1.0, potassium_mg: 1.0,
        },
        scoreThreshold: 0.7,
    }
};

/* =========================================
   2. UTILS
   ========================================= */
const Utils = {
    $: (id) => document.getElementById(id),

    clamp: (n, min, max) => Math.min(Math.max(n, min), max),

    generateUUID: () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    },

    debounce: (func, wait) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    formatNumber: (num, digits = 0) => {
        const n = Number(num);
        if (!Number.isFinite(n)) return "0";
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: digits
        }).format(n);
    },

    getISODate: (date = new Date()) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().split('T')[0];
    },

    getCurrentTime: () => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    },

    deepMerge: (target, source) => {
        const output = Object.assign({}, target);
        if (Utils.isObject(target) && Utils.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (Utils.isObject(source[key])) {
                    if (!(key in target)) Object.assign(output, {
                        [key]: source[key]
                    });
                    else output[key] = Utils.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, {
                        [key]: source[key]
                    });
                }
            });
        }
        return output;
    },

    isObject: (item) => (item && typeof item === 'object' && !Array.isArray(item))
};

/* =========================================
   3. STORAGE
   ========================================= */
const Storage = {
    get: (key, fallback) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) {
            console.error(`Error loading ${key}`, e);
            return fallback;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error saving ${key}`, e);
            alert("שגיאה בשמירת נתונים - הזיכרון מלא?");
        }
    },
    remove: (key) => localStorage.removeItem(key),
};

/* =========================================
   4. STATE MANAGEMENT
   ========================================= */
const State = {
    foods: [],
    selectedDate: Utils.getISODate(),
    editingEntryId: null,
    selectedFoodId: null,
    settings: null,

    init() {
        this.settings = this.getSettings();
    },

    getSettings() {
        const stored = Storage.get(CONFIG.LS_KEYS.settings, {});
        const merged = Utils.deepMerge(CONFIG.DEFAULTS, stored);
        merged.scoreThreshold = Utils.clamp(Number(merged.scoreThreshold ?? 0.7), 0, 0.99);
        return merged;
    },

    saveSettings(newSettings) {
        this.settings = newSettings;
        Storage.set(CONFIG.LS_KEYS.settings, newSettings);
    },

    getEntries() {
        const raw = Storage.get(CONFIG.LS_KEYS.entries, []);
        return Array.isArray(raw) ? raw.map(e => ({
            ...e,
            unit: e.unit || "grams",
            amount: Number(e.amount ?? e.grams ?? 0)
        })) : [];
    },

    saveEntries(entries) {
        Storage.set(CONFIG.LS_KEYS.entries, entries);
    },

    addToRecent(foodId) {
        const recent = Storage.get(CONFIG.LS_KEYS.recent, []);
        const updated = [foodId, ...recent.filter(id => id !== foodId)].slice(0, 10);
        Storage.set(CONFIG.LS_KEYS.recent, updated);
    }
};

/* =========================================
   5. DOMAIN LOGIC
   ========================================= */
const Domain = {
    getFoodById: (id) => State.foods.find(f => f.id === id),

    getMealLabel: (timeStr) => {
        const h = parseInt((timeStr || "00:00").split(":")[0], 10);
        if (h >= 5 && h < 11) return "בוקר";
        if (h >= 11 && h < 16) return "צהריים";
        return "ערב";
    },

    calculateEntryNutrients: (entry) => {
        const food = Domain.getFoodById(entry.foodId);
        if (!food) return null;

        let grams = entry.amount;
        if (entry.unit === "servings") {
            const servingSize = Number(food.servingGrams || 0);
            grams = servingSize > 0 ? entry.amount * servingSize : 0;
        }

        const factor = grams / 100;
        const result = { ...entry,
            foodName: food.name,
            healthTag: food.healthTag,
            calculated: {}
        };

        const p = food.per100g || {};
        const m = food.micros || {};

        CONFIG.NUTRIENTS.forEach(n => {
            const val = (n.group === 'macro' ? p[n.key] : m[n.key]) || 0;
            result.calculated[n.key] = val * factor;
        });

        return result;
    },

    getDailyTotals: (entries) => {
        const totals = {};
        CONFIG.NUTRIENTS.forEach(n => totals[n.key] = 0);

        entries.forEach(entry => {
            const data = Domain.calculateEntryNutrients(entry);
            if (!data) return;
            Object.keys(totals).forEach(key => {
                totals[key] += (data.calculated[key] || 0);
            });
        });

        return totals;
    },

    calculateScore: (totals, settings) => {
        const { targets, weights, scoreThreshold } = settings;
        let totalScore = 0;
        let totalWeight = 0;

        Object.entries(weights).forEach(([key, weight]) => {
            const w = Number(weight);
            if (w <= 0) return;

            const consumed = totals[key] || 0;
            const goal = targets[key] || 0;
            let credit = 0;

            if (key === 'kcal') {
                const diff = Math.abs(consumed - goal);
                if (diff <= goal * 0.12) credit = 1;
                else if (diff >= goal * 0.35) credit = 0;
                else credit = 1 - (diff - (goal * 0.12)) / ((goal * 0.35) - (goal * 0.12));
            } else {
                const p = goal > 0 ? consumed / goal : 1;
                if (p >= 1) credit = 1;
                else if (p < scoreThreshold) credit = 0;
                else credit = (p - scoreThreshold) / (1 - scoreThreshold);
            }

            totalScore += credit * w;
            totalWeight += w;
        });

        const normalized = totalWeight ? (totalScore / totalWeight) : 0;
        return Math.round(1 + 99 * Utils.clamp(normalized, 0, 1));
    },

    // === המאמן החכם ===
    generateSmartTip: (totals, settings, foods) => {
        const t = settings.targets;
        const currentKcal = totals.kcal || 0;

        // אם אין נתונים בכלל
        if (currentKcal === 0) return "בוקר טוב! הגיע הזמן להזין את הארוחה הראשונה שלך. 🍳";

        // 1. חריגת קלוריות
        if (currentKcal > t.kcal * 1.1) return "שים לב, עברת את יעד הקלוריות היומי. נסה להתמקד בירקות ירוקים בשאר היום. 🥗";

        // 2. חוסר בחלבון (אם אכל כבר חצי מהקלוריות אבל מעט חלבון)
        if (currentKcal > t.kcal * 0.4 && totals.protein < t.protein * 0.4) {
            // מצא מזון עשיר בחלבון מהמאגר
            const proteinFood = foods
                .filter(f => f.healthTag === 'green' && (f.per100g?.protein || 0) > 15)
                .sort(() => 0.5 - Math.random())[0]; // בחירה רנדומלית

            const suggestion = proteinFood ? `כמו ${proteinFood.name}` : "כמו טונה, עוף או טופו";
            return `רמת החלבון שלך נמוכה ביחס לקלוריות. כדאי לשלב מנת חלבון, ${suggestion}. 💪`;
        }

        // 3. חוסר בסיבים
        if (currentKcal > t.kcal * 0.6 && totals.fiber < t.fiber * 0.5) {
            return "מערכת העיכול שלך תשמח לעוד סיבים. זה זמן מעולה לפרי או דגן מלא! 🍎";
        }

        // 4. חוסר בברזל
        if (currentKcal > t.kcal * 0.5 && totals.iron_mg < t.iron_mg * 0.4) {
            return "רמת הברזל נראית נמוכה. נסה לשלב תרד, קטניות או בשר בקר בארוחה הבאה.";
        }

        // 5. פידבק חיובי
        const score = Domain.calculateScore(totals, settings);
        if (score > 85) return "וואו! ביצועים מעולים היום, אתה עומד ביעדים בצורה מרשימה! 🔥";
        if (score > 60) return "כיוון מצוין, עוד מאמץ קטן לסגירת הפינות.";

        return "המשך לעקוב כדי לקבל תובנות מדויקות יותר.";
    }
};

/* =========================================
   6. UI MANAGER
   ========================================= */
const UI = {
    els: {
        todayList: "todayList",
        nutrientTable: "nutrientTable",
        gaps: "gaps",
        dailyScore: "dailyScore",
        smartCoach: "smartCoach", // חדש
        coachText: "coachText",   // חדש
        foodSearch: "foodSearch",
        foodResults: "foodResults",
        selectedFood: "selectedFood",
        addBtn: "addBtn",
        cancelEdit: "cancelEdit",
        modeInput: "amountMode",
        amountInput: "amountInput",
        settingsForm: "settingsForm",
        datePicker: "datePicker",
    },

    getEl(key) {
        return Utils.$(this.els[key]);
    },

    render(entries, settings) {
        const todayEntries = entries.filter(e => e.dateISO === State.selectedDate);
        const totals = Domain.getDailyTotals(todayEntries);
        const hasEntries = todayEntries.length > 0;
        const score = hasEntries ? Domain.calculateScore(totals, settings) : null;

        this.renderKPIs(totals);
        this.renderScore(score);
        
        // רינדור המאמן החכם
        const tip = Domain.generateSmartTip(totals, settings, State.foods);
        this.renderSmartCoach(tip);

        this.renderTable(totals, settings);
        this.renderGaps(totals, settings);
        this.renderJournal(todayEntries);
    },

    renderSmartCoach(advice) {
        const box = this.getEl('smartCoach');
        const text = this.getEl('coachText');
        if (!box || !text) return;

        if (!advice) {
            box.classList.add('hidden');
        } else {
            box.classList.remove('hidden');
            text.textContent = advice;
        }
    },

    renderKPIs(totals) {
        const setVal = (id, val) => {
            const el = Utils.$(id);
            if (el) el.textContent = val;
        };
        setVal("kcalTotal", Math.round(totals.kcal));
        setVal("proteinTotal", Utils.formatNumber(totals.protein, 1));
        setVal("fiberTotal", Utils.formatNumber(totals.fiber, 1));
    },

    renderScore(score) {
        const el = this.getEl('dailyScore');
        if (el) el.textContent = score ? score : "—";
    },

    renderTable(totals, settings) {
        const wrap = this.getEl('nutrientTable');
        if (!wrap) return;

        let html = `<div class="trow head"><div>רכיב</div><div>נצרך</div><div>יעד</div><div>%</div><div>סטטוס</div></div>`;

        CONFIG.NUTRIENTS.forEach(n => {
            const goal = settings.targets[n.key] || 0;
            const val = totals[n.key] || 0;
            const percent = goal > 0 ? val / goal : 0;
            const pctDisplay = goal > 0 ? Math.round(percent * 100) : 0;

            let statusIcon = "❌",
                statusClass = "low",
                barColor = "var(--red)";
            if (percent >= 1) {
                statusIcon = "✅";
                statusClass = "ok";
                barColor = "var(--green)";
            } else if (percent >= settings.scoreThreshold) {
                statusIcon = "⚠️";
                statusClass = "near";
                barColor = "var(--amber)";
            }

            const barWidth = Utils.clamp(percent, 0, 1) * 100;

            html += `
        <div class="trow">
          <div>${n.label}</div>
          <div>${Utils.formatNumber(val, n.digits)} ${n.unit}</div>
          <div>${Utils.formatNumber(goal, n.digits)} ${n.unit}</div>
          <div>
            <div class="progress"><div class="bar" style="width:${barWidth}%; background:${barColor}"></div></div>
            <div style="font-size:12px; color:var(--muted)">${pctDisplay}%</div>
          </div>
          <div class="status ${statusClass}">${statusIcon}</div>
        </div>`;
        });
        wrap.innerHTML = html;
    },

    renderGaps(totals, settings) {
        const el = this.getEl('gaps');
        if (!el) return;

        const relevantKeys = ["protein", "fiber", "calcium_mg", "iron_mg", "magnesium_mg", "potassium_mg", "vitaminB12_ug"];
        const gaps = relevantKeys.map(k => {
            const goal = settings.targets[k] || 0;
            const val = totals[k] || 0;
            if (goal > 0 && val < goal) {
                const n = CONFIG.NUTRIENTS.find(x => x.key === k);
                return {
                    label: n.label,
                    diff: goal - val,
                    unit: n.unit,
                    digits: n.digits
                };
            }
            return null;
        }).filter(Boolean);

        if (gaps.length === 0) {
            el.innerHTML = "נראה טוב — הגעת ליעדים החשובים ✅";
        } else {
            el.innerHTML = `<ul>${gaps.map(g => `<li><strong>${g.label}</strong>: חסר ${Utils.formatNumber(g.diff, g.digits)} ${g.unit}</li>`).join("")}</ul>`;
        }
    },

    renderJournal(entries) {
        const wrap = this.getEl('todayList');
        if (!wrap) return;

        if (!entries.length) {
            wrap.innerHTML = `<div class="note">אין רשומות להיום.</div>`;
            return;
        }

        const groups = {
            "בוקר": [],
            "צהריים": [],
            "ערב": []
        };
        entries.sort((a, b) => (a.time || "").localeCompare(b.time || "")).forEach(e => {
            groups[Domain.getMealLabel(e.time)].push(e);
        });

        let html = "";
        ["בוקר", "צהריים", "ערב"].forEach(label => {
            const list = groups[label];
            if (!list.length) return;

            const groupTotals = Domain.getDailyTotals(list);

            html += `<div class="mealHeader"><div>${label}</div><div class="kcal">~${Math.round(groupTotals.kcal)} kcal</div></div>`;

            list.forEach(e => {
                const calculated = Domain.calculateEntryNutrients(e);
                if (!calculated) return;

                const qtyStr = e.unit === "servings" ? `${e.amount} יח׳` : `${Math.round(e.amount)}g`;
                const icon = calculated.healthTag === "green" ? "🍏" : (calculated.healthTag === "red" ? "🍰" : "•");
                const k = Math.round(calculated.calculated.kcal);

                html += `
          <div class="item">
            <div>
              <div class="name ${calculated.healthTag || ''}">${icon} ${calculated.foodName}</div>
              <div class="meta">${e.time} • ${qtyStr} • ${k} kcal</div>
            </div>
            <div class="right">
              <button class="btn" onclick="App.editEntry('${e.id}')">ערוך</button>
              <button class="btn danger del" onclick="App.deleteEntry('${e.id}')">מחק</button>
            </div>
          </div>`;
            });
        });
        wrap.innerHTML = html;
    },

    renderFoodSelection(food) {
        const box = this.getEl('selectedFood');
        if (!box) return;

        if (!food) {
            box.classList.add("hidden");
            box.innerHTML = "";
            return;
        }

        box.classList.remove("hidden");
        const p = food.per100g || {};
        box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start">
        <div>
           <div class="name ${food.healthTag || ''}" style="font-size:16px; font-weight:bold">${food.name}</div>
           <div class="tag" style="font-size:12px; margin-top:4px">${food.healthTag === 'green' ? 'מומלץ' : (food.healthTag === 'red' ? 'במידה' : 'ניטרלי')}</div>
           ${food.servingGrams ? `<div class="note">יחידה: ${food.servingGrams}g</div>` : ''}
        </div>
        <div style="text-align:left; font-size:12px; color:var(--muted)">
           ל-100ג: ${p.kcal}ק, P${p.protein}
        </div>
      </div>
    `;
    },

    renderSettingsForm(settings) {
        const wrap = this.getEl('settingsForm');
        if (!wrap) return;
        wrap.innerHTML = "";
        CONFIG.NUTRIENTS.forEach(n => {
            const div = document.createElement("div");
            div.innerHTML = `
        <label class="label">${n.label} (${n.unit})</label>
        <input type="number" step="any" data-target="${n.key}" value="${settings.targets[n.key] || 0}">
      `;
            wrap.appendChild(div);
        });
    },

    resetEntryForm() {
        State.editingEntryId = null;
        State.selectedFoodId = null;
        this.renderFoodSelection(null);
        const search = this.getEl('foodSearch');
        if (search) search.value = "";
        const amount = this.getEl('amountInput');
        if (amount) amount.value = "";
        const btn = this.getEl('addBtn');
        if (btn) {
            btn.textContent = "הוסף";
            btn.disabled = true;
        }
        const cancel = this.getEl('cancelEdit');
        if (cancel) cancel.style.display = "none";
    }
};

/* =========================================
   7. APP CONTROLLER
   ========================================= */
const App = {
    async init() {
        State.init(); // Load settings
        await this.loadFoods();
        this.bindEvents();

        // Set initial date
        const dp = UI.getEl('datePicker');
        if (dp) dp.value = State.selectedDate;

        this.refresh();
    },

    async loadFoods() {
        try {
            const res = await fetch("data/foods.json");
            const json = await res.json();
            State.foods = Array.isArray(json) ? json : [];
        } catch (e) {
            console.error("Failed to load foods", e);
            State.foods = [];
        }
    },

    refresh() {
        const entries = State.getEntries();
        UI.render(entries, State.settings);
    },

    bindEvents() {
        // Date Picker
        UI.getEl('datePicker')?.addEventListener("change", (e) => {
            State.selectedDate = e.target.value;
            UI.resetEntryForm();
            this.refresh();
        });

        // Search with Debounce
        UI.getEl('foodSearch')?.addEventListener("input", Utils.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 200));

        // Add / Update Button
        UI.getEl('addBtn')?.addEventListener("click", () => this.handleSaveEntry());

        // Amount Input Enter Key
        UI.getEl('amountInput')?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.handleSaveEntry();
            }
        });

        // Cancel Edit
        UI.getEl('cancelEdit')?.addEventListener("click", () => {
            UI.resetEntryForm();
        });

        // Chip buttons (quick amount)
        document.querySelectorAll(".chip").forEach(btn => {
            btn.addEventListener("click", () => {
                const mode = UI.getEl('modeInput');
                if (mode) mode.value = "grams";
                const inp = UI.getEl('amountInput');
                if (inp) {
                    inp.value = btn.dataset.g;
                    inp.focus();
                }
            });
        });

        // Settings Save
        Utils.$("saveSettings")?.addEventListener("click", () => {
            const inputs = document.querySelectorAll("#settingsForm input[data-target]");
            const newTargets = { ...State.settings.targets
            };
            inputs.forEach(inp => {
                newTargets[inp.dataset.target] = Number(inp.value);
            });
            const newSettings = { ...State.settings,
                targets: newTargets
            };
            State.saveSettings(newSettings);
            this.refresh();
            alert("הגדרות נשמרו בהצלחה!");
        });

        // Settings Render
        UI.renderSettingsForm(State.settings);

        // Import/Export
        Utils.$("exportBtn")?.addEventListener("click", this.exportData);
        Utils.$("importFile")?.addEventListener("change", this.importData);
        Utils.$("resetBtn")?.addEventListener("click", this.resetApp);
    },

    handleSearch(query) {
        const ul = UI.getEl('foodResults');
        if (!ul) return;
        ul.innerHTML = "";

        if (!query || query.trim().length < 2) return;

        const results = State.foods
            .filter(f => f.name.toLowerCase().includes(query.trim().toLowerCase()))
            .slice(0, 10);

        results.forEach(f => {
            const li = document.createElement("li");
            li.innerHTML = `<span>${f.name}</span> <small>${f.healthTag === 'green' ? '🍏' : ''}</small>`;
            li.addEventListener("click", () => this.selectFood(f));
            ul.appendChild(li);
        });
    },

    selectFood(food) {
        State.selectedFoodId = food.id;
        UI.getEl('foodSearch').value = food.name;
        UI.getEl('foodResults').innerHTML = "";
        UI.renderFoodSelection(food);

        const btn = UI.getEl('addBtn');
        if (btn) btn.disabled = false;

        // Smart default logic
        const mode = UI.getEl('modeInput');
        const amount = UI.getEl('amountInput');

        if (food.servingGrams && mode) {
            mode.value = "servings";
            if (amount) amount.value = "1";
        } else {
            if (mode) mode.value = "grams";
            if (amount) amount.value = "100";
        }
        amount?.focus();
    },

    handleSaveEntry() {
        const foodId = State.selectedFoodId;
        const mode = UI.getEl('modeInput')?.value || "grams";
        const amount = Number(UI.getEl('amountInput')?.value || 0);

        if (!foodId || amount <= 0) return;

        // Validate Serving logic
        if (mode === "servings") {
            const f = Domain.getFoodById(foodId);
            if (!f?.servingGrams) {
                alert("למזון זה אין הגדרת מנה. אנא בחר בגרמים.");
                return;
            }
        }

        const allEntries = State.getEntries();

        if (State.editingEntryId) {
            // Update existing
            const index = allEntries.findIndex(e => e.id === State.editingEntryId);
            if (index !== -1) {
                allEntries[index] = { ...allEntries[index],
                    foodId,
                    unit: mode,
                    amount
                };
            }
        } else {
            // Add new
            allEntries.push({
                id: Utils.generateUUID(),
                dateISO: State.selectedDate,
                time: Utils.getCurrentTime(),
                foodId,
                unit: mode,
                amount
            });
            State.addToRecent(foodId);
        }

        State.saveEntries(allEntries);
        UI.resetEntryForm();
        this.refresh();
    },

    editEntry(id) {
        const entries = State.getEntries();
        const entry = entries.find(e => e.id === id);
        if (!entry) return;

        State.editingEntryId = id;
        const food = Domain.getFoodById(entry.foodId);
        if (food) this.selectFood(food);

        const mode = UI.getEl('modeInput');
        if (mode) mode.value = entry.unit;
        const amount = UI.getEl('amountInput');
        if (amount) amount.value = entry.amount;

        const btn = UI.getEl('addBtn');
        if (btn) btn.textContent = "עדכן";
        const cancel = UI.getEl('cancelEdit');
        if (cancel) cancel.style.display = "inline-block";
    },

    deleteEntry(id) {
        if (!confirm("למחוק שורה זו?")) return;
        const entries = State.getEntries().filter(e => e.id !== id);
        State.saveEntries(entries);
        if (State.editingEntryId === id) UI.resetEntryForm();
        this.refresh();
    },

    exportData() {
        const payload = {
            exportedAt: new Date().toISOString(),
            settings: State.settings,
            entries: State.getEntries(),
            recent: Storage.get(CONFIG.LS_KEYS.recent)
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json"
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `nutripulse-${Utils.getISODate()}.json`;
        a.click();
    },

    importData(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (data.settings) State.saveSettings(data.settings);
                if (data.entries) State.saveEntries(data.entries);
                alert("נתונים נטענו בהצלחה!");
                App.refresh();
            } catch (err) {
                alert("קובץ לא תקין");
            }
        };
        reader.readAsText(file);
    },

    resetApp() {
        if (confirm("בטוח? הכל יימחק.")) {
            Object.values(CONFIG.LS_KEYS).forEach(k => Storage.remove(k));
            location.reload();
        }
    }
};

// חשיפת פונקציות לאירועי onclick ב-HTML
window.App = {
    editEntry: (id) => App.editEntry(id),
    deleteEntry: (id) => App.deleteEntry(id)
};

// אתחול האפליקציה
document.addEventListener("DOMContentLoaded", () => {
    App.init();
});
