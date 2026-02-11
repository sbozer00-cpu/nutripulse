/**
 * NutriPulse Pro - Fix v10.1
 * תיקון מנגנון בחירת מוצר וחיבור לנתוני Micros
 */

const CONFIG = {
    KEYS: { entries: "np_entries_v10", settings: "np_settings_v10" },
    NUTRIENTS: [
        { key: "kcal", label: "קלוריות", unit: "", target: 2200, group: "macro" },
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

const State = {
    foods: [], entries: [], settings: {}, date: Utils.todayISO(), selectedFood: null, mode: 'grams', 
    init() {
        this.entries = JSON.parse(localStorage.getItem(CONFIG.KEYS.entries) || "[]");
        const s = JSON.parse(localStorage.getItem(CONFIG.KEYS.settings) || "{}");
        this.settings = { targets: {} };
        CONFIG.NUTRIENTS.forEach(n => this.settings.targets[n.key] = s.targets?.[n.key] || n.target);
    },
    save() {
        localStorage.setItem(CONFIG.KEYS.entries, JSON.stringify(this.entries));
        localStorage.setItem(CONFIG.KEYS.settings, JSON.stringify(this.settings));
    }
};

const UI = {
    render() {
        const todays = State.entries.filter(e => e.date === State.date);
        const totals = {};
        CONFIG.NUTRIENTS.forEach(n => totals[n.key] = 0);

        todays.forEach(e => {
            const f = State.foods.find(food => food.id === e.foodId);
            if (f) {
                const grams = (e.unit === 'units' && f.servingGrams) ? e.amount * f.servingGrams : e.amount;
                const factor = grams / 100;
                const allData = { ...f.per100g, ...f.micros };
                CONFIG.NUTRIENTS.forEach(n => totals[n.key] += (allData[n.key] || 0) * factor);
            }
        });

        this.updateStats(totals);
        this.renderJournal(todays);
    },

    updateStats(totals) {
        const t = State.settings.targets;
        // עדכון ציון
        const score = Math.round((Math.min(totals.protein/t.protein, 1) + Math.min(totals.kcal/t.kcal, 1)) / 2 * 100) || 0;
        Utils.$('dailyScore').textContent = score;

        // התראות
        const alist = Utils.$('alertsList');
        const abox = Utils.$('alertsBox');
        alist.innerHTML = "";
        let alerts = [];
        if (totals.fat > t.fat * 1.15) alerts.push(`צריכת שומן גבוהה מהמומלץ! (${Math.round(totals.fat)}g)`);
        if (totals.sodium_mg > t.sodium_mg) alerts.push("אזהרה: חריגה משמעותית בנתרן (מלח)");
        
        if (alerts.length) {
            abox.classList.remove('hidden');
            alerts.forEach(a => { const li = document.createElement('li'); li.textContent = a; alist.appendChild(li); });
        } else abox.classList.add('hidden');

        // עדכון ברים (מאקרו)
        ['protein', 'carbs', 'fat'].forEach(k => {
            const pct = Math.min((totals[k] / t[k]) * 100, 100);
            Utils.$(`val${k.charAt(0).toUpperCase() + k.slice(1)}`).textContent = Math.round(totals[k]) + "g";
            Utils.$(`bar${k.charAt(0).toUpperCase() + k.slice(1)}`).style.width = pct + "%";
        });

        // עדכון סקאלות (מיקרו)
        const mlist = Utils.$('microsList');
        mlist.innerHTML = "";
        CONFIG.NUTRIENTS.filter(n => n.group === 'micro' || n.group === 'limit').forEach(n => {
            const val = totals[n.key] || 0;
            const pct = Math.min((val / t[n.key]) * 100, 100);
            const color = (n.group === 'limit' && val > t[n.key]) ? "bg-high" : (pct > 80 ? "bg-good" : "bg-low");
            mlist.innerHTML += `
                <div class="micro-item">
                    <div class="micro-header">
                        <span class="m-name">${n.label}</span>
                        <span class="m-val-text">${Math.round(val)} / ${t[n.key]} ${n.unit}</span>
                    </div>
                    <div class="micro-track"><div class="micro-fill ${color}" style="width:${pct}%"></div></div>
                </div>`;
        });
    },

    renderJournal(list) {
        const container = Utils.$('journalList');
        container.innerHTML = "";
        let totalKcal = 0;
        list.forEach(e => {
            const f = State.foods.find(food => food.id === e.foodId);
            if (!f) return;
            const kcal = (f.per100g.kcal * ((e.unit === 'units' ? e.amount * f.servingGrams : e.amount) / 100));
            totalKcal += kcal;
            container.innerHTML += `
                <div class="meal-row">
                    <div class="m-info"><b>${f.name}</b><span>${e.amount} ${e.unit==='grams'?'ג\'':'יח\''}</span></div>
                    <div class="m-actions"><span>${Math.round(kcal)} cal</span><button onclick="App.deleteEntry('${e.id}')">✕</button></div>
                </div>`;
        });
        Utils.$('totalKcalJournal').textContent = Math.round(totalKcal) + " קלוריות";
    },

    setMode(m) {
        State.mode = m;
        Utils.$('modeGrams').classList.toggle('active', m === 'grams');
        Utils.$('modeUnits').classList.toggle('active', m === 'units');
        this.renderChips(m === 'grams' ? [50, 100, 150, 200] : [0.5, 1, 2, 3], m === 'grams' ? 'g' : ' יח\'');
    },

    renderChips(vals, suf) {
        const c = Utils.$('quickChips'); c.innerHTML = "";
        vals.forEach(v => {
            const b = document.createElement('button'); b.className = 'chip'; b.textContent = v+suf;
            b.onclick = () => Utils.$('amountInput').value = v; c.appendChild(b);
        });
    }
};

const App = {
    async init() {
        State.init();
        await this.loadFoods();
        Utils.$('datePicker').value = State.date;
        Utils.$('datePicker').onchange = (e) => { State.date = e.target.value; UI.render(); };
        Utils.$('foodSearch').oninput = Utils.debounce((e) => App.search(e.target.value), 300);
        Utils.$('addBtn').onclick = () => App.add();
        Utils.$('modeGrams').onclick = () => UI.setMode('grams');
        Utils.$('modeUnits').onclick = () => UI.setMode('units');
        Utils.$('btnPlus').onclick = () => Utils.$('amountInput').value = Number(Utils.$('amountInput').value) + (State.mode==='grams'?50:0.5);
        Utils.$('btnMinus').onclick = () => Utils.$('amountInput').value = Math.max(0, Number(Utils.$('amountInput').value) - (State.mode==='grams'?50:0.5));
        Utils.$('settingsBtn').onclick = () => App.openSettings();
        UI.render();
    },
    async loadFoods() { try { const r = await fetch('data/foods.json'); State.foods = await r.json(); } catch(e) { console.error("Load failed"); } },
    search(q) {
        const l = Utils.$('foodResults'); l.innerHTML = "";
        if (q.length < 2) { l.classList.add('hidden'); return; }
        const matches = State.foods.filter(f => f.name.includes(q)).slice(0, 8);
        if (!matches.length) { l.classList.add('hidden'); return; }
        l.classList.remove('hidden');
        matches.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${f.name}</span><small>${f.per100g.kcal} cal</small>`;
            li.onclick = () => {
                State.selectedFood = f;
                Utils.$('editPanel').classList.remove('hidden');
                l.classList.add('hidden');
                Utils.$('foodSearch').value = "";
                Utils.$('foodNameDisplay').textContent = f.name;
                Utils.$('foodKcalDisplay').textContent = `${f.per100g.kcal} קלוריות ל-100ג'`;
                UI.setMode(f.servingGrams ? 'units' : 'grams');
                Utils.$('amountInput').value = f.servingGrams ? 1 : 100;
            };
            l.appendChild(li);
        });
    },
    add() {
        const amt = Number(Utils.$('amountInput').value);
        if (!State.selectedFood || amt <= 0) return;
        State.entries.push({ id: Utils.uuid(), date: State.date, foodId: State.selectedFood.id, amount: amt, unit: State.mode });
        State.save(); Utils.$('editPanel').classList.add('hidden'); UI.render();
    },
    deleteEntry(id) { if(confirm("למחוק?")) { State.entries = State.entries.filter(e => e.id !== id); State.save(); UI.render(); } },
    openSettings() {
        const f = Utils.$('settingsForm'); f.innerHTML = ""; Utils.$('settingsModal').classList.remove('hidden');
        CONFIG.NUTRIENTS.forEach(n => {
            f.innerHTML += `<div class="settings-group"><label>${n.label}</label><input type="number" id="set_${n.key}" value="${State.settings.targets[n.key]}"></div>`;
        });
        Utils.$('saveSettings').onclick = () => {
            CONFIG.NUTRIENTS.forEach(n => State.settings.targets[n.key] = Number(Utils.$(`set_${n.key}`).value));
            State.save(); UI.render(); Utils.$('settingsModal').classList.add('hidden');
        };
        Utils.$('closeSettings').onclick = () => Utils.$('settingsModal').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
