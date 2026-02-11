/**
 * NutriPulse Pro - v18.0 ULTIMATE SCORING (Banking Logic)
 * פתרון סופי לבאג הציון: מודל קנסות דינמי על חריגות תקציב.
 */

const CONFIG = {
    KEYS: { entries: "np_v18_final", settings: "st_v18_final" },
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
    todayISO: () => new Date().toLocaleDateString('en-CA'),
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
        const todays = State.entries.filter(e => e.date === State.date);
        const totals = this.calculateTotals(todays);
        this.updateStats(totals);
        this.renderJournal(todays);
        this.renderMicros(totals);
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

    updateStats(totals) {
        const t = State.settings.targets;
        const kcalRatio = totals.kcal / t.kcal;
        
        // --- אלגוריתם הציון החדש: "ניהול תקציב תזונתי" ---
        
        // א. נקודות על בנייה (חלבון וויטמינים) - מקסימום 100
        let baseScore = (Math.min(totals.protein / t.protein, 1) * 70); // חלבון הוא העוגן
        const micros = CONFIG.NUTRIENTS.filter(n => n.group === 'micro');
        const microAvg = micros.reduce((acc, n) => acc + Math.min(totals[n.key] / t[n.key], 1), 0) / micros.length;
        baseScore += (microAvg * 30); // גיוון ויטמינים

        // ב. קנסות על חריגות (ריבית פיגורים)
        let penalties = 0;
        
        // 1. קנס קלוריות - הופך לאגרסיבי ככל שמתרחקים מהיעד
        if (kcalRatio > 1.05) {
            penalties += (kcalRatio - 1.05) * 150; // חריגה של 100% תוריד 150 נקודות
        }
        
        // 2. קנס נתרן (מלח)
        if (totals.sodium_mg > t.sodium_mg) {
            penalties += (totals.sodium_mg / t.sodium_mg - 1) * 40;
        }

        // ג. חישוב סופי
        let finalScore = Math.round(baseScore - penalties);
        finalScore = Math.max(0, Math.min(100, finalScore));

        Utils.$('dailyScore').textContent = finalScore;
        const status = Utils.$('statusMessage');
        
        // הודעת מצב לפי רמות סיכון
        if (finalScore >= 90) { status.textContent = "ניהול תקין! תזונה מאוזנת"; status.style.color = "var(--success)"; }
        else if (finalScore >= 70) { status.textContent = "טוב, אך שים לב לחריגות"; status.style.color = "var(--warning)"; }
        else { status.textContent = "חריגה משמעותית מהתקציב"; status.style.color = "var(--danger)"; }

        // עדכון גרפים
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
            let color = (n.group === 'limit' && val > t[n.key]) ? "bg-high" : (pct >= 80 ? "bg-good" : "bg-low");
            return `
                <div class="micro-item">
                    <div class="micro-header"><span>${n.label}</span><span>${Utils.fmt(val)}/${t[n.key]} <small>${n.unit}</small></span></div>
                    <div class="micro-track"><div class="micro-fill ${color}" style="width:${pct}%"></div></div>
                </div>`;
        }).join('');
    },

    renderJournal(entries) {
        const container = Utils.$('journalList');
        let totalKcal = 0;
        container.innerHTML = entries.map(e => {
            const f = State.foods.find(food => food.id === e.foodId);
            if (!f) return "";
            const grams = (e.unit === 'units' && f.servingGrams) ? e.amount * f.servingGrams : e.amount;
            const kcal = (f.per100g.kcal * (grams / 100));
            totalKcal += kcal;
            return `<div class="meal-row">
                <div class="m-info"><b>${f.name}</b><span>${e.amount} ${e.unit === 'grams' ? "ג'" : "יח'"}</span></div>
                <div class="m-actions"><span>${Utils.fmt(kcal)} kcal</span><button onclick="App.deleteEntry('${e.id}')" class="del-btn">✕</button></div>
            </div>`;
        }).join('') || "<p style='text-align:center; padding:20px;'>טרם נרשמו ארוחות</p>";
        Utils.$('totalKcalJournal').textContent = `${Utils.fmt(totalKcal)} קלוריות`;
    },

    setMode(mode) {
        State.mode = mode;
        Utils.$('modeGrams').classList.toggle('active', mode === 'grams');
        Utils.$('modeUnits').classList.toggle('active', mode === 'units');
    }
};

const App = {
    async init() {
        State.init();
        await this.loadFoods();
        Utils.$('datePicker').value = State.date;
        Utils.$('datePicker').onchange = (e) => { State.date = e.target.value; UI.render(); };
        Utils.$('foodSearch').oninput = Utils.debounce((e) => this.search(e.target.value), 250);
        Utils.$('modeGrams').onclick = () => UI.setMode('grams');
        Utils.$('modeUnits').onclick = () => UI.setMode('units');
        Utils.$('btnPlus').onclick = () => { const s = State.mode === 'grams' ? 50 : 1; Utils.$('amountInput').value = Number(Utils.$('amountInput').value) + s; };
        Utils.$('btnMinus').onclick = () => { const s = State.mode === 'grams' ? 50 : 1; Utils.$('amountInput').value = Math.max(0, Number(Utils.$('amountInput').value) - s); };
        Utils.$('addBtn').onclick = () => this.add();
        Utils.$('settingsBtn').onclick = () => this.toggleSettings(true);
        Utils.$('saveSettings').onclick = () => this.saveSettings();
        Utils.$('closeSettings').onclick = () => Utils.$('settingsModal').classList.add('hidden');
        Utils.$('resetApp').onclick = () => { if(confirm("לאפס הכל?")) { localStorage.clear(); location.reload(); } };
        UI.render();
    },
    async loadFoods() { try { const r = await fetch('data/foods.json'); State.foods = await r.json(); } catch(e) { console.error("Data error"); } },
    search(q) {
        const res = Utils.$('foodResults'); res.innerHTML = "";
        if (q.trim().length < 2) return res.classList.add('hidden');
        const matches = State.foods.filter(f => f.name.includes(q)).slice(0, 8);
        if (!matches.length) return res.classList.add('hidden');
        res.classList.remove('hidden');
        matches.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${f.name}</span><small>${f.per100g.kcal} kcal</small>`;
            li.onclick = () => {
                State.selectedFood = f;
                Utils.$('editPanel').classList.remove('hidden');
                UI.setMode(f.servingGrams ? 'units' : 'grams');
                Utils.$('foodNameDisplay').textContent = f.name;
                Utils.$('foodKcalDisplay').textContent = `${f.per100g.kcal} קלוריות ל-100ג'`;
                res.classList.add('hidden');
                Utils.$('foodSearch').value = "";
            };
            res.appendChild(li);
        });
    },
    add() {
        const amt = Number(Utils.$('amountInput').value);
        if (!State.selectedFood || amt <= 0) return;
        State.entries.unshift({ id: Utils.uuid(), date: State.date, foodId: State.selectedFood.id, amount: amt, unit: State.mode });
        State.save(); Utils.$('editPanel').classList.add('hidden'); UI.render();
    },
    deleteEntry(id) { if(confirm("למחוק?")) { State.entries = State.entries.filter(e => e.id !== id); State.save(); UI.render(); } },
    toggleSettings(open) {
        const m = Utils.$('settingsModal');
        if (open) {
            Utils.$('settingsForm').innerHTML = CONFIG.NUTRIENTS.map(n => `
                <div class="settings-group"><label>${n.label}</label><input type="number" id="set_${n.key}" value="${State.settings.targets[n.key]}"></div>`).join('');
            m.classList.remove('hidden');
        } else m.classList.add('hidden');
    },
    saveSettings() { CONFIG.NUTRIENTS.forEach(n => State.settings.targets[n.key] = Number(Utils.$(`set_${n.key}`).value)); State.save(); UI.render(); this.toggleSettings(false); }
};
document.addEventListener('DOMContentLoaded', () => App.init());
