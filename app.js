/**
 * NutriPulse Pro - App Logic
 * מותאם לתצוגת Dashboard (Sidebar + Main Content)
 */

/* =========================================
   1. CONFIG & CONSTANTS
   ========================================= */
const CONFIG = {
    LS_KEYS: {
        entries: "nutripulse_entries",
        settings: "nutripulse_settings",
        recent: "nutripulse_recent",
    },
    // הגדרת הרכיבים למעקב
    NUTRIENTS: [
        { key: "kcal", label: "קלוריות", unit: "kcal", group: "macro", digits: 0 },
        { key: "protein", label: "חלבון", unit: "g", group: "macro", digits: 1 },
        { key: "carbs", label: "פחמימות", unit: "g", group: "macro", digits: 1 },
        { key: "fat", label: "שומן", unit: "g", group: "macro", digits: 1 },
        { key: "fiber", label: "סיבים", unit: "g", group: "macro", digits: 1 },
        { key: "calcium_mg", label: "סידן", unit: "mg", group: "micro", digits: 0 },
        { key: "iron_mg", label: "ברזל", unit: "mg", group: "micro", digits: 1 },
        { key: "vitaminC_mg", label: "ויטמין C", unit: "mg", group: "micro", digits: 0 },
    ],
    // ברירות מחדל ליעדים
    DEFAULTS: {
        targets: {
            kcal: 2300, protein: 140, carbs: 250, fat: 80, fiber: 30,
            calcium_mg: 1000, iron_mg: 8, vitaminC_mg: 90
        },
        weights: {
            kcal: 1.0, protein: 2.0, fiber: 1.5,
            calcium_mg: 1.0, iron_mg: 1.0
        },
        scoreThreshold: 0.7,
    }
};

/* =========================================
   2. UTILS
   ========================================= */
const Utils = {
    $: (id) => document.getElementById(id),
    
    // יצירת מזהה ייחודי
    uuid: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    
    // תאריך ושעה
    todayISO: () => new Date().toISOString().split('T')[0],
    nowTime: () => new Date().toTimeString().slice(0, 5),
    
    // פירמוט מספרים (למשל: 1,200)
    fmt: (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d }),
    
    // הגבלה בין מינימום למקסימום
    clamp: (val, min, max) => Math.min(Math.max(val, min), max),

    // השהייה (לחיפוש)
    debounce: (func, wait) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

/* =========================================
   3. STORAGE & STATE
   ========================================= */
const Storage = {
    get: (key, fallback) => {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    },
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

const State = {
    foods: [],
    date: Utils.todayISO(),
    selectedFood: null, // המזון שנבחר בחיפוש
    settings: null,

    init() {
        this.settings = Storage.get(CONFIG.LS_KEYS.settings, CONFIG.DEFAULTS);
        // Fallback if settings are empty
        if (!this.settings.targets) this.settings = CONFIG.DEFAULTS;
    },

    getEntries() {
        return Storage.get(CONFIG.LS_KEYS.entries, []);
    },

    saveEntries(entries) {
        Storage.set(CONFIG.LS_KEYS.entries, entries);
    }
};

/* =========================================
   4. DOMAIN LOGIC
   ========================================= */
const Domain = {
    // זיהוי ארוחה לפי שעה
    getMealLabel: (timeStr) => {
        const h = parseInt((timeStr || "00:00").split(":")[0]);
        if (h >= 5 && h < 11) return "בוקר";
        if (h >= 11 && h < 16) return "צהריים";
        return "ערב";
    },

    // חישוב ערכים תזונתיים לרשומה בודדת
    calculateEntry: (entry) => {
        const food = State.foods.find(f => f.id === entry.foodId);
        if (!food) return null;

        let grams = Number(entry.amount);
        
        // המרה מיחידות לגרמים אם צריך
        if (entry.unit === 'servings') {
            grams = entry.amount * (food.servingGrams || 0);
        }

        if (grams <= 0) return null;

        const factor = grams / 100;
        const result = {
            ...entry,
            foodName: food.name,
            calculated: {}
        };

        // איחוד כל הערכים (per100g + micros)
        const nutrients = { ...food.per100g, ...food.micros };

        CONFIG.NUTRIENTS.forEach(n => {
            result.calculated[n.key] = (nutrients[n.key] || 0) * factor;
        });

        return result;
    },

    // סיכום יומי
    getDailyTotals: (entries) => {
        const totals = {};
        CONFIG.NUTRIENTS.forEach(n => totals[n.key] = 0);

        entries.forEach(e => {
            const data = Domain.calculateEntry(e);
            if (data) {
                CONFIG.NUTRIENTS.forEach(n => {
                    totals[n.key] += (data.calculated[n.key] || 0);
                });
            }
        });
        return totals;
    },

    // חישוב ציון (1-100)
    calculateScore: (totals, settings) => {
        let totalScore = 0;
        let totalWeight = 0;

        for (const [key, weight] of Object.entries(settings.weights)) {
            const w = Number(weight);
            const goal = settings.targets[key] || 1;
            const val = totals[key] || 0;
            let credit = 0;

            if (key === 'kcal') {
                // קלוריות: עונש על חריגה או חוסר
                const diff = Math.abs(val - goal);
                if (diff < goal * 0.1) credit = 1; // בול
                else if (diff > goal * 0.3) credit = 0; // רחוק מדי
                else credit = 0.5;
            } else {
                // שאר הדברים: כמה שיותר קרוב ליעד (עד 100%)
                credit = Math.min(val / goal, 1);
                if (credit < settings.scoreThreshold) credit = 0;
            }

            totalScore += credit * w;
            totalWeight += w;
        }

        return totalWeight ? Math.round((totalScore / totalWeight) * 100) : 0;
    },

    // המאמן החכם
    getSmartTip: (totals, targets) => {
        const kPct = totals.kcal / targets.kcal;
        
        if (kPct < 0.1) return "היום רק התחיל! הגיע הזמן לארוחה ראשונה מזינה. 🍳";
        if (kPct > 1.1) return "שים לב, חריגה קלה בקלוריות. נסה להתמקד בירקות לשארית היום. 🥗";
        
        if (totals.protein < targets.protein * 0.4 && kPct > 0.4) {
            return "רמת החלבון נמוכה יחסית לקלוריות שאכלת. כדאי להוסיף מנת חלבון בקרוב. 💪";
        }
        
        if (totals.fiber < targets.fiber * 0.5 && kPct > 0.5) {
            return "מערכת העיכול תשמח לעוד סיבים. זה זמן טוב לפרי או דגן מלא. 🍎";
        }

        return "אתה בכיוון הנכון! המשך לעקוב כדי לשמור על הרצף. 🔥";
    }
};

/* =========================================
   5. UI MANAGER
   ========================================= */
const UI = {
    // רינדור ראשי
    render() {
        const allEntries = State.getEntries();
        const todayEntries = allEntries.filter(e => e.dateISO === State.date);
        const totals = Domain.getDailyTotals(todayEntries);
        const score = todayEntries.length ? Domain.calculateScore(totals, State.settings) : 0;

        this.renderKPIs(totals);
        this.renderScore(score, todayEntries.length > 0);
        this.renderSmartCoach(totals, todayEntries.length);
        this.renderJournal(todayEntries);
        this.renderTable(totals);
        this.renderGaps(totals);
    },

    renderKPIs(totals) {
        Utils.$('kcalTotal').textContent = Utils.fmt(totals.kcal);
        Utils.$('proteinTotal').textContent = Utils.fmt(totals.protein) + 'g';
        // Check if element exists (added in new HTML)
        const carbsEl = Utils.$('carbsTotal');
        if (carbsEl) carbsEl.textContent = Utils.fmt(totals.carbs) + 'g';
    },

    renderScore(score, hasEntries) {
        Utils.$('dailyScore').textContent = hasEntries ? score : "—";
        
        // צבע דינמי לכרטיס הציון
        const card = document.querySelector('.score-card');
        if (hasEntries) {
            if (score > 80) card.style.background = 'linear-gradient(135deg, #059669, #10b981)'; // Green
            else if (score > 50) card.style.background = 'linear-gradient(135deg, #d97706, #f59e0b)'; // Orange
            else card.style.background = 'linear-gradient(135deg, #dc2626, #ef4444)'; // Red
        } else {
            card.style.background = ''; // Default CSS
        }
    },

    renderSmartCoach(totals, hasEntries) {
        const coach = Utils.$('smartCoach');
        if (!hasEntries) {
            coach.classList.add('hidden');
            return;
        }
        coach.classList.remove('hidden');
        const tip = Domain.getSmartTip(totals, State.settings.targets);
        Utils.$('coachText').textContent = tip;
    },

    renderJournal(entries) {
        const container = Utils.$('todayList');
        if (entries.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted)">היומן ריק היום. התחל להוסיף!</div>`;
            return;
        }

        // קיבוץ לפי ארוחות
        const groups = { "בוקר": [], "צהריים": [], "ערב": [] };
        entries.sort((a, b) => (a.time || "").localeCompare(b.time || "")).forEach(e => {
            groups[Domain.getMealLabel(e.time)].push(e);
        });

        let html = "";
        ["בוקר", "צהריים", "ערב"].forEach(label => {
            const list = groups[label];
            if (!list.length) return;

            let mealKcal = 0;
            const itemsHtml = list.map(e => {
                const data = Domain.calculateEntry(e);
                if (!data) return "";
                mealKcal += data.calculated.kcal;
                
                return `
                <div class="item">
                    <div>
                        <div class="name">${data.foodName}</div>
                        <div class="meta">${e.time} • ${Math.round(e.amount)}${e.unit === 'grams' ? 'g' : ' יח׳'}</div>
                    </div>
                    <div class="right">
                        <span style="font-size:0.85rem; font-weight:bold; margin-left:10px">${Math.round(data.calculated.kcal)} kcal</span>
                        <button class="del" onclick="App.deleteEntry('${e.id}')">✕</button>
                    </div>
                </div>`;
            }).join("");

            html += `
                <div class="mealHeader">
                    <span>${label}</span>
                    <span style="font-size:0.85rem; opacity:0.8">${Math.round(mealKcal)} קלוריות</span>
                </div>
                ${itemsHtml}
            `;
        });

        container.innerHTML = html;
    },

    renderTable(totals) {
        const container = Utils.$('nutrientTable');
        container.innerHTML = `<div class="trow head"><div>רכיב</div><div>נצרך</div><div>יעד</div><div class="status"></div></div>`;

        CONFIG.NUTRIENTS.forEach(n => {
            const val = totals[n.key] || 0;
            const goal = State.settings.targets[n.key] || 0;
            const pct = goal ? val / goal : 0;
            
            let icon = "❌"; // Red
            if (pct >= 1) icon = "✅"; // Green
            else if (pct >= 0.7) icon = "⚠️"; // Yellow

            container.innerHTML += `
                <div class="trow">
                    <div>${n.label}</div>
                    <div>${Utils.fmt(val)}${n.unit}</div>
                    <div>${Utils.fmt(goal)}</div>
                    <div class="status">${icon}</div>
                </div>`;
        });
    },
    
    renderGaps(totals) {
        const container = Utils.$('gaps');
        if(!container) return;
        
        const gaps = [];
        ['protein', 'fiber', 'iron_mg', 'calcium_mg'].forEach(key => {
            const val = totals[key] || 0;
            const goal = State.settings.targets[key] || 0;
            if(val < goal * 0.8) { // אם פחות מ-80%
                const label = CONFIG.NUTRIENTS.find(n => n.key === key).label;
                gaps.push(label);
            }
        });
        
        if(gaps.length > 0) {
            container.innerHTML = `<strong>חסר בעיקר:</strong> ${gaps.join(', ')}`;
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    },

    // הצגת המזון שנבחר בחיפוש
    renderSelectedFood(food) {
        const panel = Utils.$('selectedFood');
        if (!food) {
            panel.classList.add('hidden');
            Utils.$('addBtn').disabled = true;
            return;
        }

        panel.classList.remove('hidden');
        panel.innerHTML = `
            <div style="font-weight:bold; color:var(--primary); font-size:1.1rem">${food.name}</div>
            <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px">
                ל-100 גרם: ${food.per100g.kcal} קלוריות • ${food.per100g.protein}g חלבון
            </div>
        `;
        Utils.$('addBtn').disabled = false;
        Utils.$('amountInput').focus();
    }
};

/* =========================================
   6. APP CONTROLLER
   ========================================= */
const App = {
    async init() {
        State.init();
        await this.loadFoods();

        // אתחול תאריך
        Utils.$('datePicker').value = State.date;

        // --- Event Listeners ---

        // שינוי תאריך
        Utils.$('datePicker').addEventListener('change', (e) => {
            State.date = e.target.value;
            UI.render();
        });

        // חיפוש מזון (עם Debounce שלא ייתקע)
        Utils.$('foodSearch').addEventListener('input', Utils.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));

        // בחירת כמות מהירה (Chips)
        document.querySelectorAll('.chip').forEach(btn => {
            btn.addEventListener('click', () => {
                Utils.$('amountInput').value = btn.dataset.g;
                Utils.$('amountMode').value = 'grams'; // ברירת מחדל
                Utils.$('amountInput').focus();
            });
        });

        // כפתור הוספה
        Utils.$('addBtn').addEventListener('click', () => this.addEntry());

        // הוספה ב-Enter
        Utils.$('amountInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.addEntry();
        });

        // כפתור ביטול
        Utils.$('cancelEdit').addEventListener('click', () => {
            this.clearSelection();
        });
        
        // הגדרות
        this.initSettings();

        // רינדור ראשוני
        UI.render();
    },

    async loadFoods() {
        try {
            const res = await fetch('data/foods.json');
            const data = await res.json();
            State.foods = Array.isArray(data) ? data : [];
        } catch (e) {
            console.error("Failed to load foods", e);
            State.foods = [];
        }
    },

    handleSearch(query) {
        const list = Utils.$('foodResults');
        list.innerHTML = "";
        
        if (query.length < 2) {
            list.classList.add('hidden');
            return;
        }

        const results = State.foods
            .filter(f => f.name.includes(query)) // חיפוש פשוט
            .slice(0, 6); // הגבלה ל-6 תוצאות

        if (results.length === 0) {
            list.classList.add('hidden');
            return;
        }

        list.classList.remove('hidden');
        results.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${f.name}</span>
                <span style="font-size:0.8em; color:#888">${f.per100g.kcal} cal</span>
            `;
            li.addEventListener('click', () => {
                this.selectFood(f);
                list.classList.add('hidden');
            });
            list.appendChild(li);
        });
    },

    selectFood(food) {
        State.selectedFood = food;
        Utils.$('foodSearch').value = food.name;
        UI.renderSelectedFood(food);
        
        // אם יש הגדרת מנה, נסה להעביר למצב "מנה"
        if (food.servingGrams) {
            Utils.$('amountMode').value = 'servings';
            Utils.$('amountInput').value = 1;
        } else {
            Utils.$('amountMode').value = 'grams';
            Utils.$('amountInput').value = 100;
        }
    },

    addEntry() {
        const amount = Number(Utils.$('amountInput').value);
        if (!State.selectedFood || amount <= 0) return;

        const entry = {
            id: Utils.uuid(),
            dateISO: State.date,
            time: Utils.nowTime(),
            foodId: State.selectedFood.id,
            amount: amount,
            unit: Utils.$('amountMode').value
        };

        const entries = State.getEntries();
        entries.push(entry);
        State.saveEntries(entries);

        this.clearSelection();
        UI.render();
    },

    deleteEntry(id) {
        if (!confirm("למחוק את הארוחה?")) return;
        const entries = State.getEntries().filter(e => e.id !== id);
        State.saveEntries(entries);
        UI.render();
    },

    clearSelection() {
        State.selectedFood = null;
        Utils.$('foodSearch').value = "";
        Utils.$('amountInput').value = "";
        UI.renderSelectedFood(null);
    },
    
    // ניהול הגדרות בסיסי
    initSettings() {
        const form = Utils.$('settingsForm');
        // כאן אפשר להוסיף קוד ליצירת טופס הגדרות דינמי אם רוצים
        // כרגע רק נאפס
        Utils.$('resetBtn').addEventListener('click', () => {
            if(confirm("בטוח שאתה רוצה לאפס הכל?")) {
                localStorage.clear();
                location.reload();
            }
        });
    }
};

// חשיפת פונקציות גלובליות ל-HTML
window.App = App;

// הרצת האפליקציה
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
