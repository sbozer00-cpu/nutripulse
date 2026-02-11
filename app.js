/* =========================================
   NutriPulse PRO – Advanced Logic
   ========================================= */

const CONFIG = {
    KEYS: { entries: "np_entries_pro", settings: "np_settings_pro" },
    // הרשימה המורחבת של המיקרו-נוטריאנטים שביקשת
    NUTRIENTS: [
        { key: "kcal", label: "קלוריות", unit: "", target: 2300 },
        { key: "protein", label: "חלבון", unit: "g", target: 140 },
        { key: "carbs", label: "פחמימה", unit: "g", target: 250 },
        { key: "fat", label: "שומן", unit: "g", target: 70 },
        
        // ויטמינים ומינרלים קריטיים
        { key: "calcium_mg", label: "סידן", unit: "mg", target: 1000 },
        { key: "iron_mg", label: "ברזל", unit: "mg", target: 10 },
        { key: "vitaminC_mg", label: "ויטמין C", unit: "mg", target: 90 },
        { key: "vitaminA_ug", label: "ויטמין A", unit: "µg", target: 900 },
        { key: "magnesium_mg", label: "מגנזיום", unit: "mg", target: 400 },
        { key: "zinc_mg", label: "אבץ", unit: "mg", target: 11 },
        { key: "sodium_mg", label: "נתרן", unit: "mg", target: 2300, max: true } // Max means lower is usually better
    ]
};

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString();

// --- State ---
const State = {
    foods: [],
    entries: JSON.parse(localStorage.getItem(CONFIG.KEYS.entries) || "[]"),
    settings: JSON.parse(localStorage.getItem(CONFIG.KEYS.settings) || "{}"), // נטען דיפולט בהמשך
    date: new Date().toISOString().split('T')[0],
    selectedFood: null,
    mode: 'grams'
};

// --- App Core ---
const App = {
    async init() {
        await this.loadFoods();
        
        // מיזוג הגדרות משתמש עם הדיפולט
        this.ensureSettings();

        // Event Listeners
        $('datePicker').value = State.date;
        $('datePicker').addEventListener('change', (e) => {
            State.date = e.target.value;
            this.render();
        });

        $('foodSearch').addEventListener('input', (e) => this.search(e.target.value));

        // Toggle Mode
        $('modeGrams').addEventListener('click', () => this.setMode('grams'));
        $('modeUnits').addEventListener('click', () => this.setMode('units'));

        // Buttons
        $('btnPlus').addEventListener('click', () => this.adjustQty(1));
        $('btnMinus').addEventListener('click', () => this.adjustQty(-1));
        $('addBtn').addEventListener('click', () => this.addEntry());

        // Settings Modal
        $('settingsBtn').addEventListener('click', () => this.openSettings());
        $('closeSettings').addEventListener('click', () => $('settingsModal').classList.add('hidden'));
        $('saveSettings').addEventListener('click', () => this.saveSettings());
        $('resetApp').addEventListener('click', () => {
            if(confirm("בטוח שברצונך לאפס הכל?")) {
                localStorage.clear();
                location.reload();
            }
        });

        this.render();
    },

    ensureSettings() {
        // אם אין הגדרות, ניצור אותן לפי ה-CONFIG
        if (!State.settings.targets) {
            State.settings.targets = {};
            CONFIG.NUTRIENTS.forEach(n => {
                State.settings.targets[n.key] = n.target;
            });
        }
    },

    async loadFoods() {
        try {
            const res = await fetch('data/foods.json');
            State.foods = await res.json();
        } catch { console.error("Foods DB Error"); }
    },

    search(query) {
        const list = $('foodResults');
        list.innerHTML = "";
        $('editPanel').classList.add('hidden');

        if(query.length < 2) { list.classList.add('hidden'); return; }

        const matches = State.foods.filter(f => f.name.includes(query)).slice(0, 6);
        if(!matches.length) { list.classList.add('hidden'); return; }

        list.classList.remove('hidden');
        matches.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${f.name}</span> <small>${f.per100g.kcal} קל'</small>`;
            li.onclick = () => this.selectFood(f);
            list.appendChild(li);
        });
    },

    selectFood(food) {
        State.selectedFood = food;
        $('foodResults').classList.add('hidden');
        $('foodSearch').value = "";
        
        const panel = $('editPanel');
        panel.classList.remove('hidden');

        $('foodNameDisplay').textContent = food.name;
        $('foodKcalDisplay').textContent = food.per100g.kcal + " קלוריות ל-100ג'";

        // Smart Mode Switch
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
        if(mode === 'grams') {
            $('modeGrams').classList.add('active');
            $('modeUnits').classList.remove('active');
            this.renderChips([50, 100, 150, 200], 'g');
        } else {
            $('modeGrams').classList.remove('active');
            $('modeUnits').classList.add('active');
            this.renderChips([0.5, 1, 2, 3], ' יח׳');
        }
    },

    renderChips(vals, suffix) {
        const div = $('quickChips');
        div.innerHTML = "";
        vals.forEach(v => {
            const btn = document.createElement('button');
            btn.className = 'chip';
            btn.textContent = v + suffix;
            btn.onclick = () => $('amountInput').value = v;
            div.appendChild(btn);
        });
    },

    adjustQty(dir) {
        const inp = $('amountInput');
        let v = Number(inp.value);
        const step = State.mode === 'grams' ? 50 : 0.5;
        v = Math.max(0, v + dir * step);
        inp.value = v;
    },

    addEntry() {
        const amt = Number($('amountInput').value);
        if(!State.selectedFood || amt <= 0) return;

        const f = State.selectedFood;
        let grams = amt;
        if(State.mode === 'units') grams = amt * (f.servingGrams || 100);

        const factor = grams / 100;
        
        // חישוב עמוק כולל מיקרו
        const nutrients = {};
        CONFIG.NUTRIENTS.forEach(n => {
            // בודק גם ב-per100g וגם ב-micros (אם קיים בקובץ)
            const val = (f.per100g[n.key] || (f.micros && f.micros[n.key]) || 0);
            nutrients[n.key] = val * factor;
        });

        const entry = {
            id: Date.now().toString(),
            date: State.date,
            foodName: f.name,
            amountDisplay: amt + (State.mode==='grams'?'g':' יח׳'),
            nutrients: nutrients
        };

        State.entries.push(entry);
        this.save();
        $('editPanel').classList.add('hidden');
        this.render();
    },

    deleteEntry(id) {
        if(!confirm("למחוק ארוחה זו?")) return;
        State.entries = State.entries.filter(e => e.id !== id);
        this.save();
        this.render();
    },

    save() {
        localStorage.setItem(CONFIG.KEYS.entries, JSON.stringify(State.entries));
        localStorage.setItem(CONFIG.KEYS.settings, JSON.stringify(State.settings));
    },

    // --- The Brain: Rendering & Analysis ---
    render() {
        const todays = State.entries.filter(e => e.date === State.date);
        
        // 1. סיכום נוטריאנטים
        const totals = {};
        CONFIG.NUTRIENTS.forEach(n => totals[n.key] = 0);

        todays.forEach(e => {
            CONFIG.NUTRIENTS.forEach(n => {
                totals[n.key] += (e.nutrients[n.key] || 0);
            });
        });

        // 2. יומן
        this.renderJournal(todays);

        // 3. ניתוח ואזהרות (החלק החדש והקריטי)
        this.analyzeNutrition(totals);

        // 4. מאקרו ברים
        this.renderMacros(totals);
    },

    renderJournal(list) {
        const container = $('journalList');
        const kcalHeader = $('totalKcalJournal');
        container.innerHTML = "";
        
        if(!list.length) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#9ca3af">לא נרשמו ארוחות בתאריך זה</div>`;
            kcalHeader.textContent = "0 קלוריות";
            return;
        }

        let dayKcal = 0;
        list.forEach(e => {
            const k = Math.round(e.nutrients.kcal);
            dayKcal += k;
            const div = document.createElement('div');
            div.className = 'meal-row';
            div.innerHTML = `
                <div class="m-info">
                    <b>${e.foodName}</b>
                    <span>${e.amountDisplay}</span>
                </div>
                <div class="m-actions">
                    <span style="font-weight:bold; font-size:14px">${k} cal</span>
                    <button class="del-btn">×</button>
                </div>
            `;
            div.querySelector('.del-btn').onclick = () => this.deleteEntry(e.id);
            container.appendChild(div);
        });
        kcalHeader.textContent = fmt(dayKcal) + " קלוריות";
    },

    renderMacros(totals) {
        const t = State.settings.targets;
        
        // פונקציית עזר לרוחב הבר
        const setBar = (id, val, target) => {
            const pct = Math.min((val / target) * 100, 100);
            $(id).style.width = pct + "%";
            $('val' + id.replace('bar','')).textContent = fmt(val) + "g";
        };

        setBar('barProtein', totals.protein, t.protein);
        setBar('barCarbs', totals.carbs, t.carbs);
        setBar('barFat', totals.fat, t.fat);
    },

    analyzeNutrition(totals) {
        const t = State.settings.targets;
        const alerts = [];
        const microsContainer = $('microsList');
        microsContainer.innerHTML = "";

        // א. חישוב ציון
        // נוסחה פשוטה: ממוצע אחוזי עמידה ביעדים (עד 100 לכל יעד)
        let totalScore = 0;
        let count = 0;
        
        // ב. מעבר על כל הנוטריאנטים ובניית הרשימה בצד שמאל
        CONFIG.NUTRIENTS.forEach(n => {
            const val = totals[n.key] || 0;
            const target = t[n.key] || 1;
            const pct = (val / target);
            
            // חישוב לציון (לא כולל נתרן)
            if(!n.max) {
                totalScore += Math.min(pct, 1);
                count++;
            }

            // זיהוי חריגות קיצוניות
            let statusIcon = "ok"; 
            let statusClass = "";

            // חריגה בשומן/נתרן
            if (n.key === 'fat' && pct > 1.15) {
                alerts.push(`צריכת שומן גבוהה (${fmt(val)}g)`);
                statusClass = "highlight-bad";
                statusIcon = "❗";
            }
            if (n.key === 'sodium_mg' && pct > 1.1) {
                alerts.push(`נתרן גבוה מדי!`);
                statusClass = "highlight-bad";
                statusIcon = "❗";
            }
            if (n.key === 'kcal' && pct > 1.1) {
                alerts.push(`חריגה מהיעד הקלורי`);
                statusClass = "highlight-warn";
            }

            // חוסר בחלבון/סידן
            if (n.key === 'protein' && pct < 0.6 && totals.kcal > t.kcal * 0.5) {
                alerts.push(`חסר חלבון באופן משמעותי`);
                statusClass = "highlight-warn";
                statusIcon = "📉";
            }
            if (n.key === 'calcium_mg' && pct < 0.5 && totals.kcal > t.kcal * 0.5) {
                alerts.push(`צריכת סידן נמוכה מאוד`);
            }

            // רינדור השורה ברשימה הארוכה
            if (['kcal', 'protein', 'carbs', 'fat'].includes(n.key)) return; // מדלג על מאקרו (יש להם ברים למעלה)

            const row = document.createElement('div');
            row.className = 'micro-row';
            // אם עבר את היעד - ירוק. אם פחות מ-50% - אפור/אדום
            const colorClass = (pct >= 0.8 && !n.max) ? "highlight-good" : (pct > 1.1 && n.max ? "highlight-bad" : "");
            
            row.innerHTML = `
                <span class="m-name">${n.label}</span>
                <span class="m-val ${colorClass}">${fmt(val)}${n.unit}</span>
                <span class="m-status">${pct >= 1 ? '✅' : ''}</span>
            `;
            microsContainer.appendChild(row);
        });

        // ג. עדכון הציון
        const finalScore = count ? Math.round((totalScore / count) * 100) : 0;
        $('dailyScore').textContent = finalScore;
        
        const statusMsg = $('statusMessage');
        if (finalScore > 85) statusMsg.textContent = "מצוין! תזונה מאוזנת";
        else if (finalScore > 60) statusMsg.textContent = "טוב, אך יש מקום לשיפור";
        else if (totals.kcal > 0) statusMsg.textContent = "שים לב לחוסרים תזונתיים";
        else statusMsg.textContent = "היום עוד לא התחיל...";

        // ד. הצגת התראות
        const alertBox = $('alertsBox');
        const alertList = $('alertsList');
        alertList.innerHTML = "";
        
        if (alerts.length > 0) {
            alertBox.classList.remove('hidden');
            alerts.forEach(txt => {
                const li = document.createElement('li');
                li.textContent = txt;
                alertList.appendChild(li);
            });
        } else {
            alertBox.classList.add('hidden');
        }
    },

    // --- Settings Modal Logic ---
    openSettings() {
        const form = $('settingsForm');
        form.innerHTML = "";
        $('settingsModal').classList.remove('hidden');

        CONFIG.NUTRIENTS.forEach(n => {
            const div = document.createElement('div');
            div.className = 'settings-group';
            div.innerHTML = `
                <label>${n.label} (${n.unit})</label>
                <input type="number" id="set_${n.key}" value="${State.settings.targets[n.key] || n.target}">
            `;
            form.appendChild(div);
        });
    },

    saveSettings() {
        CONFIG.NUTRIENTS.forEach(n => {
            const val = Number($(`set_${n.key}`).value);
            State.settings.targets[n.key] = val;
        });
        this.save();
        this.render();
        $('settingsModal').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
