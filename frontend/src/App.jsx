import { useState } from 'react';
import './App.css';
import Chat from './Chat.jsx';
import PredictiveLab from './PredictiveLab.jsx';
import ResearchExplorer from './ResearchExplorer.jsx';

const TABS = [
  { id: 'research', label: '1. Research Explorer' },
  { id: 'predictive', label: '2. Predictive Lab' },
  { id: 'chat', label: '3. Ask the Data' },
];

// g = gravity level sent to the model. Only ISS microgravity (~0 g) has NASA data behind it.
const GRAVITY_OPTIONS = [
  { id: 'iss', label: 'ISS Microgravity ~0g', badge: 'ISS / MICROGRAVITY / ~0g', g: 0 },
];

const PAGE_META = {
  research: {
    section: 'RESEARCH OPERATIONS / 01',
    title: 'Research Explorer',
    subtitle: 'Browse the evidence. Compare the experiments.',
  },
  predictive: {
    section: 'SIMULATION OPERATIONS / 02',
    title: 'Predictive Lab',
    subtitle: 'Model the cabin. Understand the flame. Quantify the risk.',
  },
  chat: {
    section: 'RAG ASSISTANT / 03',
    title: 'Ask the Data',
    subtitle: 'Questions answered from NASA PSI and fire-safety sources.',
  },
};

function LogoMark() {
  return (
    <svg
      className="logo-mark"
      width="14"
      height="26"
      viewBox="0 0 14 26"
      aria-hidden="true"
    >
      <rect x="0" y="2" width="4" height="22" rx="2" fill="#22D3EE" />
      <rect x="8" y="7" width="4" height="17" rx="2" fill="#F97316" />
    </svg>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('predictive');
  const [gravity, setGravity] = useState('iss');

  const activeGravity = GRAVITY_OPTIONS.find((g) => g.id === gravity);
  const page = PAGE_META[activeTab];

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <LogoMark />
          <div className="brand-text">
            <span className="brand-title">FLAME IN FREEFALL</span>
            <span className="brand-subtitle">// PSI-SI</span>
          </div>
        </div>

        <nav className="tabs" aria-label="Primary">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="nav-right">
          <div className="gravity" role="group" aria-label="Gravity environment">
            {GRAVITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`gravity-option ${
                  gravity === opt.id ? 'gravity-option--active' : ''
                }`}
                aria-pressed={gravity === opt.id}
                onClick={() => setGravity(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="status-badge">
            <span className="dot dot--green" aria-hidden="true" />
            <span>NASA PSI Synced</span>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-left">
          <span className="hero-label">{page.section}</span>
          <div className="hero-heading-row">
            <h1 className="hero-title">{page.title}</h1>
            <p className="hero-subtitle">{page.subtitle}</p>
          </div>
        </div>

        <div className="env-badge">
          <span className="dot dot--orange" aria-hidden="true" />
          <span>{activeGravity.badge}</span>
        </div>
      </section>

      {activeTab === 'research' && <ResearchExplorer />}
      {activeTab === 'predictive' && <PredictiveLab gravityOption={activeGravity} />}
      {activeTab === 'chat' && <Chat />}
    </div>
  );
}
