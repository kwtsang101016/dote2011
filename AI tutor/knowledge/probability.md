# DOTE2011G · Probability (interactive lecture)

**Live site:** https://kwtsang101016.github.io/dote2011/probability/  
**Page numbers** match the website slide counter and downloadable PDF (01/22 … 22/22).

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
| 07 | Game · counting |
| 08 | Three methods of assigning probabilities |
| 09 | Relative frequency (William Mini-Library) |
| 10 | Subjective · DSME probabilities |
| 11 | Events as sets |
| 12 | Complement · union · intersection |
| 13 | Addition law |
| 14 | Distributive · De Morgan |
| 15 | Conditional probability |
| 16 | Joint probability table |
| 17 | Independence |
| 18 | Bayes story (Dennis Fashion) |
| 19 | Bayes table |
| 20 | Game · Bayes |
| 21 | Prompts to try |
| 22 | Takeaways |

---

## Page 02 · What is probability

Probability = numerical measure of likelihood, always between **0 and 1**. Near 0 → unlikely; near 1 → almost certain.

---

## Page 03–04 · Experiments & DSME

**Experiment** = process with well-defined outcomes. **Sample space** S = all outcomes.  
**DSME:** ICBC ∈ {10, 5, 0, −20}, China Mobile ∈ {8, −2} → **8** sample points (net gains from +18 to −22, in $000).

---

## Page 05–07 · Counting

- Multiple-step: n₁ × n₂ × … × nₖ (tree diagrams). DSME: 4 × 2 = 8.  
- **Factorial:** n! = n × (n−1) × ⋯ × 1 (e.g. 3! = 6); 0! = 1 by definition.  
- **Combinations** C(N,n) = N! / [n!(N−n)!] — order irrelevant.  
- **Permutations** P(N,n) = N! / (N−n)! — order matters. P = C × n!.

---

## Page 08–10 · Assigning probabilities

Rules: 0 ≤ P(Eᵢ) ≤ 1 and Σ P(Eᵢ) = 1.

| Method | Idea |
|--------|------|
| Classical | Equally likely → 1/n |
| Relative frequency | frequency / trials (e.g. library books: P(2)=18/40=0.45) |
| Subjective | Judgment / degree of belief (DSME analyst table sums to 1) |

---

## Page 11–13 · Events and relationships

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

## Page 15–17 · Conditioning & independence

**P(A|B)=P(A∩B)/P(B).** Example: P(C|I)=0.36/0.70≈0.5143.  
**Multiplication:** P(A∩B)=P(B)×P(A|B).  
Joint table: body = joints; margins = totals.  
**Independent** iff P(A∩B)=P(A)P(B). DSME: 0.70×0.48=0.34 ≠ 0.36 → **not independent**.  
Do not confuse with mutually exclusive (cannot both occur).

---

## Page 18–20 · Bayes’ theorem

Dennis Fashion / zoning: priors P(A₁)=0.70, P(A₂)=0.30; B = board recommends against; P(B|A₁)=0.20, P(B|A₂)=0.90.  
Joints: 0.14 and 0.27; P(B)=0.41; **posteriors ≈ 0.34 and 0.66**. Negative board news lowers P(approve) from 0.70 to ≈0.34.

Formula: P(Aᵢ|B) = [P(B|Aᵢ)P(Aᵢ)] / Σⱼ P(B|Aⱼ)P(Aⱼ).

---

## Page 21–22 · Practice & takeaways

Prompts: simulate a die; C/P; joint conditionals; Bayes medical test.

**You may try:** paste the prompt into Microsoft Copilot (https://copilot.microsoft.com/), then run the Python in Google Colab (https://colab.research.google.com/) — download any files, and still read the code so you know what the assistant did.

Takeaways: **Count → assign → update** (sample space, event laws, Bayes).
