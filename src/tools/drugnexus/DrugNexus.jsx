import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

import DB from "./data.json";
// ─── Helpers ─────────────────────────────────────────
const DRUGS = Object.values(DB.drugs);
const TARGETS = Object.values(DB.targets);
const DISEASES = Object.values(DB.diseases);

function getDrugTargets(drugId) {
  return DB.moaLinks.filter(l => l.drugId === drugId).map(l => ({
    ...l,
    target: DB.targets[l.targetId],
  })).filter(l => l.target);
}
function getDrugDiseases(drugId) {
  return DB.indLinks.filter(l => l.drugId === drugId).map(l => ({
    ...l,
    disease: DB.diseases[l.diseaseId],
  })).filter(l => l.disease);
}
function getTargetDrugs(targetId) {
  return DB.moaLinks.filter(l => l.targetId === targetId).map(l => ({
    ...l,
    drug: DB.drugs[l.drugId],
  })).filter(l => l.drug);
}
function getDrugBio(drugId) {
  return (DB.bioactivities || []).filter(b => b.drugId === drugId);
}

const C = {
  drug: "#E85D3A", drugBg: "#FDEEE9",
  target: "#2A7DE1", targetBg: "#E3EFFC",
  disease: "#0FA573", diseaseBg: "#E0F5ED",
  bg: "#0C1118", panel: "#141B24", card: "#1A2332",
  border: "#243044", text: "#E2E8F0", muted: "#8896AB",
  accent: "#E85D3A", accent2: "#2A7DE1",
};

const SF = "'Playfair Display',Georgia,serif";
const BF = "'DM Sans','Source Sans 3',system-ui,sans-serif";
const MF = "'JetBrains Mono',monospace";

// ─── Force Graph (D3) ──────────────────────────────
function ForceGraph({ drugId, onSelectDrug, onSelectTarget }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 700;
    const H = 440;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // Build graph data
    const nodes = [], links = [];
    const nodeSet = new Set();
    const addNode = (id, type, name) => {
      if (nodeSet.has(id)) return;
      nodeSet.add(id);
      nodes.push({ id, type, name: name?.length > 22 ? name.slice(0,20)+"…" : name, fullName: name });
    };

    // Center drug or all drugs
    const centerDrugs = drugId ? [DB.drugs[drugId]].filter(Boolean) : DRUGS.slice(0, 10);
    centerDrugs.forEach(d => {
      addNode(d.id, "drug", d.name);
      getDrugTargets(d.id).forEach(l => {
        addNode(l.targetId, "target", l.target.name);
        links.push({ source: d.id, target: l.targetId, type: "moa", label: l.action });
      });
      getDrugDiseases(d.id).slice(0, 6).forEach(l => {
        addNode(l.diseaseId, "disease", l.disease.name);
        links.push({ source: d.id, target: l.diseaseId, type: "indication" });
      });
    });

    // Colors
    const colorMap = { drug: C.drug, target: C.target, disease: C.disease };
    const sizeMap = { drug: 18, target: 14, disease: 10 };

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.type === "moa" ? 100 : 130))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide().radius(d => sizeMap[d.type] + 8));

    simRef.current = sim;

    // Defs
    const defs = svg.append("defs");
    defs.append("filter").attr("id","glow")
      .append("feGaussianBlur").attr("stdDeviation","3").attr("result","color");

    // Links
    const link = svg.append("g")
      .selectAll("line")
      .data(links).join("line")
      .attr("stroke", d => d.type === "moa" ? "#2A7DE155" : "#0FA57333")
      .attr("stroke-width", d => d.type === "moa" ? 2 : 1)
      .attr("stroke-dasharray", d => d.type === "indication" ? "4,4" : "none");

    // Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes).join("g")
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    node.append("circle")
      .attr("r", d => sizeMap[d.type])
      .attr("fill", d => colorMap[d.type])
      .attr("opacity", 0.85)
      .attr("filter", "url(#glow)");

    node.append("circle")
      .attr("r", d => sizeMap[d.type] - 3)
      .attr("fill", d => colorMap[d.type])
      .attr("opacity", 0.4);

    node.append("text")
      .text(d => d.name)
      .attr("dy", d => sizeMap[d.type] + 14)
      .attr("text-anchor", "middle")
      .style("font-size", d => d.type === "drug" ? "11px" : "9px")
      .style("font-weight", d => d.type === "drug" ? "700" : "500")
      .style("font-family", BF)
      .style("fill", "#8896AB")
      .style("pointer-events", "none");

    node.on("click", (e, d) => {
      if (d.type === "drug") onSelectDrug?.(d.id);
      else if (d.type === "target") onSelectTarget?.(d.id);
    });

    sim.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [drugId]);

  return <svg ref={svgRef} style={{ width: "100%", height: 440, background: C.bg, borderRadius: 12 }} />;
}

// ─── Shared UI ────────────────────────────────────
function Chip({ label, color, bg }) {
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: bg, color, letterSpacing: 0.3 }}>{label}</span>;
}
function TypeBadge({ type }) {
  const m = { drug: [C.drug, C.drugBg, "Drug"], target: [C.target, C.targetBg, "Target"], disease: [C.disease, C.diseaseBg, "Disease"] };
  const [c, b, l] = m[type] || m.drug;
  return <Chip label={l} color={c} bg={b} />;
}
function Card({ children, style: s, onClick }) {
  return <div onClick={onClick} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, ...s, cursor: onClick ? "pointer" : "default" }}>{children}</div>;
}
function StatBox({ label, value, color }) {
  return <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 24, fontWeight: 700, color: color || C.text, fontFamily: SF }}>{value}</div>
    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{label}</div>
  </div>;
}
function CTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.text }}>
    <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
    {payload.map((p, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.fill }} />
      {p.name}: <b>{p.value}</b>
    </div>)}
  </div>;
}

// ─── Tab 1: Explore ─────────────────────────────────
function ExploreTab({ onSelectDrug, onSelectTarget }) {
  const [search, setSearch] = useState("");
  const [focusDrug, setFocusDrug] = useState(null);

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return [
      ...DRUGS.filter(d => d.name.toLowerCase().includes(q)).map(d => ({ ...d, _type: "drug" })),
      ...TARGETS.filter(t => (t.name||"").toLowerCase().includes(q) || (t.genes||[]).some(g => g.toLowerCase().includes(q))).map(t => ({ ...t, _type: "target" })),
      ...DISEASES.filter(d => (d.name||"").toLowerCase().includes(q)).slice(0, 8).map(d => ({ ...d, _type: "disease" })),
    ].slice(0, 12);
  }, [search]);

  return <div>
    {/* Search */}
    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 14px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drugs, targets, diseases…"
          style={{ flex: 1, border: "none", outline: "none", padding: "11px 12px", fontSize: 14, color: C.text, background: "transparent", fontFamily: BF }} />
      </div>
      {focusDrug && <button onClick={() => setFocusDrug(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel, color: C.muted, fontSize: 12, cursor: "pointer" }}>Clear focus</button>}
    </div>

    {/* Quick picks */}
    {!search && !focusDrug && <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: C.muted, lineHeight: "28px" }}>Quick:</span>
      {["IMATINIB","PEMBROLIZUMAB","ASPIRIN","ATORVASTATIN","ADALIMUMAB","OSIMERTINIB"].map(n => {
        const d = DRUGS.find(x => x.name === n);
        return d && <button key={n} onClick={() => setFocusDrug(d.id)} style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${C.border}`, background: "transparent", color: C.drug, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{n}</button>;
      })}
    </div>}

    {/* Search results */}
    {search && results.length > 0 && <div style={{ background: C.panel, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 16, maxHeight: 200, overflow: "auto" }}>
      {results.map((r, i) => <div key={i} onClick={() => {
        if (r._type === "drug") { setFocusDrug(r.id); setSearch(""); }
        else if (r._type === "target") { onSelectTarget(r.id); setSearch(""); }
      }} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
        onMouseEnter={e => e.currentTarget.style.background = C.card}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <TypeBadge type={r._type} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name}</span>
        {r.genes && <span style={{ fontSize: 11, color: C.muted }}>{r.genes.join(", ")}</span>}
      </div>)}
    </div>}

    {/* Legend */}
    <div style={{ display: "flex", gap: 20, marginBottom: 12, justifyContent: "center" }}>
      {[["drug", C.drug, "●", "Drug"], ["target", C.target, "●", "Target"], ["disease", C.disease, "●", "Disease"]].map(([, c, dot, label]) =>
        <span key={label} style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ color: c, fontSize: 16 }}>{dot}</span> {label}
        </span>
      )}
      <span style={{ fontSize: 11, color: C.muted }}>—— MoA</span>
      <span style={{ fontSize: 11, color: C.muted }}>- - - Indication</span>
    </div>

    {/* Graph */}
    <ForceGraph drugId={focusDrug} onSelectDrug={id => onSelectDrug(id)} onSelectTarget={id => onSelectTarget(id)} />

    {/* Stats */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
      <Card><StatBox label="Drugs" value={DRUGS.length} color={C.drug} /></Card>
      <Card><StatBox label="Targets" value={TARGETS.length} color={C.target} /></Card>
      <Card><StatBox label="Diseases" value={DISEASES.length} color={C.disease} /></Card>
      <Card><StatBox label="Connections" value={DB.moaLinks.length + DB.indLinks.length} color={C.accent} /></Card>
    </div>
  </div>;
}

// ─── Tab 2: Drug Profile ───────────────────────────
function DrugProfile({ drugId, onBack }) {
  const drug = DB.drugs[drugId];
  if (!drug) return null;
  const targets = getDrugTargets(drugId);
  const diseases = getDrugDiseases(drugId);
  const bio = getDrugBio(drugId);
  const phaseData = [4,3,2,1].map(p => ({ name: `Phase ${p}`, count: diseases.filter(d => parseFloat(d.maxPhaseForInd) === p).length }));

  return <div>
    <button onClick={onBack} style={{ background: "none", border: "none", color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 16 }}>← Back</button>
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: C.drugBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: C.drug, fontFamily: SF }}>{drug.name[0]}</span>
      </div>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.text, fontFamily: SF }}>{drug.name}</h2>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <Chip label={drug.type || "Small molecule"} color={C.drug} bg={C.drugBg} />
          <Chip label={`Phase ${drug.maxPhase}`} color={C.target} bg={C.targetBg} />
          {drug.blackBox === 1 && <Chip label="Black Box Warning" color="#E24B4A" bg="#3A1C1C" />}
          <span style={{ fontSize: 12, color: C.muted, fontFamily: MF }}>{drugId}</span>
        </div>
      </div>
    </div>

    {/* Properties */}
    {drug.mw && <Card style={{ marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Molecular Properties</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        {[["MW", drug.mw, "Da"], ["ALogP", drug.alogp], ["HBA", drug.hba], ["HBD", drug.hbd], ["PSA", drug.psa, "Å²"], ["Ro5", drug.ro5, "violations"]].map(([l, v, u]) =>
          v != null && <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{v}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{l}{u ? ` (${u})` : ""}</div>
          </div>
        )}
      </div>
    </Card>}

    {/* Targets */}
    <Card style={{ marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Mechanism of Action ({targets.length} targets)</h3>
      {targets.map((t, i) => <div key={i} style={{ padding: "12px 0", borderBottom: i < targets.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.target }}>{t.target.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t.mechanism}</div>
          {t.target.genes?.length > 0 && <div style={{ fontSize: 11, color: C.muted, fontFamily: MF, marginTop: 2 }}>{t.target.genes.join(", ")}</div>}
        </div>
        <Chip label={t.action || "UNKNOWN"} color={C.accent} bg={`${C.accent}20`} />
      </div>)}
    </Card>

    {/* Indications */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Indications ({diseases.length})</h3>
        <div style={{ maxHeight: 240, overflow: "auto" }}>
          {diseases.slice(0, 15).map((d, i) => <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: C.disease }}>{d.disease.name}</span>
            <span style={{ color: C.muted, fontSize: 11 }}>Phase {d.maxPhaseForInd || "?"}</span>
          </div>)}
        </div>
      </Card>
      <Card>
        <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Indications by Phase</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={phaseData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
            <Tooltip content={<CTooltip />} />
            <Bar dataKey="count" fill={C.drug} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  </div>;
}

// ─── Tab 3: Target Profile ─────────────────────────
function TargetProfile({ targetId, onBack, onSelectDrug }) {
  const target = DB.targets[targetId];
  if (!target) return null;
  const drugs = getTargetDrugs(targetId);

  return <div>
    <button onClick={onBack} style={{ background: "none", border: "none", color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 16 }}>← Back</button>
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: C.targetBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.target} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, fontFamily: SF }}>{target.name}</h2>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <Chip label={target.type || "PROTEIN"} color={C.target} bg={C.targetBg} />
          <Chip label={target.organism || "Homo sapiens"} color={C.disease} bg={C.diseaseBg} />
          {target.genes?.map(g => <span key={g} style={{ fontFamily: MF, fontSize: 12, color: C.muted, padding: "2px 8px", background: C.panel, borderRadius: 4 }}>{g}</span>)}
          <span style={{ fontSize: 12, color: C.muted, fontFamily: MF }}>{targetId}</span>
        </div>
        {target.uniprots?.length > 0 && <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>UniProt: {target.uniprots.map(u => <a key={u} href={`https://www.uniprot.org/uniprot/${u}`} target="_blank" rel="noopener" style={{ color: C.target, marginRight: 8 }}>{u}</a>)}</div>}
      </div>
    </div>

    <Card>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Drugs targeting this protein ({drugs.length})</h3>
      {drugs.map((d, i) => <div key={i} onClick={() => onSelectDrug(d.drugId)} style={{ padding: "14px 0", borderBottom: i < drugs.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.drug }}>{d.drug.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{d.mechanism}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Chip label={d.action || "?"} color={C.accent} bg={`${C.accent}20`} />
          <Chip label={`Phase ${d.drug.maxPhase}`} color={C.target} bg={C.targetBg} />
        </div>
      </div>)}
    </Card>
  </div>;
}

// ─── Tab 4: Pathways (Sankey-like) ──────────────────
function PathwaysTab() {
  const [drugId, setDrugId] = useState(null);

  // Build flow: drug -> targets -> diseases
  const flowData = useMemo(() => {
    const did = drugId || DRUGS[0]?.id;
    if (!did) return null;
    const drug = DB.drugs[did];
    const targets = getDrugTargets(did);
    const diseases = getDrugDiseases(did).slice(0, 10);
    return { drug, targets, diseases };
  }, [drugId]);

  return <div>
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Select drug</label>
      <select value={drugId || DRUGS[0]?.id} onChange={e => setDrugId(e.target.value)}
        style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel, color: C.text, fontSize: 14, fontFamily: BF, outline: "none", minWidth: 200 }}>
        {DRUGS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
    </div>

    {flowData && <Card>
      <svg viewBox="0 0 800 400" style={{ width: "100%", height: 400 }}>
        {/* Drug node (left) */}
        <rect x="20" y="160" width="140" height="80" rx="12" fill={C.drug} opacity="0.9"/>
        <text x="90" y="195" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily={BF}>{flowData.drug.name}</text>
        <text x="90" y="215" textAnchor="middle" fill="white" fontSize="10" opacity="0.7" fontFamily={BF}>{flowData.drug.type}</text>

        {/* Target nodes (middle) */}
        {flowData.targets.map((t, i) => {
          const ty = 40 + i * (340 / Math.max(flowData.targets.length, 1));
          return <g key={t.targetId}>
            <line x1="160" y1="200" x2="300" y2={ty + 30} stroke={C.target} strokeWidth="2" opacity="0.4"/>
            <rect x="300" y={ty} width="180" height="56" rx="10" fill={C.target} opacity="0.85"/>
            <text x="390" y={ty + 22} textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily={BF}>
              {(t.target.name||"").length > 28 ? t.target.name.slice(0,26)+"…" : t.target.name}
            </text>
            <text x="390" y={ty + 38} textAnchor="middle" fill="white" fontSize="9" opacity="0.7" fontFamily={MF}>{t.action}</text>

            {/* Target to diseases */}
            {flowData.diseases.slice(0, 4).map((d, j) => {
              const dy = 20 + j * (360 / Math.max(flowData.diseases.length, 1));
              return <line key={`${t.targetId}-${d.diseaseId}`} x1="480" y1={ty + 28} x2="580" y2={dy + 20} stroke={C.disease} strokeWidth="1" opacity="0.2" strokeDasharray="4,4"/>;
            })}
          </g>;
        })}

        {/* Disease nodes (right) */}
        {flowData.diseases.slice(0, 10).map((d, i) => {
          const dy = 20 + i * (360 / Math.max(flowData.diseases.length, 1));
          return <g key={d.diseaseId}>
            <rect x="580" y={dy} width="200" height="36" rx="8" fill={C.disease} opacity="0.7"/>
            <text x="680" y={dy + 22} textAnchor="middle" fill="white" fontSize="9" fontWeight="500" fontFamily={BF}>
              {(d.disease.name||"").length > 30 ? d.disease.name.slice(0,28)+"…" : d.disease.name}
            </text>
          </g>;
        })}

        {/* Labels */}
        <text x="90" y="14" textAnchor="middle" fill={C.drug} fontSize="12" fontWeight="700" fontFamily={BF}>DRUG</text>
        <text x="390" y="14" textAnchor="middle" fill={C.target} fontSize="12" fontWeight="700" fontFamily={BF}>TARGETS</text>
        <text x="680" y="14" textAnchor="middle" fill={C.disease} fontSize="12" fontWeight="700" fontFamily={BF}>DISEASES</text>
      </svg>
    </Card>}
  </div>;
}

// ─── Tab 5: Compare ───────────────────────────────
function CompareTab({ onSelectDrug }) {
  const [sel, setSel] = useState(["", ""]);
  const upd = (i, v) => { const n = [...sel]; n[i] = v; setSel(n); };
  const valid = sel.filter(Boolean);
  const data = valid.map(id => {
    const drug = DB.drugs[id];
    const targets = getDrugTargets(id);
    const diseases = getDrugDiseases(id);
    return { drug, targets, diseases };
  }).filter(d => d.drug);

  const radarData = useMemo(() => {
    if (data.length < 2) return [];
    const maxT = Math.max(...data.map(d => d.targets.length), 1);
    const maxD = Math.max(...data.map(d => d.diseases.length), 1);
    const maxMW = Math.max(...data.map(d => parseFloat(d.drug.mw || 0) || 0), 1);
    return [
      { metric: "Targets", ...Object.fromEntries(data.map(d => [d.drug.name, Math.round(d.targets.length / maxT * 100)])) },
      { metric: "Indications", ...Object.fromEntries(data.map(d => [d.drug.name, Math.round(d.diseases.length / maxD * 100)])) },
      { metric: "MW", ...Object.fromEntries(data.map(d => [d.drug.name, Math.round((parseFloat(d.drug.mw || 0) / maxMW) * 100)])) },
      { metric: "Phase", ...Object.fromEntries(data.map(d => [d.drug.name, Math.round(parseFloat(d.drug.maxPhase || 0) / 4 * 100)])) },
    ];
  }, [data]);

  const PRESETS = [
    { label: "Kinase inhibitors", ids: ["CHEMBL941", "CHEMBL553", "CHEMBL3353410"] },
    { label: "Immuno-oncology", ids: ["CHEMBL3137343", "CHEMBL2108738"] },
    { label: "Anti-inflammatory", ids: ["CHEMBL1201580", "CHEMBL1201581", "CHEMBL25"] },
  ];
  const applyPreset = (pr) => setSel([...pr.ids.slice(0, 3), "", ""].slice(0, Math.max(sel.length, pr.ids.length)));
  const RC = [C.drug, C.target, C.disease];

  return <div>
    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: C.muted, lineHeight: "28px" }}>Presets:</span>
      {PRESETS.map(p => <button key={p.label} onClick={() => applyPreset(p)} style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${C.border}`, background: "transparent", color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{p.label}</button>)}
    </div>
    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
      {sel.map((s, i) => <select key={i} value={s} onChange={e => upd(i, e.target.value)}
        style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel, color: C.text, fontSize: 13, fontFamily: BF, outline: "none" }}>
        <option value="">Select drug {i + 1}</option>
        {DRUGS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>)}
      {sel.length < 3 && <button onClick={() => setSel([...sel, ""])} style={{ padding: "10px 16px", borderRadius: 8, border: `1px dashed ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>+</button>}
    </div>

    {data.length >= 2 && <>
      <div style={{ display: "grid", gridTemplateColumns: data.map(() => "1fr").join(" "), gap: 16, marginBottom: 20 }}>
        {data.map((d, i) => <Card key={d.drug.id} style={{ borderTop: `3px solid ${RC[i]}` }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: RC[i], fontFamily: SF }}>{d.drug.name}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <StatBox label="Targets" value={d.targets.length} color={RC[i]} />
            <StatBox label="Diseases" value={d.diseases.length} color={RC[i]} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>MoA</div>
            {d.targets.map(t => <div key={t.targetId} style={{ fontSize: 11, color: C.text, marginBottom: 2 }}>• {t.mechanism}</div>)}
          </div>
        </Card>)}
      </div>

      {radarData.length > 0 && <Card style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Comparison Radar</h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke={C.border} />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: C.muted }} />
            {data.map((d, i) => <Radar key={d.drug.name} name={d.drug.name} dataKey={d.drug.name} stroke={RC[i]} fill={RC[i]} fillOpacity={0.15} strokeWidth={2} />)}
            <Legend wrapperStyle={{ fontSize: 12, color: C.muted }} iconSize={10} />
            <Tooltip content={<CTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </Card>}

      {/* Shared targets */}
      {(() => {
        const allTids = data.map(d => new Set(d.targets.map(t => t.targetId)));
        const shared = [...allTids[0]].filter(tid => allTids.every(s => s.has(tid)));
        return shared.length > 0 && <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Shared Targets ({shared.length})</h3>
          {shared.map(tid => <div key={tid} style={{ padding: "8px 0", fontSize: 14, color: C.target, fontWeight: 600 }}>{DB.targets[tid]?.name}</div>)}
        </Card>;
      })()}
    </>}
  </div>;
}

// ─── Main App ─────────────────────────────────────
const TABS = [
  { id: "explore", label: "Explore", icon: "◎" },
  { id: "drug", label: "Drug Profile", icon: "💊" },
  { id: "target", label: "Target Profile", icon: "🎯" },
  { id: "pathways", label: "Pathways", icon: "→" },
  { id: "compare", label: "Compare", icon: "⚖" },
];

export default function DrugNexus() {
  const [tab, setTab] = useState("explore");
  const [drugId, setDrugId] = useState(null);
  const [targetId, setTargetId] = useState(null);

  const selectDrug = (id) => { setDrugId(id); setTab("drug"); };
  const selectTarget = (id) => { setTargetId(id); setTab("target"); };

  return <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: BF }}>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

    {/* Header */}
    <div style={{ padding: "14px 28px", display: "flex", alignItems: "center", gap: 20, borderBottom: `1px solid ${C.border}`, background: C.panel }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.drug}, ${C.target})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>⬡</span>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text, fontFamily: SF, lineHeight: 1 }}>DrugNexus</h1>
          <p style={{ margin: 0, fontSize: 10, color: C.muted, letterSpacing: 1 }}>Drug-Target Knowledge Graph</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)}
          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: tab === t.id ? `${C.accent}20` : "transparent", color: tab === t.id ? C.accent : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
        </button>)}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: `${C.disease}15`, border: `1px solid ${C.disease}30`, fontSize: 10, fontWeight: 600, color: C.disease }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.disease }} />
        ChEMBL Data
      </div>
    </div>

    {/* Content */}
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      {tab === "explore" && <ExploreTab onSelectDrug={selectDrug} onSelectTarget={selectTarget} />}
      {tab === "drug" && <DrugProfile drugId={drugId || DRUGS[0]?.id} onBack={() => setTab("explore")} />}
      {tab === "target" && <TargetProfile targetId={targetId || TARGETS[0]?.id} onBack={() => setTab("explore")} onSelectDrug={selectDrug} />}
      {tab === "pathways" && <PathwaysTab />}
      {tab === "compare" && <CompareTab onSelectDrug={selectDrug} />}
    </div>
  </div>;
}
