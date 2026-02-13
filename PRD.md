# Product Requirements Document (PRD) - NutriPulse Pro

## 1. Overview
NutriPulse Pro is a web-based nutrition tracking application designed to help users monitor their daily caloric intake, macronutrients (protein, carbs, fats), and micronutrients (sodium, calcium, sugar). The app utilizes a local database of Israeli-common foods to provide accurate tracking tailored to the user's environment.

## 2. Goals & Objectives
* **Simplicity:** Provide a straightforward interface for logging meals.
* **Accuracy:** Use exact weights (grams) or standard units (pieces, cups).
* **Visual Feedback:** Offer immediate visual cues (green progress bars) when nutritional data is updated.
* **Health Focus:** Go beyond calories to track specific vitamins and minerals.

## 3. Key Features
### 3.1 Food Logging
* Search functionality from a pre-defined database (150+ items).
* Ability to specify quantity in grams or units.
* Edit panel to adjust quantities before adding to the daily log.

### 3.2 Daily Dashboard
* **Calorie Counter:** Displays total consumed vs. daily target (2500 kcal).
* **Macro Bars:** Progress bars for Protein, Carbs, and Fats.
* **Micro Bars:** Specific tracking for Sodium, Sugar, and Calcium.

### 3.3 Data Management
* **Data Source:** External JSON file (`data/foods.json`).
* **Persistence:** Usage of LocalStorage to save daily logs.

## 4. Technical Requirements
* **Frontend:** HTML5, CSS3, JavaScript (ES6+).
* **Architecture:** Fetch API to load external JSON data.
