/**
 * NutriPulse Pro - v15.0 ULTIMATE EDITION
 * הליבה המבצעית המתוקנת: בחירת יחידות, סקאלות צבעוניות וניהול יומן.
 */

const CONFIG = {
    KEYS: { entries: "np_pro_entries_v15", settings: "np_pro_settings_v15" },
    NUTRIENTS: [
        { key: "kcal", label: "קלוריות", unit: "kcal", target: 2200, group: "macro" },
        { key: "protein", label: "חלבון", unit: "g", target: 140, group: "macro" },
        { key: "carbs", label: "פחמימה", unit: "g", target: 250, group: "macro" },
        { key: "fat", label: "שומן", unit: "g", target: 70, group: "macro" },
        { key: "calcium_mg", label: "סידן", unit: "mg", target: 1000, group: "micro" },
        { key: "iron_mg", label: "ברזל", unit: "mg", target: 15, group: "micro" },
        { key: "magnesium_mg", label: "מגנזיום", unit: "mg", target: 400, group: "micro" },
        { key: "zinc_mg", label: "אבץ", unit: "mg", target: 11, group: "micro" },
        { key: "vitaminC_mg", label: "ויטמין C", unit: "mg", target: 90, group: "micro" },
        { key: "vitaminA_ug", label: "ויטמין A", unit: "µg", target: 900, group: "micro" },
        { key: "sodium_mg", label: "נתרן", unit: "mg", target: 2300, group: "limit" }
    ]
};

const Utils = {
    $: (id) => document.getElementById(id),
    uuid: () => Math.random().toString(36).substring(2, 11),
    todayISO: () => new Date().toLocaleDateString('en-CA'), // פורמט YYYY-MM-DD יציב
    fmt: (n) => Math.round(n || 0).toLocaleString(),
    debounce: (fn, ms) => {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
    }
};

const State = {
    foods: [], entries: [], settings: { targets: {} },
    date: Utils.todayISO(), selectedFood: null, mode: 'grams',

    init() {
        this.entries = JSON.parse(localStorage.getItem(CONFIG.KEYS.entries)) || [];
        const saved = JSON.parse(localStorage.getItem(CONFIG.KEYS.settings)) || {};
        CONFIG.NUTRIENTS.forEach(n => this.settings.targets[n.key] = saved.targets?.[n.key] || n.target);
    },
    save() {
        localStorage.setItem(CONFIG.KEYS.entries, JSON.stringify(this.entries));
        localStorage.setItem(CONFIG.KEYS.settings, JSON.stringify(this.settings));
    }
};

const UI = {
    render() {
        const todaysEntries = State.entries.filter(e => e.date === State.date);
        const totals = this.calculateTotals(todaysEntries);
        
        this.updateHeaderStats(totals);
        this.renderMacros(totals);
        this.renderMicros(totals);
        this.renderJournal(todaysEntries);
    },

    calculateTotals(entries) {
        const totals = {};
        CONFIG.NUTRIENTS.forEach(n => totals[n.key] = 0);
        entries.forEach(e => {
            const f = State.foods.find(food => food.id === e.foodId);
            if (!f) return;
            const grams = (e.unit === 'units' && f.servingGrams) ? e.amount * f.servingGrams : e.amount;
            const factor = grams / 100;
            const data = { ...f.per100g, ...f.micros };
            CONFIG.NUTRIENTS.forEach(n => totals[n.key] += (data[n.key] || 0) * factor);
        });
        return totals;
    },

    updateHeaderStats(totals) {
        const t = State.settings.targets;
        // אלגוריתם ציון המשלב קלוריות וחלבון
        const score = Math.round((Math.min(totals.protein / t.protein, 1) * 60) + (Math.min(totals.kcal / t.kcal, 1) * 40));
        Utils.$('dailyScore').textContent = score || 0;
        
        const status = Utils.$('statusMessage');
        if (score > 85) { status.textContent = "מצוין! תזונה מאוזנת"; status.style.color = "var(--success)"; }
        else if (score > 60) { status.textContent = "בדרך הטובה, להמשיך!"; status.style.color = "var(--primary)"; }
        else { status.textContent = "יש להשלים חוסרים להיום"; status.style.color = "var(--text-secondary)"; }

        // בדיקת חריגות (נתרן)
        const abox = Utils.$('alertsBox');
        if (totals.sodium_mg > t.sodium_mg) {
            abox.classList.remove('hidden');
            Utils.$('alertsList').innerHTML = `<li>חריגה בכמות הנתרן המומלצת!</li>`;
        } else {
            abox.classList.add('hidden');
        }
    },

    renderMacros(totals) {
        const t = State.settings.targets;
        ['protein', 'carbs', 'fat'].forEach(k => {
            const pct = Math.min((totals[k] / t[k]) * 100, 100);
            Utils.$(`val${k.charAt(0).toUpperCase() + k.slice(1)}`).textContent = `${Utils.fmt(totals[k])}g`;
            Utils.$(`bar${k.charAt(0).toUpperCase() + k.slice(1)}`).style.width = `${pct}%`;
        });
    },

    renderMicros(totals) {
        const container = Utils.$('microsList');
        const t = State.settings.targets;
        container.innerHTML = CONFIG.NUTRIENTS.filter(n => n.group === 'micro' || n.group === 'limit').map(n => {
            const val = totals[n.key] || 0;
            const pct = Math.min((val / t[n.key]) * 100, 100);
            
            // לוגיקת הצבע הירוק (מעל 80% מהיעד)
            let colorClass = "bg-low";
            if (n.group === 'limit' && val > t[n.key]) colorClass = "bg-high";
            else if (pct >= 80) colorClass = "bg-good";

            return `
                <div class="micro-item">
                    <div class="micro-header">
                        <span class="m-name">${n.label}</span>
                        <span class="m-val-text">${Utils.fmt(val)} / ${t[n.key]} <small>${n.unit}</small></span>
                    </div>
                    <div class="micro-track"><div class="micro-fill ${colorClass}" style="width:${pct}%"></div></div>
                </div>`;
        }).join('');
    },

    renderJournal(entries) {
        const container = Utils.$('journalList');
        let dailyKcal = 0;
        container.innerHTML = entries.map(e => {
            const f = State.foods.find(food => food.id === e.foodId);
            if (!f) return "";
            const grams = (e.unit === 'units' && f.servingGrams) ? e.amount * f.servingGrams : e.amount;
            const kcal = (f.per100g.kcal * (grams / 100));
            dailyKcal += kcal;
            return `
                <div class="meal-row">
                    <div class="m-info"><b>${f.name}</b><span>${e.amount} ${e.unit === 'grams' ? "גרם" : "יח'"}</span></div>
                    <div class="m-actions">
                        <span>${Utils.fmt(kcal)} <small>kcal</small></span>
                        <button onclick="App.deleteEntry('${e.id}')" class="del-btn">✕</button>
                    </div>
                </div>`;
        }).join('') || "<p style='text-align:center; padding:20px; color:#94a3b8;'>היומן ריק היום</p>";
        Utils.$('totalKcalJournal').textContent = `${Utils.fmt(dailyKcal)} קלוריות`;
    },

    setMode(mode) {
        State.mode = mode;
        // עדכון ויזואלי של הכפתורים
        Utils.$('modeGrams').classList.toggle('active', mode === 'grams');
        Utils.$('modeUnits').classList.toggle('active', mode === 'units');
        
        // עדכון כמות ברירת מחדל
        Utils.$('amountInput').value = (mode === 'units') ? 1 : 100;
    }
};

const App = {
    async init() {
        State.init();
        await this.loadFoods();
        
        Utils.$('datePicker').value = State.date;
        Utils.$('datePicker').onchange = (e) => { State.date = e.target.value; UI.render(); };
        
        // חיפוש
        Utils.$('foodSearch').oninput = Utils.debounce((e) => this.handleSearch(e.target.value), 250);
        
        // יחידות ומידות
        Utils.$('modeGrams').onclick = () => UI.setMode('grams');
        Utils.$('modeUnits').onclick = () => UI.setMode('units');
        
        Utils.$('btnPlus').onclick = () => {
            const step = (State.mode === 'grams') ? 50 : 1;
            Utils.$('amountInput').value = Number(Utils.$('amountInput').value) + step;
        };
        Utils.$('btnMinus').onclick = () => {
            const step = (State.mode === 'grams') ? 50 : 1;
            const current = Number(Utils.$('amountInput').value);
            Utils.$('amountInput').value = Math.max(0, current - step);
        };

        Utils.$('addBtn').onclick = () => this.addEntry();
        Utils.$('settingsBtn').onclick = () => this.toggleSettings(true);
        Utils.$('saveSettings').onclick = () => this.saveSettings();
        Utils.$('closeSettings').onclick = () => Utils.$('settingsModal').classList.add('hidden');
        Utils.$('resetApp').onclick = () => { if(confirm("לאפס את כל הנתונים?")) { localStorage.clear(); location.reload(); } };

        UI.render();
    },

    async loadFoods() {
        try {
            const r = await fetch('data/foods.json');
            State.foods = await r.json();
        } catch (e) { console.error("Database load failed"); }
    },

    handleSearch(q) {
        const list = Utils.$('foodResults');
        list.innerHTML = "";
        if (q.trim().length < 2) return list.classList.add('hidden');

        const matches = State.foods.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
        if (!matches.length) return list.classList.add('hidden');

        list.classList.remove('hidden');
        matches.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${f.name}</span><small>${f.per100g.kcal} kcal</small>`;
            li.onclick = () => {
                State.selectedFood = f;
                Utils.$('editPanel').classList.remove('hidden');
                UI.setMode(f.servingGrams ? 'units' : 'grams');
                Utils.$('foodSearch').value = "";
                list.classList.add('hidden');
                Utils.$('foodNameDisplay').textContent = f.name;
                Utils.$('foodKcalDisplay').textContent = `${f.per100g.kcal} קלוריות ל-100ג'`;
            };
            list.appendChild(li);
        });
    },

    addEntry() {
        const amt = Number(Utils.$('amountInput').value);
        if (!State.selectedFood || amt <= 0) return;

        State.entries.unshift({
            id: Utils.uuid(),
            date: State.date,
            foodId: State.selectedFood.id,
            amount: amt,
            unit: State.mode
        });

        State.save();
        Utils.$('editPanel').classList.add('hidden');
        UI.render();
    },

    deleteEntry(id) {
        if (!confirm("למחוק מהיומן?")) return;
        State.entries = State.entries.filter(e => e.id !== id);
        State.save();
        UI.render();
    },

    toggleSettings(open) {
        const m = Utils.$('settingsModal');
        if (open) {
            Utils.$('settingsForm').innerHTML = CONFIG.NUTRIENTS.map(n => `
                <div class="settings-group">
                    <label>${n.label} (${n.unit})</label>
                    <input type="number" id="set_${n.key}" value="${State.settings.targets[n.key]}">
                </div>`).join('');
            m.classList.remove('hidden');
        } else m.classList.add('hidden');
    },

    saveSettings() {
        CONFIG.NUTRIENTS.forEach(n => State.settings.targets[n.key] = Number(Utils.$(`set_${n.key}`).value));
        State.save();
        UI.render();
        this.toggleSettings(false);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
