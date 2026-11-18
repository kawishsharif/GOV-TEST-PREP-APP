// Small SVG line chart on a 0–100% scale (one axis), with legend, end labels and a hover crosshair/tooltip.
import { useRef, useState } from 'react';
import { fmtDay } from '../lib/util.js';

/** series: [{ name, color, dashed, points: [{ d: 'YYYY-MM-DD', v: number, note }] }] */
export function LineChart({ series, refLine, refLabel, height = 220 }) {
  const wrap = useRef(null);
  const [hover, setHover] = useState(null);
  const days = [...new Set(series.flatMap((s) => s.points.map((p) => p.d)))].sort();
  if (!days.length) return null;
  const W = 640, H = height * 1.6, L = 64, R = 92, T = 16, B = 40;
  const x = (d) => (days.length === 1 ? (L + W - R) / 2 : L + (days.indexOf(d) / (days.length - 1)) * (W - L - R));
  const y = (v) => T + (1 - v / 100) * (H - T - B);
  const ticks = [0, 25, 50, 75, 100];
  const xt = days.length <= 6 ? days : [days[0], days[Math.floor(days.length / 2)], days[days.length - 1]];

  const onMove = (e) => {
    const r = wrap.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = days[0];
    for (const d of days) if (Math.abs(x(d) - px) < Math.abs(x(best) - px)) best = d;
    setHover(best);
  };
  const hv = hover && series.map((s) => ({ s, p: s.points.find((p) => p.d === hover) })).filter((z) => z.p);

  return (
    <div className="chart relative min-w-0 touch-pan-y" ref={wrap} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <div className="legend-row">{series.map((s) => (
        <span key={s.name}><i style={{ background: s.color, ...(s.dashed ? { background: `repeating-linear-gradient(90deg, ${s.color} 0 5px, transparent 5px 8px)` } : {}) }} />{s.name}</span>
      ))}</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => `${s.name}: ${s.points.map((p) => `${p.d} ${p.v}%`).join(', ')}`).join('; ')}>
        <g className="gridlines">{ticks.map((t) => <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} />)}</g>
        {ticks.map((t) => <text key={t} x={L - 10} y={y(t) + 7} textAnchor="end">{t}%</text>)}
        {xt.map((d) => <text key={d} x={x(d)} y={H - 8} textAnchor="middle">{fmtDay(d)}</text>)}
        {refLine != null && <>
          <line x1={L} x2={W - R} y1={y(refLine)} y2={y(refLine)} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth="1" />
          <text x={W - R + 4} y={y(refLine) + 4} >{refLabel}</text>
        </>}
        {series.map((s) => {
          const pts = s.points.filter((p) => days.includes(p.d));
          const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d)},${y(p.v)}`).join(' ');
          const last = pts[pts.length - 1];
          return (
            <g key={s.name}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="3.5" strokeDasharray={s.dashed ? '10 7' : undefined} strokeLinejoin="round" strokeLinecap="round" />
              {!s.dashed && pts.map((p) => <circle key={p.d} cx={x(p.d)} cy={y(p.v)} r="7" fill={s.color} stroke="var(--card)" strokeWidth="3" />)}
              {last && <text x={x(last.d) + 12} y={y(last.v) + 7} style={{ fill: 'var(--foreground)', fontWeight: 600 }}>{last.v}%</text>}
            </g>
          );
        })}
        {hover && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--muted-foreground)" strokeWidth="1" />}
      </svg>
      {hover && hv.length > 0 && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(Math.min(...hv.map((z) => y(z.p.v))) / H) * 100}%` }}>
          <b>{fmtDay(hover, { day: 'numeric', month: 'short', year: 'numeric' })}</b>
          {hv.map(({ s, p }) => <div key={s.name}><span style={{ color: s.color }}>●</span> {s.name}: <b>{p.v}%</b>{p.note ? ` · ${p.note}` : ''}</div>)}
        </div>
      )}
    </div>
  );
}
