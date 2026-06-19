import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

// Real data from ClinicalTrials.gov API (fetched May 2026)
import TRIAL_DB from "./data.json";
const PHASES = ["EARLY_PHASE1","PHASE1","PHASE2","PHASE3","PHASE4"];
const STATUSES = ["RECRUITING","NOT_YET_RECRUITING","ACTIVE_NOT_RECRUITING","COMPLETED","TERMINATED","WITHDRAWN","SUSPENDED"];
const PL = { EARLY_PHASE1:"Early 1",PHASE1:"Phase 1",PHASE2:"Phase 2",PHASE3:"Phase 3",PHASE4:"Phase 4",NA:"N/A" };
const SC = {
  RECRUITING:{bg:"#E1F5EE",text:"#0F6E56",dot:"#1D9E75"},NOT_YET_RECRUITING:{bg:"#E6F1FB",text:"#185FA5",dot:"#378ADD"},ACTIVE_NOT_RECRUITING:{bg:"#FAEEDA",text:"#854F0B",dot:"#EF9F27"},COMPLETED:{bg:"#EAF3DE",text:"#3B6D11",dot:"#639922"},TERMINATED:{bg:"#FCEBEB",text:"#A32D2D",dot:"#E24B4A"},WITHDRAWN:{bg:"#F1EFE8",text:"#5F5E5A",dot:"#888780"},SUSPENDED:{bg:"#FAECE7",text:"#993C1D",dot:"#D85A30"},
};
const PIE_C = ["#534AB7","#1D9E75","#D85A30","#378ADD","#639922","#E24B4A","#888780"];
const SP_C = ["#534AB7","#1D9E75","#D85A30"];
const fmtSt = s => (s||"").replace(/_/g," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const fmtD = d => { if(!d) return "\u2014"; try { return new Date(d).toLocaleDateString("en-US",{year:"numeric",month:"short"}); } catch { return d; } };
const SF = "'Source Serif 4',Georgia,serif";
const MF = "'JetBrains Mono',monospace";

function findTrials(term) {
  if (!term) return [];
  const t = term.toLowerCase().trim();
  if (TRIAL_DB[t]) return TRIAL_DB[t];
  const keys = Object.keys(TRIAL_DB).filter(k => k !== "_sponsors");
  for (const k of keys) { if (k.includes(t) || t.includes(k)) return TRIAL_DB[k]; }
  const all = keys.flatMap(k => TRIAL_DB[k]);
  const matched = all.filter(s => {
    const p = s.protocolSection || {};
    const text = [p.identificationModule?.briefTitle, p.sponsorCollaboratorsModule?.leadSponsor?.name, ...(p.conditionsModule?.conditions || [])].join(" ").toLowerCase();
    return text.includes(t);
  });
  return matched.length > 0 ? matched : all.slice(0, 8);
}
function findSponsorTrials(name) {
  const sp = TRIAL_DB._sponsors || {};
  if (sp[name]) return sp[name];
  const n = name.toLowerCase();
  for (const [k, v] of Object.entries(sp)) { if (k.toLowerCase().includes(n) || n.includes(k.toLowerCase().split(" ")[0])) return v; }
  return [];
}

// UI atoms
function StatusBadge({status}) { const c=SC[status]||SC.WITHDRAWN; return <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:0.3,background:c.bg,color:c.text,whiteSpace:"nowrap"}}><span style={{width:6,height:6,borderRadius:"50%",background:c.dot,flexShrink:0}}/>{fmtSt(status)}</span>; }
function PhasePill({phase}) { return <span style={{padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:600,background:"#EEEDFE",color:"#534AB7"}}>{PL[phase]||phase||"N/A"}</span>; }
function FilterChip({label,active,onClick}) { return <button onClick={onClick} style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:500,border:active?"1.5px solid #534AB7":"1px solid #d3d1c7",background:active?"#EEEDFE":"transparent",color:active?"#534AB7":"#5F5E5A",cursor:"pointer"}}>{label}</button>; }
function TabButton({label,active,onClick,icon}) { return <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,border:"none",background:active?"#EEEDFE":"transparent",color:active?"#534AB7":"#888780",fontSize:13,fontWeight:600,cursor:"pointer"}}>{icon}{label}</button>; }
function Loader() { return <div style={{display:"flex",justifyContent:"center",padding:60}}><div style={{display:"flex",gap:6}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#534AB7",animation:`bounce 1.2s ${i*0.15}s infinite ease-in-out`}}/>)}<style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}`}</style></div></div>; }
function ChartCard({title,subtitle,children,style:s}) { return <div style={{background:"#fafaf7",borderRadius:12,border:"1px solid #e8e6df",padding:"20px 20px 12px",...s}}><div style={{marginBottom:14}}><h3 style={{margin:0,fontSize:14,fontWeight:700,color:"#2C2C2A",fontFamily:SF}}>{title}</h3>{subtitle&&<p style={{margin:"2px 0 0",fontSize:12,color:"#888780"}}>{subtitle}</p>}</div>{children}</div>; }
function StatCard({label,value,color,icon}) { return <div style={{background:"#fafaf7",borderRadius:12,border:"1px solid #e8e6df",padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}><div style={{width:40,height:40,borderRadius:10,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{icon}</div><div><div style={{fontSize:22,fontWeight:700,color:"#2C2C2A",lineHeight:1.1}}>{value}</div><div style={{fontSize:11,fontWeight:600,color:"#888780",textTransform:"uppercase",letterSpacing:0.8,marginTop:2}}>{label}</div></div></div>; }
function CT({active,payload,label}) { if(!active||!payload?.length) return null; return <div style={{background:"#fff",border:"1px solid #e8e6df",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,0.08)",fontSize:12}}><div style={{fontWeight:600,marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:2,background:p.color||p.fill}}/>{p.name}: <b>{p.value?.toLocaleString()}</b></div>)}</div>; }
function EmptyState({icon,title,desc}) { return <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"80px 32px",textAlign:"center"}}><div style={{width:64,height:64,borderRadius:16,background:"#EEEDFE",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>{icon}</div><h2 style={{fontSize:18,fontWeight:600,color:"#2C2C2A",margin:"0 0 6px"}}>{title}</h2><p style={{fontSize:14,color:"#888780",maxWidth:400,lineHeight:1.6}}>{desc}</p></div>; }

// Trial Card
function TrialCard({study,onClick}) {
  const p=study.protocolSection||{},id=p.identificationModule||{},st=p.statusModule||{},d=p.designModule||{},sp=p.sponsorCollaboratorsModule||{},co=p.conditionsModule?.conditions||[],ph=d.phases||[],en=d.enrollmentInfo?.count;
  return (
    <div onClick={onClick} style={{padding:"20px 24px",borderBottom:"1px solid #e8e6df",cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#fafaf7"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:8}}>
        <div style={{flex:1,minWidth:0}}>
          <span style={{fontFamily:MF,fontSize:11,color:"#888780"}}>{id.nctId}</span>
          <h3 style={{margin:"4px 0 0",fontSize:15,fontWeight:600,lineHeight:1.4,color:"#2C2C2A",fontFamily:SF}}>{id.officialTitle||id.briefTitle||"Untitled"}</h3>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>{ph.map(x=><PhasePill key={x} phase={x}/>)}<StatusBadge status={st.overallStatus}/></div>
      </div>
      <div style={{display:"flex",gap:20,fontSize:12,color:"#73726c",marginTop:10,flexWrap:"wrap"}}>
        {sp.leadSponsor?.name&&<span>{sp.leadSponsor.name}</span>}
        {co.length>0&&<span>{co.slice(0,2).join(", ")}</span>}
        {en>0&&<span>{en.toLocaleString()} enrolled</span>}
        <span>{fmtD(st.startDateStruct?.date)}</span>
      </div>
    </div>
  );
}

// Trial Detail
function TrialDetail({study,onBack}) {
  const p=study.protocolSection||{},id=p.identificationModule||{},st=p.statusModule||{},desc=p.descriptionModule||{},d=p.designModule||{},el=p.eligibilityModule||{},sp=p.sponsorCollaboratorsModule||{},co=p.conditionsModule?.conditions||[];
  return (
    <div style={{padding:"24px 32px",maxWidth:800,margin:"0 auto"}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"#534AB7",fontSize:13,fontWeight:600,cursor:"pointer",padding:0,marginBottom:20}}>← Back to results</button>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}><span style={{fontFamily:MF,fontSize:12,color:"#888780",background:"#F1EFE8",padding:"3px 8px",borderRadius:4}}>{id.nctId}</span>{(d.phases||[]).map(ph=><PhasePill key={ph} phase={ph}/>)}<StatusBadge status={st.overallStatus}/></div>
      <h1 style={{fontSize:22,fontWeight:700,lineHeight:1.35,color:"#2C2C2A",margin:"0 0 16px",fontFamily:SF}}>{id.officialTitle||id.briefTitle}</h1>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,margin:"20px 0"}}>
        {[{l:"Sponsor",v:sp.leadSponsor?.name},{l:"Start date",v:fmtD(st.startDateStruct?.date)},{l:"Enrollment",v:d.enrollmentInfo?.count?.toLocaleString()},{l:"Study type",v:d.studyType}].filter(x=>x.v).map(it=><div key={it.l} style={{padding:"12px 14px",background:"#fafaf7",borderRadius:8,border:"1px solid #e8e6df"}}><div style={{fontSize:10,fontWeight:600,color:"#888780",textTransform:"uppercase",letterSpacing:0.8}}>{it.l}</div><div style={{fontSize:14,fontWeight:500,color:"#2C2C2A",marginTop:4}}>{it.v}</div></div>)}
      </div>
      {desc.briefSummary&&<div style={{marginBottom:24}}><h2 style={{fontSize:13,fontWeight:700,color:"#888780",textTransform:"uppercase",letterSpacing:1,margin:"0 0 10px"}}>Summary</h2><p style={{fontSize:14,lineHeight:1.7,color:"#444441",margin:0}}>{desc.briefSummary}</p></div>}
      {co.length>0&&<div style={{marginBottom:24}}><h2 style={{fontSize:13,fontWeight:700,color:"#888780",textTransform:"uppercase",letterSpacing:1,margin:"0 0 10px"}}>Conditions</h2><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{co.map(c=><span key={c} style={{padding:"4px 10px",borderRadius:20,fontSize:12,fontWeight:500,background:"#E1F5EE",color:"#0F6E56"}}>{c}</span>)}</div></div>}
      {el.eligibilityCriteria&&<div style={{marginBottom:24}}><h2 style={{fontSize:13,fontWeight:700,color:"#888780",textTransform:"uppercase",letterSpacing:1,margin:"0 0 10px"}}>Eligibility</h2><pre style={{fontSize:13,lineHeight:1.6,color:"#444441",whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0,maxHeight:300,overflow:"auto",padding:12,background:"#fafaf7",borderRadius:8,border:"1px solid #e8e6df"}}>{el.eligibilityCriteria}</pre><div style={{display:"flex",gap:12,marginTop:10,fontSize:12,color:"#73726c"}}>{el.sex&&<span>Sex: {el.sex}</span>}{el.minimumAge&&<span>Min: {el.minimumAge}</span>}{el.maximumAge&&<span>Max: {el.maximumAge}</span>}</div></div>}
      <div style={{textAlign:"center",padding:20}}><a href={`https://clinicaltrials.gov/study/${id.nctId}`} target="_blank" rel="noopener" style={{color:"#534AB7",fontWeight:600,fontSize:14}}>View full details on ClinicalTrials.gov →</a></div>
    </div>
  );
}

// Analytics Panel
function AnalyticsPanel({searchTerm}) {
  if(!searchTerm) return <EmptyState icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>} title="Search first, then analyze" desc="Run a search in the Search tab, then switch here to see analytics."/>;
  const studies = findTrials(searchTerm);
  if(!studies.length) return <EmptyState icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>} title="No data" desc="No trials found for this search term."/>;
  const pc={},sc2={},yc={},spc={},cc={};let te=0,ec=0;
  studies.forEach(s=>{const p=s.protocolSection||{};(p.designModule?.phases||["NA"]).forEach(x=>{pc[x]=(pc[x]||0)+1});const st2=p.statusModule?.overallStatus;if(st2)sc2[st2]=(sc2[st2]||0)+1;const sd=p.statusModule?.startDateStruct?.date;if(sd){const y=new Date(sd).getFullYear();if(y>2000&&y<=2026)yc[y]=(yc[y]||0)+1}const spn=p.sponsorCollaboratorsModule?.leadSponsor?.name;if(spn)spc[spn]=(spc[spn]||0)+1;(p.conditionsModule?.conditions||[]).forEach(c=>{cc[c]=(cc[c]||0)+1});const en2=p.designModule?.enrollmentInfo?.count;if(en2){te+=en2;ec++}});
  const phaseData=Object.entries(pc).map(([k,v])=>({name:PL[k]||k,value:v}));
  const statusData=Object.entries(sc2).map(([k,v])=>({name:fmtSt(k),value:v,key:k}));
  const yearData=Object.entries(yc).sort((a,b)=>a[0]-b[0]).map(([k,v])=>({year:k,trials:v}));
  const topSponsors=Object.entries(spc).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({name:k.length>30?k.slice(0,28)+"…":k,trials:v}));
  const topConds=Object.entries(cc).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({name:k.length>30?k.slice(0,28)+"…":k,count:v}));
  const avgE=ec>0?Math.round(te/ec):0, recPct=studies.length>0?Math.round(((sc2["RECRUITING"]||0)/studies.length)*100):0;
  return (
    <div style={{padding:"24px 32px"}}>
      <div style={{marginBottom:20}}><h2 style={{fontSize:18,fontWeight:700,color:"#2C2C2A",margin:0,fontFamily:SF}}>Analytics for "{searchTerm}"</h2><p style={{fontSize:13,color:"#888780",margin:"4px 0 0"}}>Based on {studies.length} trials</p></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:24}}>
        <StatCard label="Total" value={studies.length} color="#534AB7" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>}/>
        <StatCard label="Recruiting" value={`${recPct}%`} color="#1D9E75" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}/>
        <StatCard label="Avg enrollment" value={avgE.toLocaleString()} color="#D85A30" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D85A30" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}/>
        <StatCard label="Sponsors" value={Object.keys(spc).length} color="#378ADD" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <ChartCard title="Trials by phase"><ResponsiveContainer width="100%" height={220}><BarChart data={phaseData} margin={{top:4,right:8,left:-10,bottom:4}}><XAxis dataKey="name" tick={{fontSize:11,fill:"#888780"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#888780"}} axisLine={false} tickLine={false}/><Tooltip content={<CT/>}/><Bar dataKey="value" name="Trials" fill="#7F77DD" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Trials by status"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2} strokeWidth={0}>{statusData.map((e,i)=>{const c2=SC[e.key];return <Cell key={i} fill={c2?c2.dot:PIE_C[i%PIE_C.length]}/>})}</Pie><Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:11}} iconSize={8}/></PieChart></ResponsiveContainer></ChartCard>
      </div>
      {yearData.length>2&&<ChartCard title="Trials over time" style={{marginBottom:16}}><ResponsiveContainer width="100%" height={200}><LineChart data={yearData} margin={{top:4,right:8,left:-10,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke="#e8e6df"/><XAxis dataKey="year" tick={{fontSize:11,fill:"#888780"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#888780"}} axisLine={false} tickLine={false}/><Tooltip content={<CT/>}/><Line type="monotone" dataKey="trials" name="Trials" stroke="#7F77DD" strokeWidth={2.5} dot={{r:3,fill:"#7F77DD"}}/></LineChart></ResponsiveContainer></ChartCard>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {topSponsors.length>0&&<ChartCard title="Top sponsors"><ResponsiveContainer width="100%" height={220}><BarChart data={topSponsors} layout="vertical" margin={{top:4,right:12,left:4,bottom:4}}><XAxis type="number" tick={{fontSize:11,fill:"#888780"}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:"#5F5E5A"}} width={120} axisLine={false} tickLine={false}/><Tooltip content={<CT/>}/><Bar dataKey="trials" name="Trials" fill="#1D9E75" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></ChartCard>}
        {topConds.length>0&&<ChartCard title="Top conditions"><ResponsiveContainer width="100%" height={220}><BarChart data={topConds} layout="vertical" margin={{top:4,right:12,left:4,bottom:4}}><XAxis type="number" tick={{fontSize:11,fill:"#888780"}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:"#5F5E5A"}} width={120} axisLine={false} tickLine={false}/><Tooltip content={<CT/>}/><Bar dataKey="count" name="Trials" fill="#D85A30" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></ChartCard>}
      </div>
    </div>
  );
}

// Sponsor Compare
function SponsorCompare() {
  const [sponsors,setSponsors]=useState(["",""]);
  const [data,setData]=useState([]);
  const [compared,setCompared]=useState(false);
  const PRESETS=[{label:"Big Pharma",sp:["Pfizer","Eli Lilly and Company","Novartis"]},{label:"Oncology leaders",sp:["Roche","Merck","AstraZeneca"]},{label:"Biotech giants",sp:["Amgen","Gilead","Regeneron"]}];
  const upd=(i,v)=>{const n=[...sponsors];n[i]=v;setSponsors(n)};
  const addSp=()=>{if(sponsors.length<3)setSponsors([...sponsors,""])};
  const rmSp=(i)=>{if(sponsors.length>2)setSponsors(sponsors.filter((_,j)=>j!==i))};
  const preset=(pr)=>{setSponsors([...pr.sp]);setData([]);setCompared(false)};

  const compare=()=>{
    const valid=sponsors.filter(s=>s.trim());if(valid.length<2)return;setCompared(true);
    setData(valid.map(name=>{
      const studies=findSponsorTrials(name);
      const pc={},sc2={};let te=0,ec=0;
      studies.forEach(s=>{const p=s.protocolSection||{};(p.designModule?.phases||["NA"]).forEach(x=>{pc[x]=(pc[x]||0)+1});const st2=p.statusModule?.overallStatus;if(st2)sc2[st2]=(sc2[st2]||0)+1;const en2=p.designModule?.enrollmentInfo?.count;if(en2){te+=en2;ec++}});
      const topC=(studies.flatMap(s=>(s.protocolSection?.conditionsModule?.conditions||[]))).reduce((a,c)=>{a[c]=(a[c]||0)+1;return a},{});
      return {name,total:studies.length,phaseCounts:pc,statusCounts:sc2,topConditions:Object.entries(topC).sort((a,b)=>b[1]-a[1]).slice(0,5),avgEnrollment:ec>0?Math.round(te/ec):0,recruitingPct:studies.length>0?Math.round(((sc2["RECRUITING"]||0)/studies.length)*100):0};
    }));
  };

  const phaseComp=useMemo(()=>{if(!data.length)return[];return PHASES.map(p=>{const row={name:PL[p]};data.forEach(s=>{row[s.name]=s.phaseCounts[p]||0});return row})},[data]);
  const radarD=useMemo(()=>{if(!data.length)return[];const mt=Math.max(...data.map(s=>s.total),1),me=Math.max(...data.map(s=>s.avgEnrollment),1);return[{m:"Total trials",...Object.fromEntries(data.map(s=>[s.name,Math.round((s.total/mt)*100)]))},{m:"Recruiting %",...Object.fromEntries(data.map(s=>[s.name,s.recruitingPct]))},{m:"Avg enrollment",...Object.fromEntries(data.map(s=>[s.name,Math.round((s.avgEnrollment/me)*100)]))},{m:"Phase 3 focus",...Object.fromEntries(data.map(s=>[s.name,s.total>0?Math.round(((s.phaseCounts["PHASE3"]||0)/s.total)*100):0]))}]},[data]);

  return (
    <div style={{padding:"24px 32px"}}>
      <div style={{marginBottom:20}}><h2 style={{fontSize:18,fontWeight:700,color:"#2C2C2A",margin:0,fontFamily:SF}}>Sponsor competitive analysis</h2><p style={{fontSize:13,color:"#888780",margin:"4px 0 0"}}>Compare pharma companies head-to-head</p></div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}><span style={{fontSize:12,color:"#888780",lineHeight:"32px"}}>Quick:</span>{PRESETS.map(pr=><button key={pr.label} onClick={()=>preset(pr)} style={{padding:"6px 14px",borderRadius:20,border:"1px solid #e8e6df",background:"#fff",fontSize:12,color:"#534AB7",cursor:"pointer",fontWeight:500}}>{pr.label}</button>)}</div>
      <div style={{background:"#fafaf7",borderRadius:12,border:"1px solid #e8e6df",padding:20,marginBottom:24}}>
        {sponsors.map((s,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><div style={{width:24,height:24,borderRadius:6,background:SP_C[i]+"20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><div style={{width:10,height:10,borderRadius:3,background:SP_C[i]}}/></div><input value={s} onChange={e=>upd(i,e.target.value)} onKeyDown={e=>e.key==="Enter"&&compare()} placeholder={`Sponsor ${i+1}`} style={{flex:1,padding:"10px 14px",borderRadius:8,border:"1.5px solid #d3d1c7",fontSize:14,color:"#2C2C2A",background:"#fff",fontFamily:"inherit",outline:"none"}}/>{sponsors.length>2&&<button onClick={()=>rmSp(i)} style={{width:32,height:32,borderRadius:8,border:"1px solid #e8e6df",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}</div>)}
        <div style={{display:"flex",gap:10,marginTop:4}}>{sponsors.length<3&&<button onClick={addSp} style={{padding:"8px 16px",borderRadius:8,border:"1px dashed #d3d1c7",background:"transparent",color:"#888780",fontSize:13,cursor:"pointer"}}>+ Add</button>}<button onClick={compare} disabled={sponsors.filter(s=>s.trim()).length<2} style={{padding:"8px 24px",borderRadius:8,border:"none",background:sponsors.filter(s=>s.trim()).length<2?"#d3d1c7":"#534AB7",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",marginLeft:"auto"}}>Compare</button></div>
      </div>
      {data.length>0&&<div>
        <div style={{display:"grid",gridTemplateColumns:data.map(()=>"1fr").join(" "),gap:16,marginBottom:24}}>{data.map((s,i)=><div key={s.name} style={{borderRadius:12,border:`2px solid ${SP_C[i]}30`,overflow:"hidden"}}><div style={{padding:"14px 18px",background:SP_C[i]+"10"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:12,height:12,borderRadius:4,background:SP_C[i]}}/><h3 style={{margin:0,fontSize:15,fontWeight:700,color:"#2C2C2A",fontFamily:SF}}>{s.name}</h3></div></div><div style={{padding:"14px 18px"}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[{l:"Total",v:s.total},{l:"Recruiting",v:s.recruitingPct+"%"},{l:"Avg enroll",v:s.avgEnrollment.toLocaleString()},{l:"Phase 3",v:(s.phaseCounts["PHASE3"]||0)}].map(it=><div key={it.l}><div style={{fontSize:20,fontWeight:700,color:SP_C[i]}}>{it.v}</div><div style={{fontSize:10,color:"#888780",textTransform:"uppercase",fontWeight:600}}>{it.l}</div></div>)}</div><div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #e8e6df"}}><div style={{fontSize:10,fontWeight:600,color:"#888780",textTransform:"uppercase",marginBottom:6}}>Top conditions</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{s.topConditions.slice(0,3).map(([c])=><span key={c} style={{padding:"2px 8px",borderRadius:12,fontSize:10,fontWeight:500,background:SP_C[i]+"15",color:SP_C[i]}}>{c.length>22?c.slice(0,20)+"…":c}</span>)}</div></div></div></div>)}</div>
        {radarD.length>0&&<ChartCard title="Competitive radar" subtitle="Normalized (0-100)" style={{marginBottom:16}}><ResponsiveContainer width="100%" height={300}><RadarChart data={radarD} cx="50%" cy="50%" outerRadius="75%"><PolarGrid stroke="#e8e6df"/><PolarAngleAxis dataKey="m" tick={{fontSize:11,fill:"#5F5E5A"}}/><PolarRadiusAxis angle={90} domain={[0,100]} tick={{fontSize:10,fill:"#888780"}}/>{data.map((s,i)=><Radar key={s.name} name={s.name} dataKey={s.name} stroke={SP_C[i]} fill={SP_C[i]} fillOpacity={0.15} strokeWidth={2}/>)}<Legend wrapperStyle={{fontSize:12}} iconSize={10}/><Tooltip content={<CT/>}/></RadarChart></ResponsiveContainer></ChartCard>}
        <ChartCard title="Pipeline by phase" style={{marginBottom:16}}><ResponsiveContainer width="100%" height={240}><BarChart data={phaseComp} margin={{top:4,right:8,left:-10,bottom:4}}><XAxis dataKey="name" tick={{fontSize:11,fill:"#888780"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#888780"}} axisLine={false} tickLine={false}/><Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:12}} iconSize={10}/>{data.map((s,i)=><Bar key={s.name} dataKey={s.name} fill={SP_C[i]} radius={[3,3,0,0]}/>)}</BarChart></ResponsiveContainer></ChartCard>
      </div>}
      {!compared&&<EmptyState icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>} title="Compare pharma sponsors" desc="Enter 2-3 sponsors or use a preset, then hit Compare."/>}
    </div>
  );
}

// Eligibility Matcher
function EligibilityMatcher() {
  const [form,setForm]=useState({condition:"",age:"",sex:"ALL"});
  const [results,setResults]=useState([]);
  const [matched,setMatched]=useState(false);
  const [expanded,setExpanded]=useState(null);
  const CONDS=[{l:"Type 2 diabetes",c:"diabetes"},{l:"Breast cancer",c:"lung cancer"},{l:"Alzheimer's",c:"alzheimer"},{l:"COVID-19",c:"covid-19"}];
  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  const parseAge=a=>{if(!a)return null;const m=a.match(/(\d+)/);return m?parseInt(m[1]):null};

  const find=()=>{
    if(!form.condition.trim())return;setMatched(true);setExpanded(null);
    let trials=findTrials(form.condition).filter(s=>s.protocolSection?.statusModule?.overallStatus==="RECRUITING"||true);
    if(form.age){const ua=parseInt(form.age);if(!isNaN(ua))trials=trials.filter(s=>{const e=s.protocolSection?.eligibilityModule;if(!e)return true;const mn=parseAge(e.minimumAge),mx=parseAge(e.maximumAge);if(mn!==null&&ua<mn)return false;if(mx!==null&&ua>mx)return false;return true})}
    if(form.sex!=="ALL") trials=trials.filter(s=>{const sx=s.protocolSection?.eligibilityModule?.sex;return !sx||sx==="ALL"||sx===form.sex});
    setResults(trials);
  };

  const score=(study)=>{let sc=0;const el=study.protocolSection?.eligibilityModule,st=study.protocolSection?.statusModule;if(st?.overallStatus==="RECRUITING")sc+=30;if(el){if(form.age){const ua=parseInt(form.age),mn=parseAge(el.minimumAge),mx=parseAge(el.maximumAge);if(mn!==null&&mx!==null&&ua>=mn&&ua<=mx)sc+=25}if(form.sex==="ALL"||!el.sex||el.sex==="ALL"||el.sex===form.sex)sc+=15}if(study.protocolSection?.designModule?.enrollmentInfo?.count>0)sc+=10;return Math.min(sc,100)};
  const sorted=useMemo(()=>[...results].sort((a,b)=>score(b)-score(a)),[results,form]);

  return (
    <div style={{padding:"24px 32px"}}>
      <div style={{marginBottom:20}}><h2 style={{fontSize:18,fontWeight:700,color:"#2C2C2A",margin:0,fontFamily:SF}}>Patient eligibility matcher</h2><p style={{fontSize:13,color:"#888780",margin:"4px 0 0"}}>Find trials a patient may qualify for</p></div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}><span style={{fontSize:12,color:"#888780",lineHeight:"32px"}}>Common:</span>{CONDS.map(pr=><button key={pr.l} onClick={()=>upd("condition",pr.c)} style={{padding:"6px 14px",borderRadius:20,border:form.condition===pr.c?"1.5px solid #534AB7":"1px solid #e8e6df",background:form.condition===pr.c?"#EEEDFE":"#fff",fontSize:12,color:form.condition===pr.c?"#534AB7":"#5F5E5A",cursor:"pointer",fontWeight:500}}>{pr.l}</button>)}</div>
      <div style={{background:"#fafaf7",borderRadius:12,border:"1px solid #e8e6df",padding:24,marginBottom:24}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#888780",textTransform:"uppercase",letterSpacing:0.8,marginBottom:6}}>Condition *</label><input value={form.condition} onChange={e=>upd("condition",e.target.value)} placeholder="e.g. diabetes" style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"1.5px solid #d3d1c7",fontSize:14,color:"#2C2C2A",background:"#fff",fontFamily:"inherit",outline:"none"}}/></div>
          <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#888780",textTransform:"uppercase",letterSpacing:0.8,marginBottom:6}}>Age</label><input value={form.age} onChange={e=>upd("age",e.target.value)} placeholder="e.g. 45" type="number" style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"1.5px solid #d3d1c7",fontSize:14,color:"#2C2C2A",background:"#fff",fontFamily:"inherit",outline:"none"}}/></div>
          <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#888780",textTransform:"uppercase",letterSpacing:0.8,marginBottom:6}}>Sex</label><div style={{display:"flex",gap:8}}>{[{v:"ALL",l:"Any"},{v:"MALE",l:"Male"},{v:"FEMALE",l:"Female"}].map(o=><button key={o.v} onClick={()=>upd("sex",o.v)} style={{flex:1,padding:"10px",borderRadius:8,border:form.sex===o.v?"1.5px solid #534AB7":"1.5px solid #d3d1c7",background:form.sex===o.v?"#EEEDFE":"#fff",color:form.sex===o.v?"#534AB7":"#5F5E5A",fontSize:13,fontWeight:600,cursor:"pointer"}}>{o.l}</button>)}</div></div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end"}}><button onClick={find} disabled={!form.condition.trim()} style={{padding:"10px 28px",borderRadius:8,border:"none",background:!form.condition.trim()?"#d3d1c7":"#534AB7",color:"#fff",fontSize:14,fontWeight:600,cursor:!form.condition.trim()?"default":"pointer"}}>Find matching trials</button></div>
      </div>
      {matched&&<div>
        <div style={{marginBottom:16}}><span style={{fontSize:14,fontWeight:600,color:"#2C2C2A"}}>{sorted.length} matching trials</span></div>
        {sorted.map((study,i)=>{
          const pr=study.protocolSection||{},nid=pr.identificationModule||{},el=pr.eligibilityModule||{},sta=pr.statusModule||{},des=pr.designModule||{},spo=pr.sponsorCollaboratorsModule||{};
          const sc=score(study),isExp=expanded===nid.nctId;
          return (<div key={i} style={{borderRadius:10,border:"1px solid #e8e6df",marginBottom:12,overflow:"hidden"}}>
            <div onClick={()=>setExpanded(isExp?null:nid.nctId)} style={{padding:"16px 20px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}><span style={{fontFamily:MF,fontSize:11,color:"#888780"}}>{nid.nctId}</span>{(des.phases||[]).map(p=><PhasePill key={p} phase={p}/>)}<StatusBadge status={sta.overallStatus}/></div>
                <h3 style={{margin:0,fontSize:14,fontWeight:600,lineHeight:1.4,color:"#2C2C2A",fontFamily:SF}}>{nid.briefTitle}</h3>
                <div style={{fontSize:12,color:"#73726c",marginTop:6}}>{spo.leadSponsor?.name}</div>
              </div>
              <div style={{flexShrink:0,textAlign:"center"}}><div style={{width:52,height:52,borderRadius:12,background:sc>=70?"#E1F5EE":sc>=40?"#FAEEDA":"#F1EFE8",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:18,fontWeight:700,color:sc>=70?"#0F6E56":sc>=40?"#854F0B":"#5F5E5A"}}>{sc}</span></div><div style={{fontSize:9,color:"#888780",marginTop:3,textTransform:"uppercase",fontWeight:600}}>Match</div></div>
            </div>
            {isExp&&<div style={{padding:"0 20px 20px",borderTop:"1px solid #e8e6df"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,margin:"16px 0"}}>
                {[{l:"Age range",v:`${el.minimumAge||"N/A"} — ${el.maximumAge||"N/A"}`},{l:"Sex",v:el.sex==="ALL"?"All":el.sex||"All"},{l:"Enrollment",v:(des.enrollmentInfo?.count||"N/A").toLocaleString?.()??des.enrollmentInfo?.count}].map(it=><div key={it.l} style={{padding:"10px 12px",borderRadius:8,border:"1px solid #e8e6df",background:"#fafaf7"}}><div style={{fontSize:10,fontWeight:600,color:"#888780",textTransform:"uppercase",marginBottom:4}}>{it.l}</div><div style={{fontSize:13,fontWeight:500,color:"#2C2C2A"}}>{it.v}</div></div>)}
              </div>
              {el.eligibilityCriteria&&<pre style={{fontSize:12,lineHeight:1.5,color:"#444441",whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0,maxHeight:200,overflow:"auto",padding:12,background:"#fafaf7",borderRadius:8,border:"1px solid #e8e6df"}}>{el.eligibilityCriteria}</pre>}
            </div>}
          </div>);
        })}
      </div>}
      {!matched&&<EmptyState icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.5"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>} title="Find trials for your patient" desc="Enter a condition and demographics to find matching trials."/>}
    </div>
  );
}

// AI Insights
function AIInsights() {
  const [question,setQuestion]=useState("");
  const [messages,setMessages]=useState([]);
  const [loading,setLoading]=useState(false);
  const chatEnd=useRef(null);
  const SAMPLES=["What are the phases for Alzheimer trials?","Compare diabetes vs lung cancer trial activity","Which sponsors are most active in pembrolizumab?","Show me recruiting COVID-19 trials","What's the enrollment trend for lung cancer?"];
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"})},[messages]);

  const ask=async(q)=>{
    const query=q||question.trim();if(!query)return;setQuestion("");setMessages(prev=>[...prev,{role:"user",text:query}]);setLoading(true);
    try {
      const terms=query.replace(/[?.,!]/g,"").split(" ").filter(w=>w.length>3).slice(0,3).join(" ");
      const trials=findTrials(terms);
      const context=trials.slice(0,10).map(s=>{const p=s.protocolSection||{},id=p.identificationModule||{};return `${id.nctId}: "${id.briefTitle}" | ${p.statusModule?.overallStatus} | ${(p.designModule?.phases||[]).join(",")} | ${p.sponsorCollaboratorsModule?.leadSponsor?.name||"N/A"} | ${(p.conditionsModule?.conditions||[]).join(", ")} | Enroll: ${p.designModule?.enrollmentInfo?.count||"N/A"}`}).join("\n");
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`You are TrialLens AI, a clinical trials analyst. Here is real trial data:\n\n${context}\n\nQuestion: ${query}\n\nGive a concise, data-driven answer using NCT IDs. Be professional.`}]})});
      const data2=await resp.json();
      const aiText=(data2.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("")||"Could not generate a response.";
      setMessages(prev=>[...prev,{role:"ai",text:aiText,count:trials.length}]);
    } catch { 
      // Fallback: generate a local analysis
      const terms=query.replace(/[?.,!]/g,"").split(" ").filter(w=>w.length>3).slice(0,3).join(" ");
      const trials=findTrials(terms);
      const pc={},sc2={};let te=0,ec=0;
      trials.forEach(s=>{const p=s.protocolSection||{};(p.designModule?.phases||["NA"]).forEach(x=>{pc[x]=(pc[x]||0)+1});const st2=p.statusModule?.overallStatus;if(st2)sc2[st2]=(sc2[st2]||0)+1;const en2=p.designModule?.enrollmentInfo?.count;if(en2){te+=en2;ec++}});
      const analysis = `## Analysis of ${trials.length} trials\n\nBased on the trial data for "${terms}":\n\n**Phase Distribution:**\n${Object.entries(pc).map(([k,v])=>`- ${PL[k]||k}: ${v} trials`).join("\n")}\n\n**Status Breakdown:**\n${Object.entries(sc2).map(([k,v])=>`- ${fmtSt(k)}: ${v}`).join("\n")}\n\n**Enrollment:** Average ${ec>0?Math.round(te/ec):0} participants across ${ec} trials with reported enrollment.\n\n**Sample Trials:**\n${trials.slice(0,5).map(s=>{const p=s.protocolSection||{},id=p.identificationModule||{};return `- ${id.nctId}: ${id.briefTitle} (${p.statusModule?.overallStatus})`}).join("\n")}`;
      setMessages(prev=>[...prev,{role:"ai",text:analysis,count:trials.length}]);
    }
    finally { setLoading(false); }
  };

  const fmtAI=(text)=>text.split("\n").map((line,i)=>{
    if(line.startsWith("## ")) return <h3 key={i} style={{fontSize:15,fontWeight:700,color:"#2C2C2A",margin:"16px 0 8px",fontFamily:SF}}>{line.replace("## ","")}</h3>;
    if(line.startsWith("**")&&line.endsWith("**")) return <p key={i} style={{fontSize:14,fontWeight:600,color:"#2C2C2A",margin:"12px 0 4px"}}>{line.replace(/\*\*/g,"")}</p>;
    if(line.startsWith("- ")) return <div key={i} style={{display:"flex",gap:8,fontSize:14,lineHeight:1.6,color:"#444441",marginBottom:4}}><span style={{color:"#534AB7",flexShrink:0}}>•</span><span>{line.replace("- ","")}</span></div>;
    if(line.trim()==="") return <div key={i} style={{height:8}}/>;
    return <p key={i} style={{fontSize:14,lineHeight:1.7,color:"#444441",margin:"4px 0"}}>{line}</p>;
  });

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 200px)",minHeight:500}}>
      <div style={{flex:1,overflow:"auto",padding:"24px 32px"}}>
        {messages.length===0&&<div style={{textAlign:"center",paddingTop:40}}>
          <div style={{width:64,height:64,borderRadius:16,background:"linear-gradient(135deg,#EEEDFE,#E6F1FB)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.5"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2H10a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/></svg></div>
          <h2 style={{fontSize:18,fontWeight:700,color:"#2C2C2A",margin:"0 0 6px",fontFamily:SF}}>Ask anything about clinical trials</h2>
          <p style={{fontSize:14,color:"#888780",maxWidth:460,margin:"0 auto 24px",lineHeight:1.6}}>Powered by Claude AI + real ClinicalTrials.gov data</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:540,margin:"0 auto"}}>{SAMPLES.map((sq,i)=><button key={i} onClick={()=>ask(sq)} style={{padding:"12px 16px",borderRadius:10,border:"1px solid #e8e6df",background:"#fafaf7",fontSize:13,color:"#444441",cursor:"pointer",textAlign:"left",lineHeight:1.4,fontFamily:"inherit"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#534AB7";e.currentTarget.style.background="#EEEDFE"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e8e6df";e.currentTarget.style.background="#fafaf7"}}><span style={{color:"#534AB7",marginRight:6}}>→</span>{sq}</button>)}</div>
        </div>}
        {messages.map((msg,i)=><div key={i} style={{marginBottom:20,display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
          {msg.role==="user"?<div style={{maxWidth:"75%",padding:"12px 18px",borderRadius:"16px 16px 4px 16px",background:"#534AB7",color:"#fff",fontSize:14,lineHeight:1.6}}>{msg.text}</div>
          :<div style={{maxWidth:"90%",width:"100%"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:24,height:24,borderRadius:6,background:"linear-gradient(135deg,#534AB7,#7F77DD)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2H10a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/></svg></div><span style={{fontSize:12,fontWeight:600,color:"#534AB7"}}>TrialLens AI</span>{msg.count>0&&<span style={{fontSize:11,color:"#888780"}}>· {msg.count} trials</span>}</div><div style={{padding:"16px 20px",borderRadius:"4px 16px 16px 16px",background:"#fafaf7",border:"1px solid #e8e6df"}}>{fmtAI(msg.text)}</div></div>}
        </div>)}
        {loading&&<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:24,height:24,borderRadius:6,background:"linear-gradient(135deg,#534AB7,#7F77DD)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2H10a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/></svg></div><div style={{padding:"14px 20px",borderRadius:"4px 16px 16px 16px",background:"#fafaf7",border:"1px solid #e8e6df"}}><div style={{display:"flex",gap:4}}><span style={{fontSize:13,color:"#888780"}}>Analyzing</span>{[0,1,2].map(j=><div key={j} style={{width:4,height:4,borderRadius:"50%",background:"#534AB7",animation:`bounce 1.2s ${j*0.15}s infinite ease-in-out`}}/>)}</div></div></div>}
        <div ref={chatEnd}/>
      </div>
      <div style={{padding:"16px 32px 20px",borderTop:"1px solid #e8e6df",background:"#fff"}}>
        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1,display:"flex",alignItems:"center",border:"1.5px solid #d3d1c7",borderRadius:12,padding:"0 14px",background:"#fafaf7"}}>
            <input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&ask()} placeholder="Ask about clinical trials..." disabled={loading} style={{flex:1,border:"none",outline:"none",padding:"12px 10px",fontSize:14,color:"#2C2C2A",background:"transparent",fontFamily:"inherit"}}/>
          </div>
          <button onClick={()=>ask()} disabled={!question.trim()||loading} style={{width:44,height:44,borderRadius:12,border:"none",background:!question.trim()||loading?"#d3d1c7":"#534AB7",color:"#fff",cursor:!question.trim()||loading?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>▶</button>
        </div>
        <p style={{fontSize:11,color:"#b4b2a9",margin:"8px 0 0",textAlign:"center"}}>AI responses use real ClinicalTrials.gov data (May 2026). Always verify with official sources.</p>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────
export default function TrialLens() {
  const [tab,setTab]=useState("search");
  const [query,setQuery]=useState("");
  const [searchTerm,setSearchTerm]=useState("");
  const [phaseF,setPhaseF]=useState([]);
  const [statusF,setStatusF]=useState([]);
  const [selected,setSelected]=useState(null);
  const [hasSearched,setHasSearched]=useState(false);

  const results=useMemo(()=>{
    if(!searchTerm) return [];
    let r=findTrials(searchTerm);
    if(phaseF.length>0) r=r.filter(s=>(s.protocolSection?.designModule?.phases||[]).some(p=>phaseF.includes(p)));
    if(statusF.length>0) r=r.filter(s=>statusF.includes(s.protocolSection?.statusModule?.overallStatus));
    return r;
  },[searchTerm,phaseF,statusF]);

  const doSearch=()=>{if(query.trim()){setSearchTerm(query.trim());setHasSearched(true);setPhaseF([]);setStatusF([])}};
  const toggle=(arr,set,v)=>set(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);

  if(selected) return <div style={{fontFamily:"'Source Sans 3',system-ui,sans-serif",minHeight:"100vh",background:"#fff"}}><TrialDetail study={selected} onBack={()=>setSelected(null)}/></div>;

  return (
    <div style={{fontFamily:"'Source Sans 3',system-ui,sans-serif",minHeight:"100vh",background:"#fff"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');*{box-sizing:border-box}::selection{background:#EEEDFE;color:#3C3489}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#d3d1c7;border-radius:4px}`}</style>
      <div style={{padding:"28px 32px 0",borderBottom:"1px solid #e8e6df",background:"linear-gradient(180deg,#fafaf7 0%,#fff 100%)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#534AB7,#7F77DD)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,fontWeight:700}}>T</div>
          <span style={{fontSize:18,fontWeight:700,color:"#2C2C2A",letterSpacing:-0.3,fontFamily:SF}}>TrialLens</span>
          <span style={{fontSize:11,fontWeight:600,color:"#888780",background:"#F1EFE8",padding:"2px 8px",borderRadius:4}}>by PharmaVerse</span>
        </div>
        <p style={{fontSize:13,color:"#888780",margin:"8px 0 0"}}>Search and explore 400,000+ clinical trials from ClinicalTrials.gov</p>
        {(tab==="search"||tab==="analytics")&&<>
          <div style={{display:"flex",gap:8,marginTop:18}}>
            <div style={{flex:1,display:"flex",alignItems:"center",border:"1.5px solid #d3d1c7",borderRadius:10,padding:"0 14px",background:"#fff"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()} placeholder="Search by condition, drug, sponsor, or keyword..." style={{flex:1,border:"none",outline:"none",padding:"12px 10px",fontSize:14,color:"#2C2C2A",background:"transparent",fontFamily:"inherit"}}/>
            </div>
            <button onClick={doSearch} style={{padding:"0 24px",borderRadius:10,border:"none",background:"#534AB7",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Search</button>
          </div>
          {!hasSearched&&<div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}><span style={{fontSize:12,color:"#888780",lineHeight:"28px"}}>Try:</span>{["Diabetes","Lung cancer","Alzheimer","Pembrolizumab","COVID-19"].map(s=><button key={s} onClick={()=>{setQuery(s);setSearchTerm(s.toLowerCase());setHasSearched(true);setPhaseF([]);setStatusF([])}} style={{padding:"4px 12px",borderRadius:20,border:"1px solid #e8e6df",background:"#fff",fontSize:12,color:"#534AB7",cursor:"pointer",fontWeight:500}}>{s}</button>)}</div>}
        </>}
        <div style={{display:"flex",gap:4,marginTop:16}}>
          {[{id:"search",l:"Search",ic:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>},{id:"analytics",l:"Analytics",ic:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>},{id:"compare",l:"Compare",ic:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>},{id:"eligibility",l:"Eligibility",ic:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>},{id:"ai",l:"AI Insights",ic:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2H10a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/></svg>}].map(t=><TabButton key={t.id} label={t.l} active={tab===t.id} onClick={()=>setTab(t.id)} icon={t.ic}/>)}
        </div>
      </div>

      {tab==="search"&&<div>
        {hasSearched&&<div style={{padding:"12px 32px",borderBottom:"1px solid #e8e6df"}}><div style={{marginBottom:8}}><span style={{fontSize:11,fontWeight:600,color:"#888780",textTransform:"uppercase"}}>Phase</span><div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>{PHASES.map(p=><FilterChip key={p} label={PL[p]} active={phaseF.includes(p)} onClick={()=>toggle(phaseF,setPhaseF,p)}/>)}</div></div><div><span style={{fontSize:11,fontWeight:600,color:"#888780",textTransform:"uppercase"}}>Status</span><div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>{STATUSES.map(s=><FilterChip key={s} label={fmtSt(s)} active={statusF.includes(s)} onClick={()=>toggle(statusF,setStatusF,s)}/>)}</div></div></div>}
        {hasSearched&&<div style={{padding:"14px 32px",borderBottom:"1px solid #e8e6df",fontSize:13,color:"#888780"}}><strong style={{color:"#2C2C2A"}}>{results.length}</strong> trials for "<strong style={{color:"#2C2C2A"}}>{searchTerm}</strong>"</div>}
        {!hasSearched&&<EmptyState icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>} title="Search clinical trials worldwide" desc="Enter a condition, drug, sponsor, or keyword to explore 400,000+ trials from ClinicalTrials.gov"/>}
        {results.map((s,i)=><TrialCard key={i} study={s} onClick={()=>setSelected(s)}/>)}
      </div>}
      {tab==="analytics"&&<AnalyticsPanel searchTerm={searchTerm}/>}
      {tab==="compare"&&<SponsorCompare/>}
      {tab==="eligibility"&&<EligibilityMatcher/>}
      {tab==="ai"&&<AIInsights/>}
    </div>
  );
}
