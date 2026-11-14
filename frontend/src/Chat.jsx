import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Chat.css';

const SUGGESTIONS = [
  'Which experiments studied fire suppression?',
  'How does flame spread behave in microgravity?',
  'What happened in the Apollo 1 fire?',
];

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(question) {
    const q = question.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
      setMessages((m) => [...m, { role: 'bot', text: data.answer, sources: data.sources }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', error: true, text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="chat">
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Ask about NASA microgravity combustion data.</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg--${m.role} ${m.error ? 'chat-msg--error' : ''}`}>
            <div className={`chat-text ${m.role === 'bot' && !m.error ? 'md' : ''}`}>
              {m.role === 'bot' && !m.error ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
                    table: (props) => (
                      <div className="table-wrap">
                        <table {...props} />
                      </div>
                    ),
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              ) : (
                m.text
              )}
            </div>
            {m.sources?.length > 0 && (
              <div className="chat-sources">
                <span>Sources:</span>
                {m.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" title={s.title}>
                    {s.accession}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="chat-msg chat-msg--bot chat-typing">Searching NASA data…</div>}
        <div ref={endRef} />
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the data…"
          aria-label="Question"
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
