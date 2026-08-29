import styles from "./Lecture.module.css";
import { type BoxPlotStats, type HistogramBin, formatNumber, mean } from "../stats";

const PALETTE = ["#df4a3e", "#2e7190", "#16213c", "#f5cf6b", "#c56a3a", "#5f8aa0"];

type LabeledValue = {
  label: string;
  value: number;
};

function maxOf(values: number[], fallback = 1): number {
  return Math.max(fallback, ...values);
}

export function BarChart({
  data,
  title,
  yLabel,
  gap = true,
}: {
  data: LabeledValue[];
  title: string;
  yLabel: string;
  gap?: boolean;
}) {
  const width = 520;
  const height = 260;
  const left = 48;
  const right = 16;
  const top = 18;
  const bottom = 58;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const peak = maxOf(data.map((item) => item.value));
  const barWidth = plotWidth / data.length;

  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <text className={styles.chartTitle} x={left} y={14}>
          {title}
        </text>
        <line className={styles.axis} x1={left} y1={top + 8} x2={left} y2={height - bottom} />
        <line className={styles.axis} x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} />
        <text className={styles.axisLabel} x={14} y={height / 2} transform={`rotate(-90 14 ${height / 2})`}>
          {yLabel}
        </text>
        {data.map((item, index) => {
          const barHeight = (item.value / peak) * (plotHeight - 16);
          const x = left + index * barWidth + (gap ? barWidth * 0.18 : 2);
          const y = height - bottom - barHeight;
          const w = gap ? barWidth * 0.64 : barWidth - 2;
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={w} height={barHeight} fill={PALETTE[index % PALETTE.length]} />
              <text className={styles.barValue} x={x + w / 2} y={y - 6}>
                {formatNumber(item.value, Number.isInteger(item.value) ? 0 : 2)}
              </text>
              <text className={styles.tick} x={x + w / 2} y={height - bottom + 16}>
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function ParetoChart({
  data,
  title,
}: {
  data: LabeledValue[];
  title: string;
}) {
  const ordered = [...data].sort((a, b) => b.value - a.value);
  const total = ordered.reduce((sum, item) => sum + item.value, 0) || 1;
  let running = 0;
  const points = ordered.map((item) => {
    running += item.value;
    return { ...item, cumulative: (running / total) * 100 };
  });
  const width = 560;
  const height = 280;
  const left = 48;
  const right = 48;
  const top = 22;
  const bottom = 58;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const peak = maxOf(ordered.map((item) => item.value));
  const barWidth = plotWidth / ordered.length;
  const linePath = points
    .map((item, index) => {
      const x = left + index * barWidth + barWidth / 2;
      const y = top + plotHeight - (item.cumulative / 100) * plotHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <text className={styles.chartTitle} x={left} y={14}>
          {title}
        </text>
        <line className={styles.axis} x1={left} y1={top} x2={left} y2={height - bottom} />
        <line className={styles.axis} x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} />
        <line className={styles.axis} x1={width - right} y1={top} x2={width - right} y2={height - bottom} />
        <line className={styles.trend} x1={left} y1={top + plotHeight * 0.2} x2={width - right} y2={top + plotHeight * 0.2} strokeDasharray="5 5" opacity="0.45" />
        <text className={styles.axisLabel} x={14} y={height / 2} transform={`rotate(-90 14 ${height / 2})`}>
          Frequency
        </text>
        <text className={styles.axisLabel} x={width - 12} y={height / 2} transform={`rotate(90 ${width - 12} ${height / 2})`}>
          Cumulative %
        </text>
        {points.map((item, index) => {
          const barHeight = (item.value / peak) * (plotHeight - 16);
          const x = left + index * barWidth + barWidth * 0.18;
          const y = height - bottom - barHeight;
          const w = barWidth * 0.64;
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={w} height={barHeight} fill={index < 2 ? "#df4a3e" : "#2e7190"} />
              <text className={styles.barValue} x={x + w / 2} y={y - 6}>
                {formatNumber(item.value, 0)}
              </text>
              <text className={styles.tick} x={x + w / 2} y={height - bottom + 16}>
                {item.label}
              </text>
            </g>
          );
        })}
        <path d={linePath} fill="none" stroke="#16213c" strokeWidth="3" />
        {points.map((item, index) => {
          const x = left + index * barWidth + barWidth / 2;
          const y = top + plotHeight - (item.cumulative / 100) * plotHeight;
          return (
            <g key={`${item.label}-cum`}>
              <circle cx={x} cy={y} r="5" fill="#f5cf6b" stroke="#16213c" strokeWidth="2" />
              <text className={styles.barValue} x={x} y={y - 10}>
                {formatNumber(item.cumulative, 0)}%
              </text>
            </g>
          );
        })}
        <text className={styles.tick} x={width - right + 18} y={top + plotHeight * 0.2 + 4}>
          80%
        </text>
      </svg>
    </figure>
  );
}

export function PieChart({ data, title }: { data: LabeledValue[]; title: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let angle = -90;
  const cx = 120;
  const cy = 120;
  const radius = 88;

  const slices = data.map((item, index) => {
    const sweep = (item.value / total) * 360;
    const start = polar(cx, cy, radius, angle);
    const end = polar(cx, cy, radius, angle + sweep);
    const large = sweep > 180 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y} Z`;
    const mid = polar(cx, cy, radius * 0.62, angle + sweep / 2);
    angle += sweep;
    return { ...item, path, mid, fill: PALETTE[index % PALETTE.length], percent: (item.value / total) * 100 };
  });

  return (
    <figure className={styles.chartCard}>
      <svg viewBox="0 0 320 240" role="img" aria-label={title}>
        <text className={styles.chartTitle} x={16} y={18}>
          {title}
        </text>
        {slices.map((slice) => (
          <path key={slice.label} d={slice.path} fill={slice.fill} stroke="#fffaf0" strokeWidth="2" />
        ))}
        {slices
          .filter((slice) => slice.percent >= 8)
          .map((slice) => (
            <text key={`${slice.label}-pct`} className={styles.pieLabel} x={slice.mid.x} y={slice.mid.y}>
              {Math.round(slice.percent)}%
            </text>
          ))}
        {data.map((item, index) => (
          <g key={`legend-${item.label}`} transform={`translate(230 ${48 + index * 28})`}>
            <rect width="12" height="12" fill={PALETTE[index % PALETTE.length]} />
            <text className={styles.legend} x="18" y="11">
              {item.label}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

function polar(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

export function HistogramChart({
  bins,
  title,
  yLabel = "Frequency",
}: {
  bins: HistogramBin[];
  title: string;
  yLabel?: string;
}) {
  return (
    <BarChart
      data={bins.map((bin) => ({ label: bin.label, value: bin.count }))}
      title={title}
      yLabel={yLabel}
      gap={false}
    />
  );
}

export function DotPlot({ values, title, xLabel }: { values: number[]; title: string; xLabel: string }) {
  if (values.length === 0) return null;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = Math.max(maxValue - minValue, 1);
  const counts = new Map<number, number>();
  const ordered = [...values].sort((a, b) => a - b);
  const stacks: Array<{ value: number; stack: number }> = ordered.map((value) => {
    const stack = (counts.get(value) ?? 0) + 1;
    counts.set(value, stack);
    return { value, stack };
  });
  const maxStack = maxOf([...counts.values()]);
  const width = 560;
  const height = 180;
  const left = 24;
  const right = 24;
  const axisY = 140;

  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <text className={styles.chartTitle} x={left} y={16}>
          {title}
        </text>
        <line className={styles.axis} x1={left} y1={axisY} x2={width - right} y2={axisY} />
        {stacks.map((dot, index) => {
          const x = left + ((dot.value - minValue) / span) * (width - left - right);
          const y = axisY - 10 - (dot.stack - 1) * 11;
          return <circle key={`${dot.value}-${index}`} cx={x} cy={y} r="5" fill="#df4a3e" stroke="#16213c" strokeWidth="1.5" />;
        })}
        <text className={styles.tick} x={left} y={axisY + 18}>
          {formatNumber(minValue, 0)}
        </text>
        <text className={styles.tick} x={width - right} y={axisY + 18}>
          {formatNumber(maxValue, 0)}
        </text>
        <text className={styles.axisLabel} x={width / 2} y={height - 8}>
          {xLabel}
          {maxStack > 8 ? " · stacked dots" : ""}
        </text>
      </svg>
    </figure>
  );
}

export function OgiveChart({
  points,
  title,
}: {
  points: Array<{ x: number; y: number; label?: string }>;
  title: string;
}) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = maxOf(ys);
  const width = 520;
  const height = 240;
  const left = 48;
  const bottom = 40;
  const top = 24;
  const right = 16;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const coord = (x: number, y: number) => ({
    x: left + ((x - minX) / Math.max(maxX - minX, 1)) * plotWidth,
    y: top + plotHeight - (y / maxY) * plotHeight,
  });
  const path = points
    .map((point, index) => {
      const { x, y } = coord(point.x, point.y);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <text className={styles.chartTitle} x={left} y={16}>
          {title}
        </text>
        <line className={styles.axis} x1={left} y1={top} x2={left} y2={height - bottom} />
        <line className={styles.axis} x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} />
        <path d={path} fill="none" stroke="#df4a3e" strokeWidth="4" />
        {points.map((point) => {
          const { x, y } = coord(point.x, point.y);
          return <circle key={`${point.x}-${point.y}`} cx={x} cy={y} r="5" fill="#16213c" />;
        })}
        <text className={styles.axisLabel} x={width / 2} y={height - 8}>
          Upper class boundary
        </text>
        <text className={styles.axisLabel} x={14} y={height / 2} transform={`rotate(-90 14 ${height / 2})`}>
          Cumulative %
        </text>
      </svg>
    </figure>
  );
}

export function ScatterChart({
  points,
  title,
  xLabel,
  yLabel,
  showTrend = false,
}: {
  points: Array<{ x: number; y: number }>;
  title: string;
  xLabel: string;
  yLabel: string;
  showTrend?: boolean;
}) {
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padX = Math.max((maxX - minX) * 0.08, 0.5);
  const padY = Math.max((maxY - minY) * 0.12, 0.5);
  const width = 520;
  const height = 280;
  const left = 50;
  const bottom = 42;
  const top = 24;
  const right = 16;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x0 = minX - padX;
  const x1 = maxX + padX;
  const y0 = minY - padY;
  const y1 = maxY + padY;
  const coord = (x: number, y: number) => ({
    x: left + ((x - x0) / (x1 - x0)) * plotWidth,
    y: top + ((y1 - y) / (y1 - y0)) * plotHeight,
  });

  let trend: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (showTrend && points.length >= 2) {
    const xBar = mean(xs);
    const yBar = mean(ys);
    const ssxx = xs.reduce((total, x) => total + (x - xBar) ** 2, 0);
    const slope = ssxx === 0 ? 0 : xs.reduce((total, x, index) => total + (x - xBar) * (ys[index] - yBar), 0) / ssxx;
    const intercept = yBar - slope * xBar;
    const start = coord(x0, intercept + slope * x0);
    const end = coord(x1, intercept + slope * x1);
    trend = { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  }

  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <text className={styles.chartTitle} x={left} y={16}>
          {title}
        </text>
        <line className={styles.axis} x1={left} y1={top} x2={left} y2={height - bottom} />
        <line className={styles.axis} x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} />
        {trend ? <line className={styles.trend} x1={trend.x1} y1={trend.y1} x2={trend.x2} y2={trend.y2} /> : null}
        {points.map((point, index) => {
          const { x, y } = coord(point.x, point.y);
          return <circle key={`${point.x}-${point.y}-${index}`} cx={x} cy={y} r="7" fill="#2e7190" stroke="#16213c" strokeWidth="2" />;
        })}
        <text className={styles.axisLabel} x={width / 2} y={height - 8}>
          {xLabel}
        </text>
        <text className={styles.axisLabel} x={14} y={height / 2} transform={`rotate(-90 14 ${height / 2})`}>
          {yLabel}
        </text>
      </svg>
    </figure>
  );
}

export function BoxPlotChart({ stats, title }: { stats: BoxPlotStats; title: string }) {
  const values = [stats.whiskerMin, stats.whiskerMax, stats.lowerFence, stats.upperFence, ...stats.outliers];
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = Math.max(maxValue - minValue, 1);
  const left = 36;
  const right = 36;
  const width = 560;
  const y = 70;
  const scale = (value: number) => left + ((value - minValue) / span) * (width - left - right);

  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${width} 150`} role="img" aria-label={title}>
        <text className={styles.chartTitle} x={left} y={18}>
          {title}
        </text>
        <line className={styles.axis} x1={left} y1={110} x2={width - right} y2={110} />
        <line className={styles.whisker} x1={scale(stats.whiskerMin)} y1={y} x2={scale(stats.q1)} y2={y} />
        <line className={styles.whisker} x1={scale(stats.q3)} y1={y} x2={scale(stats.whiskerMax)} y2={y} />
        <line className={styles.whisker} x1={scale(stats.whiskerMin)} y1={y - 14} x2={scale(stats.whiskerMin)} y2={y + 14} />
        <line className={styles.whisker} x1={scale(stats.whiskerMax)} y1={y - 14} x2={scale(stats.whiskerMax)} y2={y + 14} />
        <rect
          x={scale(stats.q1)}
          y={y - 22}
          width={Math.max(scale(stats.q3) - scale(stats.q1), 2)}
          height={44}
          fill="#f5cf6b"
          stroke="#16213c"
          strokeWidth="3"
        />
        <line className={styles.medianLine} x1={scale(stats.median)} y1={y - 22} x2={scale(stats.median)} y2={y + 22} />
        {stats.outliers.map((value, index) => (
          <text key={`${value}-${index}`} className={styles.outlier} x={scale(value)} y={y + 6}>
            *
          </text>
        ))}
        <text className={styles.tick} x={scale(stats.q1)} y={128}>
          Q1 {formatNumber(stats.q1, 0)}
        </text>
        <text className={styles.tick} x={scale(stats.median)} y={142}>
          Med {formatNumber(stats.median, 0)}
        </text>
        <text className={styles.tick} x={scale(stats.q3)} y={128}>
          Q3 {formatNumber(stats.q3, 0)}
        </text>
      </svg>
    </figure>
  );
}

export function DensitySketch({
  shape,
  title,
}: {
  shape: "symmetric" | "left" | "right" | "high-right";
  title: string;
}) {
  const points = Array.from({ length: 80 }, (_, index) => {
    const x = index / 79;
    let y = Math.exp(-0.5 * ((x - 0.5) / 0.16) ** 2);
    if (shape === "left") y = Math.exp(-0.5 * ((x - 0.62) / 0.14) ** 2) + 0.35 * Math.exp(-0.5 * ((x - 0.22) / 0.12) ** 2);
    if (shape === "right") y = Math.exp(-0.5 * ((x - 0.38) / 0.14) ** 2) + 0.35 * Math.exp(-0.5 * ((x - 0.78) / 0.12) ** 2);
    if (shape === "high-right") y = Math.exp(-0.5 * ((x - 0.28) / 0.11) ** 2) + 0.22 * Math.exp(-0.5 * ((x - 0.72) / 0.18) ** 2);
    return { x, y };
  });
  const peak = maxOf(points.map((point) => point.y));
  const d = points
    .map((point, index) => {
      const x = 20 + point.x * 260;
      const y = 120 - (point.y / peak) * 90;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <figure className={styles.chartCard}>
      <svg viewBox="0 0 300 150" role="img" aria-label={title}>
        <text className={styles.chartTitle} x={16} y={18}>
          {title}
        </text>
        <path d={`${d} L 280 120 L 20 120 Z`} fill="#2e7190" opacity="0.25" />
        <path d={d} fill="none" stroke="#16213c" strokeWidth="3" />
        <line className={styles.axis} x1={20} y1={120} x2={280} y2={120} />
      </svg>
    </figure>
  );
}
