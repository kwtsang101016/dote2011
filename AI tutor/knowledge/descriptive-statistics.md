# DOTE2011G · Descriptive Statistics (interactive lecture)

**Live site:** https://kwtsang101016.github.io/dote2011/descriptive-statistics/  
**Page numbers** match the website slide counter and downloadable PDF (01/26 … 26/26).

---

## Index

| Page | Title |
|------|-------|
| 01 | Cover |
| 02 | Why summarise |
| 03 | Game · Name, or number? |
| 04 | Hyatt · categorical data |
| 05 | Pareto diagram |
| 06 | Game · Read the chart |
| 07 | Classes and histogram |
| 08 | Game · Skewness shape |
| 09 | Skewness formula |
| 10 | Stem-and-leaf |
| 11 | Cumulative / ogive |
| 12 | Crosstab |
| 13 | Game · Simpson's paradox |
| 14 | Scatter diagrams |
| 15 | Tool map |
| 16 | Mean / median / mode |
| 17 | Percentiles and quartiles |
| 18 | Game · Compute mean & median |
| 19 | Variability |
| 20 | Game · Two suppliers |
| 21 | z-scores, Chebyshev, empirical rule |
| 22 | Box plot |
| 23 | Correlation |
| 24 | Weighted mean / grouped data |
| 25 | Game · Cloud vs table |
| 26 | Prompts to try |
| 27 | Takeaways |

---

## Page 01 · Cover

**Title:** Descriptive Statistics  
**Lead:** From a pile of numbers to a picture — and a decision you can defend.

---

## Page 02 · Why summarise

**Title:** Raw data is not a story.

William Auto: 50 tune-up **parts costs** ($) — a long list of numbers (52, 57, 62, …). You cannot hold 50 numbers in your head. Descriptive statistics compresses them into a table, a picture, or a few honest numbers.

| Type | Meaning | Examples |
|------|---------|----------|
| **Categorical** | Labels | Rating, home type, supplier name |
| **Quantitative** | Amounts | Cost, rate, shots, rent ($) |

---

## Page 03 · Game · Name, or number?

**Title:** Name, or number?  
**Rule:** Categorical = label/name/group. Quantitative = numeric amount or count.

### All classify examples (complete deck)

| Observation | Answer | Why |
|-------------|--------|-----|
| Hyatt guest rating: Above Average | **Categorical** | Label/category |
| Tune-up parts cost: $91 | **Quantitative** | Dollar amount |
| Shatin home type: Flat | **Categorical** | Label |
| Number of shots on goal | **Quantitative** | Count |
| Supplier name: FastGo | **Categorical** | Label |
| Daily studio rent in Tai Po | **Quantitative** | Dollar amount |

---

## Page 04 · Hyatt · categorical data

**Title:** Twenty guests. One table. Two pictures.

Frequency = count. Relative frequency = count ÷ n. Percent frequency = relative × 100. **n = 20.**

| Rating | f | Relative | Percent |
|--------|---|----------|---------|
| Poor | 2 | 0.10 | 10% |
| Below Average | 3 | 0.15 | 15% |
| Average | 5 | 0.25 | 25% |
| Above Average | 9 | 0.45 | 45% |
| Excellent | 1 | 0.05 | 5% |

Tools: bar chart (frequency), pie chart (percent). Pie slice = relative frequency × 360°.

---

## Page 05 · Pareto diagram

**Title:** Sort the bars. The biggest problems come first.

Bar chart of causes ordered **most frequent → least**, often with cumulative-% line (Vilfredo Pareto; quality/operations standard).

**Hyatt complaints (n = 100):**

| Cause | Count | % | Cum. % |
|-------|-------|---|--------|
| Check-in | 48 | 48% | 48% |
| Cleanliness | 24 | 24% | 72% |
| Wi-Fi | 12 | 12% | 84% |
| Noise | 9 | 9% | 93% |
| Billing | 7 | 7% | 100% |

**Key point:** Check-in + Cleanliness = **72%** of complaints — fix those first (80/20 idea).

---

## Page 06 · Game · Read the chart

**Title:** What percent said “Above Average”?

Count the bar, divide by **n = 20**. Textbook: **9/20 = 45%**. Website redraws samples — learn the method, not one memorised answer.

---

## Page 07 · Classes and histogram

**Title:** Classes are a choice. Make them honest.

William Auto: 50 parts costs ($). **6 classes, width 10, start $50.**  
Approx. width = (max − min) / k. Guideline: **5–20 classes**. Each value in exactly one class.

---

## Page 08 · Game · Skewness shape

**Title:** Which way does the tail point?

| Shape | Tail | Examples |
|-------|------|----------|
| Symmetric | Neither side longer | Heights, weights |
| Skewed left | Long left tail | Some exam score sets |
| Skewed right | Long right tail | Property prices, salaries |
| Highly skewed right | Very long right tail | Few huge values pull the mean |

Skewness is named for the **long tail**, not the pile.

---

## Page 09 · Skewness formula

**Title:** Skewness turns the histogram into one number.

**70 Shatin/Tai Po studio rates ($).** Formula:

**Skewness = [n / ((n − 1)(n − 2))] × Σ [(xᵢ − x̄) / s]³**

| Value | Meaning |
|-------|---------|
| 0 | Symmetric |
| Negative | Left tail |
| Positive | Right tail (mean usually above median) |

Textbook sample: skewness = **0.92** (moderate right skew).

---

## Page 10 · Stem-and-leaf

**Title:** Stem-and-leaf is a histogram that still shows the data.

Stem = leading digits; leaf = last digit. Can split stems (0–4 / 5–9). Companion: dot plot. Leaf unit = 1 here (if data were 8.6, 9.1, use leaf unit 0.1).

---

## Page 11 · Cumulative / ogive

**Title:** How many costs fall at or below each limit?

Histogram: count **inside** each class. Cumulative: count **at most** each upper limit. Read “at most,” not “exactly.”

**Tune-up costs (textbook):**

| At most | Cum. f | Cum. % |
|---------|--------|--------|
| ≤ $59 | 2 | 4% |
| ≤ $69 | 15 | 30% |
| ≤ $79 | 31 | 62% |
| ≤ $89 | 38 | 76% |
| ≤ $99 | 45 | 90% |
| ≤ $109 | 50 | 100% |

Example: **15 of 50** tune-ups cost ≤ **$69** = **30%**. Ogive uses class upper boundaries (59.5, 69.5, …).

---

## Page 12 · Crosstab

**Title:** A crosstab is two frequency distributions sharing one table.

100 Shatin homes: **type** (categorical) × **price band** (grouped quantitative).

| Price \ Type | HOS | House | Flat | HOS (G) | Total |
|--------------|-----|-------|------|---------|-------|
| < $5M | 18 | 6 | 19 | 12 | 55 |
| ≥ $5M | 12 | 14 | 16 | 3 | 45 |
| **Total** | **30** | **20** | **35** | **15** | **100** |

- **HOS** = Home Ownership Scheme flat  
- **HOS (G)** = HOS under Green Form  

Row % = given price band, what type? Column % = given type, what price? Different questions.

---

## Page 13 · Game · Simpson's paradox

**Title:** The total can reverse every subgroup.

Two cafés — 5-star rates:

| | 5-star | Orders | Rate |
|---|--------|--------|------|
| Shop A | 273 | 350 | 78% |
| Shop B | 289 | 350 | **83%** |

**Weekdays:** A 93% vs B 87%. **Weekends:** A 73% vs B 69%. **A wins both subgroups** — B only wins overall because it takes more easy weekday orders. **Simpson's paradox:** aggregating hid the lurking variable (day type).

---

## Page 14 · Scatter diagrams

**Title:** The cloud is the relationship.

Manchester United: **goals vs shots** (5 matches). **r ≈ 0.90.** Trendline sketches the cloud — not proof of cause.

| Goals | Shots |
|-------|-------|
| 1 | 14 |
| 3 | 24 |
| 2 | 18 |
| 1 | 17 |
| 3 | 30 |

---

## Page 15 · Tool map

**Categorical tools:** frequency / relative / percent tables; bar; pie; Pareto; crosstab.  
**Quantitative tools:** frequency tables, histogram, dot plot, stem-and-leaf, ogive, scatter, crosstab.

Next: center, spread, shape, association as numbers.

---

## Page 16 · Mean / median / mode

**Mean** x̄ = Σxᵢ / n — walks toward outliers.  
**Median** — middle of ordered list — more stable.  
**Mode** — most frequent value.

Example: 12, 14, 18, 19, 26, 27, 27. “Star salary” demo: mean pulled up; median barely moves.

---

## Page 17 · Percentiles and quartiles

**70 hotel studio rates**, ordered. **p-th percentile:** at least p% of values are this much or less.

1. i = (p/100) × n  
2. **Case A — i whole number:** average xᵢ and xᵢ₊₁ (e.g. median i = 35 → avg #35 and #36)  
3. **Case B — i decimal:** round **up**; take that position (e.g. Q1 i = 17.5 → #18)

| Measure | Value |
|---------|-------|
| Q1 | 445 |
| Q2 (median) | 475 |
| Q3 | 525 |
| 80th percentile | **542** |

---

## Page 18 · Game · Compute

Order 8 values first. Compute **mean** and **median**. Answers change when sample is redrawn.

---

## Page 19 · Variability

**Range** = max − min (sensitive to outliers).  
**IQR** = Q3 − Q1 (middle 50%).  
**Sample s** = √[Σ(xᵢ − x̄)² / (n − 1)].  
**CV** = (s / x̄) × 100% (relative variability).

Dataset: 70 hotel studio rates.

---

## Page 20 · Game · Two suppliers

| | FastGo | Steady |
|---|--------|--------|
| Delivery days | 4,5,5,5,6,**14** | 6,7,7,8,8,9 |
| Mean | 6.5 | 7.5 |
| s | 3.73 | 1.05 |

**Choose Steady** — similar average, much less scatter. One 14-day delay is the business risk.

---

## Page 21 · z-scores and rules

**z = (x − x̄) / s** — standardised value; |z| > 3 often flagged as outlier.

**Chebyshev:** for any data, fraction within z SD of mean ≥ 1 − 1/z².  
**Empirical rule (bell-shaped only):** ~68% within ±1s, ~95% within ±2s, ~99.7% within ±3s.

---

## Page 22 · Box plot

Five-number summary: min, Q1, median, Q3, max. Whiskers to last point within **1.5 × IQR** of quartiles; points beyond = outliers.

---

## Page 23 · Correlation

Golf: driving distance vs score (6 rounds). **r ≈ −0.96** (longer drives, lower scores).

**s_xy** = Σ(xᵢ − x̄)(yᵢ − ȳ) / (n − 1)  
**r = s_xy / (s_x s_y)** — always between −1 and +1.

**Correlation measures linear association — not causation.**

---

## Page 24 · Weighted mean / grouped data

**GPA:** x̄_w = Σ wᵢxᵢ / Σ wᵢ. Example: **3.53** (not plain average 3.50) because credits weight courses.

**Grouped data:** use class midpoints Mᵢ and frequencies fᵢ:  
x̄ ≈ Σ fᵢMᵢ / n; s² ≈ Σ fᵢ(Mᵢ − x̄)² / (n − 1).

---

## Page 25 · Game · Cloud vs table

Plot before trusting **r**. Textbook trap table (A and B both climb): **r ≈ 0.95** — strong positive linear — but always **plot first**.

---

## Page 26 · Prompts to try

**Title:** Practice descriptive statistics on your own CSV.

Use `aapl_daily.csv` (from Introduction) with an AI assistant. Example prompts:

- **Histogram · daily returns** — compute % return from Close; histogram ~15 classes; mean and s of returns  
- **Center & spread** — mean, median, s of Close  
- **Time series** — line chart of Close + 20-day moving average  
- **Box plot · volatility** — weekly range of Close; box plot  
- **Two variables** — scatter Volume vs |daily % return|  
- **Compare two stocks** — normalized Close for AAPL vs MSFT  

For graded work, follow course AI policy.

---

## Page 27 · Takeaways

1. **See the type** — categorical vs quantitative picks the tool.  
2. **Show the shape** — before quoting a mean.  
3. **Name the risk** — outliers, lurking variables, correlation ≠ cause.

Descriptive statistics makes the sample legible; inference (later) asks how far the story travels.
