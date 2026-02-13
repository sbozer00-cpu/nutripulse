/**
 * NutriPulse Pro - v21.0 FINAL FIX
 * תיקון באג ויטמינים: כעת המערכת קוראת נתונים גם מ-micros
 * וצובעת את הפסים בירוק.
 */

// --- 1. הגדרות בסיס ---
const CONFIG = {
    KEYS: { entries: "np_v21_entries" },
    NUTRIENTS: [
        { key: "protein", label: "חלבון", target: 160, unit: "g" },
        { key: "carbs", label: "פחמימה", target: 220, unit: "g" },
        { key: "fat", label: "שומן", target: 70, unit: "g" },
        // הערכים האלו נמצאים ב-micros ב-DB
        { key: "sodium_mg", label: "נתרן", target: 2300, unit: "mg" },
        { key: "sugar_g", label: "סוכר", target: 50, unit: "g" },
        { key: "calcium_mg", label: "סידן", target: 1000, unit: "mg" }
    ],
    DAILY_CALORIE_TARGET: 2500
};

// --- 2. מסד נתונים מלא (150 פריטים) ---
const localFoodDB = [
  // --- ירקות ---
  { "id": "1", "name": "מלפפון", "unit_name": "יחידה בינונית", "unit_weight": 100, "per100g": { "kcal": 15, "protein": 0.7, "carbs": 3.6, "fat": 0.1 }, "micros": { "sodium_mg": 2, "calcium_mg": 16, "sugar_g": 1.7 } },
  { "id": "2", "name": "עגבניה", "unit_name": "יחידה בינונית", "unit_weight": 120, "per100g": { "kcal": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2 }, "micros": { "sodium_mg": 5, "calcium_mg": 10, "sugar_g": 2.6 } },
  { "id": "3", "name": "פלפל אדום (גמבה)", "unit_name": "יחידה בינונית", "unit_weight": 150, "per100g": { "kcal": 31, "protein": 1, "carbs": 6, "fat": 0.3 }, "micros": { "sodium_mg": 4, "calcium_mg": 7, "sugar_g": 4.2 } },
  { "id": "4", "name": "גזר", "unit_name": "יחידה בינונית", "unit_weight": 100, "per100g": { "kcal": 41, "protein": 0.9, "carbs": 9.6, "fat": 0.2 }, "micros": { "sodium_mg": 69, "calcium_mg": 33, "sugar_g": 4.7 } },
  { "id": "5", "name": "בצל לבן", "unit_name": "יחידה בינונית", "unit_weight": 110, "per100g": { "kcal": 40, "protein": 1.1, "carbs": 9.3, "fat": 0.1 }, "micros": { "sodium_mg": 4, "calcium_mg": 23, "sugar_g": 4.2 } },
  { "id": "6", "name": "חסה (עלים)", "unit_name": "ראש חסה", "unit_weight": 300, "per100g": { "kcal": 15, "protein": 1.4, "carbs": 2.9, "fat": 0.2 }, "micros": { "sodium_mg": 28, "calcium_mg": 36, "sugar_g": 0.8 } },
  { "id": "7", "name": "ברוקולי (מבושל)", "unit_name": "כוס פרחים", "unit_weight": 150, "per100g": { "kcal": 35, "protein": 2.4, "carbs": 7.2, "fat": 0.4 }, "micros": { "sodium_mg": 41, "calcium_mg": 40, "sugar_g": 1.4 } },
  { "id": "8", "name": "כרובית (מבושלת)", "unit_name": "כוס פרחים", "unit_weight": 125, "per100g": { "kcal": 23, "protein": 1.8, "carbs": 4.1, "fat": 0.5 }, "micros": { "sodium_mg": 15, "calcium_mg": 16, "sugar_g": 2 } },
  { "id": "9", "name": "קישוא (מבושל)", "unit_name": "יחידה בינונית", "unit_weight": 200, "per100g": { "kcal": 17, "protein": 1.2, "carbs": 3.1, "fat": 0.3 }, "micros": { "sodium_mg": 8, "calcium_mg": 16, "sugar_g": 1.7 } },
  { "id": "10", "name": "חציל (קלוּי)", "unit_name": "חציל בינוני", "unit_weight": 250, "per100g": { "kcal": 25, "protein": 1, "carbs": 6, "fat": 0.2 }, "micros": { "sodium_mg": 2, "calcium_mg": 9, "sugar_g": 3.5 } },
  { "id": "11", "name": "תירס (גרגרים)", "unit_name": "כוס", "unit_weight": 160, "per100g": { "kcal": 86, "protein": 3.2, "carbs": 19, "fat": 1.2 }, "micros": { "sodium_mg": 15, "calcium_mg": 2, "sugar_g": 6 } },
  { "id": "12", "name": "אפונה (מבושלת)", "unit_name": "כוס", "unit_weight": 160, "per100g": { "kcal": 81, "protein": 5.4, "carbs": 14, "fat": 0.4 }, "micros": { "sodium_mg": 5, "calcium_mg": 25, "sugar_g": 5.7 } },
  { "id": "13", "name": "שעועית ירוקה (מבושלת)", "unit_name": "כוס", "unit_weight": 125, "per100g": { "kcal": 35, "protein": 1.9, "carbs": 7.9, "fat": 0.3 }, "micros": { "sodium_mg": 6, "calcium_mg": 37, "sugar_g": 1.4 } },
  { "id": "14", "name": "פטריות (טריות)", "unit_name": "חבילה/סלסלה", "unit_weight": 250, "per100g": { "kcal": 22, "protein": 3.1, "carbs": 3.3, "fat": 0.3 }, "micros": { "sodium_mg": 5, "calcium_mg": 3, "sugar_g": 2 } },
  { "id": "15", "name": "תרד (טרי)", "unit_name": "חבילה", "unit_weight": 200, "per100g": { "kcal": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.4 }, "micros": { "sodium_mg": 79, "calcium_mg": 99, "sugar_g": 0.4 } },
  { "id": "16", "name": "בטטה (אפויה)", "unit_name": "יחידה בינונית", "unit_weight": 150, "per100g": { "kcal": 90, "protein": 2, "carbs": 21, "fat": 0.1 }, "micros": { "sodium_mg": 36, "calcium_mg": 38, "sugar_g": 6.5 } },
  { "id": "17", "name": "תפוח אדמה (אפוי)", "unit_name": "יחידה בינונית", "unit_weight": 170, "per100g": { "kcal": 93, "protein": 2.5, "carbs": 21, "fat": 0.1 }, "micros": { "sodium_mg": 10, "calcium_mg": 15, "sugar_g": 1.2 } },
  { "id": "18", "name": "דלעת (מבושלת)", "unit_name": "כוס קוביות", "unit_weight": 200, "per100g": { "kcal": 20, "protein": 0.7, "carbs": 4.9, "fat": 0.1 }, "micros": { "sodium_mg": 1, "calcium_mg": 15, "sugar_g": 2 } },
  { "id": "19", "name": "כרוב לבן (טרי)", "unit_name": "כוס חתוך", "unit_weight": 70, "per100g": { "kcal": 25, "protein": 1.3, "carbs": 5.8, "fat": 0.1 }, "micros": { "sodium_mg": 18, "calcium_mg": 40, "sugar_g": 3.2 } },
  { "id": "20", "name": "סלק (מבושל)", "unit_name": "יחידה", "unit_weight": 100, "per100g": { "kcal": 44, "protein": 1.7, "carbs": 10, "fat": 0.2 }, "micros": { "sodium_mg": 77, "calcium_mg": 16, "sugar_g": 8 } },

  // --- פירות ---
  { "id": "21", "name": "תפוח עץ", "unit_name": "יחידה בינונית", "unit_weight": 180, "per100g": { "kcal": 52, "protein": 0.3, "carbs": 14, "fat": 0.2 }, "micros": { "sodium_mg": 1, "calcium_mg": 6, "sugar_g": 10 } },
  { "id": "22", "name": "בננה", "unit_name": "יחידה בינונית", "unit_weight": 120, "per100g": { "kcal": 89, "protein": 1.1, "carbs": 23, "fat": 0.3 }, "micros": { "sodium_mg": 1, "calcium_mg": 5, "sugar_g": 12 } },
  { "id": "23", "name": "תפוז", "unit_name": "יחידה בינונית", "unit_weight": 130, "per100g": { "kcal": 47, "protein": 0.9, "carbs": 12, "fat": 0.1 }, "micros": { "sodium_mg": 0, "calcium_mg": 40, "sugar_g": 9 } },
  { "id": "24", "name": "אגס", "unit_name": "יחידה בינונית", "unit_weight": 170, "per100g": { "kcal": 57, "protein": 0.4, "carbs": 15, "fat": 0.1 }, "micros": { "sodium_mg": 1, "calcium_mg": 9, "sugar_g": 10 } },
  { "id": "25", "name": "אפרסק", "unit_name": "יחידה בינונית", "unit_weight": 150, "per100g": { "kcal": 39, "protein": 0.9, "carbs": 10, "fat": 0.3 }, "micros": { "sodium_mg": 0, "calcium_mg": 6, "sugar_g": 8 } },
  { "id": "26", "name": "שזיף", "unit_name": "יחידה", "unit_weight": 65, "per100g": { "kcal": 46, "protein": 0.7, "carbs": 11, "fat": 0.3 }, "micros": { "sodium_mg": 0, "calcium_mg": 6, "sugar_g": 10 } },
  { "id": "27", "name": "ענבים", "unit_name": "כוס", "unit_weight": 150, "per100g": { "kcal": 69, "protein": 0.7, "carbs": 18, "fat": 0.2 }, "micros": { "sodium_mg": 2, "calcium_mg": 10, "sugar_g": 15 } },
  { "id": "28", "name": "אבטיח", "unit_name": "פלח גדול", "unit_weight": 300, "per100g": { "kcal": 30, "protein": 0.6, "carbs": 8, "fat": 0.2 }, "micros": { "sodium_mg": 1, "calcium_mg": 7, "sugar_g": 6 } },
  { "id": "29", "name": "מלון", "unit_name": "פלח בינוני", "unit_weight": 200, "per100g": { "kcal": 34, "protein": 0.8, "carbs": 8, "fat": 0.2 }, "micros": { "sodium_mg": 16, "calcium_mg": 9, "sugar_g": 8 } },
  { "id": "30", "name": "תות שדה", "unit_name": "כוס", "unit_weight": 150, "per100g": { "kcal": 32, "protein": 0.7, "carbs": 7.7, "fat": 0.3 }, "micros": { "sodium_mg": 1, "calcium_mg": 16, "sugar_g": 4.9 } },
  { "id": "31", "name": "אוכמניות", "unit_name": "חבילה קטנה", "unit_weight": 125, "per100g": { "kcal": 57, "protein": 0.7, "carbs": 14, "fat": 0.3 }, "micros": { "sodium_mg": 1, "calcium_mg": 6, "sugar_g": 10 } },
  { "id": "32", "name": "אננס", "unit_name": "כוס קוביות", "unit_weight": 160, "per100g": { "kcal": 50, "protein": 0.5, "carbs": 13, "fat": 0.1 }, "micros": { "sodium_mg": 1, "calcium_mg": 13, "sugar_g": 10 } },
  { "id": "33", "name": "מנגו", "unit_name": "יחידה בינונית", "unit_weight": 200, "per100g": { "kcal": 60, "protein": 0.8, "carbs": 15, "fat": 0.4 }, "micros": { "sodium_mg": 1, "calcium_mg": 11, "sugar_g": 14 } },
  { "id": "34", "name": "קיווי", "unit_name": "יחידה", "unit_weight": 75, "per100g": { "kcal": 61, "protein": 1.1, "carbs": 15, "fat": 0.5 }, "micros": { "sodium_mg": 3, "calcium_mg": 34, "sugar_g": 9 } },
  { "id": "35", "name": "קלמנטינה", "unit_name": "יחידה", "unit_weight": 80, "per100g": { "kcal": 53, "protein": 0.8, "carbs": 13, "fat": 0.3 }, "micros": { "sodium_mg": 2, "calcium_mg": 37, "sugar_g": 9 } },
  { "id": "36", "name": "אשכולית", "unit_name": "חצי אשכולית", "unit_weight": 120, "per100g": { "kcal": 42, "protein": 0.8, "carbs": 11, "fat": 0.1 }, "micros": { "sodium_mg": 0, "calcium_mg": 22, "sugar_g": 7 } },
  { "id": "37", "name": "תמר (מג'הול)", "unit_name": "יחידה", "unit_weight": 20, "per100g": { "kcal": 277, "protein": 1.8, "carbs": 75, "fat": 0.2 }, "micros": { "sodium_mg": 1, "calcium_mg": 64, "sugar_g": 66 } },
  { "id": "38", "name": "צימוקים", "unit_name": "כף", "unit_weight": 10, "per100g": { "kcal": 299, "protein": 3.1, "carbs": 79, "fat": 0.5 }, "micros": { "sodium_mg": 11, "calcium_mg": 50, "sugar_g": 59 } },
  { "id": "39", "name": "רימון (גרגרים)", "unit_name": "חצי כוס", "unit_weight": 80, "per100g": { "kcal": 83, "protein": 1.7, "carbs": 19, "fat": 1.2 }, "micros": { "sodium_mg": 3, "calcium_mg": 10, "sugar_g": 14 } },
  { "id": "40", "name": "לימון (סחוט)", "unit_name": "יחידה", "unit_weight": 50, "per100g": { "kcal": 29, "protein": 1.1, "carbs": 9, "fat": 0.3 }, "micros": { "sodium_mg": 2, "calcium_mg": 26, "sugar_g": 2.5 } },

  // --- חלבון מן החי ---
  { "id": "41", "name": "חזה עוף (צלוי/מבושל)", "unit_name": "חזה שלם", "unit_weight": 150, "per100g": { "kcal": 165, "protein": 31, "carbs": 0, "fat": 3.6 }, "micros": { "sodium_mg": 74, "calcium_mg": 15, "sugar_g": 0 } },
  { "id": "42", "name": "פרגית (צלוי)", "unit_name": "סטייק פרגית", "unit_weight": 150, "per100g": { "kcal": 210, "protein": 24, "carbs": 0, "fat": 12 }, "micros": { "sodium_mg": 90, "calcium_mg": 12, "sugar_g": 0 } },
  { "id": "43", "name": "שוק עוף (מבושל, ללא עור)", "unit_name": "יחידה", "unit_weight": 100, "per100g": { "kcal": 170, "protein": 25, "carbs": 0, "fat": 8 }, "micros": { "sodium_mg": 90, "calcium_mg": 12, "sugar_g": 0 } },
  { "id": "44", "name": "כנפיים (ברוטב)", "unit_name": "יחידה", "unit_weight": 40, "per100g": { "kcal": 290, "protein": 18, "carbs": 5, "fat": 20 }, "micros": { "sodium_mg": 400, "calcium_mg": 15, "sugar_g": 4 } },
  { "id": "45", "name": "שניצל (מטוגן)", "unit_name": "יחידה בינונית", "unit_weight": 150, "per100g": { "kcal": 280, "protein": 19, "carbs": 14, "fat": 16 }, "micros": { "sodium_mg": 450, "calcium_mg": 20, "sugar_g": 1 } },
  { "id": "46", "name": "שניצל תירס (טבעול)", "unit_name": "יחידה", "unit_weight": 85, "per100g": { "kcal": 220, "protein": 9, "carbs": 24, "fat": 9 }, "micros": { "sodium_mg": 400, "calcium_mg": 15, "sugar_g": 2 } },
  { "id": "47", "name": "בשר טחון (בקר רזה)", "unit_name": "מנה", "unit_weight": 150, "per100g": { "kcal": 215, "protein": 26, "carbs": 0, "fat": 12 }, "micros": { "sodium_mg": 70, "calcium_mg": 20, "sugar_g": 0 } },
  { "id": "48", "name": "סטייק אנטריקוט", "unit_name": "סטייק", "unit_weight": 250, "per100g": { "kcal": 270, "protein": 23, "carbs": 0, "fat": 20 }, "micros": { "sodium_mg": 60, "calcium_mg": 12, "sugar_g": 0 } },
  { "id": "49", "name": "המבורגר (קציצה)", "unit_name": "יחידה", "unit_weight": 200, "per100g": { "kcal": 250, "protein": 18, "carbs": 1, "fat": 19 }, "micros": { "sodium_mg": 550, "calcium_mg": 18, "sugar_g": 0 } },
  { "id": "50", "name": "קבב", "unit_name": "שיפוד/יחידה", "unit_weight": 80, "per100g": { "kcal": 260, "protein": 16, "carbs": 2, "fat": 21 }, "micros": { "sodium_mg": 600, "calcium_mg": 15, "sugar_g": 0 } },
  { "id": "51", "name": "סלמון (אפוי)", "unit_name": "פילה/נתח", "unit_weight": 180, "per100g": { "kcal": 208, "protein": 20, "carbs": 0, "fat": 13 }, "micros": { "sodium_mg": 60, "calcium_mg": 15, "sugar_g": 0 } },
  { "id": "52", "name": "דג לבן/אמנון (אפוי)", "unit_name": "פילה", "unit_weight": 150, "per100g": { "kcal": 128, "protein": 26, "carbs": 0, "fat": 2.5 }, "micros": { "sodium_mg": 56, "calcium_mg": 14, "sugar_g": 0 } },
  { "id": "53", "name": "טונה בשמן (מסונן)", "unit_name": "קופסה", "unit_weight": 112, "per100g": { "kcal": 190, "protein": 26, "carbs": 0, "fat": 9 }, "micros": { "sodium_mg": 380, "calcium_mg": 14, "sugar_g": 0 } },
  { "id": "54", "name": "טונה במים (מסונן)", "unit_name": "קופסה", "unit_weight": 112, "per100g": { "kcal": 116, "protein": 26, "carbs": 0, "fat": 0.8 }, "micros": { "sodium_mg": 300, "calcium_mg": 14, "sugar_g": 0 } },
  { "id": "55", "name": "סרדינים", "unit_name": "קופסה", "unit_weight": 100, "per100g": { "kcal": 208, "protein": 24, "carbs": 0, "fat": 11 }, "micros": { "sodium_mg": 500, "calcium_mg": 380, "sugar_g": 0 } },
  { "id": "56", "name": "ביצה קשה (L)", "unit_name": "יחידה", "unit_weight": 60, "per100g": { "kcal": 155, "protein": 12.6, "carbs": 1.1, "fat": 10.6 }, "micros": { "sodium_mg": 124, "calcium_mg": 50, "sugar_g": 1.1 } },
  { "id": "57", "name": "חביתה (מ-2 ביצים)", "unit_name": "מנה", "unit_weight": 120, "per100g": { "kcal": 196, "protein": 11, "carbs": 0.8, "fat": 15 }, "micros": { "sodium_mg": 250, "calcium_mg": 90, "sugar_g": 1 } },
  { "id": "58", "name": "חלבון ביצה (לבן)", "unit_name": "יחידה", "unit_weight": 35, "per100g": { "kcal": 52, "protein": 11, "carbs": 0.7, "fat": 0.2 }, "micros": { "sodium_mg": 166, "calcium_mg": 7, "sugar_g": 0.7 } },
  { "id": "59", "name": "פסטרמה (הודו)", "unit_name": "פרוסה", "unit_weight": 20, "per100g": { "kcal": 100, "protein": 18, "carbs": 2, "fat": 2 }, "micros": { "sodium_mg": 850, "calcium_mg": 10, "sugar_g": 1 } },
  { "id": "60", "name": "נקניק סלמי", "unit_name": "פרוסה", "unit_weight": 15, "per100g": { "kcal": 400, "protein": 20, "carbs": 2, "fat": 35 }, "micros": { "sodium_mg": 1200, "calcium_mg": 10, "sugar_g": 0.5 } },

  // --- מוצרי חלב ותחליפים ---
  { "id": "61", "name": "קוטג' 5%", "unit_name": "גביע", "unit_weight": 250, "per100g": { "kcal": 94, "protein": 11, "carbs": 2, "fat": 5 }, "micros": { "sodium_mg": 380, "calcium_mg": 100, "sugar_g": 2 } },
  { "id": "62", "name": "גבינה לבנה 5%", "unit_name": "גביע", "unit_weight": 250, "per100g": { "kcal": 95, "protein": 9.5, "carbs": 3.5, "fat": 5 }, "micros": { "sodium_mg": 300, "calcium_mg": 105, "sugar_g": 3.5 } },
  { "id": "63", "name": "גבינה צהובה 28%", "unit_name": "פרוסה", "unit_weight": 28, "per100g": { "kcal": 350, "protein": 24, "carbs": 0.5, "fat": 28 }, "micros": { "sodium_mg": 680, "calcium_mg": 800, "sugar_g": 0 } },
  { "id": "64", "name": "גבינה צהובה 9%", "unit_name": "פרוסה", "unit_weight": 25, "per100g": { "kcal": 205, "protein": 29, "carbs": 0.5, "fat": 9 }, "micros": { "sodium_mg": 700, "calcium_mg": 850, "sugar_g": 0 } },
  { "id": "65", "name": "בולגרית 5%", "unit_name": "קוביה/פרוסה", "unit_weight": 50, "per100g": { "kcal": 115, "protein": 12, "carbs": 3, "fat": 5 }, "micros": { "sodium_mg": 900, "calcium_mg": 350, "sugar_g": 2 } },
  { "id": "66", "name": "מוצרלה (מגורדת)", "unit_name": "חופן/כף", "unit_weight": 30, "per100g": { "kcal": 300, "protein": 22, "carbs": 2, "fat": 22 }, "micros": { "sodium_mg": 600, "calcium_mg": 500, "sugar_g": 1 } },
  { "id": "67", "name": "ריקוטה 5%", "unit_name": "כף גדושה", "unit_weight": 30, "per100g": { "kcal": 105, "protein": 7, "carbs": 4, "fat": 5 }, "micros": { "sodium_mg": 100, "calcium_mg": 550, "sugar_g": 3 } },
  { "id": "68", "name": "יוגורט ביו 3%", "unit_name": "גביע", "unit_weight": 200, "per100g": { "kcal": 65, "protein": 3.8, "carbs": 5, "fat": 3 }, "micros": { "sodium_mg": 50, "calcium_mg": 150, "sugar_g": 5 } },
  { "id": "69", "name": "יוגורט יווני 0%", "unit_name": "גביע", "unit_weight": 150, "per100g": { "kcal": 59, "protein": 10, "carbs": 3.6, "fat": 0.4 }, "micros": { "sodium_mg": 40, "calcium_mg": 110, "sugar_g": 3.6 } },
  { "id": "70", "name": "יוגורט חלבון (Go/Pro)", "unit_name": "גביע", "unit_weight": 200, "per100g": { "kcal": 65, "protein": 10, "carbs": 4.5, "fat": 0.8 }, "micros": { "sodium_mg": 60, "calcium_mg": 120, "sugar_g": 4 } },
  { "id": "71", "name": "מעדן שוקולד (Milky וכו')", "unit_name": "גביע", "unit_weight": 133, "per100g": { "kcal": 160, "protein": 3, "carbs": 22, "fat": 6 }, "micros": { "sodium_mg": 80, "calcium_mg": 100, "sugar_g": 18 } },
  { "id": "72", "name": "חלב 3%", "unit_name": "כוס", "unit_weight": 200, "per100g": { "kcal": 60, "protein": 3.2, "carbs": 4.8, "fat": 3 }, "micros": { "sodium_mg": 50, "calcium_mg": 120, "sugar_g": 4.8 } },
  { "id": "73", "name": "חלב 1%", "unit_name": "כוס", "unit_weight": 200, "per100g": { "kcal": 43, "protein": 3.4, "carbs": 4.9, "fat": 1 }, "micros": { "sodium_mg": 50, "calcium_mg": 125, "sugar_g": 4.9 } },
  { "id": "74", "name": "חלב סויה (רגיל)", "unit_name": "כוס", "unit_weight": 200, "per100g": { "kcal": 45, "protein": 3.5, "carbs": 2.5, "fat": 1.8 }, "micros": { "sodium_mg": 40, "calcium_mg": 120, "sugar_g": 2 } },
  { "id": "75", "name": "חלב שקדים (ללא סוכר)", "unit_name": "כוס", "unit_weight": 200, "per100g": { "kcal": 15, "protein": 0.5, "carbs": 0.5, "fat": 1.2 }, "micros": { "sodium_mg": 60, "calcium_mg": 150, "sugar_g": 0 } },
  { "id": "76", "name": "חמאה", "unit_name": "כפית", "unit_weight": 5, "per100g": { "kcal": 717, "protein": 0.8, "carbs": 0.1, "fat": 81 }, "micros": { "sodium_mg": 10, "calcium_mg": 24, "sugar_g": 0 } },
  { "id": "77", "name": "שמנת מתוקה 38%", "unit_name": "מיכל קטן", "unit_weight": 250, "per100g": { "kcal": 360, "protein": 2, "carbs": 3, "fat": 38 }, "micros": { "sodium_mg": 30, "calcium_mg": 80, "sugar_g": 3 } },
  { "id": "78", "name": "טופו (גולמי)", "unit_name": "שליש חבילה", "unit_weight": 100, "per100g": { "kcal": 140, "protein": 15, "carbs": 2, "fat": 8 }, "micros": { "sodium_mg": 10, "calcium_mg": 350, "sugar_g": 0.5 } },
  { "id": "79", "name": "סייטן", "unit_name": "מנה", "unit_weight": 100, "per100g": { "kcal": 120, "protein": 25, "carbs": 4, "fat": 1.5 }, "micros": { "sodium_mg": 150, "calcium_mg": 30, "sugar_g": 0 } },
  { "id": "80", "name": "שייק חלבון (אבקה)", "unit_name": "סקופ", "unit_weight": 30, "per100g": { "kcal": 380, "protein": 75, "carbs": 10, "fat": 5 }, "micros": { "sodium_mg": 200, "calcium_mg": 100, "sugar_g": 2 } },

  // --- דגנים ופחמימות ---
  { "id": "81", "name": "אורז לבן (מבושל)", "unit_name": "כוס", "unit_weight": 150, "per100g": { "kcal": 130, "protein": 2.7, "carbs": 28, "fat": 0.3 }, "micros": { "sodium_mg": 2, "calcium_mg": 10, "sugar_g": 0.1 } },
  { "id": "82", "name": "אורז מלא (מבושל)", "unit_name": "כוס", "unit_weight": 150, "per100g": { "kcal": 110, "protein": 2.6, "carbs": 23, "fat": 0.9 }, "micros": { "sodium_mg": 1, "calcium_mg": 10, "sugar_g": 0.2 } },
  { "id": "83", "name": "פסטה (מבושלת)", "unit_name": "כוס", "unit_weight": 140, "per100g": { "kcal": 158, "protein": 5.8, "carbs": 31, "fat": 0.9 }, "micros": { "sodium_mg": 1, "calcium_mg": 7, "sugar_g": 0.5 } },
  { "id": "84", "name": "פתיתים (מבושל)", "unit_name": "כוס", "unit_weight": 150, "per100g": { "kcal": 150, "protein": 4.5, "carbs": 30, "fat": 1 }, "micros": { "sodium_mg": 5, "calcium_mg": 6, "sugar_g": 0 } },
  { "id": "85", "name": "קוסקוס (מבושל)", "unit_name": "כוס", "unit_weight": 150, "per100g": { "kcal": 112, "protein": 3.8, "carbs": 23, "fat": 0.2 }, "micros": { "sodium_mg": 5, "calcium_mg": 8, "sugar_g": 0 } },
  { "id": "86", "name": "קינואה (מבושלת)", "unit_name": "כוס", "unit_weight": 185, "per100g": { "kcal": 120, "protein": 4.4, "carbs": 21, "fat": 1.9 }, "micros": { "sodium_mg": 7, "calcium_mg": 17, "sugar_g": 0.9 } },
  { "id": "87", "name": "בורגול (מבושל)", "unit_name": "כוס", "unit_weight": 180, "per100g": { "kcal": 83, "protein": 3, "carbs": 18, "fat": 0.2 }, "micros": { "sodium_mg": 5, "calcium_mg": 10, "sugar_g": 0.1 } },
  { "id": "88", "name": "לחם אחיד/לבן", "unit_name": "פרוסה", "unit_weight": 30, "per100g": { "kcal": 250, "protein": 8, "carbs": 48, "fat": 2 }, "micros": { "sodium_mg": 500, "calcium_mg": 20, "sugar_g": 2 } },
  { "id": "89", "name": "לחם מלא", "unit_name": "פרוסה", "unit_weight": 35, "per100g": { "kcal": 240, "protein": 11, "carbs": 43, "fat": 3 }, "micros": { "sodium_mg": 450, "calcium_mg": 30, "sugar_g": 2 } },
  { "id": "90", "name": "לחם קל", "unit_name": "פרוסה", "unit_weight": 25, "per100g": { "kcal": 180, "protein": 10, "carbs": 35, "fat": 1 }, "micros": { "sodium_mg": 400, "calcium_mg": 20, "sugar_g": 1 } },
  { "id": "91", "name": "חלה", "unit_name": "פרוסה עבה", "unit_weight": 50, "per100g": { "kcal": 280, "protein": 8, "carbs": 50, "fat": 5 }, "micros": { "sodium_mg": 400, "calcium_mg": 25, "sugar_g": 5 } },
  { "id": "92", "name": "פיתה", "unit_name": "יחידה", "unit_weight": 100, "per100g": { "kcal": 240, "protein": 8, "carbs": 50, "fat": 1 }, "micros": { "sodium_mg": 520, "calcium_mg": 20, "sugar_g": 1 } },
  { "id": "93", "name": "פיתה כוסמין", "unit_name": "יחידה", "unit_weight": 100, "per100g": { "kcal": 220, "protein": 10, "carbs": 45, "fat": 2 }, "micros": { "sodium_mg": 450, "calcium_mg": 25, "sugar_g": 1 } },
  { "id": "94", "name": "לחמניה", "unit_name": "יחידה", "unit_weight": 90, "per100g": { "kcal": 270, "protein": 8, "carbs": 52, "fat": 3 }, "micros": { "sodium_mg": 480, "calcium_mg": 20, "sugar_g": 5 } },
  { "id": "95", "name": "טורטיה", "unit_name": "יחידה", "unit_weight": 50, "per100g": { "kcal": 300, "protein": 8, "carbs": 50, "fat": 7 }, "micros": { "sodium_mg": 600, "calcium_mg": 60, "sugar_g": 2 } },
  { "id": "96", "name": "פריכית אורז", "unit_name": "יחידה", "unit_weight": 8, "per100g": { "kcal": 380, "protein": 7, "carbs": 80, "fat": 3 }, "micros": { "sodium_mg": 200, "calcium_mg": 10, "sugar_g": 0 } },
  { "id": "97", "name": "שיבולת שועל (קוואקר)", "unit_name": "כף גדושה", "unit_weight": 10, "per100g": { "kcal": 389, "protein": 16.9, "carbs": 66, "fat": 6.9 }, "micros": { "sodium_mg": 2, "calcium_mg": 54, "sugar_g": 0 } },
  { "id": "98", "name": "גרנולה", "unit_name": "כף גדושה", "unit_weight": 15, "per100g": { "kcal": 450, "protein": 10, "carbs": 65, "fat": 18 }, "micros": { "sodium_mg": 50, "calcium_mg": 60, "sugar_g": 25 } },
  { "id": "99", "name": "קורנפלקס (תלמה)", "unit_name": "מנה (כוס)", "unit_weight": 30, "per100g": { "kcal": 370, "protein": 7, "carbs": 84, "fat": 0.5 }, "micros": { "sodium_mg": 550, "calcium_mg": 10, "sugar_g": 8 } },
  { "id": "100", "name": "כריות (דגני בוקר)", "unit_name": "מנה (כוס)", "unit_weight": 40, "per100g": { "kcal": 450, "protein": 6, "carbs": 70, "fat": 16 }, "micros": { "sodium_mg": 300, "calcium_mg": 50, "sugar_g": 40 } },
  { "id": "101", "name": "שעועית לבנה ברוטב", "unit_name": "כוס", "unit_weight": 200, "per100g": { "kcal": 95, "protein": 5, "carbs": 16, "fat": 0.5 }, "micros": { "sodium_mg": 300, "calcium_mg": 40, "sugar_g": 3 } },
  { "id": "102", "name": "עדשים (מבושל)", "unit_name": "כוס", "unit_weight": 200, "per100g": { "kcal": 116, "protein": 9, "carbs": 20, "fat": 0.4 }, "micros": { "sodium_mg": 2, "calcium_mg": 19, "sugar_g": 0 } },
  { "id": "103", "name": "חומוס גרגירים", "unit_name": "כוס", "unit_weight": 160, "per100g": { "kcal": 164, "protein": 9, "carbs": 27, "fat": 2.6 }, "micros": { "sodium_mg": 7, "calcium_mg": 49, "sugar_g": 0 } },
  { "id": "104", "name": "אפונה ירוקה (יבשה מבושלת)", "unit_name": "כוס", "unit_weight": 200, "per100g": { "kcal": 118, "protein": 8, "carbs": 21, "fat": 0.4 }, "micros": { "sodium_mg": 5, "calcium_mg": 20, "sugar_g": 0 } },
  { "id": "105", "name": "פולי סויה (אדממה)", "unit_name": "כוס (קלופים)", "unit_weight": 150, "per100g": { "kcal": 122, "protein": 11, "carbs": 10, "fat": 5 }, "micros": { "sodium_mg": 6, "calcium_mg": 60, "sugar_g": 2 } },

  // --- אגוזים, שומנים וממרחים ---
  { "id": "106", "name": "שמן זית", "unit_name": "כף", "unit_weight": 10, "per100g": { "kcal": 884, "protein": 0, "carbs": 0, "fat": 100 }, "micros": { "sodium_mg": 2, "calcium_mg": 1, "sugar_g": 0 } },
  { "id": "107", "name": "טחינה גולמית", "unit_name": "כף", "unit_weight": 15, "per100g": { "kcal": 595, "protein": 17, "carbs": 21, "fat": 53 }, "micros": { "sodium_mg": 12, "calcium_mg": 426, "sugar_g": 1 } },
  { "id": "108", "name": "טחינה מוכנה", "unit_name": "כף", "unit_weight": 15, "per100g": { "kcal": 250, "protein": 8, "carbs": 10, "fat": 20 }, "micros": { "sodium_mg": 300, "calcium_mg": 150, "sugar_g": 0.5 } },
  { "id": "109", "name": "חומוס (סלט קנוי)", "unit_name": "כף גדושה", "unit_weight": 25, "per100g": { "kcal": 300, "protein": 8, "carbs": 14, "fat": 25 }, "micros": { "sodium_mg": 480, "calcium_mg": 40, "sugar_g": 1 } },
  { "id": "110", "name": "אבוקדו", "unit_name": "חצי אבוקדו", "unit_weight": 75, "per100g": { "kcal": 160, "protein": 2, "carbs": 8.5, "fat": 15 }, "micros": { "sodium_mg": 7, "calcium_mg": 12, "sugar_g": 0.7 } },
  { "id": "111", "name": "שקדים", "unit_name": "חופן (10 יח')", "unit_weight": 12, "per100g": { "kcal": 579, "protein": 21, "carbs": 22, "fat": 49 }, "micros": { "sodium_mg": 1, "calcium_mg": 269, "sugar_g": 4 } },
  { "id": "112", "name": "אגוזי מלך", "unit_name": "חופן (4-5 חצאים)", "unit_weight": 10, "per100g": { "kcal": 654, "protein": 15, "carbs": 14, "fat": 65 }, "micros": { "sodium_mg": 2, "calcium_mg": 98, "sugar_g": 2.6 } },
  { "id": "113", "name": "בוטנים", "unit_name": "חופן", "unit_weight": 15, "per100g": { "kcal": 567, "protein": 26, "carbs": 16, "fat": 49 }, "micros": { "sodium_mg": 18, "calcium_mg": 92, "sugar_g": 4 } },
  { "id": "114", "name": "חמאת בוטנים (טבעית)", "unit_name": "כף", "unit_weight": 15, "per100g": { "kcal": 590, "protein": 25, "carbs": 20, "fat": 50 }, "micros": { "sodium_mg": 10, "calcium_mg": 50, "sugar_g": 9 } },
  { "id": "115", "name": "קשיו", "unit_name": "חופן", "unit_weight": 15, "per100g": { "kcal": 553, "protein": 18, "carbs": 30, "fat": 44 }, "micros": { "sodium_mg": 12, "calcium_mg": 37, "sugar_g": 6 } },
  { "id": "116", "name": "גרעיני חמניה (לא קלוי)", "unit_name": "כף", "unit_weight": 10, "per100g": { "kcal": 584, "protein": 21, "carbs": 20, "fat": 51 }, "micros": { "sodium_mg": 9, "calcium_mg": 78, "sugar_g": 2 } },
  { "id": "117", "name": "זרעי צ'יה", "unit_name": "כף", "unit_weight": 10, "per100g": { "kcal": 486, "protein": 17, "carbs": 42, "fat": 31 }, "micros": { "sodium_mg": 16, "calcium_mg": 631, "sugar_g": 0 } },
  { "id": "118", "name": "מיונז", "unit_name": "כפית", "unit_weight": 5, "per100g": { "kcal": 680, "protein": 1, "carbs": 1, "fat": 75 }, "micros": { "sodium_mg": 600, "calcium_mg": 10, "sugar_g": 1 } },
  { "id": "119", "name": "מיונז לייט", "unit_name": "כפית", "unit_weight": 5, "per100g": { "kcal": 290, "protein": 0.5, "carbs": 8, "fat": 28 }, "micros": { "sodium_mg": 700, "calcium_mg": 10, "sugar_g": 3 } },
  { "id": "120", "name": "קטשופ", "unit_name": "כף", "unit_weight": 15, "per100g": { "kcal": 100, "protein": 1, "carbs": 25, "fat": 0.1 }, "micros": { "sodium_mg": 900, "calcium_mg": 15, "sugar_g": 22 } },

  // --- חטיפים ומתוקים ---
  { "id": "121", "name": "שוקולד פרה", "unit_name": "שורה/4 קוביות", "unit_weight": 20, "per100g": { "kcal": 530, "protein": 7, "carbs": 58, "fat": 31 }, "micros": { "sodium_mg": 80, "calcium_mg": 190, "sugar_g": 55 } },
  { "id": "122", "name": "במבה", "unit_name": "שקית קטנה", "unit_weight": 25, "per100g": { "kcal": 534, "protein": 17, "carbs": 40, "fat": 34 }, "micros": { "sodium_mg": 400, "calcium_mg": 20, "sugar_g": 2 } },
  { "id": "123", "name": "ביסלי", "unit_name": "שקית קטנה", "unit_weight": 35, "per100g": { "kcal": 490, "protein": 8, "carbs": 65, "fat": 23 }, "micros": { "sodium_mg": 800, "calcium_mg": 20, "sugar_g": 3 } },
  { "id": "124", "name": "צ'יפס (תפוצ'יפס)", "unit_name": "שקית אישית", "unit_weight": 50, "per100g": { "kcal": 540, "protein": 6, "carbs": 53, "fat": 34 }, "micros": { "sodium_mg": 550, "calcium_mg": 15, "sugar_g": 1 } },
  { "id": "125", "name": "דוריטוס", "unit_name": "שקית אישית", "unit_weight": 55, "per100g": { "kcal": 510, "protein": 7, "carbs": 60, "fat": 26 }, "micros": { "sodium_mg": 600, "calcium_mg": 100, "sugar_g": 2 } },
  { "id": "126", "name": "בייגלה", "unit_name": "חופן", "unit_weight": 30, "per100g": { "kcal": 380, "protein": 10, "carbs": 75, "fat": 5 }, "micros": { "sodium_mg": 900, "calcium_mg": 20, "sugar_g": 3 } },
  { "id": "127", "name": "עוגיה (שוקולד צ'יפס)", "unit_name": "יחידה", "unit_weight": 15, "per100g": { "kcal": 480, "protein": 5, "carbs": 65, "fat": 24 }, "micros": { "sodium_mg": 300, "calcium_mg": 30, "sugar_g": 35 } },
  { "id": "128", "name": "וופל (רגיל)", "unit_name": "יחידה", "unit_weight": 8, "per100g": { "kcal": 520, "protein": 4, "carbs": 65, "fat": 28 }, "micros": { "sodium_mg": 150, "calcium_mg": 30, "sugar_g": 40 } },
  { "id": "129", "name": "גלידה (שמנת)", "unit_name": "כדור", "unit_weight": 60, "per100g": { "kcal": 220, "protein": 4, "carbs": 25, "fat": 12 }, "micros": { "sodium_mg": 70, "calcium_mg": 100, "sugar_g": 22 } },
  { "id": "130", "name": "ארטיק קרח", "unit_name": "יחידה", "unit_weight": 80, "per100g": { "kcal": 100, "protein": 0, "carbs": 25, "fat": 0 }, "micros": { "sodium_mg": 5, "calcium_mg": 0, "sugar_g": 22 } },
  { "id": "131", "name": "מגנום", "unit_name": "יחידה", "unit_weight": 80, "per100g": { "kcal": 320, "protein": 4, "carbs": 28, "fat": 22 }, "micros": { "sodium_mg": 80, "calcium_mg": 120, "sugar_g": 26 } },
  { "id": "132", "name": "חטיף אנרגיה (גרנולה)", "unit_name": "חטיף", "unit_weight": 30, "per100g": { "kcal": 400, "protein": 8, "carbs": 65, "fat": 12 }, "micros": { "sodium_mg": 150, "calcium_mg": 50, "sugar_g": 25 } },
  { "id": "133", "name": "חטיף חלבון", "unit_name": "חטיף (60 גרם)", "unit_weight": 60, "per100g": { "kcal": 360, "protein": 33, "carbs": 30, "fat": 10 }, "micros": { "sodium_mg": 250, "calcium_mg": 150, "sugar_g": 2 } },
  { "id": "134", "name": "חלבה", "unit_name": "חתיכה קטנה", "unit_weight": 20, "per100g": { "kcal": 550, "protein": 12, "carbs": 50, "fat": 35 }, "micros": { "sodium_mg": 50, "calcium_mg": 100, "sugar_g": 45 } },
  { "id": "135", "name": "דבש", "unit_name": "כפית", "unit_weight": 10, "per100g": { "kcal": 304, "protein": 0.3, "carbs": 82, "fat": 0 }, "micros": { "sodium_mg": 4, "calcium_mg": 6, "sugar_g": 82 } },

  // --- משקאות ואוכל מוכן ---
  { "id": "136", "name": "קוקה קולה", "unit_name": "פחית", "unit_weight": 330, "per100g": { "kcal": 42, "protein": 0, "carbs": 10.6, "fat": 0 }, "micros": { "sodium_mg": 10, "calcium_mg": 2, "sugar_g": 10.6 } },
  { "id": "137", "name": "קולה זירו", "unit_name": "פחית", "unit_weight": 330, "per100g": { "kcal": 0.3, "protein": 0, "carbs": 0, "fat": 0 }, "micros": { "sodium_mg": 10, "calcium_mg": 2, "sugar_g": 0 } },
  { "id": "138", "name": "מיץ תפוזים (טבעי)", "unit_name": "כוס", "unit_weight": 200, "per100g": { "kcal": 45, "protein": 0.7, "carbs": 10, "fat": 0.2 }, "micros": { "sodium_mg": 1, "calcium_mg": 11, "sugar_g": 8.5 } },
  { "id": "139", "name": "קפה הפוך", "unit_name": "כוס", "unit_weight": 200, "per100g": { "kcal": 45, "protein": 2.5, "carbs": 4, "fat": 2 }, "micros": { "sodium_mg": 45, "calcium_mg": 100, "sugar_g": 4 } },
  { "id": "140", "name": "בירה", "unit_name": "בקבוק/פחית", "unit_weight": 330, "per100g": { "kcal": 43, "protein": 0.5, "carbs": 3.6, "fat": 0 }, "micros": { "sodium_mg": 4, "calcium_mg": 4, "sugar_g": 0 } },
  { "id": "141", "name": "יין אדום", "unit_name": "כוס יין", "unit_weight": 150, "per100g": { "kcal": 85, "protein": 0.1, "carbs": 2.6, "fat": 0 }, "micros": { "sodium_mg": 4, "calcium_mg": 8, "sugar_g": 0.6 } },
  { "id": "142", "name": "פיצה", "unit_name": "משולש", "unit_weight": 100, "per100g": { "kcal": 266, "protein": 11, "carbs": 33, "fat": 10 }, "micros": { "sodium_mg": 590, "calcium_mg": 180, "sugar_g": 3 } },
  { "id": "143", "name": "שווארמה בלאפה", "unit_name": "מנה", "unit_weight": 500, "per100g": { "kcal": 230, "protein": 12, "carbs": 28, "fat": 10 }, "micros": { "sodium_mg": 650, "calcium_mg": 40, "sugar_g": 1 } },
  { "id": "144", "name": "שווארמה בפיתה", "unit_name": "מנה", "unit_weight": 350, "per100g": { "kcal": 240, "protein": 13, "carbs": 26, "fat": 11 }, "micros": { "sodium_mg": 600, "calcium_mg": 40, "sugar_g": 1 } },
  { "id": "145", "name": "פלאפל (כדור)", "unit_name": "כדור", "unit_weight": 20, "per100g": { "kcal": 330, "protein": 13, "carbs": 31, "fat": 18 }, "micros": { "sodium_mg": 580, "calcium_mg": 50, "sugar_g": 0.5 } },
  { "id": "146", "name": "פלאפל בפיתה", "unit_name": "מנה מלאה", "unit_weight": 350, "per100g": { "kcal": 250, "protein": 8, "carbs": 35, "fat": 10 }, "micros": { "sodium_mg": 500, "calcium_mg": 60, "sugar_g": 2 } },
  { "id": "147", "name": "סושי (אינסייד אאוט)", "unit_name": "רול (8 יח')", "unit_weight": 200, "per100g": { "kcal": 150, "protein": 5, "carbs": 30, "fat": 1 }, "micros": { "sodium_mg": 400, "calcium_mg": 10, "sugar_g": 2 } },
  { "id": "148", "name": "נודלס מוקפץ (עוף)", "unit_name": "צלחת", "unit_weight": 350, "per100g": { "kcal": 160, "protein": 8, "carbs": 20, "fat": 6 }, "micros": { "sodium_mg": 450, "calcium_mg": 20, "sugar_g": 4 } },
  { "id": "149", "name": "בורקס גבינה", "unit_name": "יחידה קטנה", "unit_weight": 50, "per100g": { "kcal": 380, "protein": 9, "carbs": 36, "fat": 22 }, "micros": { "sodium_mg": 720, "calcium_mg": 120, "sugar_g": 2 } },
  { "id": "150", "name": "מלוואח", "unit_name": "יחידה", "unit_weight": 150, "per100g": { "kcal": 360, "protein": 6, "carbs": 44, "fat": 18 }, "micros": { "sodium_mg": 620, "calcium_mg": 15, "sugar_g": 2 } }
];

// --- 3. עזרים ---
const Utils = {
    $: (id) => document.getElementById(id),
    uuid: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    todayISO: () => new Date().toLocaleDateString('en-CA'),
    fmt: (n) => Math.round(n || 0).toLocaleString()
};

// --- 4. ניהול מצב (State) ---
const State = {
    entries: [],
    currentDate: Utils.todayISO(),
    
    editor: {
        food: null,
        mode: 'grams', // 'grams' or 'units'
        amount: 0
    },

    init() {
        const savedEntries = localStorage.getItem(CONFIG.KEYS.entries);
        this.entries = savedEntries ? JSON.parse(savedEntries) : [];
        Utils.$('datePicker').value = this.currentDate;
    },

    save() {
        localStorage.setItem(CONFIG.KEYS.entries, JSON.stringify(this.entries));
        UI.render();
    },

    addEntry() {
        if (!this.editor.food || this.editor.amount <= 0) {
            alert("אנא הזן כמות חוקית (גדולה מ-0)");
            return;
        }

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
            foodName: this.editor.food.name,
            grams: finalGrams,
            originalInput: this.editor.amount,
            inputType: this.editor.mode
        };

        this.entries.unshift(newEntry);
        this.save();
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
        const daysEntries = State.entries.filter(e => e.date === State.currentDate);
        const totals = this.calculateTotals(daysEntries);
        this.updateDashboard(totals);
        this.renderJournal(daysEntries);
    },

    // --- הפונקציה המתוקנת! ---
    calculateTotals(entries) {
        const t = { kcal: 0 };
        CONFIG.NUTRIENTS.forEach(n => t[n.key] = 0);

        entries.forEach(entry => {
            const food = localFoodDB.find(f => f.id === entry.foodId);
            if (!food) return;

            const ratio = entry.grams / 100;
            
            // חישוב קלוריות
            t.kcal += food.per100g.kcal * ratio;

            // חישוב שאר הערכים (כולל בדיקה ב-micros)
            CONFIG.NUTRIENTS.forEach(n => {
                let val = 0;
                // בדיקה ב-per100g (למשל חלבון/פחמימה)
                if (food.per100g[n.key] !== undefined) {
                    val = food.per100g[n.key];
                } 
                // בדיקה ב-micros (למשל סידן/נתרן) - התיקון כאן!
                else if (food.micros && food.micros[n.key] !== undefined) {
                    val = food.micros[n.key];
                }
                
                t[n.key] += val * ratio;
            });
        });
        return t;
    },

    updateDashboard(totals) {
        Utils.$('dailyCaloriesDisplay').textContent = Utils.fmt(totals.kcal);
        Utils.$('dailyGoalDisplay').textContent = `/ ${Utils.fmt(CONFIG.DAILY_CALORIE_TARGET)} יעד`;
        
        // עדכון מאקרו (חלבון, פחמימה, שומן)
        ['protein', 'carbs', 'fat'].forEach(key => {
            const val = totals[key] || 0;
            const target = CONFIG.NUTRIENTS.find(n => n.key === key).target;
            const percent = Math.min((val / target) * 100, 100);
            
            Utils.$(`val${key.charAt(0).toUpperCase() + key.slice(1)}`).textContent = `${Utils.fmt(val)}g`;
            Utils.$(`bar${key.charAt(0).toUpperCase() + key.slice(1)}`).style.width = `${percent}%`;
        });

        // עדכון מיקרו (ויטמינים) - עם פס ירוק
        const microContainer = Utils.$('microsList');
        const micros = CONFIG.NUTRIENTS.filter(n => !['protein', 'carbs', 'fat'].includes(n.key));
        
        microContainer.innerHTML = micros.map(m => {
            const val = totals[m.key] || 0;
            const pct = Math.min((val / m.target) * 100, 100);
            
            // שימוש קבוע במחלקה הירוקה bg-good
            const statusColor = "bg-good";

            return `
            <div class="micro-item">
                <div class="micro-header">
                    <span>${m.label}</span>
                    <span>${Utils.fmt(val)} / ${m.target} <small>${m.unit}</small></span>
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

    openEditPanel(food) {
        State.editor.food = food;
        State.editor.amount = 0; 
        State.editor.mode = 'grams'; 
        
        Utils.$('editPanel').classList.remove('hidden');
        Utils.$('foodNameDisplay').textContent = food.name;
        Utils.$('foodKcalDisplay').textContent = `${food.per100g.kcal} קלוריות ל-100 גרם`;
        
        const input = Utils.$('amountInput');
        input.value = '';
        input.focus();
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
        Utils.$('amountInput').value = ''; 
        State.editor.amount = 0;
    }
};

// --- 6. אתחול האפליקציה ---
const App = {
    init() {
        State.init();
        this.bindEvents();
        UI.render();
    },

    bindEvents() {
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

        window.stepAmount = (step) => {
            const input = Utils.$('amountInput');
            let current = parseFloat(input.value) || 0;
            let newVal = Math.max(0, current + step);
            input.value = newVal;
            State.editor.amount = newVal;
        };

        Utils.$('amountInput').addEventListener('input', (e) => {
            State.editor.amount = parseFloat(e.target.value) || 0;
        });

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                UI.setToggleState(e.target.dataset.mode);
            });
        });

        Utils.$('addBtn').addEventListener('click', () => State.addEntry());

        Utils.$('datePicker').addEventListener('change', (e) => {
            State.currentDate = e.target.value;
            UI.render();
        });
        
        Utils.$('resetApp').addEventListener('click', () => {
            if(confirm('פעולה זו תמחק את כל ההיסטוריה. להמשיך?')) {
                localStorage.clear();
                location.reload();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
