/* =========================================
   NutriPulse – Fixed App Logic
   ========================================= */

const CONFIG = {
    KEYS: { entries: "np_entries", settings: "np_settings" },
    DEFAULTS: { kcal: 2200, protein: 140, carbs: 220, fat: 70 }
};

const $ = (id) => {
    const el = document.getElementById(id);
    if (!el) console.error(`Element not found: ${id}`);
    return el;
};

// --- State ---
const State = {
    foods: [],
    entries: JSON.parse(localStorage.getItem(CONFIG.KEYS.entries) || "[]"),
    settings: JSON.parse(localStorage.getItem(CONFIG.KEYS.settings) || JSON.stringify(CONFIG.DEFAULTS)),
    date: new Date().toISOString().split('T')[0],
    selectedFood: null,
    mode: 'grams'
};

// --- App ---
const App = {
    async init() {
        console.log("App initializing...");
        await this.loadFoods();
        
        // Setup Inputs
        if($('datePicker')) {
            $('datePicker').value = State.date;
            $('datePicker').addEventListener('change', (e) => {
                State.date = e.target.value;
                this.render();
            });
        }

        // Search Listener
        if($('foodSearch')) {
            $('foodSearch').addEventListener('input', (e) => this.search(e.target.value));
        }

        // Buttons
        if($('modeGrams')) $('modeGrams').addEventListener('click', () => this.setMode('grams'));
        if($('modeUnits')) $('modeUnits').addEventListener('click', () => this.setMode('units'));
        if($('btnPlus')) $('btnPlus').addEventListener('click', () => this.adjustAmount(1));
        if($('btnMinus')) $('btnMinus').addEventListener('click', () => this.adjustAmount(-1));
        if($('addBtn')) $('addBtn').addEventListener('click', () => this.addEntry());

        // Settings
        if($('settingsBtn')) $('settingsBtn').addEventListener('click', () => $('settingsModal').classList.remove('hidden'));
        if($('closeSettings')) $('closeSettings').addEventListener('click', () => $('settingsModal').classList.add('hidden'));
        if($('saveSettings')) $('saveSettings').addEventListener('click', () => this.saveSettings());
        if($('resetApp')) $('resetApp').addEventListener('click', () => { 
            if(confirm("למחוק הכל?")) { localStorage.clear(); location.reload(); }
        });

        this.initSettingsForm();
        this.render();
    },

    async loadFoods() {
        try {
            const res = await fetch('data/foods.json');
            State.foods = await res.json();
            console.log("Foods loaded:", State.foods.length);
        } catch (e) { 
            console.error("Foods failed to load", e); 
        }
    },

    search(query) {
        const list = $('foodResults');
        if(!list) return;
        
        list.innerHTML = "";
        const panel = $('editPanel');
        if(panel) panel.classList.add('hidden');

        if(query.length < 2) { list.classList.add('hidden'); return; }

        const matches = State.foods.filter(f => f.name.includes(query)).slice(0, 6);
        
        if(!matches.length) { 
            list.classList.add('hidden'); 
            return; 
        }

        list.classList.remove('hidden');
        matches.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${f.name}</span> <span style="font-size:0.8em;color:#888">${f.per100g.kcal} קל'</span>`;
            
            // התיקון הקריטי: האזנה ללחיצה
            li.addEventListener('click', () => {
                console.log("Clicked food:", f.name);
                this.selectFood(f);
            });
            
            list.appendChild(li);
        });
    },

    selectFood(food) {
        State.selectedFood = food;
        
        const list = $('foodResults');
        if(list) list.classList.add('hidden');
        
        const searchInput = $('foodSearch');
        if(searchInput) searchInput.value = ""; 

        const panel = $('editPanel');
        if(!panel) {
            console.error("CRITICAL: editPanel ID missing in HTML");
            alert("שגיאה: חסר אלמנט ב-HTML. וודא שהעתקת את ה-HTML החדש.");
            return;
        }
        
        panel.classList.remove('hidden');
        
        if($('foodNameDisplay')) $('foodNameDisplay').textContent = food.name;

        // Smart Switch Logic
        if(food.servingGrams) {
            this.setMode('units');
            if($('amountInput')) $('amountInput').value = 1; 
        } else {
            this.setMode('grams');
            if($('amountInput')) $('amountInput').value = 100;
        }
    },

    setMode(mode) {
        State.mode = mode;
        const btnG = $('modeGrams');
        const btnU = $('modeUnits');
        
        if(btnG && btnU) {
            if(mode === 'grams') {
                btnG.classList.add('active');
                btnU.classList.remove('active');
                this.renderChips([100, 200, 300], 'g');
            } else {
                btnG.classList.remove('active');
                btnU.classList.add('active');
                this.renderChips([1, 2, 3], ' יח׳');
            }
        }
    },

    renderChips(values, suffix) {
        const container = $('quickChips');
        if(!container) return;
        container.innerHTML = "";
        values.forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'chip';
            btn.textContent = val + suffix;
            btn.onclick = () => {
                if($('amountInput')) $('amountInput').value = val;
            };
            container.appendChild(btn);
        });
    },

    adjustAmount(dir) {
        const input = $('amountInput');
        if(!input) return;
        let val = Number(input.value);
        const step = State.mode === 'grams' ? 50 : 0.5;
        val += dir * step;
        if(val < 0) val = 0;
        input.value = val;
    },

    addEntry() {
        if(!State.selectedFood) return;
        const input = $('amountInput');
        const amount = Number(input ? input.value : 0);
        if(amount <= 0) return;

        const food = State.selectedFood;
        let grams = amount;
        
        if(State.mode === 'units') {
            grams = amount * (food.servingGrams || 100);
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
        
        const panel = $('editPanel');
        if(panel) panel.classList.add('hidden');
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
        const todays = State.entries.filter(e => e.date === State.date);
        
        const totals = todays.reduce((acc, cur) => ({
            kcal: acc.kcal + cur.kcal,
            protein: acc.protein + cur.protein,
            carbs: acc.carbs + cur.carbs,
            fat: acc.fat + cur.fat
        }), { kcal:0, protein:0, carbs:0, fat:0 });

        // Render Ring
        const t = State.settings;
        const p = t.kcal > 0 ? Math.min((totals.kcal / t.kcal) * 100, 100) : 0;
        
        if($('kcalRing')) $('kcalRing').style.setProperty('--p', p);
        if($('kcalVal')) $('kcalVal').textContent = Math.round(totals.kcal);
        if($('proteinVal')) $('proteinVal').textContent = Math.round(totals.protein) + "g";
        if($('carbsVal')) $('carbsVal').textContent = Math.round(totals.carbs) + "g";
        if($('fatVal')) $('fatVal').textContent = Math.round(totals.fat) + "g";

        // Render List
        const list = $('journalList');
        if(list) {
            list.innerHTML = "";
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
        }

        // Coach
        const coach = $('smartCoach');
        const txt = $('coachText');
        if(coach && txt) {
            if(totals.kcal === 0) {
                coach.classList.add('hidden');
            } else {
                coach.classList.remove('hidden');
                const kPct = totals.kcal / t.kcal;
                if (kPct > 1.05) txt.textContent = "שים לב, הגעת ליעד הקלוריות היומי.";
                else if (totals.protein < t.protein * 0.5 && kPct > 0.5) txt.textContent = "חסר לך חלבון היום.";
                else txt.textContent = "אתה באיזון מצוין.";
            }
        }
    },

    initSettingsForm() {
        const form = $('settingsForm');
        if(!form) return;
        form.innerHTML = "";
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
        if($('set_kcal')) State.settings.kcal = Number($('set_kcal').value);
        if($('set_protein')) State.settings.protein = Number($('set_protein').value);
        if($('set_carbs')) State.settings.carbs = Number($('set_carbs').value);
        if($('set_fat')) State.settings.fat = Number($('set_fat').value);
        this.save();
        this.render();
        if($('settingsModal')) $('settingsModal').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
