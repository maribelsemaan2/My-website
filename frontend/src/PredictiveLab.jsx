import { useEffect, useState } from 'react';
import './PredictiveLab.css';

// Ranges the NASA BASS-II ISS tests actually covered (see /api/ml/health).
const DIAMETERS = [0.64, 0.95, 1.27];

const VALUE_TYPE_LABEL = {
  experimentally_observed_finding: 'Observed in NASA tests',
  derived_rule: 'Rule derived from data',
};

export default function PredictiveLab({ gravityOption }) {
  const [o2, setO2] = useState(18.5);
  const [flow, setFlow] = useState(2);
  const [diameter, setDiameter] = useState(0.64);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Re-run (debounced) whenever an input or the gravity environment changes.
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            o2_percent: Number(o2),
            opposed_flow_cm_s: Number(flow),
            rod_diameter_cm: Number(diameter),
            gravity_g: gravityOption.g,
          }),
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Invalid input');
        setResult(data);
      } catch (e) {
        if (e.name !== 'AbortError') {
          setResult(null);
          setError(e.message);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [o2, flow, diameter, gravityOption.g]);

  const pred = result?.modelPrediction;

  return (
    <section className="lab">
      <div className="lab-inputs card">
        <h2>Scenario</h2>
        <label>
          <span>Oxygen concentration <b>{o2}%</b></span>
          <input type="range" min="15" max="25" step="0.1" value={o2} onChange={(e) => setO2(e.target.value)} />
        </label>
        <label>
          <span>Opposed airflow <b>{flow} cm/s</b></span>
          <input type="range" min="0.2" max="10" step="0.1" value={flow} onChange={(e) => setFlow(e.target.value)} />
        </label>
        <label>
          <span>PMMA rod diameter</span>
          <select value={diameter} onChange={(e) => setDiameter(e.target.value)}>
            {DIAMETERS.map((d) => (
              <option key={d} value={d}>{d} cm</option>
            ))}
          </select>
        </label>
        <p className="lab-note">
          Model trained on 52 ISS tests (BASS-II, PMMA rods). Sliders beyond ~16.8–20.9% O₂ or ~0.4–7.5 cm/s extrapolate.
        </p>
      </div>

      <div className="lab-output card" aria-live="polite">
        <h2>Result {loading && <small>updating…</small>}</h2>

        {error && <div className="lab-banner lab-banner--error">Error: {error}</div>}

        {result?.status === 'unsupported_gravity' && (
          <div className="lab-banner lab-banner--warn">
            <b>No prediction for {gravityOption.label}.</b>
            <p>{result.message}</p>
          </div>
        )}

        {pred && (
          <>
            <div className="lab-big">
              <span className="lab-big-num">{pred.predictedSpreadRate_mm_s.toFixed(3)}</span>
              <span className="lab-big-unit">mm/s predicted flame spread rate</span>
              <span className="lab-range">
                typical error range {pred.approxRange_mm_s[0].toFixed(3)} – {pred.approxRange_mm_s[1].toFixed(3)} mm/s
              </span>
            </div>

            <div className="lab-pills">
              <span className={`pill pill--${result.confidence.toLowerCase()}`}>Confidence: {result.confidence}</span>
              <span className="pill">Evidence: {result.evidenceStatus}</span>
            </div>

            {result.warnings.length > 0 && (
              <div className="lab-banner lab-banner--warn">
                {result.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            )}

            <h3>Relative spread rate</h3>
            <p className="lab-tier">{result.risk.hazardIndicator}</p>
            <p className="lab-note">{result.risk.disclaimer}</p>
            <details>
              <summary>How is this tier decided?</summary>
              <p className="lab-note">{result.risk.hazardBasis}</p>
            </details>

            {result.risk.indicators.length > 0 && (
              <>
                <h3>What NASA's tests showed</h3>
                <ul className="lab-indicators">
                  {result.risk.indicators.map((i) => (
                    <li key={i.text}>
                      <span className="tag">{VALUE_TYPE_LABEL[i.valueType] ?? i.valueType}</span> {i.text}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="lab-note">
              Peak temperature: not available — {result.peakTemperature.reason}
            </p>
            <p className="lab-source">Source: {result.source}</p>
          </>
        )}
      </div>
    </section>
  );
}
