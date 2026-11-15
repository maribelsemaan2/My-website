import { useEffect, useState } from 'react';
import './PredictiveLab.css';
/* ===== Mock API layer (replace with real fetch calls later) ===== */
// Mock "backend" for the Predictive Lab. Mirrors the shape of the real FastAPI
// POST /predict response so the UI never needs to change when you switch over.
//
// To use the real backend: set USE_MOCK = false, then from the REPO ROOT run
//   bash backend/ai/ml/run_all.sh                      (once, trains the model)
//   uvicorn backend.api.main:app --reload --port 8000

const USE_MOCK = false; // real backend: POST /api/predict and /api/sweep
// Backend routes live in backend/api/ml_routes.py. The backend only allows the
// browser origin http://localhost:5173, so open the app at exactly that address.
const API_BASE = '/api'; // proxied to the backend by Vite (see vite.config.js)
const API_URL = `${API_BASE}/predict`;
const SWEEP_URL = `${API_BASE}/sweep`;

// Ranges the real model was trained on (NASA BASS-II, ISS microgravity).
const TRAINED = {
  o2: [16.8, 20.9],
  flow: [0.41, 7.55],
  diameters: [0.64, 0.95, 1.27],
};

const APPROX_ERROR = 0.0138; // typical cross-validated error, mm/s
const ROD_LENGTH_MM = 57;

// Hand-tuned stand-in for the real model (only used when USE_MOCK = true). NOT real NASA output.
// Shape: rises with O2, rises then falls with airflow, falls with thicker rods,
// clamped to the 0.02–0.10 mm/s range seen in the real data.
function mockModel(o2, flow, diameter) {
  const o2Factor = Math.min(1.6, Math.max(0.6, 1 + 0.18 * (o2 - 18.2)));
  const bell = (f) =>
    Math.exp(-((Math.log(f) - Math.log(3.5)) ** 2) / (2 * 0.9 ** 2));
  const lowFlowPenalty = flow < 0.6 ? 0.55 : 1;
  const flowFactor = (bell(Math.max(flow, 0.05)) / bell(1.7)) * lowFlowPenalty;
  const diameterFactor = Math.pow(0.64 / diameter, 0.8);
  const raw = 0.0669 * o2Factor * flowFactor * diameterFactor;
  return Math.min(0.1, Math.max(0.02, raw));
}

// O2 sweep for the chart (mock only: the real API predicts one point per call).
function sweepO2(flow, diameter, steps = 42) {
  const [lo, hi] = TRAINED.o2;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const o2 = lo + ((hi - lo) * i) / steps;
    return { o2, rate: mockModel(o2, flow, diameter) };
  });
}

function hazardLabel(rate) {
  if (rate < 0.045) return 'Lower within tested range';
  if (rate < 0.075) return 'Moderate within tested range';
  return 'Higher within tested range';
}

function buildMockResponse({ o2_percent: o2, opposed_flow_cm_s: flow, rod_diameter_cm: d }) {
  const rate = mockModel(o2, flow, d);
  const warnings = [];
  let outOfRange = false;

  if (o2 < TRAINED.o2[0] || o2 > TRAINED.o2[1]) {
    outOfRange = true;
    warnings.push(
      `O₂ of ${o2}% is outside the tested range (${TRAINED.o2[0]}–${TRAINED.o2[1]}%). This is an extrapolation.`
    );
  }
  if (flow < TRAINED.flow[0] || flow > TRAINED.flow[1]) {
    outOfRange = true;
    warnings.push(
      `Airflow of ${flow} cm/s is outside the tested range (${TRAINED.flow[0]}–${TRAINED.flow[1]} cm/s). This is an extrapolation.`
    );
  }
  if (!TRAINED.diameters.includes(d)) {
    outOfRange = true;
    warnings.push(
      `Rod diameter ${d} cm was not tested. NASA used 0.64, 0.95 and 1.27 cm rods.`
    );
  }
  if (d === 0.64 && o2 > 18.9 && o2 <= TRAINED.o2[1]) {
    warnings.push(
      '0.64 cm rods were only tested at 16.8–18.9% O₂, so this point is interpolation.'
    );
  }
  if (flow > 3 && flow <= TRAINED.flow[1]) {
    warnings.push('Very few NASA tests exceed 3 cm/s, so the high-flow trend is weakly supported.');
  }

  const indicators = [];
  if (flow < 0.6) {
    indicators.push({
      text: 'In the NASA tests, no flame spread was observed below about 0.6 cm/s of opposed flow.',
    });
  } else {
    indicators.push({
      text: 'Spread rate first rises, then falls, as opposed flow increases.',
    });
  }
  if (o2 <= 18.5) {
    indicators.push({
      text: 'At 1g, flames could not be sustained at or below about 18% O₂, but in microgravity they spread.',
    });
  } else {
    indicators.push({
      text: 'The limiting oxygen level is lower in microgravity than at 1g.',
    });
  }

  const confidence = outOfRange ? 'Low' : 'Medium';

  return {
    modelPrediction: {
      predictedSpreadRate_mm_s: Number(rate.toFixed(4)),
      approxRange_mm_s: [
        Number(Math.max(0, rate - APPROX_ERROR).toFixed(4)),
        Number((rate + APPROX_ERROR).toFixed(4)),
      ],
      valueType: 'mock_prediction',
      model: 'Mock curve (stand-in for the Ridge model)',
    },
    peakTemperature: {
      available: false,
      reason: 'Temperature was not measured in the NASA BASS-II spread-rate tables.',
    },
    confidence,
    evidenceStatus: 'Limited (52 ISS tests, 19 samples)',
    warnings,
    unsupportedInputs: [],
    risk: {
      hazardIndicator: hazardLabel(rate),
      evidenceConfidence: confidence,
      indicators,
    },
    source: 'Link et al., Scientific Reports 8:120 (2018), NASA BASS-II',
  };
}

async function predictSpreadRate(input, { signal } = {}) {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return buildMockResponse(input);
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Prediction request failed (${response.status})`);
  }
  return response.json();
}

// O2 sweep for the chart. Mock mode computes it locally; real mode asks
// POST /api/sweep, so the curve is actual model output.
async function fetchSweep(flow, diameter, { signal } = {}) {
  if (USE_MOCK) {
    return { points: sweepO2(flow, diameter), approxError: APPROX_ERROR };
  }
  const response = await fetch(SWEEP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opposed_flow_cm_s: flow, rod_diameter_cm: diameter }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Sweep request failed (${response.status})`);
  }
  return response.json();
}
/* ===== End API layer ===== */

const MODEL_STATS = [
  { label: 'MAE', value: '0.0108 mm/s' },
  { label: 'RMSE', value: '0.0133 mm/s' },
  { label: 'R²', value: '0.51' },
  { label: 'MAPE', value: '21.6%' },
  { label: 'Samples', value: '19 (52 tests)' },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtRate = (v) => v.toFixed(3);

/* ---------- Flame front animation ---------- */
const SPEEDUP = 200; // illustrative playback speed

function FlameRod({ rate, diameter, flow }) {
  const cycle = ROD_LENGTH_MM / rate / SPEEDUP; // seconds per pass
  const rodH = 12 + (diameter / 1.27) * 16;
  const rodY = 45 - rodH / 2;

  return (
    <svg
      className="rod-svg"
      viewBox="0 0 600 90"
      role="img"
      aria-label={`Illustration of a flame moving along a plastic rod at ${fmtRate(rate)} millimeters per second`}
    >
      {/* opposed flow chevrons, flowing right to left */}
      <g className="flow-marks" fill="none" stroke="#5b6b86" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M588 14 L578 20 L588 26" />
        <path d="M566 14 L556 20 L566 26" />
        <path d="M544 14 L534 20 L544 26" />
      </g>
      <text x="524" y="24" textAnchor="end" className="rod-note">
        opposed flow {flow} cm/s
      </text>

      {/* unburnt rod */}
      <rect x="20" y={rodY} width="560" height={rodH} rx="4" fill="#26344a" />

      <g key={cycle} style={{ '--cycle': `${cycle}s` }}>
        {/* burnt section */}
        <rect
          className="rod-burnt"
          x="20"
          y={rodY}
          width="560"
          height={rodH}
          rx="4"
          fill="#0f1623"
        />
        {/* flame front */}
        <g className="rod-flame">
          <ellipse cx="20" cy="45" rx="18" ry={rodH / 2 + 12} fill="#38bdf8" opacity="0.28" />
          <ellipse cx="20" cy="45" rx="11" ry={rodH / 2 + 6} fill="#38bdf8" opacity="0.7" />
          <ellipse cx="20" cy="45" rx="5" ry={rodH / 2 + 1} fill="#e0f2fe" />
        </g>
      </g>

      <text x="20" y="84" className="rod-note">ignition end</text>
    </svg>
  );
}

/* ---------- O2 sweep chart ---------- */
function SweepChart({ flow, diameter, o2, result }) {
  const W = 480;
  const H = 220;
  const pad = { l: 48, r: 14, t: 14, b: 36 };
  const [xLo, xHi] = TRAINED.o2;
  const yMax = 0.12;

  const sx = (v) => pad.l + ((v - xLo) / (xHi - xLo)) * (W - pad.l - pad.r);
  const sy = (v) => H - pad.b - (v / yMax) * (H - pad.t - pad.b);

  const [sweep, setSweep] = useState({ points: [], approxError: APPROX_ERROR });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSweep(await fetchSweep(flow, diameter, { signal: controller.signal }));
      } catch (err) {
        if (err.name !== 'AbortError') setSweep((s) => ({ ...s, points: [] }));
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [flow, diameter]);
  const pts = sweep.points;
  const err = sweep.approxError;
  const hasData = pts.length > 0;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.o2).toFixed(1)} ${sy(p.rate).toFixed(1)}`).join(' ');
  const upper = pts.map((p) => `${sx(p.o2).toFixed(1)} ${sy(Math.min(yMax, p.hi ?? p.rate + err)).toFixed(1)}`);
  const lower = pts
    .slice()
    .reverse()
    .map((p) => `${sx(p.o2).toFixed(1)} ${sy(Math.max(0, p.lo ?? p.rate - err)).toFixed(1)}`);
  const band = `M${upper.join(' L')} L${lower.join(' L')} Z`;

  const showMarker = result && o2 >= xLo && o2 <= xHi;
  const yTicks = [0, 0.03, 0.06, 0.09, 0.12];
  const xTicks = [17, 18, 19, 20];

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Predicted spread rate across the tested oxygen range at the current airflow and rod diameter"
    >
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} className="chart-grid" />
          <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end" className="chart-tick">
            {t.toFixed(2)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={t} x={sx(t)} y={H - pad.b + 18} textAnchor="middle" className="chart-tick">
          {t}%
        </text>
      ))}
      <text x={(pad.l + W - pad.r) / 2} y={H - 4} textAnchor="middle" className="chart-axis">
        O₂ concentration
      </text>
      <text
        x={12}
        y={(pad.t + H - pad.b) / 2}
        textAnchor="middle"
        className="chart-axis"
        transform={`rotate(-90 12 ${(pad.t + H - pad.b) / 2})`}
      >
        spread rate (mm/s)
      </text>

      {hasData && <path d={band} className="chart-band" />}
      {hasData && <path d={line} className="chart-line" />}

      {showMarker && (
        <g>
          <line x1={sx(o2)} x2={sx(o2)} y1={pad.t} y2={H - pad.b} className="chart-guide" />
          <circle
            cx={sx(o2)}
            cy={sy(result.modelPrediction.predictedSpreadRate_mm_s)}
            r="5"
            className="chart-dot"
          />
        </g>
      )}
    </svg>
  );
}

/* ---------- Input controls ---------- */
function SliderField({ id, label, unit, min, max, step, raw, onChange }) {
  const num = parseFloat(raw);
  const sliderValue = Number.isFinite(num) ? clamp(num, min, max) : min;
  const outside = Number.isFinite(num) && (num < min || num > max);

  return (
    <div className="field">
      <div className="field-top">
        <label htmlFor={`${id}-num`} className="field-label">{label}</label>
        <div className="num-wrap">
          <input
            id={`${id}-num`}
            className={`num-input ${outside ? 'num-input--outside' : ''}`}
            type="number"
            inputMode="decimal"
            step={step}
            value={raw}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="num-unit">{unit}</span>
        </div>
      </div>
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="slider-range">
        <span>{min}</span>
        <span>tested range</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

/* ---------- Predictive Lab ---------- */
export default function PredictiveLab({ gravityOption }) {
  const gravity = gravityOption;
  const [o2Raw, setO2Raw] = useState('18.2');
  const [flowRaw, setFlowRaw] = useState('1.7');
  const [diameter, setDiameter] = useState(0.64);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const o2 = parseFloat(o2Raw);
  const flow = parseFloat(flowRaw);
  const valid = Number.isFinite(o2) && Number.isFinite(flow) && o2 > 0 && flow > 0;

  useEffect(() => {
    if (!valid) return undefined;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await predictSpreadRate(
          { o2_percent: o2, opposed_flow_cm_s: flow, rod_diameter_cm: diameter, g: gravity.g },
          { signal: controller.signal }
        );
        setResult(data);
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [o2, flow, diameter, valid, gravity.g]);

  const rate = result?.modelPrediction.predictedSpreadRate_mm_s;
  const range = result?.modelPrediction.approxRange_mm_s;
  const hazard = result?.risk.hazardIndicator ?? '';
  const hazardClass = hazard.startsWith('Lower')
    ? 'hazard--low'
    : hazard.startsWith('Higher') || hazard.startsWith('Upper')
    ? 'hazard--high'
    : 'hazard--mid';
  const confClass = result?.confidence === 'Low' ? 'conf--low' : 'conf--mid';
  const isZeroG = gravity.g === 0;

  return (
    <section className="predictive-lab lab">
      <div className={`notice ${isZeroG ? '' : 'notice--warn'}`}>
        <span className={`dot ${isZeroG ? 'dot--green' : 'dot--orange'}`} aria-hidden="true" />
        <p>
          {isZeroG
            ? 'The model is trained on ISS microgravity (0g) data, which matches this setting.'
            : `The model is trained on ISS microgravity (0g) data only. Gravity is not a model input, so ${gravity.label} changes the label but not the prediction.`}
        </p>
        {USE_MOCK && <span className="mock-tag">Mock data</span>}
      </div>

      <div className="lab-grid">
        {/* 1. Inputs */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-label">1. INPUTS</span>
          </div>

          <SliderField
            id="o2"
            label="Oxygen concentration"
            unit="%"
            min={TRAINED.o2[0]}
            max={TRAINED.o2[1]}
            step={0.1}
            raw={o2Raw}
            onChange={setO2Raw}
          />
          <SliderField
            id="flow"
            label="Opposed airflow"
            unit="cm/s"
            min={TRAINED.flow[0]}
            max={TRAINED.flow[1]}
            step={0.01}
            raw={flowRaw}
            onChange={setFlowRaw}
          />

          <div className="field">
            <span className="field-label" id="diameter-label">PMMA rod diameter</span>
            <div className="seg" role="group" aria-labelledby="diameter-label">
              {TRAINED.diameters.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`seg-option ${diameter === d ? 'seg-option--active' : ''}`}
                  aria-pressed={diameter === d}
                  onClick={() => setDiameter(d)}
                >
                  {d} cm
                </button>
              ))}
            </div>
          </div>

          {!valid && (
            <p className="inline-error">Enter a positive number for oxygen and airflow.</p>
          )}
        </div>

        {/* 2. Prediction */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-label">2. PREDICTION</span>
            <span className={`status ${loading ? 'status--busy' : ''}`}>
              {loading ? 'Computing…' : 'Up to date'}
            </span>
          </div>

          {error && <p className="inline-error">{error}</p>}

          {rate !== undefined && (
            <>
              <div className="headline">
                <span className="headline-value">{fmtRate(rate)}</span>
                <span className="headline-unit">mm/s</span>
              </div>
              <p className="headline-range">
                Likely range {fmtRate(range[0])} to {fmtRate(range[1])} mm/s
              </p>
              <p className="headline-plain">
                About {(rate * 60).toFixed(1)} mm per minute. A {ROD_LENGTH_MM} mm rod would take roughly{' '}
                {Math.round(ROD_LENGTH_MM / rate / 60)} minutes to burn through.
              </p>

              <FlameRod rate={rate} diameter={diameter} flow={Number.isFinite(flow) ? flow : 0} />
              <p className="caption">Illustration only, played at {SPEEDUP}× speed.</p>

              <div className="temp-row">
                <span className="temp-label">Peak temperature</span>
                <span className="temp-value">Not measured in NASA data</span>
              </div>
            </>
          )}
        </div>

        {/* 3. Risk and evidence */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-label">3. RISK &amp; EVIDENCE</span>
          </div>

          {result && (
            <>
              <div className="verdicts">
                <div className="verdict">
                  <span className="verdict-label">Hazard</span>
                  <span className={`chip ${hazardClass}`}>{hazard}</span>
                </div>
                <div className="verdict">
                  <span className="verdict-label">Evidence</span>
                  <span className={`chip ${confClass}`}>{result.risk.evidenceConfidence}</span>
                </div>
              </div>
              <p className="fine">
                Hazard compares this rate with the rates NASA observed. It is not a safety score.
                Evidence: {result.evidenceStatus}.
              </p>

              {result.warnings.length > 0 && (
                <ul className="warn-list">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}

              <h3 className="sub-head">What the paper found</h3>
              <ul className="finding-list">
                {result.risk.indicators.map((i) => (
                  <li key={i.text}>{i.text}</li>
                ))}
              </ul>
              <p className="source">{result.source}</p>
            </>
          )}
        </div>
      </div>

      {/* Model vs reality */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-label">MODEL BEHAVIOR · O₂ SWEEP</span>
          <span className="status">
            at {Number.isFinite(flow) ? flow : '–'} cm/s, {diameter} cm rod
          </span>
        </div>
        <SweepChart flow={clamp(Number.isFinite(flow) ? flow : 1.7, 0.05, 50)} diameter={diameter} o2={o2} result={result} />
        <p className="caption">
          Line is the predicted rate; the shaded band is one typical cross-validated error.
        </p>

        <dl className="stats">
          {MODEL_STATS.map((s) => (
            <div className="stat" key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="caption">
          Ridge regression on log(spread rate), leave-one-sample-out validation, trained on NASA BASS-II ISS tests (Link et al., 2018).
          {USE_MOCK && ' The values above are produced by a mock curve until the backend is connected.'}
        </p>
      </div>
    </section>
  );
}
