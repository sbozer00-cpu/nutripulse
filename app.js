/* =========================================
   NutriPulse – Smart Core
   ========================================= */

const CONFIG = {
    KEYS: { entries: "np_entries", settings: "np_settings" },
    DEFAULTS: { kcal: 2200, protein: 140, carbs: 220, fat: 70 }
};

const $ = (id) => document.getElementById(id);

// --- State Management ---
const State = {
    foods: [],
    entries: JSON.parse(localStorage.getItem(CONFIG.KEYS.entries) || "[]"),
    settings: JSON.parse(localStorage.getItem(CONFIG.KEYS.settings) || JSON.stringify(CONFIG.DEFAULTS)),
    date: new Date().toISOString().split('T')[0],
    selectedFood: null,
    mode: 'grams' // 'grams' or 'units'
};

// --- App Logic ---
const App = {
    async init() {
        await this.loadFoods();
        
        // Setup Date
        $('datePicker').value = State.date;
        $('datePicker').addEventListener('change', (e) => {
            State.date = e.target.value;
            this.render();
        });

        // Search
        $('foodSearch').addEventListener('input', (e) => this.search(e.target.value));

        // Toggle Mode (Grams vs Units)
        $('modeGrams').addEventListener('click', () => this.setMode('grams'));
        $('modeUnits').addEventListener('click', () => this.setMode('units'));

        // Quantity Buttons
        $('btnPlus').addEventListener('click', () => this.adjustAmount(1));
        $('btnMinus').addEventListener('click', () => this.adjustAmount(-1));
        
        // Add Button
        $('addBtn').addEventListener('click', () => this.addEntry());

        // Settings Modal
        $('settingsBtn').addEventListener('click', () => $('settingsModal').classList.remove('hidden'));
        $('closeSettings').addEventListener('click', () => $('settingsModal').classList.add('hidden'));
        $('saveSettings').addEventListener('click', () => this.saveSettings());
        $('resetApp').addEventListener('click', () => { if(confirm("למחוק הכל?")) { localStorage.clear(); location.reload(); }});

        this.initSettingsForm();
        this.render();
    },

    async loadFoods() {
        try {
            const res = await fetch('data/foods.json');
            State.foods = await res.json();
        } catch { console.error("Foods not loaded"); }
    },

    search(query) {
        const list = $('foodResults');
        list.innerHTML = "";
        $('editPanel').classList.add('hidden');

        if(query.length < 2) { list.classList.add('hidden'); return; }

        const matches = State.foods.filter(f => f.name.includes(query)).slice(0, 5);
        if(!matches.length) { list.classList.add('hidden'); return; }

        list.classList.remove('hidden');
        matches.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${f.name}</span> <span style="font-size:0.8em;color:var(--text-muted)">${f.per100g.kcal} קלוריות</span>`;
            li.onclick = () => this.selectFood(f);
            list.appendChild(li);
        });
    },

    selectFood(food) {
        State.selectedFood = food;
        $('foodResults').classList.add('hidden');
        $('foodSearch').value = ""; // Clear search for clean look
        $('editPanel').classList.remove('hidden');
        $('foodNameDisplay').textContent = food.name;

        // --- התיקון החכם (Smart Switch) ---
        // אם למזון יש הגדרת מנה (servingGrams), נעבור ליחידות
        if(food.servingGrams) {
            this.setMode('units');
            $('amountInput').value = 1; 
        } else {
            this.setMode('grams');
            $('amountInput').value = 100;
        }
    },

    setMode(mode) {
        State.mode = mode;
        
        // UI Updates
        if(mode === 'grams') {
            $('modeGrams').classList.add('active');
            $('modeUnits').classList.remove('active');
            this.renderChips([100, 200, 300], 'g');
        } else {
            $('modeGrams').classList.remove('active');
            $('modeUnits').classList.add('active');
            this.renderChips([1, 2, 3], ' יח׳');
        }
    },

    renderChips(values, suffix) {
        const container = $('quickChips');
        container.innerHTML = "";
        values.forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'chip';
            btn.textContent = val + suffix;
            btn.onclick = () => $('amountInput').value = val;
            container.appendChild(btn);
        });
    },

    adjustAmount(dir) {
        const input = $('amountInput');
        let val = Number(input.value);
        const step = State.mode === 'grams' ? 50 : 0.5;
        val += dir * step;
        if(val < 0) val = 0;
        input.value = val;
    },

    addEntry() {
        if(!State.selectedFood) return;
        const amount = Number($('amountInput').value);
        if(amount <= 0) return;

        // חישוב קלוריות
        const food = State.selectedFood;
        let grams = amount;
        
        // אם אנחנו במצב יחידות, נכפיל במשקל היחידה
        if(State.mode === 'units') {
            grams = amount * (food.servingGrams || 100); // ברירת מחדל 100 אם אין הגדרה
        }

        const factor = grams / 100;
        const entry = {
            id: Date.now().toString(),
            date: State.date,
            time: new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'}),
            foodName: food.name,
            kcal: (food.per100g.kcal || 0) * factor,
            protein: (food.per100g.protein || 0) * factor,
            carbs: (food.per100g.carbs || 0) * factor,
            fat: (food.per100g.fat || 0) * factor,
            displayAmount: amount,
            displayUnit: State.mode === 'grams' ? 'g' : ' יח׳'
        };

        State.entries.push(entry);
        this.save();
        
        // Reset UI
        $('editPanel').classList.add('hidden');
        this.render();
    },

    deleteEntry(id) {
        if(!confirm("למחוק?")) return;
        State.entries = State.entries.filter(e => e.id !== id);
        this.save();
        this.render();
    },

    save() {
        localStorage.setItem(CONFIG.KEYS.entries, JSON.stringify(State.entries));
        localStorage.setItem(CONFIG.KEYS.settings, JSON.stringify(State.settings));
    },

    render() {
        // 1. Filter entries for today
        const todays = State.entries.filter(e => e.date === State.date);
        
        // 2. Sum totals
        const totals = todays.reduce((acc, cur) => ({
            kcal: acc.kcal + cur.kcal,
            protein: acc.protein + cur.protein,
            carbs: acc.carbs + cur.carbs,
            fat: acc.fat + cur.fat
        }), { kcal:0, protein:0, carbs:0, fat:0 });

        // 3. Render Ring & Macros
        const t = State.settings;
        const p = Math.min((totals.kcal / t.kcal) * 100, 100);
        $('kcalRing').style.setProperty('--p', p);
        $('kcalVal').textContent = Math.round(totals.kcal);
        
        $('proteinVal').textContent = Math.round(totals.protein) + "g";
        $('carbsVal').textContent = Math.round(totals.carbs) + "g";
        $('fatVal').textContent = Math.round(totals.fat) + "g";

        // 4. Render Journal List
        const list = $('journalList');
        list.innerHTML = "";
        
        // מסדרים לפי שעה
        todays.sort((a,b) => a.time.localeCompare(b.time)).reverse();

        if(!todays.length) {
            list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted)">היומן ריק היום</div>`;
        } else {
            todays.forEach(e => {
                const el = document.createElement('div');
                el.className = 'meal-item';
                el.innerHTML = `
                    <div class="meal-info">
                        <span class="meal-name">${e.foodName}</span>
                        <span class="meal-meta">${e.time} • ${e.displayAmount}${e.displayUnit}</span>
                    </div>
                    <div style="display:flex; align-items:center">
                        <span class="meal-kcal">${Math.round(e.kcal)}</span>
                        <button class="btn-del">×</button>
                    </div>
                `;
                el.querySelector('.btn-del').onclick = () => this.deleteEntry(e.id);
                list.appendChild(el);
            });
        }

        // 5. Smart Coach
        this.renderCoach(totals, t);
    },

    renderCoach(totals, targets) {
        const coach = $('smartCoach');
        const txt = $('coachText');
        
        if(totals.kcal === 0) {
            coach.classList.add('hidden');
            return;
        }
        coach.classList.remove('hidden');

        const kPct = totals.kcal / targets.kcal;
        
        if (kPct > 1.05) {
            txt.textContent = "שים לב, הגעת ליעד הקלוריות היומי.";
        } else if (totals.protein < targets.protein * 0.5 && kPct > 0.5) {
            txt.textContent = "חסר לך חלבון היום ביחס לקלוריות שאכלת.";
        } else {
            txt.textContent = "אתה באיזון מצוין. המשך כך!";
        }
    },

    // --- Settings Logic ---
    initSettingsForm() {
        const form = $('settingsForm');
        const keys = { kcal: "קלוריות", protein: "חלבון", carbs: "פחמימה", fat: "שומן" };
        
        for(const [k, label] of Object.entries(keys)) {
            const div = document.createElement('div');
            div.className = 'settings-input-group';
            div.innerHTML = `
                <label>${label}</label>
                <input type="number" id="set_${k}" value="${State.settings[k]}">
            `;
            form.appendChild(div);
        }
    },

    saveSettings() {
        State.settings.kcal = Number($('set_kcal').value);
        State.settings.protein = Number($('set_protein').value);
        State.settings.carbs = Number($('set_carbs').value);
        State.settings.fat = Number($('set_fat').value);
        this.save();
        this.render();
        $('settingsModal').classList.add('hidden');
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => App.init());
