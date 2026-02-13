/**
 * NutriPulse Pro - v19.0 DATA DRIVEN
 * ליבה חדשה: ללא ציונים, פוקוס על דשבורד ודיוק בנתונים.
 */

// --- 1. הגדרות בסיס ---
const CONFIG = {
    KEYS: { entries: "np_v19_entries", settings: "np_v19_settings" },
    NUTRIENTS: [
        // מאקרו
        { key: "protein", label: "חלבון", target: 160, unit: "g" },
        { key: "carbs", label: "פחמימה", target: 220, unit: "g" },
        { key: "fat", label: "שומן", target: 70, unit: "g" },
        // מיקרו (לדוגמה)
        { key: "sodium_mg", label: "נתרן", target: 2300, unit: "mg" },
        { key: "sugar_g", label: "סוכר", target: 50, unit: "g" },
        { key: "calcium_mg", label: "סידן", target: 1000, unit: "mg" }
    ],
    DAILY_CALORIE_TARGET: 2500
};

// --- 2. מסד נתונים (דוגמה מובנית לשימוש מיידי) ---
// unit_weight = כמה שוקלת יחידה אחת בגרמים (למשל ביצה = 60 גרם)
const localFoodDB = [
    { id: 101, name: "חזה עוף (צלוי)", per100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, unit_weight: 150, unit_name: "חתיכה" },
    { id: 102, name: "אורז לבן (מבושל)", per100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }, unit_weight: 200, unit_name: "כוס" },
    { id: 103, name: "ביצה קשה (L)", per100g: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 }, unit_weight: 60, unit_name: "ביצה" },
    { id: 104, name: "לחם מלא", per100g: { kcal: 250, protein: 13, carbs: 41, fat: 4 }, unit_weight: 35, unit_name: "פרוסה" },
    { id: 105, name: "בננה", per100g: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 }, unit_weight: 120, unit_name: "יחידה" },
    { id: 106, name: "שיבולת שועל", per100g: { kcal: 389, protein: 16.9, carbs: 66, fat: 6.9 }, unit_weight: 100, unit_name: "כוס" },
    { id: 107, name: "יוגורט חלבון 20g", per100g: { kcal: 60, protein: 10, carbs: 4, fat: 0 }, unit_weight: 200, unit_name: "גביע" }
];

// --- 3. עזרים ---
const Utils = {
    $: (id) => document.getElementById(id),
    uuid: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    todayISO: () => new Date().toLocaleDateString('en-CA'), // Format YYYY-MM-DD
    fmt: (n) => Math.round(n || 0).toLocaleString()
};

// --- 4. ניהול מצב (State) ---
const State = {
    entries: [],
    currentDate: Utils.todayISO(),
    
    // מצב עריכה נוכחי
    editor: {
        food: null,
        mode: 'grams', // 'grams' or 'units'
        amount: 0
    },

    init() {
        const savedEntries = localStorage.getItem(CONFIG.KEYS.entries);
        this.entries = savedEntries ? JSON.parse(savedEntries) : [];
        
        // טעינת תאריך מה-Input או מהיום
        Utils.$('datePicker').value = this.currentDate;
    },

    save() {
        localStorage.setItem(CONFIG.KEYS.entries, JSON.stringify(this.entries));
        UI.render(); // רענון מסך אחרי שמירה
    },

    addEntry() {
        if (!this.editor.food || this.editor.amount <= 0) {
            alert("אנא הזן כמות חוקית (גדולה מ-0)");
            return;
        }

        // 1. חישוב המשקל הסופי בגרמים לשמירה
        let finalGrams = 0;
        if (this.editor.mode === 'units') {
            finalGrams = this.editor.amount * (this.editor.food.unit_weight || 100);
        } else {
            finalGrams = this.editor.amount;
        }

        const newEntry = {
            id: Utils.uuid(),
            date: this.currentDate,
            foodId: this.editor.food.id,
            foodName: this.editor.food.name, // שומרים שם למקרה שה-DB ישתנה
            grams: finalGrams,
            originalInput: this.editor.amount, // לשחזור תצוגה אם צריך
            inputType: this.editor.mode
        };

        this.entries.unshift(newEntry);
        this.save();
        
        // איפוס וסגירה
        UI.closeEditPanel();
        Utils.$('foodSearch').value = '';
        Utils.$('foodResults').classList.add('hidden');
    },

    deleteEntry(id) {
        if (confirm("למחוק את המנה הזו?")) {
            this.entries = this.entries.filter(e => e.id !== id);
            this.save();
        }
    }
};

// --- 5. ממשק משתמש (UI) ---
const UI = {
    render() {
        // סינון לפי תאריך
        const daysEntries = State.entries.filter(e => e.date === State.currentDate);
        
        // חישוב סיכומים
        const totals = this.calculateTotals(daysEntries);
        
        // עדכון הדשבורד החדש
        this.updateDashboard(totals);
        
        // עדכון רשימת הארוחות
        this.renderJournal(daysEntries);
    },

    calculateTotals(entries) {
        const t = { kcal: 0 };
        CONFIG.NUTRIENTS.forEach(n => t[n.key] = 0);

        entries.forEach(entry => {
            // מציאת המאכל ב-DB (או שימוש בנתונים שמורים אם היינו שומרים את הערכים)
            const food = localFoodDB.find(f => f.id === entry.foodId);
            if (!food) return;

            const ratio = entry.grams / 100;
            
            t.kcal += food.per100g.kcal * ratio;
            CONFIG.NUTRIENTS.forEach(n => {
                t[n.key] += (food.per100g[n.key] || 0) * ratio;
            });
        });
        return t;
    },

    updateDashboard(totals) {
        // 1. עדכון קלוריות ראשי
        Utils.$('dailyCaloriesDisplay').textContent = Utils.fmt(totals.kcal);
        Utils.$('dailyGoalDisplay').textContent = `/ ${Utils.fmt(CONFIG.DAILY_CALORIE_TARGET)} יעד`;
        
        // 2. עדכון ברים (מאקרו)
        ['protein', 'carbs', 'fat'].forEach(key => {
            const val = totals[key] || 0;
            const target = CONFIG.NUTRIENTS.find(n => n.key === key).target;
            const percent = Math.min((val / target) * 100, 100);
            
            // עדכון טקסט
            Utils.$(`val${key.charAt(0).toUpperCase() + key.slice(1)}`).textContent = `${Utils.fmt(val)}g`;
            // עדכון רוחב הבר
            Utils.$(`bar${key.charAt(0).toUpperCase() + key.slice(1)}`).style.width = `${percent}%`;
        });

        // 3. עדכון מיקרו (רשימה)
        const microContainer = Utils.$('microsList');
        const micros = CONFIG.NUTRIENTS.filter(n => !['protein', 'carbs', 'fat'].includes(n.key));
        
        microContainer.innerHTML = micros.map(m => {
            const val = totals[m.key] || 0;
            const pct = Math.min((val / m.target) * 100, 100);
            let statusColor = "bg-low";
            if (pct > 100) statusColor = "bg-high";
            else if (pct > 80) statusColor = "bg-good";

            return `
            <div class="micro-item">
                <div class="micro-header">
                    <span>${m.label}</span>
                    <span>${Utils.fmt(val)} / ${m.target}</span>
                </div>
                <div class="micro-track">
                    <div class="micro-fill ${statusColor}" style="width: ${pct}%"></div>
                </div>
            </div>`;
        }).join('');
    },

    renderJournal(entries) {
        const list = Utils.$('journalList');
        if (entries.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:20px; color:#888;">היומן ריק היום... התחל להוסיף!</div>`;
            Utils.$('totalKcalJournal').textContent = `0 קלוריות`;
            return;
        }

        let totalKcal = 0;
        
        list.innerHTML = entries.map(entry => {
            const food = localFoodDB.find(f => f.id === entry.foodId);
            if (!food) return '';
            
            const kcal = Math.round(food.per100g.kcal * (entry.grams / 100));
            totalKcal += kcal;
            
            // תצוגה חכמה: אם הוזן ביחידות, נציג יחידות. אחרת גרם.
            const displayAmount = entry.inputType === 'units' 
                ? `${entry.originalInput} יח'` 
                : `${entry.originalInput} גרם`;

            return `
            <div class="meal-row">
                <div style="flex:1;">
                    <div style="font-weight:bold; color:#1e3a8a;">${food.name}</div>
                    <div style="font-size:0.85rem; color:#64748b;">${displayAmount}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:600;">${kcal} kcal</span>
                    <button class="del-btn" onclick="State.deleteEntry('${entry.id}')">✕</button>
                </div>
            </div>`;
        }).join('');

        Utils.$('totalKcalJournal').textContent = `${Utils.fmt(totalKcal)} קלוריות`;
    },

    // --- לוגיקת פאנל הוספה ---
    openEditPanel(food) {
        State.editor.food = food;
        State.editor.amount = 0; // תמיד מתחיל מ-0!
        State.editor.mode = 'grams'; // ברירת מחדל
        
        // עדכון UI
        Utils.$('editPanel').classList.remove('hidden');
        Utils.$('foodNameDisplay').textContent = food.name;
        Utils.$('foodKcalDisplay').textContent = `${food.per100g.kcal} קלוריות ל-100 גרם`;
        
        // איפוס שדה הקלט
        const input = Utils.$('amountInput');
        input.value = ''; // ריק כדי לעודד הקלדה
        input.focus();

        // איפוס כפתורי הטוגל
        this.setToggleState('grams');
    },

    closeEditPanel() {
        Utils.$('editPanel').classList.add('hidden');
        State.editor.food = null;
    },

    setToggleState(mode) {
        State.editor.mode = mode;
        const btns = document.querySelectorAll('.toggle-btn');
        btns.forEach(btn => {
            if (btn.dataset.mode === mode) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        
        // איפוס הערך כשמחליפים מצב למניעת בלבול
        Utils.$('amountInput').value = ''; 
        State.editor.amount = 0;
    }
};

// --- 6. אתחול האפליקציה (Init) ---
const App = {
    init() {
        State.init();
        this.bindEvents();
        UI.render();
    },

    bindEvents() {
        // חיפוש
        const searchInput = Utils.$('foodSearch');
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const results = Utils.$('foodResults');
            results.innerHTML = '';
            
            if (term.length < 2) {
                results.classList.add('hidden');
                return;
            }

            const matches = localFoodDB.filter(f => f.name.includes(term));
            
            if (matches.length > 0) {
                results.classList.remove('hidden');
                matches.forEach(food => {
                    const li = document.createElement('li');
                    li.textContent = food.name;
                    li.onclick = () => {
                        UI.openEditPanel(food);
                        results.classList.add('hidden');
                    };
                    results.appendChild(li);
                });
            } else {
                results.classList.add('hidden');
            }
        });

        // כפתורי +/-
        window.stepAmount = (step) => {
            const input = Utils.$('amountInput');
            let current = parseFloat(input.value) || 0;
            let newVal = Math.max(0, current + step);
            input.value = newVal;
            State.editor.amount = newVal;
        };

        // האזנה לקלט ידני במספרים
        Utils.$('amountInput').addEventListener('input', (e) => {
            State.editor.amount = parseFloat(e.target.value) || 0;
        });

        // החלפת יחידות (Grams / Units)
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                UI.setToggleState(e.target.dataset.mode);
            });
        });

        // הוספה
        Utils.$('addBtn').addEventListener('click', () => State.addEntry());

        // שינוי תאריך
        Utils.$('datePicker').addEventListener('change', (e) => {
            State.currentDate = e.target.value;
            UI.render();
        });
        
        // כפתור איפוס כללי
        Utils.$('resetApp').addEventListener('click', () => {
            if(confirm('פעולה זו תמחק את כל ההיסטוריה. להמשיך?')) {
                localStorage.clear();
                location.reload();
            }
        });
    }
};

// הפעלה
document.addEventListener('DOMContentLoaded', () => App.init());
