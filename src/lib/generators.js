// Template-based numerical generators: unlimited fresh variants of the classic exam calculations.
// Each wrong option is built from a typical slip (missing √3, I instead of I², wrong formula),
// so practising here trains you against exactly the traps examiners plant.
import { shuffle, uid } from './util.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const fmt = (x) => {
  const ax = Math.abs(x);
  const d = ax >= 1000 ? 0 : ax >= 100 ? 1 : ax >= 10 ? 1 : ax >= 1 ? 2 : 3;
  return Number(x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
};
const tanOf = (pf) => Math.tan(Math.acos(pf));

/** Build a question; `wrong` = [[value, reason], …]. Duplicate/near-equal distractors are replaced. */
function make(topic, difficulty, q, value, unit, wrong, steps) {
  const u = unit ? ` ${unit}` : '';
  const right = fmt(value) + u;
  const seen = new Set([right]);
  const opts = [{ t: right, why: null, ok: true }];
  for (const [v, why] of wrong) {
    const t = fmt(v) + u;
    if (!Number.isFinite(v) || seen.has(t) || Math.abs(v - value) / Math.abs(value || 1) < 0.004) continue;
    seen.add(t); opts.push({ t, why });
    if (opts.length === 4) break;
  }
  for (const f of [0.97, 0.94, 1.03, 0.91, 1.25, 0.8, 1.5, 0.5]) {
    if (opts.length === 4) break;
    const t = fmt(value * f) + u;
    if (!seen.has(t)) { seen.add(t); opts.push({ t, why: `${f > 1 ? 'Too high' : 'Too low'} — does not follow from the correct working.` }); }
  }
  const o = shuffle(opts);
  return {
    id: 'gen-' + uid(), topic, difficulty, type: 'numerical', style: 'Concept variant', source: 'template',
    q, options: o.map((x) => x.t), answer: o.findIndex((x) => x.ok), why: o.map((x) => x.why),
    solution: [...steps, `Answer: ${right}`], explanation: `Answer: ${right}`,
  };
}

const G = {
  machines: [
    () => { // rotor speed
      const P = pick([2, 4, 6, 8]), s = rnd(2, 6) / 100, Ns = 6000 / P, N = Ns * (1 - s);
      return make('machines', 'easy', `A ${P}-pole, 50 Hz induction motor runs at ${s * 100}% slip. Rotor speed is:`, N, 'rpm',
        [[Ns, 'That is synchronous speed — slip ignored.'], [Ns * (1 + s), 'Adds slip; motors run below N_{s}.'], [3000 / P * (1 - s), 'Uses 60f/P instead of 120f/P.']],
        [`N_{s} = 120 × 50/${P} = ${fmt(Ns)} rpm`, `N = N_{s}(1 − s) = ${fmt(Ns)} × ${fmt(1 - s)}`]);
    },
    () => { // slip from speeds
      const P = pick([4, 6, 8]), Ns = 6000 / P, N = Ns - rnd(2, 7) * Ns / 100, s = (Ns - N) / Ns * 100;
      return make('machines', 'easy', `A ${P}-pole induction motor on 50 Hz runs at ${fmt(N)} rpm. Its slip is:`, s, '%',
        [[(Ns - N) / N * 100, 'Divides by rotor speed instead of N_{s}.'], [(Ns - N), 'Speed difference in rpm, not slip.'], [100 - s, 'That is N/N_{s}, not slip.']],
        [`N_{s} = 6000/${P} = ${fmt(Ns)} rpm`, `s = (N_{s} − N)/N_{s} = ${fmt(Ns - N)}/${fmt(Ns)}`]);
    },
    () => { // rotor frequency
      const s = rnd(2, 6) / 100;
      return make('machines', 'easy', `Rotor current frequency of an induction motor at ${s * 100}% slip on a 50 Hz supply is:`, 50 * s, 'Hz',
        [[50, 'That is stator frequency (true only at standstill).'], [50 * (1 - s), 'That is (1 − s)f.'], [s, 'Forgot to multiply by f.']],
        [`f_{r} = s × f = ${s} × 50`]);
    },
    () => { // transformer efficiency
      const S = pick([25, 50, 100, 200]), Pi = S * pick([8, 10, 12]), Pcu = S * pick([15, 20, 25]), x = pick([0.5, 0.75, 1]), pf = pick([0.8, 1]);
      const out = x * S * 1000 * pf, cu = x * x * Pcu, eta = out / (out + Pi + cu) * 100;
      return make('machines', 'hard', `A ${S} kVA transformer has iron loss ${Pi} W and full-load copper loss ${Pcu} W. Efficiency at ${x * 100}% load and ${pf} pf is:`, eta, '%',
        [[out / (out + Pi) * 100, 'Ignores copper loss.'], [out / (out + Pi + x * Pcu) * 100, 'Takes copper loss ∝ load instead of load².'], [out / (out + Pi + Pcu) * 100, 'Uses full-load copper loss at part load.']],
        [`Output = ${x} × ${S} × ${pf} = ${fmt(out / 1000)} kW`, `Cu loss = ${x}² × ${Pcu} = ${fmt(cu)} W`, `η = ${fmt(out)}/(${fmt(out)} + ${Pi} + ${fmt(cu)}) × 100`]);
    },
    () => { // max efficiency load
      const Pi = pick([200, 300, 400, 500, 800]), Pcu = pick([600, 900, 1200, 1600, 2000]), x = Math.sqrt(Pi / Pcu) * 100;
      return make('machines', 'medium', `Iron loss is ${Pi} W and full-load copper loss is ${Pcu} W. Maximum efficiency occurs at what percentage of full load?`, x, '%',
        [[Pi / Pcu * 100, 'Forgot the square root.'], [100, 'Only if the two losses are equal.'], [Pcu / Pi * 100, 'Ratio inverted.']],
        [`x = √(P_{i}/P_{cu,fl}) = √(${Pi}/${Pcu})`]);
    },
    () => { // alternator poles
      const P = pick([8, 10, 12, 16, 20, 24, 40, 48]), N = 6000 / P;
      return make('machines', 'easy', `A hydro-alternator runs at ${fmt(N)} rpm on a 50 Hz system. Number of poles:`, P, '',
        [[P / 2, 'Uses 60f/N.'], [P * 2, 'Uses 240f/N.'], [P + 4, 'Not consistent with P = 120f/N.']],
        [`P = 120f/N = 6000/${fmt(N)}`]);
    },
  ],
  power: [
    () => { // base impedance
      const kV = pick([11, 33, 66, 132, 220, 500]), MVA = pick([10, 50, 100, 500]), z = kV * kV / MVA;
      return make('power', 'easy', `Base impedance for ${kV} kV and ${MVA} MVA base is:`, z, 'Ω',
        [[kV / MVA, 'Uses kV/MVA.'], [MVA / (kV * kV), 'Inverted (base admittance).'], [z / 3, 'Divides by 3 — not needed with line kV and 3-φ MVA.']],
        [`Z_{base} = kV²/MVA = ${kV}²/${MVA}`]);
    },
    () => { // pf correction
      const P = pick([50, 100, 150, 200, 300, 500]), p1 = pick([0.6, 0.7, 0.75, 0.8]), p2 = pick([0.9, 0.95]);
      const t1 = tanOf(p1), t2 = tanOf(p2), Q = P * (t1 - t2);
      return make('power', 'hard', `A ${P} kW load at ${p1} pf lagging is to be improved to ${p2} pf lagging. Capacitor rating required:`, Q, 'kVAR',
        [[P * t2, 'That is the remaining kVAR after correction.'], [P * t1, 'That is the original kVAR.'], [P * (Math.sin(Math.acos(p1)) - Math.sin(Math.acos(p2))), 'Uses sin φ instead of tan φ.']],
        [`tan φ_{1} = ${t1.toFixed(3)}, tan φ_{2} = ${t2.toFixed(3)}`, `Q_{c} = P(tan φ_{1} − tan φ_{2}) = ${P} × ${(t1 - t2).toFixed(3)}`]);
    },
    () => { // fault MVA
      const MVA = pick([100, 200, 500]), z = pick([0.05, 0.08, 0.1, 0.125, 0.2, 0.25]), F = MVA / z;
      return make('power', 'easy', `Base ${MVA} MVA; Thevenin impedance to a fault is ${z} p.u. Fault level is:`, F, 'MVA',
        [[MVA * z, 'Multiplies instead of dividing.'], [MVA, 'Ignores impedance.'], [F / Math.sqrt(3), 'Divides by √3 unnecessarily.']],
        [`Fault MVA = base MVA/Z_{pu} = ${MVA}/${z}`]);
    },
    () => { // load factor
      const MD = pick([100, 150, 200, 250, 400]), LF = pick([40, 45, 50, 60, 65, 70]), E = MD * LF / 100 * 8760;
      return make('power', 'medium', `A consumer uses ${fmt(E)} kWh in a year with maximum demand ${MD} kW. Annual load factor is:`, LF, '%',
        [[E / (MD * 365), 'Divides by days, not hours.'], [100 - LF, 'Complement — no meaning.'], [LF * 0.876, 'Uses 10,000 hours instead of 8,760.']],
        [`Average load = ${fmt(E)}/8760 = ${fmt(E / 8760)} kW`, `LF = average/maximum = ${fmt(E / 8760)}/${MD}`]);
    },
    () => { // loss with voltage change
      const V1 = pick([66, 132]), V2 = V1 * 2, L = pick([400, 800, 1200]);
      return make('power', 'medium', `A line loses ${L} kW at ${V1} kV. For the same power, pf and conductor at ${V2} kV, the loss becomes:`, L / 4, 'kW',
        [[L / 2, 'Assumes loss ∝ 1/V.'], [L, 'Loss does change with voltage.'], [L * 4, 'Inverted relation.']],
        [`Loss ∝ 1/V²`, `New loss = ${L} × (${V1}/${V2})² = ${L}/4`]);
    },
  ],
  circuits: [
    () => { // 3-phase power
      const VL = pick([400, 415, 11000]), I = pick([10, 20, 50, 100]), pf = pick([0.8, 0.85, 0.9]), P = Math.sqrt(3) * VL * I * pf / 1000;
      return make('circuits', 'medium', `A balanced 3-phase load draws ${I} A at ${VL} V (line) and ${pf} pf. Active power is:`, P, 'kW',
        [[VL * I * pf / 1000, 'Missing √3.'], [3 * VL * I * pf / 1000, 'Uses 3 with line values.'], [Math.sqrt(3) * VL * I / 1000, 'Omits power factor (that is kVA).']],
        [`P = √3 V_{L} I_{L} cos φ = 1.732 × ${VL} × ${I} × ${pf}`]);
    },
    () => { // resonance
      const L = pick([1, 2, 5, 10, 20]), C = pick([1, 2, 5, 10, 20]), f = 1 / (2 * Math.PI * Math.sqrt(L * 1e-3 * C * 1e-6));
      return make('circuits', 'medium', `Resonant frequency of a series circuit with L = ${L} mH and C = ${C} µF is about:`, f, 'Hz',
        [[f * 2 * Math.PI, 'That is ω_{0} (rad/s), not Hz.'], [f / 10, 'Unit error (factor 10).'], [f * Math.sqrt(10), 'Wrong power of ten inside the root.']],
        [`f_{0} = 1/(2π√(LC)) = 1/(2π√(${L}×10⁻³ × ${C}×10⁻⁶))`]);
    },
    () => { // max power
      const V = pick([10, 12, 20, 24, 30, 48]), R = pick([2, 4, 5, 6, 8, 10]);
      return make('circuits', 'easy', `A source has V_{th} = ${V} V and R_{th} = ${R} Ω. Maximum power it can deliver to a load is:`, V * V / (4 * R), 'W',
        [[V * V / R, 'Uses V²/R.'], [V * V / (2 * R), 'Uses V²/2R.'], [V / (2 * R), 'That is current, not power.']],
        [`P_{max} = V_{th}²/(4R_{th}) = ${V}²/(4 × ${R})`]);
    },
  ],
  pe: [
    () => { // full converter
      const V = pick([220, 230, 240]), a = pick([30, 45, 60]), Vm = Math.SQRT2 * V, Vd = 2 * Vm / Math.PI * Math.cos(a * Math.PI / 180);
      return make('pe', 'medium', `A single-phase fully controlled bridge on ${V} V (rms) fired at α = ${a}° (continuous current). Average output is about:`, Vd, 'V',
        [[2 * Vm / Math.PI, 'Ignores cos α.'], [Vm / Math.PI * (1 + Math.cos(a * Math.PI / 180)), 'Semiconverter formula.'], [Vm / Math.PI * Math.cos(a * Math.PI / 180), 'Half-wave form.']],
        [`V_{m} = √2 × ${V} = ${fmt(Vm)} V`, `V_{dc} = (2V_{m}/π) cos ${a}°`]);
    },
    () => { // 3-phase bridge
      const VL = pick([380, 400, 415, 440]), a = pick([0, 30, 45, 60]), Vd = 1.35 * VL * Math.cos(a * Math.PI / 180);
      return make('pe', 'medium', `A three-phase fully controlled bridge on ${VL} V line, α = ${a}°. Average DC output is about:`, Vd, 'V',
        [[0.9 * VL * Math.cos(a * Math.PI / 180), 'Uses single-phase factor 0.9.'], [Math.SQRT2 * VL, 'Peak line voltage, not average.'], [1.35 * VL / Math.sqrt(3) * Math.cos(a * Math.PI / 180), 'Uses phase voltage with the line-voltage factor.']],
        [`V_{dc} = 1.35 V_{L} cos α = 1.35 × ${VL} × cos ${a}°`]);
    },
    () => { // buck/boost
      const Vin = pick([12, 24, 48, 100, 200]), D = pick([0.25, 0.4, 0.5, 0.6, 0.75]);
      return pick([
        () => make('pe', 'easy', `A buck converter has V_{in} = ${Vin} V and duty cycle ${D}. Output voltage:`, D * Vin, 'V',
          [[Vin / (1 - D), 'Boost formula.'], [(1 - D) * Vin, 'Uses (1 − D).'], [Vin * D / (1 - D), 'Buck–boost formula.']], [`V_{o} = D V_{in} = ${D} × ${Vin}`]),
        () => make('pe', 'medium', `A boost converter has V_{in} = ${Vin} V and duty cycle ${D}. Output voltage (ideal):`, Vin / (1 - D), 'V',
          [[D * Vin, 'Buck formula.'], [Vin * D / (1 - D), 'Buck–boost formula.'], [Vin / D, 'Uses 1/D.']], [`V_{o} = V_{in}/(1 − D) = ${Vin}/${fmt(1 - D)}`]),
      ])();
    },
  ],
  protection: [
    () => { // PSM
      const ratio = pick([200, 300, 400, 600]), set = pick([100, 125, 150]), If = ratio * pick([5, 8, 10, 12]), sec = If * 5 / ratio, psm = sec / (5 * set / 100);
      return make('protection', 'medium', `Overcurrent relay set at ${set}% on a ${ratio}/5 A CT. Fault current ${fmt(If)} A. Plug setting multiplier:`, psm, '',
        [[sec / 5, 'Ignores the plug setting.'], [If / ratio, 'Primary/CT primary — ignores setting.'], [sec, 'That is CT secondary current.']],
        [`Relay setting = ${set}% × 5 = ${fmt(5 * set / 100)} A`, `CT secondary = ${fmt(If)} × 5/${ratio} = ${fmt(sec)} A`, `PSM = ${fmt(sec)}/${fmt(5 * set / 100)}`]);
    },
    () => { // L-G fault
      const z1 = pick([0.1, 0.15, 0.2, 0.25]), z0 = pick([0.05, 0.1, 0.15]), Ia0 = 1 / (2 * z1 + z0);
      return make('protection', 'hard', `E = 1 p.u., Z_{1} = Z_{2} = j${z1}, Z_{0} = j${z0} p.u. (solid fault). Single line-to-ground fault current:`, 3 * Ia0, 'p.u.',
        [[Ia0, 'That is I_{a0}, not 3I_{a0}.'], [1 / z1, 'Three-phase fault current.'], [Math.sqrt(3) / (2 * z1), 'Line-to-line fault current.']],
        [`I_{a0} = 1/(Z_{1} + Z_{2} + Z_{0}) = 1/${fmt(2 * z1 + z0)} = ${fmt(Ia0)}`, 'I_{f} = 3I_{a0}']);
    },
    () => { // breaking capacity
      const kV = pick([11, 33, 132, 220]), kA = pick([20, 25, 31.5, 40]), M = Math.sqrt(3) * kV * kA;
      return make('protection', 'easy', `Symmetrical breaking capacity of a ${kV} kV breaker rated ${kA} kA:`, M, 'MVA',
        [[kV * kA, 'Missing √3.'], [3 * kV * kA, 'Uses 3 instead of √3.'], [kV * kA / Math.sqrt(3), 'Divides by √3.']],
        [`MVA = √3 × kV × kA = 1.732 × ${kV} × ${kA}`]);
    },
  ],
  control: [
    () => { // zeta wn
      const wn = pick([2, 3, 4, 5, 6, 8, 10]), z = pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.8]), b = 2 * z * wn;
      return make('control', 'medium', `For s² + ${fmt(b)}s + ${wn * wn} = 0, the damping ratio is:`, z, '',
        [[b / (wn * wn), 'Divides by ω_{n}² instead of 2ω_{n}.'], [b / wn, 'Forgot the factor 2.'], [b / (2 * wn * wn), 'Uses ω_{n}² for ω_{n}.']],
        [`ω_{n} = √${wn * wn} = ${wn}`, `ζ = ${fmt(b)}/(2 × ${wn})`]);
    },
    () => { // settling time
      const wn = pick([2, 4, 5, 8, 10]), z = pick([0.25, 0.4, 0.5, 0.8]);
      return make('control', 'easy', `A second-order system has ω_{n} = ${wn} rad/s and ζ = ${z}. Settling time (2% criterion):`, 4 / (z * wn), 's',
        [[3 / (z * wn), '5% criterion.'], [4 / wn, 'Ignores ζ.'], [Math.PI / (wn * Math.sqrt(1 - z * z)), 'That is peak time.']],
        [`t_{s} = 4/(ζω_{n}) = 4/(${z} × ${wn})`]);
    },
  ],
  em: [
    () => { // stretched wire
      const k = pick([2, 3, 4]), R = pick([2, 5, 10]);
      return make('em', 'medium', `A ${R} Ω wire is drawn out to ${k} times its length (volume constant). New resistance:`, R * k * k, 'Ω',
        [[R * k, 'Ignores the reduction in area.'], [R / k, 'Wrong direction.'], [R * k * k * k, 'Cubes the ratio.']],
        ['Length × k, area ÷ k (constant volume)', `R ∝ l/A → R × k² = ${R} × ${k * k}`]);
    },
  ],
};

/** Generate n fresh numerical questions (optionally for one topic). */
export function generateSet(exam, n = 5, topic) {
  const pools = topic && G[topic] ? [G[topic]] : Object.entries(G).filter(([t]) => exam.topicIndex[t]).map(([, g]) => g);
  if (!pools.length) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    const q = pick(pick(pools))();
    if (q.options.length === 4) out.push(q);
  }
  return out;
}
export const generatorTopics = Object.keys(G);
