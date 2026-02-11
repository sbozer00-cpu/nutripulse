/**
 * NutriPulse Pro - Ultimate Edition v10.0
 * מותאם אישית למערכת סקאלות ויזואליות, ניתוח חריגות וניהול יעדים.
 */

/* === 1. קונפיגורציה ויעדים === */
const CONFIG = {
    KEYS: {
        entries: "nutripulse_entries_v10",
        settings: "nutripulse_settings_v10"
    },
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

/* === 2. כלי עזר === */
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

/* === 3. ניהול המצב (State) === */
const State = {
    foods: [],
    entries: [],
    settings: {},
    date: Utils.todayISO(),
    selectedFood: null,
    mode: 'grams', 

    init() {
        this.entries = JSON.parse(localStorage.getItem(CONFIG.KEYS.entries) || "[]");
        const s = JSON.parse(localStorage.getItem(CONFIG.KEYS.settings) || "{}");
        this.settings = { targets: {} };
        CONFIG.NUTRIENTS.forEach(n => {
            this.settings.targets[n.key] = s.targets?.[n.key] || n.target;
        });
    },

    save() {
        localStorage.setItem(CONFIG.KEYS.entries, JSON.stringify(this.entries));
        localStorage.setItem(CONFIG.KEYS.settings, JSON.stringify(this.settings));
    }
};

/* === 4. לוגיקה עסקית === */
const Domain = {
    calculateEntry: (entry, food) => {
        if (!food) return null;
        let grams = Number(entry.amount);
        if (entry.unit === 'units' && food.servingGrams) grams = entry.amount * food.servingGrams;
        const factor = grams / 100;
        const result = { ...entry, calculated: {} };
        const allData = { ...food.per100g, ...food.micros };
        CONFIG.NUTRIENTS.forEach(n => result.calculated[n.key] = (allData[n.key] || 0) * factor);
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

            if (n.key === 'fat' && pct > 1.15) alerts.push({ type: 'bad', msg: `חריגה בשומן (${Utils.fmt(val)}g)` });
            if (n.key === 'sodium_mg' && pct > 1.1) alerts.push({ type: 'bad', msg: `צריכת נתרן גבוהה מדי!` });
            if (n.key === 'kcal' && pct > 1.1) alerts.push({ type: 'warn', msg: `עברת את יעד הקלוריות` });

            if (totals.kcal > targets.kcal * 0.5) {
                if (n.key === 'protein' && pct < 0.6) alerts.push({ type: 'warn', msg: `חסר חלבון משמעותי` });
                if (n.key === 'calcium_mg' && pct < 0.5) alerts.push({ type: 'warn', msg: `צריכת סידן נמוכה` });
            }

            if (n.group !== 'limit') {
                scoreSum += Math.min(pct, 1);
                scoreCount++;
            }
        });
        return { score: scoreCount ? Math.round((scoreSum / scoreCount) * 100) : 0, alerts };
    }
};

/* === 5. ניהול ממשק המשתמש === */
const UI = {
    render() {
        const todays = State.entries.filter(e => e.date === State.date);
        const totals = {};
        CONFIG.NUTRIENTS.forEach(n => totals[n.key] = 0);

        todays.forEach(e => {
            const f = State.foods.find(food => food.id === e.foodId);
            const d = Domain.calculateEntry(e, f);
            if (d) CONFIG.NUTRIENTS.forEach(n => totals[n.key] += d.calculated[n.key]);
        });

        const analysis = Domain.analyze(totals, State.settings.targets);
        this.renderJournal(todays, totals.kcal);
        this.renderSidebar(totals, analysis);
    },

    renderJournal(list, totalKcal) {
        const container = Utils.$('journalList');
        container.innerHTML = "";
        Utils.$('totalKcalJournal').textContent = Utils.fmt(totalKcal) + " קלוריות";

        if (!list.length) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;font-size:0.95rem">היומן ריק היום.</div>`;
            return;
        }

        list.forEach(e => {
            const f = State.foods.find(food => food.id === e.foodId);
            if (!f) return;
            const d = Domain.calculateEntry(e, f);
            const div = document.createElement('div');
            div.className = 'meal-row';
            div.innerHTML = `
                <div class="m-info"><b>${f.name}</b><span>${e.amount} ${e.unit === 'grams' ? 'ג\'' : 'יח\''}</span></div>
                <div class="m-actions">
                    <span style="font-weight:700; color:#111827">${Math.round(d.calculated.kcal)} cal</span>
                    <button class="del-btn" onclick="App.deleteEntry('${e.id}')">✕</button>
                </div>`;
            container.appendChild(div);
        });
    },

    renderSidebar(totals, analysis) {
        const t = State.settings.targets;
        Utils.$('dailyScore').textContent = analysis.score;
        const msg = Utils.$('statusMessage');
        
        if (analysis.score > 85) { msg.textContent = "תזונה מעולה!"; msg.style.color = "#10B981"; }
        else if (analysis.score > 60) { msg.textContent = "מצב טוב מאוד"; msg.style.color = "#F59E0B"; }
        else { msg.textContent = "יש מה לשפר"; msg.style.color = "#EF4444"; }

        const abox = Utils.$('alertsBox');
        const alist = Utils.$('alertsList');
        alist.innerHTML = "";
        if (analysis.alerts.length) {
            abox.classList.remove('hidden');
            analysis.alerts.forEach(a => {
                const li = document.createElement('li');
                li.textContent = a.msg;
                li.style.color = a.type === 'bad' ? '#B91C1C' : '#B45309';
                alist.appendChild(li);
            });
        } else abox.classList.add('hidden');

        ['protein', 'carbs', 'fat'].forEach(k => {
            const v = totals[k];
            const pct = Math.min((v / t[k]) * 100, 100);
            Utils.$(`val${k.charAt(0).toUpperCase() + k.slice(1)}`).textContent = Math.round(v) + "g";
            Utils.$(`bar${k.charAt(0).toUpperCase() + k.slice(1)}`).style.width = pct + "%";
        });

        const mlist = Utils.$('microsList');
        mlist.innerHTML = "";
        CONFIG.NUTRIENTS.filter(n => n.group === 'micro' || n.group === 'limit').forEach(n => {
            const val = totals[n.key] || 0;
            const target = t[n.key] || 1;
            const pct = Math.min((val / target) * 100, 100);
            
            let bgClass = "bg-low";
            if (n.group === 'limit') bgClass = (val > target) ? "bg-high" : "bg-good";
            else if (pct >= 85) bgClass = "bg-good";

            const item = document.createElement('div');
            item.className = 'micro-item';
            item.innerHTML = `
                <div class="micro-header">
                    <span class="m-name">${n.label}</span>
                    <div><span class="m-val-text">${Utils.fmt(val)}</span><span class="m-target-text"> / ${Utils.fmt(target)} ${n.unit}</span></div>
                </div>
                <div class="micro-track"><div class="micro-fill ${bgClass}" style="width:${pct}%"></div></div>`;
            mlist.appendChild(item);
        });
    },

    setMode(m) {
        State.mode = m;
        Utils.$('modeGrams').classList.toggle('active', m === 'grams');
        Utils.$('modeUnits').classList.toggle('active', m === 'units');
        if (m === 'grams') this.renderChips([50, 100, 150, 200], 'g');
        else this.renderChips([0.5, 1, 2, 3], ' יח\'');
    },

    renderChips(vals, suf) {
        const container = Utils.$('quickChips');
        container.innerHTML = "";
        vals.forEach(v => {
            const btn = document.createElement('button');
            btn.className = 'chip';
            btn.textContent = v + suf;
            btn.onclick = () => Utils.$('amountInput').value = v;
            container.appendChild(btn);
        });
    }
};

/* === 6. בקר ראשי === */
const App = {
    async init() {
        State.init();
        await this.loadFoods();
        Utils.$('datePicker').value = State.date;
        Utils.$('datePicker').onchange = (e) => { State.date = e.target.value; UI.render(); };
        Utils.$('foodSearch').oninput = Utils.debounce((e) => this.search(e.target.value), 300);
        Utils.$('addBtn').onclick = () => this.add();
        Utils.$('modeGrams').onclick = () => UI.setMode('grams');
        Utils.$('modeUnits').onclick = () => UI.setMode('units');
        Utils.$('btnPlus').onclick = () => { const i = Utils.$('amountInput'); i.value = Number(i.value) + (State.mode === 'grams' ? 50 : 0.5); };
        Utils.$('btnMinus').onclick = () => { const i = Utils.$('amountInput'); i.value = Math.max(0, Number(i.value) - (State.mode === 'grams' ? 50 : 0.5)); };
        Utils.$('settingsBtn').onclick = () => this.openSettings();
        Utils.$('saveSettings').onclick = () => this.saveSettings();
        Utils.$('closeSettings').onclick = () => Utils.$('settingsModal').classList.add('hidden');
        Utils.$('resetApp').onclick = () => { if (confirm("לאפס הכל?")) { localStorage.clear(); location.reload(); } };
        UI.render();
    },

    async loadFoods() {
        try { State.foods = await (await fetch('data/foods.json')).json(); } catch (e) { console.error("Data load failed"); }
    },

    search(q) {
        const l = Utils.$('foodResults');
        l.innerHTML = "";
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
                Utils.$('foodResults').classList.add('hidden');
                Utils.$('foodSearch').value = "";
                Utils.$('foodNameDisplay').textContent = f.name;
                Utils.$('foodKcalDisplay').textContent = `${f.per100g.kcal} קלוריות ל-100ג'`;
                if (f.servingGrams) { UI.setMode('units'); Utils.$('amountInput').value = 1; }
                else { UI.setMode('grams'); Utils.$('amountInput').value = 100; }
            };
            l.appendChild(li);
        });
    },

    add() {
        const amt = Number(Utils.$('amountInput').value);
        if (!State.selectedFood || amt <= 0) return;
        State.entries.push({ id: Utils.uuid(), date: State.date, foodId: State.selectedFood.id, amount: amt, unit: State.mode });
        State.save();
        Utils.$('editPanel').classList.add('hidden');
        UI.render();
    },

    deleteEntry(id) {
        if (confirm("למחוק?")) { State.entries = State.entries.filter(e => e.id !== id); State.save(); UI.render(); }
    },

    openSettings() {
        const f = Utils.$('settingsForm'); f.innerHTML = ""; Utils.$('settingsModal').classList.remove('hidden');
        CONFIG.NUTRIENTS.forEach(n => {
            const d = document.createElement('div'); d.className = 'settings-group';
            d.innerHTML = `<label>${n.label}</label><input type="number" id="set_${n.key}" value="${State.settings.targets[n.key]}">`;
            f.appendChild(d);
        });
    },

    saveSettings() {
        CONFIG.NUTRIENTS.forEach(n => State.settings.targets[n.key] = Number(Utils.$(`set_${n.key}`).value));
        State.save(); UI.render(); Utils.$('settingsModal').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
