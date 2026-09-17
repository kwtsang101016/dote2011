# DOTE2011G · Probability (interactive lecture)

**Live site:** https://kwtsang101016.github.io/dote2011/probability/  
**Page numbers** match the website slide counter and downloadable PDF (01/24 … 24/24).

---

## Index

| Page | Title |
|------|-------|
| 01 | Cover |
| 02 | What is probability |
| 03 | Experiments & sample space |
| 04 | DSME sample space |
| 05 | Multiple-step counting |
| 06 | Combinations & permutations |
| 07 | Mark Six |
| 08 | Horse racing |
| 09 | Game · counting |
| 10 | Three methods of assigning probabilities |
| 11 | Relative frequency (William Mini-Library) |
| 12 | Subjective · DSME probabilities |
| 13 | Events as sets |
| 14 | Complement · union · intersection |
| 15 | Addition law |
| 16 | Distributive · De Morgan |
| 17 | Conditional probability |
| 18 | Joint probability table |
| 19 | Independence |
| 20 | Bayes story (Dennis Fashion) |
| 21 | Bayes table |
| 22 | Game · Bayes |
| 23 | Prompts to try |
| 24 | Takeaways |

---

## Page 02 · What is probability

Probability = numerical measure of likelihood, always between **0 and 1**. Near 0 → unlikely; near 1 → almost certain.

---

## Page 03–04 · Experiments & DSME

**Experiment** = process with well-defined outcomes. **Sample space** S = all outcomes.  
**DSME:** ICBC ∈ {10, 5, 0, −20}, China Mobile ∈ {8, −2} → **8** sample points (net gains from +18 to −22, in $000).

---

## Page 05–09 · Counting

- Multiple-step: n₁ × n₂ × … × nₖ (tree diagrams). DSME: 4 × 2 = 8.  
- **Factorial:** n! = n × (n−1) × ⋯ × 1 (e.g. 3! = 6); 0! = 1 by definition.  
- **Combinations** C(N,n) = N! / [n!(N−n)!] — order irrelevant.  
- **Permutations** P(N,n) = N! / (N−n)! — order matters. P = C × n!.

### Mark Six (HK)

- Six Drawn Numbers from 1–49 (unordered) → **C(49,6) = 13,983,816** outcomes.  
- First prize (one single entry): **P = 1 / C(49,6)** ≈ 1 in 14 million.  
- Multiple entry of **7 numbers**: **C(7,6) = 7** single tickets → **7 × HK$10 = HK$70**.  
- General: k numbers → C(k,6) entries × HK$10.

### Horse racing (equal-chance teaching model)

With n runners (e.g. n = 14):

| Pool | Meaning | Count |
|------|---------|-------|
| Win | Who finishes 1st | n |
| Forecast | 1st & 2nd correct **order** | P(n,2) |
| Quinella | 1st & 2nd **any** order | C(n,2) |
| Tierce | Top 3 correct order | P(n,3) |
| Trio | Top 3 any order | C(n,3) |

Identity: P(n,2) = 2 · C(n,2); P(n,3) = 3! · C(n,3).

---

## Page 10–12 · Assigning probabilities

Rules: 0 ≤ P(Eᵢ) ≤ 1 and Σ P(Eᵢ) = 1.

| Method | Idea |
|--------|------|
| Classical | Equally likely → 1/n |
| Relative frequency | frequency / trials (e.g. library books: P(2)=18/40=0.45) |
| Subjective | Judgment / degree of belief (DSME analyst table sums to 1) |

---

## Page 13–16 · Events and relationships

Event = collection of sample points; P(event) = sum of those probabilities.  
DSME: **P(I)=0.70** (ICBC profitable), **P(C)=0.48** (Mobile profitable), **P(I∩C)=0.36**.

- Complement: P(Aᶜ)=1−P(A)  
- Union A∪B; Intersection A∩B  
- **Addition law:** P(A∪B)=P(A)+P(B)−P(A∩B). If mutually exclusive, drop the intersection term.

**Distributive laws:**  
A ∪ (B ∩ C) = (A ∪ B) ∩ (A ∪ C)  
A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C)

**De Morgan’s laws:**  
(A ∪ B)ᶜ = Aᶜ ∩ Bᶜ  
(A ∩ B)ᶜ = Aᶜ ∪ Bᶜ  

DSME check: (I ∪ C)ᶜ = “neither profitable” = Iᶜ ∩ Cᶜ.

---

## Page 17–19 · Conditioning & independence

**P(A|B)=P(A∩B)/P(B).** Example: P(C|I)=0.36/0.70≈0.5143.  
**Multiplication:** P(A∩B)=P(B)×P(A|B).  
Joint table: body = joints; margins = totals.  
**Independent** iff P(A∩B)=P(A)P(B). DSME: 0.70×0.48=0.34 ≠ 0.36 → **not independent**.  
Do not confuse with mutually exclusive (cannot both occur).

---

## Page 20–22 · Bayes’ theorem

Dennis Fashion / zoning: priors P(A₁)=0.70, P(A₂)=0.30; B = board recommends against; P(B|A₁)=0.20, P(B|A₂)=0.90.  
Joints: 0.14 and 0.27; P(B)=0.41; **posteriors ≈ 0.34 and 0.66**. Negative board news lowers P(approve) from 0.70 to ≈0.34.

Formula: P(Aᵢ|B) = [P(B|Aᵢ)P(Aᵢ)] / Σⱼ P(B|Aⱼ)P(Aⱼ).

---

## Page 23–24 · Practice & takeaways

Prompts: simulate a die; C/P; Mark Six; horse racing pools; joint conditionals; Bayes medical test.

**You may try:** paste the prompt into Microsoft Copilot (https://copilot.microsoft.com/), then run the Python in Google Colab (https://colab.research.google.com/) — download any files, and still read the code so you know what the assistant did.

Takeaways: **Count → assign → update** (sample space, event laws, Bayes).
