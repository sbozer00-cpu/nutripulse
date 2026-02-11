/**
 * NutriPulse Pro - Final Logic v5.1
 * Fixed search rendering & click handlers
 */

/* =========================================
   1. CONFIG & TARGETS
   ========================================= */
const CONFIG = {
    KEYS: {
        entries: "nutripulse_entries_v5",
        settings: "nutripulse_settings_v5"
    },
    NUTRIENTS: [
        { key: "kcal", label: "קלוריות", unit: "", target: 2200, group: "macro" },
        { key: "protein", label: "חלבון", unit: "g", target: 140, group: "macro" },
        { key: "carbs", label: "פחמימה", unit: "g", target: 250, group: "macro" },
        { key: "fat", label: "שומן", unit: "g", target: 70, group: "macro" },
        
        { key: "calcium_mg", label: "סידן", unit: "mg", target: 1000, group: "micro" },
        { key: "iron_mg", label: "ברזל", unit: "mg", target: 10, group: "micro" },
        { key: "magnesium_mg", label: "מגנזיום", unit: "mg", target: 400, group: "micro" },
        { key: "zinc_mg", label: "אבץ", unit: "mg", target: 11, group: "micro" },
        { key: "vitaminC_mg", label: "ויטמין C", unit: "mg", target: 90, group: "micro" },
        { key: "vitaminA_ug", label: "ויטמין A", unit: "µg", target: 900, group: "micro" },
        
        { key: "sodium_mg", label: "נתרן", unit: "mg", target: 2300, group: "limit" }
    ]
};

/* =========================================
   2. UTILS
   ========================================= */
const Utils = {
    $: (id) => document.getElementById(id),
    uuid: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    todayISO: () => new Date().toISOString().split('T')[0],
    fmt: (n) => Math.round(n).toLocaleString(),
    
    debounce: (func, wait) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

/* =========================================
   3. STATE
   ========================================= */
const State = {
    foods: [],
    entries: [],
    settings: {},
    date: Utils.todayISO(),
    selectedFood: null,
    mode: 'grams', 

    init() {
        this.entries = JSON.parse(localStorage.getItem(CONFIG.KEYS.entries) || "[]");
        const storedSettings = JSON.parse(localStorage.getItem(CONFIG.KEYS.settings) || "{}");
        
        this.settings = { targets: {} };
        CONFIG.NUTRIENTS.forEach(n => {
            this.settings.targets[n.key] = storedSettings.targets?.[n.key] || n.target;
        });
    },

    save() {
        localStorage.setItem(CONFIG.KEYS.entries, JSON.stringify(this.entries));
        localStorage.setItem(CONFIG.KEYS.settings, JSON.stringify(this.settings));
    }
};

/* =========================================
   4. DOMAIN LOGIC
   ========================================= */
const Domain = {
    calculateEntry: (entry, food) => {
        if (!food) return null;
        
        let grams = Number(entry.amount);
        if (entry.unit === 'units' && food.servingGrams) {
            grams = entry.amount * food.servingGrams;
        }

        const factor = grams / 100;
        const result = { ...entry, calculated: {} };
        const allData = { ...food.per100g, ...food.micros };

        CONFIG.NUTRIENTS.forEach(n => {
            const val = allData[n.key] || 0;
            result.calculated[n.key] = val * factor;
        });

        return result;
    },

    analyze: (totals, targets) => {
        const alerts = [];
        let scoreSum = 0;
        let scoreCount = 0;

        CONFIG.NUTRIENTS.forEach(n => {
            const val = totals[n.key] || 0;
            const target = targets[n.key] || 1;
            const pct = val / target;

            // Alerts
            if (n.key === 'fat' && pct > 1.15) alerts.push({ type: 'bad', msg: `צריכת שומן גבוהה (${Utils.fmt(val)}g)` });
            if (n.key === 'sodium_mg' && pct > 1.1) alerts.push({ type: 'bad', msg: `אזהרה: נתרן גבוה!` });
            if (n.key === 'kcal' && pct > 1.1) alerts.push({ type: 'warn', msg: `חריגה מהיעד הקלורי` });

            const kcalPct = (totals.kcal || 0) / (targets.kcal || 1);
            if (kcalPct > 0.5) {
                if (n.key === 'protein' && pct < 0.6) alerts.push({ type: 'warn', msg: `חסר חלבון משמעותי` });
                if (n.key === 'calcium_mg' && pct < 0.5) alerts.push({ type: 'warn', msg: `צריכת סידן נמוכה` });
            }

            if (n.group !== 'limit') {
                scoreSum += Math.min(pct, 1);
                scoreCount++;
            }
        });

        const score = scoreCount ? Math.round((scoreSum / scoreCount) * 100) : 0;
        return { score, alerts };
    }
};

/* =========================================
   5. UI MANAGER
   ========================================= */
const UI = {
    render() {
        const todaysEntries = State.entries.filter(e => e.date === State.date);
        const totals = {};
        CONFIG.NUTRIENTS.forEach(n => totals[n.key] = 0);

        todaysEntries.forEach(entry => {
            const food = State.foods.find(f => f.id === entry.foodId);
            const data = Domain.calculateEntry(entry, food);
            if (data) {
                CONFIG.NUTRIENTS.forEach(n => totals[n.key] += data.calculated[n.key]);
            }
        });

        const analysis = Domain.analyze(totals, State.settings.targets);

        this.renderJournal(todaysEntries, totals.kcal);
        this.renderSidebar(totals, analysis);
    },

    renderJournal(list, totalKcal) {
        const container = Utils.$('journalList');
        container.innerHTML = "";
        Utils.$('totalKcalJournal').textContent = Utils.fmt(totalKcal) + " קלוריות";

        if (list.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#9ca3af">לא נרשמו ארוחות היום</div>`;
            return;
        }

        list.forEach(e => {
            const food = State.foods.find(f => f.id === e.foodId);
            if (!food) return;
            const data = Domain.calculateEntry(e, food);
            
            const div = document.createElement('div');
            div.className = 'meal-row';
            div.innerHTML = `
                <div class="m-info">
                    <b>${food.name}</b>
                    <span>${e.amount} ${e.unit === 'grams' ? 'גרם' : 'יח׳'}</span>
                </div>
                <div class="m-actions">
                    <span style="font-weight:bold; font-size:14px">${Math.round(data.calculated.kcal)} cal</span>
                    <button class="del-btn" onclick="App.deleteEntry('${e.id}')">×</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    renderSidebar(totals, analysis) {
        const t = State.settings.targets;

        // Score
        Utils.$('dailyScore').textContent = analysis.score;
        const statusEl = Utils.$('statusMessage');
        if (analysis.score > 85) statusEl.textContent = "תזונה מצוינת ומאוזנת!";
        else if (analysis.score > 60) statusEl.textContent = "מצב טוב, המשך כך";
        else statusEl.textContent = "יש להשלים חוסרים";

        // Alerts
        const alertBox = Utils.$('alertsBox');
        const alertList = Utils.$('alertsList');
        alertList.innerHTML = "";
        
        if (analysis.alerts.length > 0) {
            alertBox.classList.remove('hidden');
            analysis.alerts.forEach(alert => {
                const li = document.createElement('li');
                li.textContent = alert.msg;
                li.style.color = alert.type === 'bad' ? '#B91C1C' : '#B45309';
                li.style.fontWeight = alert.type === 'bad' ? 'bold' : 'normal';
                alertList.appendChild(li);
            });
        } else {
            alertBox.classList.add('hidden');
        }

        // Macros
        ['protein', 'carbs', 'fat'].forEach(key => {
            const val = totals[key];
            const target = t[key];
            const pct = Math.min((val / target) * 100, 100);
            Utils.$(`val${key.charAt(0).toUpperCase() + key.slice(1)}`).textContent = Math.round(val) + "g";
            Utils.$(`bar${key.charAt(0).toUpperCase() + key.slice(1)}`).style.width = pct + "%";
        });

        // Micros List
        const microsContainer = Utils.$('microsList');
        microsContainer.innerHTML = "";

        CONFIG.NUTRIENTS.filter(n => n.group === 'micro' || n.group === 'limit').forEach(n => {
            const val = totals[n.key];
            const target = t[n.key];
            const pct = val / target;
            
            let colorClass = "";
            let icon = "";
            
            if (n.group === 'limit') {
                if (pct > 1.1) { colorClass = "highlight-bad"; icon = "⚠️"; }
                else colorClass = "highlight-good";
            } else {
                if (pct >= 1) { colorClass = "highlight-good"; icon = "✅"; }
                else if (pct < 0.5) colorClass = "highlight-warn"; 
            }

            const row = document.createElement('div');
            row.className = 'micro-row';
            row.innerHTML = `
                <span class="m-name">${n.label}</span>
                <span class="m-val ${colorClass}">${Utils.fmt(val)}${n.unit}</span>
                <span class="m-status">${icon}</span>
            `;
            microsContainer.appendChild(row);
        });
    },

    renderSelectedFood(food) {
        const panel = Utils.$('editPanel');
        const results = Utils.$('foodResults');
        
        if (!food) {
            panel.classList.add('hidden');
            return;
        }

        results.classList.add('hidden');
        Utils.$('foodSearch').value = ""; 
        panel.classList.remove('hidden');

        Utils.$('foodNameDisplay').textContent = food.name;
        Utils.$('foodKcalDisplay').textContent = `${food.per100g.kcal} קלוריות ל-100 גרם`;

        if (food.servingGrams) {
            this.setMode('units');
            Utils.$('amountInput').value = 1;
        } else {
            this.setMode('grams');
            Utils.$('amountInput').value = 100;
        }
    },

    setMode(mode) {
        State.mode = mode;
        const btnG = Utils.$('modeGrams');
        const btnU = Utils.$('modeUnits');

        if (mode === 'grams') {
            btnG.classList.add('active');
            btnU.classList.remove('active');
            this.renderChips([50, 100, 150, 200], 'g');
        } else {
            btnG.classList.remove('active');
            btnU.classList.add('active');
            this.renderChips([0.5, 1, 2, 3], ' יח׳');
        }
    },

    renderChips(values, suffix) {
        const div = Utils.$('quickChips');
        div.innerHTML = "";
        values.forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'chip';
            btn.textContent = val + suffix;
            btn.onclick = () => Utils.$('amountInput').value = val;
            div.appendChild(btn);
        });
    }
};

/* =========================================
   6. APP CONTROLLER
   ========================================= */
const App = {
    async init() {
        State.init();
        await this.loadFoods();

        // Listeners
        Utils.$('datePicker').value = State.date;
        Utils.$('datePicker').addEventListener('change', (e) => {
            State.date = e.target.value;
            UI.render();
        });

        // Search with fixed rendering
        Utils.$('foodSearch').addEventListener('input', Utils.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));

        Utils.$('addBtn').addEventListener('click', () => this.addEntry());
        
        Utils.$('modeGrams').addEventListener('click', () => UI.setMode('grams'));
        Utils.$('modeUnits').addEventListener('click', () => UI.setMode('units'));

        Utils.$('btnPlus').addEventListener('click', () => this.adjustQty(1));
        Utils.$('btnMinus').addEventListener('click', () => this.adjustQty(-1));

        Utils.$('settingsBtn').addEventListener('click', () => this.openSettings());
        Utils.$('closeSettings').addEventListener('click', () => Utils.$('settingsModal').classList.add('hidden'));
        Utils.$('saveSettings').addEventListener('click', () => this.saveSettings());
        Utils.$('resetApp').addEventListener('click', () => {
            if(confirm("לאפס הכל?")) { localStorage.clear(); location.reload(); }
        });

        UI.render();
    },

    async loadFoods() {
        try {
            const res = await fetch('data/foods.json');
            State.foods = await res.json();
        } catch { console.error("Error loading foods"); }
    },

    handleSearch(query) {
        const list = Utils.$('foodResults');
        list.innerHTML = "";
        
        if (query.length < 2) {
            list.classList.add('hidden');
            return;
        }

        const matches = State.foods.filter(f => f.name.includes(query)).slice(0, 6);
        
        if (!matches.length) {
            list.classList.add('hidden');
            return;
        }

        list.classList.remove('hidden');
        matches.forEach(f => {
            const li = document.createElement('li');
            // תיקון ויזואלי: הצגת שם + קלוריות
            li.innerHTML = `
                <span>${f.name}</span>
                <span style="font-size:0.85rem; color:#6B7280; font-weight:normal">${f.per100g.kcal} קל'</span>
            `;
            // תיקון לחיצה: addEventListener
            li.addEventListener('click', () => {
                State.selectedFood = f;
                UI.renderSelectedFood(f);
            });
            list.appendChild(li);
        });
    },

    adjustQty(delta) {
        const input = Utils.$('amountInput');
        let val = Number(input.value);
        const step = State.mode === 'grams' ? 50 : 0.5;
        input.value = Math.max(0, val + delta * step);
    },

    addEntry() {
        const amount = Number(Utils.$('amountInput').value);
        if (!State.selectedFood || amount <= 0) return;

        const entry = {
            id: Utils.uuid(),
            date: State.date,
            foodId: State.selectedFood.id,
            amount: amount,
            unit: State.mode // 'grams' or 'units'
        };

        State.entries.push(entry);
        State.save();
        
        Utils.$('editPanel').classList.add('hidden');
        UI.render();
    },

    deleteEntry(id) {
        if (!confirm("למחוק?")) return;
        State.entries = State.entries.filter(e => e.id !== id);
        State.save();
        UI.render();
    },

    openSettings() {
        const form = Utils.$('settingsForm');
        form.innerHTML = "";
        Utils.$('settingsModal').classList.remove('hidden');

        CONFIG.NUTRIENTS.forEach(n => {
            const div = document.createElement('div');
            div.className = 'settings-group';
            div.innerHTML = `
                <label>${n.label} (${n.unit})</label>
                <input type="number" id="set_${n.key}" value="${State.settings.targets[n.key]}">
            `;
            form.appendChild(div);
        });
    },

    saveSettings() {
        CONFIG.NUTRIENTS.forEach(n => {
            const val = Number(Utils.$(`set_${n.key}`).value);
            if (val > 0) State.settings.targets[n.key] = val;
        });
        State.save();
        UI.render();
        Utils.$('settingsModal').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
