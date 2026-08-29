import type { ReactElement } from "react";
import styles from "./Lecture.module.css";

type BarSpec = { label: string; value: number; color?: string };

function MiniBarChart({
  title,
  bars,
  yMin,
  yMax,
  note,
}: {
  title: string;
  bars: BarSpec[];
  yMin: number;
  yMax: number;
  note: string;
}) {
  const width = 220;
  const height = 150;
  const pad = { top: 28, right: 12, bottom: 36, left: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const span = Math.max(yMax - yMin, 1);

  return (
    <figure className={styles.ethicsChart}>
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="var(--ink)" strokeWidth="2" />
        <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="var(--ink)" strokeWidth="2" />
        <text x={6} y={pad.top + 4} fontSize="9" fill="var(--muted)">{yMax}</text>
        <text x={6} y={pad.top + plotH} fontSize="9" fill="var(--muted)">{yMin}</text>
        {bars.map((bar, index) => {
          const barW = plotW / bars.length - 14;
          const x = pad.left + index * (plotW / bars.length) + 8;
          const normalized = (bar.value - yMin) / span;
          const barH = normalized * plotH;
          const y = pad.top + plotH - barH;
          return (
            <g key={bar.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 2)}
                fill={bar.color ?? "var(--blue)"}
                stroke="var(--ink)"
                strokeWidth="1.5"
              />
              <text x={x + barW / 2} y={pad.top + plotH + 14} textAnchor="middle" fontSize="10" fill="var(--ink)">
                {bar.label}
              </text>
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--ink)">
                {bar.value}
              </text>
            </g>
          );
        })}
      </svg>
      <p className={styles.ethicsChartNote}>{note}</p>
    </figure>
  );
}

function SampleDemo() {
  return (
    <div className={styles.ethicsDemoBody}>
      <p className={styles.ethicsStory}>
        A retailer surveys shoppers <strong>leaving one luxury mall</strong> and headlines: “Hong Kong prefers Brand X.”
        That sample is easy to reach — but it is not the whole city.
      </p>
      <svg className={styles.ethicsSvgWide} viewBox="0 0 420 160" role="img" aria-label="Convenience sample versus population">
        <circle cx="210" cy="80" r="72" fill="#d9edf1" stroke="var(--ink)" strokeWidth="2" />
        <text x="210" y="76" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">All residents</text>
        <text x="210" y="92" textAnchor="middle" fontSize="11" fill="var(--muted)">population</text>
        <circle cx="318" cy="58" r="28" fill="#ffdfd3" stroke="var(--red)" strokeWidth="2.5" />
        <text x="318" y="54" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--ink)">Mall exit</text>
        <text x="318" y="66" textAnchor="middle" fontSize="10" fill="var(--ink)">survey only</text>
        <text x="210" y="148" textAnchor="middle" fontSize="11" fill="var(--muted)">
          Convenience ≠ representative — who is missing from the mall on a weekday?
        </text>
      </svg>
    </div>
  );
}

function AxisDemo() {
  const bars = [
    { label: "101", value: 101 },
    { label: "102", value: 102, color: "var(--red)" },
  ];
  return (
    <div className={styles.ethicsDemoBody}>
      <p className={styles.ethicsStory}>
        Two cafés report weekly revenue of <strong>$101M</strong> and <strong>$102M</strong> — almost the same.
        Honest charts start the axis at <strong>zero</strong> so the gap looks small, as it should.
      </p>
      <div className={styles.ethicsDemoGrid}>
        <MiniBarChart
          title="Axis starts at 0 (honest)"
          bars={bars}
          yMin={0}
          yMax={110}
          note="The $1M gap looks modest — about 1%."
        />
        <MiniBarChart
          title="Axis starts at 100 (misleading)"
          bars={bars}
          yMin={100}
          yMax={103}
          note="102 looks twice as tall as 101 — same data, distorted scale."
        />
      </div>
    </div>
  );
}

function CherryDemo() {
  return (
    <div className={styles.ethicsDemoBody}>
      <p className={styles.ethicsStory}>
        A wellness app claims “users sleep 40% better.” In the <strong>full trial</strong>, improvement is tiny.
        The ad cites only <strong>young office workers who already owned smart watches</strong> — the subgroup that looked best.
      </p>
      <div className={styles.ethicsDemoGrid}>
        <MiniBarChart
          title="All participants (n = 2,000)"
          bars={[
            { label: "Control", value: 6.1 },
            { label: "App", value: 6.4, color: "var(--blue)" },
          ]}
          yMin={0}
          yMax={8}
          note="Average sleep score — small, honest difference."
        />
        <MiniBarChart
          title="Cherry-picked subgroup only"
          bars={[
            { label: "Control", value: 6.0 },
            { label: "App", value: 8.4, color: "var(--red)" },
          ]}
          yMin={0}
          yMax={9}
          note="Same study — reporting only the favorable slice."
        />
      </div>
    </div>
  );
}

function CauseDemo() {
  const months = ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
  const iceCream = [2, 4, 7, 10, 8, 3];
  const rescue = [1, 2, 4, 9, 6, 2];
  const width = 420;
  const height = 170;
  const pad = { top: 24, right: 16, bottom: 32, left: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const line = (values: number[]) => {
    const max = 11;
    return values
      .map((value, index) => {
        const x = pad.left + (index / (values.length - 1)) * plotW;
        const y = pad.top + plotH - (value / max) * plotH;
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  };

  return (
    <div className={styles.ethicsDemoBody}>
      <p className={styles.ethicsStory}>
        Ice-cream sales and drowning rescues both <strong>rise in summer</strong>. They move together — but ice cream does
        not cause drownings. A hidden factor (warm weather / more swimming) drives both.
      </p>
      <figure className={styles.ethicsChart}>
        <figcaption>Correlation without causation</figcaption>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ice cream and rescues rise together in summer">
          <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="var(--ink)" strokeWidth="2" />
          <path d={line(iceCream)} fill="none" stroke="var(--blue)" strokeWidth="3" />
          <path d={line(rescue)} fill="none" stroke="var(--red)" strokeWidth="3" strokeDasharray="6 4" />
          {months.map((month, index) => {
            const x = pad.left + (index / (months.length - 1)) * plotW;
            return (
              <text key={month} x={x} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--ink)">
                {month}
              </text>
            );
          })}
          <text x={pad.left + plotW - 4} y={pad.top + 12} textAnchor="end" fontSize="10" fill="var(--blue)">Ice-cream sales</text>
          <text x={pad.left + plotW - 4} y={pad.top + 26} textAnchor="end" fontSize="10" fill="var(--red)">Water rescues</text>
        </svg>
        <p className={styles.ethicsChartNote}>High correlation ≠ proof that one variable causes the other.</p>
      </figure>
    </div>
  );
}

function ContextDemo() {
  return (
    <div className={styles.ethicsDemoBody}>
      <p className={styles.ethicsStory}>
        Two apps both advertise great ratings. Without context, the stars are meaningless — you need{" "}
        <strong>how many people</strong> rated and <strong>how they were recruited</strong>.
      </p>
      <div className={styles.ethicsDemoGrid}>
        <article className={styles.ethicsStatCard}>
          <p className={styles.ethicsStatStars}>4.9 ★</p>
          <p className={styles.ethicsStatMeta}>n = 18 · friends of the founder</p>
          <p className={styles.ethicsStatVerdict}>Easy to inflate — not trustworthy alone.</p>
        </article>
        <article className={`${styles.ethicsStatCard} ${styles.ethicsStatCardGood}`}>
          <p className={styles.ethicsStatStars}>4.6 ★</p>
          <p className={styles.ethicsStatMeta}>n = 12,400 · random active users</p>
          <p className={styles.ethicsStatVerdict}>Lower average, but honest context builds trust.</p>
        </article>
      </div>
    </div>
  );
}

const DEMO_BY_ID: Record<string, () => ReactElement> = {
  sample: SampleDemo,
  axis: AxisDemo,
  cherry: CherryDemo,
  cause: CauseDemo,
  context: ContextDemo,
};

export function EthicsDemo({ id }: { id: string }) {
  const Demo = DEMO_BY_ID[id];
  if (!Demo) return null;
  return (
    <div className={styles.ethicsDemo}>
      <Demo />
    </div>
  );
}

export type EthicsFlag = {
  id: string;
  label: string;
  bad: boolean;
  verdict: string;
};

export const ETHICS_FLAGS: EthicsFlag[] = [
  {
    id: "sample",
    label: "Convenience sample dressed up as representative",
    bad: true,
    verdict: "Problem — easy-to-reach people are not the same as the population you claim to represent.",
  },
  {
    id: "axis",
    label: "Chart axis starts at zero when comparing amounts",
    bad: false,
    verdict: "Good practice — start at zero (or show the full scale) so small differences are not exaggerated.",
  },
  {
    id: "cherry",
    label: "Report only the subgroup that supports the story",
    bad: true,
    verdict: "Problem — cherry-picking a favorable slice hides what the full study actually showed.",
  },
  {
    id: "cause",
    label: "Call correlation “proof of cause”",
    bad: true,
    verdict: "Problem — two trends can move together for reasons you have not measured or controlled for.",
  },
  {
    id: "context",
    label: "Show sample size and how data were collected",
    bad: false,
    verdict: "Good practice — sample size and collection method tell readers whether to trust the headline number.",
  },
];
