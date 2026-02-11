/**
 * NutriPulse Pro - v12.0 Ultra Logic
 * הליבה המבצעית: ניהול נתונים, ניתוח תזונתי מתקדם ופידבק ויזואלי.
 */

const CONFIG = {
    KEYS: { entries: "np_pro_entries_v12", settings: "np_pro_settings_v12" },
    NUTRIENTS: [
        { key: "kcal", label: "קלוריות", unit: "kcal", target: 2200, group: "macro", color: "#2563EB" },
        { key: "protein", label: "חלבון", unit: "g", target: 140, group: "macro", color: "#10B981" },
        { key: "carbs", label: "פחמימה", unit: "g", target: 250, group: "macro", color: "#F59E0B" },
        { key: "fat", label: "שומן", unit: "g", target: 70, group: "macro", color: "#EF4444" },
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
    todayISO: () => new Date().toLocaleDateString('en-CA'),
    fmt: (n) => (n % 1 === 0 ? n.toLocaleString() : n.toFixed(1)),
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
        const todays = State.entries.filter(e => e.date === State.date);
        const totals = this.getTotals(todays);
        
        this.renderJournal(todays);
        this.renderStats(totals);
        this.renderMicros(totals);
    },

    getTotals(entries) {
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

    renderStats(totals) {
        const t = State.settings.targets;
        // אלגוריתם ציון משופר
        const kcalPct = totals.kcal / t.kcal;
        const proteinPct = totals.protein / t.protein;
        const score = Math.round((Math.min(kcalPct, 1) * 40) + (Math.min(proteinPct, 1) * 60));
        
        Utils.$('dailyScore').textContent = score || 0;
        const status = Utils.$('statusMessage');
        
        if (score > 90) { status.textContent = "פשוט מושלם!"; status.style.color = "var(--success)"; }
        else if (score > 70) { status.textContent = "בדרך הנכונה"; status.style.color = "var(--primary)"; }
        else { status.textContent = "צריך עוד קצת חלבון"; status.style.color = "var(--text-secondary)"; }

        // התראות חכמות
        const alist = Utils.$('alertsList');
        const abox = Utils.$('alertsBox');
        alist.innerHTML = "";
        const alerts = [];
        if (totals.fat > t.fat * 1.1) alerts.push(`שימו לב: חריגה בשומן (${Math.round(totals.fat)}g)`);
        if (totals.sodium_mg > t.sodium_mg) alerts.push("נתרן גבוה מדי - נסו להפחית מלח");

        if (alerts.length) {
            abox.classList.remove('hidden');
            alerts.forEach(a => alist.innerHTML += `<li>${a}</li>`);
        } else abox.classList.add('hidden');

        // מאקרו ברים
        ['protein', 'carbs', 'fat'].forEach(k => {
            const pct = Math.min((totals[k] / t[k]) * 100, 100);
            Utils.$(`val${k.charAt(0).toUpperCase() + k.slice(1)}`).textContent = `${Utils.fmt(totals[k])}g`;
            Utils.$(`bar${k.charAt(0).toUpperCase() + k.slice(1)}`).style.width = `${pct}%`;
        });
    },

    renderMicros(totals) {
        const container = Utils.$('microsList');
        const t = State.settings.targets;
        let html = "";

        CONFIG.NUTRIENTS.filter(n => n.group === 'micro' || n.group === 'limit').forEach(n => {
            const val = totals[n.key] || 0;
            const pct = Math.min((val / t[n.key]) * 100, 100);
            const colorClass = (n.group === 'limit' && val > t[n.key]) ? "bg-high" : (pct > 85 ? "bg-good" : "bg-low");

            html += `
                <div class="micro-item">
                    <div class="micro-header">
                        <span class="m-name">${n.label}</span>
                        <span class="m-val-text">${Utils.fmt(val)} / ${t[n.key]} <small>${n.unit}</small></span>
                    </div>
                    <div class="micro-track"><div class="micro-fill ${colorClass}" style="width:${pct}%"></div></div>
                </div>`;
        });
        container.innerHTML = html;
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
                    <div class="m-info"><b>${f.name}</b><span>${e.amount} ${e.unit === 'grams' ? "ג'" : "יח'"}</span></div>
                    <div class="m-actions">
                        <span>${Utils.fmt(kcal)} <small>kcal</small></span>
                        <button onclick="App.deleteEntry('${e.id}')" class="del-btn">✕</button>
                    </div>
                </div>`;
        }).join('') || "<p class='empty-msg'>עדיין לא אכלת כלום היום?</p>";
        Utils.$('totalKcalJournal').textContent = `${Utils.fmt(dailyKcal)} קלוריות`;
    },

    updateLivePreview() {
        if (!State.selectedFood) return;
        const amt = Number(Utils.$('amountInput').value) || 0;
        const grams = (State.mode === 'units') ? amt * (State.selectedFood.servingGrams || 0) : amt;
        const kcal = (State.selectedFood.per100g.kcal * (grams / 100));
        Utils.$('foodKcalDisplay').textContent = `${Utils.fmt(kcal)} קלוריות סה"כ`;
    }
};

const App = {
    async init() {
        State.init();
        await this.loadData();
        
        // Listeners
        Utils.$('datePicker').value = State.date;
        Utils.$('datePicker').onchange = (e) => { State.date = e.target.value; UI.render(); };
        Utils.$('foodSearch').oninput = Utils.debounce((e) => this.search(e.target.value), 250);
        Utils.$('amountInput').oninput = () => UI.updateLivePreview();
        Utils.$('addBtn').onclick = () => this.add();
        Utils.$('modeGrams').onclick = () => { State.mode = 'grams'; UI.renderSelected(); };
        Utils.$('modeUnits').onclick = () => { State.mode = 'units'; UI.renderSelected(); };
        Utils.$('btnPlus').onclick = () => { Utils.$('amountInput').value = Number(Utils.$('amountInput').value) + (State.mode === 'grams' ? 50 : 1); UI.updateLivePreview(); };
        Utils.$('btnMinus').onclick = () => { Utils.$('amountInput').value = Math.max(0, Number(Utils.$('amountInput').value) - (State.mode === 'grams' ? 50 : 1)); UI.updateLivePreview(); };
        Utils.$('settingsBtn').onclick = () => this.toggleSettings(true);
        Utils.$('closeSettings').onclick = () => this.toggleSettings(false);
        Utils.$('saveSettings').onclick = () => this.saveSettings();
        Utils.$('resetApp').onclick = () => { if(confirm("למחוק הכל?")) { localStorage.clear(); location.reload(); } };

        UI.render();
    },

    async loadData() {
        try {
            const r = await fetch('data/foods.json');
            State.foods = await r.json();
        } catch (e) { Utils.$('foodSearch').placeholder = "שגיאה בטעינת המאגר"; }
    },

    search(q) {
        const res = Utils.$('foodResults'); res.innerHTML = "";
        if (q.trim().length < 2) return res.classList.add('hidden');
        const matches = State.foods.filter(f => f.name.includes(q)).slice(0, 10);
        if (!matches.length) return res.classList.add('hidden');
        
        res.classList.remove('hidden');
        matches.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `${f.name} <small>${f.per100g.kcal} kcal</small>`;
            li.onclick = () => this.select(f);
            res.appendChild(li);
        });
    },

    select(f) {
        State.selectedFood = f;
        State.mode = f.servingGrams ? 'units' : 'grams';
        Utils.$('editPanel').classList.remove('hidden');
        Utils.$('foodResults').classList.add('hidden');
        Utils.$('foodSearch').value = "";
        this.renderSelected();
    },

    renderSelected() {
        const f = State.selectedFood;
        Utils.$('foodNameDisplay').textContent = f.name;
        Utils.$('modeGrams').classList.toggle('active', State.mode === 'grams');
        Utils.$('modeUnits').classList.toggle('active', State.mode === 'units');
        Utils.$('amountInput').value = State.mode === 'units' ? 1 : 100;
        UI.updateLivePreview();
        
        const chips = Utils.$('quickChips'); chips.innerHTML = "";
        const vals = State.mode === 'grams' ? [50, 100, 200, 300] : [0.5, 1, 2];
        vals.forEach(v => {
            const b = document.createElement('button'); b.className = 'chip'; b.textContent = v + (State.mode==='grams'?'g':'');
            b.onclick = () => { Utils.$('amountInput').value = v; UI.updateLivePreview(); };
            chips.appendChild(b);
        });
    },

    add() {
        const amt = Number(Utils.$('amountInput').value);
        if (!State.selectedFood || amt <= 0) return;
        State.entries.unshift({ id: Utils.uuid(), date: State.date, foodId: State.selectedFood.id, amount: amt, unit: State.mode });
        State.save();
        Utils.$('editPanel').classList.add('hidden');
        UI.render();
        // פידבק ויזואלי מהיר
        Utils.$('addSection').style.borderColor = 'var(--success)';
        setTimeout(() => Utils.$('addSection').style.borderColor = 'var(--border-color)', 600);
    },

    deleteEntry(id) {
        if (!confirm("למחוק?")) return;
        State.entries = State.entries.filter(e => e.id !== id);
        State.save(); UI.render();
    },

    toggleSettings(open) {
        const m = Utils.$('settingsModal');
        if (open) {
            const f = Utils.$('settingsForm'); f.innerHTML = CONFIG.NUTRIENTS.map(n => `
                <div class="settings-group">
                    <label>${n.label} (${n.unit})</label>
                    <input type="number" id="set_${n.key}" value="${State.settings.targets[n.key]}">
                </div>`).join('');
            m.classList.remove('hidden');
        } else m.classList.add('hidden');
    },

    saveSettings() {
        CONFIG.NUTRIENTS.forEach(n => State.settings.targets[n.key] = Number(Utils.$(`set_${n.key}`).value));
        State.save(); UI.render(); this.toggleSettings(false);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
