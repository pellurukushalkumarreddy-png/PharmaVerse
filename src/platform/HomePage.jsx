import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOOLS, queryPharmaRAG } from './helpers';

export default function HomePage({ messages, setMessages, loading, setLoading, setChatHistory }) {
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const fileRef = useRef(null);
  const endRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageData({ base64: reader.result.split(',')[1], type: file.type });
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearImage = () => { setImagePreview(null); setImageData(null); };

  const send = async (text) => {
    const q = text || input.trim();
    if ((!q && !imageData) || loading) return;
    setInput('');
    const img = imageData;
    const imgPrev = imagePreview;
    clearImage();

    setMessages((prev) => [...prev, { role: 'user', text: q || 'Analyze this image', image: imgPrev }]);
    setChatHistory((prev) => [(imgPrev ? '[img] ' : '') + (q || 'Image').slice(0, 40), ...prev].slice(0, 10));
    setLoading(true);

    try {
      const resp = await queryPharmaRAG(q || 'Analyze this image', img);
      setMessages((prev) => [...prev, { role: 'ai', text: resp }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Sorry, could not process that. Please try again.' }]);
    }
    setLoading(false);
  };

  const fmt = (text) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('##')) return <h3 key={i} style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '14px 0 6px' }}>{line.replace(/^#+\s*/, '')}</h3>;
      if (line.startsWith('**') && line.includes('**')) {
        const parts = line.split(/\*\*/g);
        return <p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', margin: '4px 0' }}>{parts.map((p, j) => (j % 2 === 1 ? <strong key={j}>{p}</strong> : p))}</p>;
      }
      if (line.match(/^[-•]\s/)) return <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.65, color: '#4B5563', marginBottom: 3, paddingLeft: 4 }}><span style={{ color: '#6366F1' }}>•</span><span>{line.replace(/^[-•]\s/, '')}</span></div>;
      if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
      return <p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: '#374151', margin: '3px 0' }}>{line}</p>;
    });

  const InputBar = ({ placeholder }) => (
    <div>
      <input type="file" ref={fileRef} onChange={handleFile} accept="image/*" style={{ display: 'none' }} />
      {imagePreview && (
        <div style={{ maxWidth: 640, marginBottom: 8, position: 'relative', display: 'inline-block' }}>
          <img src={imagePreview} alt="Upload" style={{ maxHeight: 120, borderRadius: 10, border: '1px solid #E5E7EB' }} />
          <button onClick={clearImage} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#EF4444', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid ' + (imagePreview ? '#6366F1' : '#E5E7EB'), borderRadius: 12, padding: '0 6px 0 4px', background: '#fff', maxWidth: 640 }}>
        <button onClick={() => fileRef.current?.click()} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', color: '#9CA3AF', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Upload image">&#128206;</button>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={placeholder || 'Ask about any medicine, disease, or treatment...'} disabled={loading}
          style={{ flex: 1, border: 'none', outline: 'none', padding: '14px 8px', fontSize: 14, color: '#111827', background: 'transparent', fontFamily: 'inherit' }} />
        <button onClick={() => send()} disabled={(!input.trim() && !imageData) || loading}
          style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: (!input.trim() && !imageData) || loading ? '#E5E7EB' : '#6366F1', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>&#8593;</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 40px' }}>
        {/* Welcome state */}
        {messages.length === 0 && (
          <div style={{ paddingTop: 60 }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{ fontSize: 30, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Hello &#128075;</h2>
              <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px' }}>What do you want to know today?</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}><InputBar /></div>
              <p style={{ fontSize: 11, color: '#C5C9D1', margin: '8px 0 0' }}>Powered by Claude AI + live PubMed + openFDA | Upload images of medicines</p>
            </div>

            {/* Use Case Cards */}
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>Use Cases</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {TOOLS.map((t) => (
                  <div key={t.id} onClick={() => navigate('/' + t.id)}
                    style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px 22px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px ' + t.color + '12'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: t.color }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{t.icon}</div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{t.name}</h3>
                        <p style={{ margin: 0, fontSize: 12, color: t.color, fontWeight: 600 }}>{t.desc}</p>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{t.sub}</p>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {t.tags.slice(0, 4).map((tag) => <span key={tag} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: t.bg, color: t.color }}>{tag}</span>)}
                    </div>
                    <div style={{ position: 'absolute', bottom: 14, right: 16, fontSize: 12, fontWeight: 600, color: t.color }}>Open &#8594;</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.length > 0 && (
          <div style={{ paddingTop: 24, paddingBottom: 100, maxWidth: 780, margin: '0 auto' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                {m.role === 'user' ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>U</div>
                    <div style={{ paddingTop: 5 }}>
                      {m.image && <img src={m.image} alt="Uploaded" style={{ maxHeight: 160, borderRadius: 10, marginBottom: 8, display: 'block', border: '1px solid #E5E7EB' }} />}
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{m.text}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: '#fff', fontSize: 11 }}>&#9877;</span></div>
                    <div style={{ flex: 1, paddingTop: 2 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#6366F1' }}>PharmaVerse AI</span>
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#ECFDF5', color: '#059669', fontWeight: 700 }}>RAG</span>
                      </div>
                      <div>{fmt(m.text)}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 11 }}>&#9877;</span></div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 6 }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>Searching PubMed + openFDA</span>
                  {[0, 1, 2].map((j) => <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366F1', animation: 'bounce 1.2s ' + j * 0.15 + 's infinite ease-in-out' }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Bottom input when chatting */}
      {messages.length > 0 && (
        <div style={{ padding: '14px 40px 18px', borderTop: '1px solid #E5E7EB', background: '#F8F9FC' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}><InputBar placeholder="Ask a follow-up..." /></div>
        </div>
      )}
    </div>
  );
}
