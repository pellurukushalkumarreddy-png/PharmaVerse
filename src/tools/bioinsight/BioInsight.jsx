import { useState, useEffect, useRef, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

import DB from "./data.json";
const T = {
  bg: "#FEFCF8", panel: "#FBF8F1", card: "#FFFFFF",
  border: "#E8E2D6", borderLight: "#F0EBE1",
  text: "#2B2520", sec: "#6B6158", muted: "#9A9186",
  accent: "#B44D2C", accent2: "#2D6B56", accent3: "#3B5998",
  tc: {"CRISPR Gene Therapy":"#B44D2C","GLP-1 & Obesity":"#2D6B56","mRNA Cancer Vaccines":"#7B4BAF","Alzheimer Amyloid Therapy":"#3B5998","AI Drug Discovery":"#C17E2F"}
};
const DF = "'Libre Baskerville',Georgia,serif";
const BF = "'Nunito Sans',system-ui,sans-serif";
const MCP = "https://pubmed.mcp.claude.com/mcp";
const ARTICLES = DB.articles;
const TOPICS = DB.topics;

async function askClaude(prompt, mcp) {
  const body = {model:"claude-sonnet-4-20250514",max_tokens:4000,messages:[{role:"user",content:prompt}]};
  if(mcp) body.mcp_servers=[{type:"url",url:MCP,name:"pubmed"}];
  const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d = await r.json();
  return (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
}

function Badge({label,color}){
  return <span style={{padding:"2px 8px",borderRadius:12,fontSize:10,fontWeight:600,background:(color||T.accent)+"15",color:color||T.accent}}>{label}</span>;
}
function Card({children,style:s,onClick}){
  return <div onClick={onClick} style={{background:T.card,borderRadius:12,border:"1px solid "+T.border,padding:20,...s,cursor:onClick?"pointer":"default"}}>{children}</div>;
}
function Dots(){
  return <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center",padding:30}}>
    <span style={{fontSize:13,color:T.muted}}>Searching PubMed</span>
    {[0,1,2].map(j=><div key={j} style={{width:6,height:6,borderRadius:"50%",background:T.accent,animation:"bounce 1.2s "+j*0.15+"s infinite ease-in-out"}}/>)}
  </div>;
}
function CTooltip({active,payload,label}){
  if(!active||!payload?.length)return null;
  return <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:8,padding:"8px 12px",fontSize:12,color:T.text}}>
    <div style={{fontWeight:600,marginBottom:4}}>{label}</div>
    {payload.map((p,i)=><div key={i}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:p.color||p.fill,marginRight:6}}/>{p.name}: <b>{p.value}</b></div>)}
  </div>;
}

function ArticleCard({art,onClick,live}){
  const c=T.tc[art.topic]||T.accent;
  return <div onClick={onClick} style={{padding:"18px 24px",borderBottom:"1px solid "+T.borderLight,cursor:"pointer"}}
    onMouseEnter={e=>(e.currentTarget.style.background=T.panel)} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
      {live&&<Badge label="Live" color={T.accent2}/>}
      {art.topic&&<Badge label={art.topic} color={c}/>}
      {(art.pubTypes||[]).includes("Review")&&<Badge label="Review" color={T.accent3}/>}
      <span style={{fontSize:11,color:T.muted}}>{art.pubDate}</span>
    </div>
    <h3 style={{margin:"0 0 6px",fontSize:15,fontWeight:600,lineHeight:1.45,color:T.text,fontFamily:DF}}>{art.title}</h3>
    <div style={{fontSize:12,color:T.sec}}>{(art.authors||[]).join(", ")}{(art.authors||[]).length>2?" et al.":""}</div>
    <div style={{fontSize:11,color:T.muted,marginTop:4,fontStyle:"italic"}}>{art.journal}</div>
  </div>;
}

function Detail({art,onBack}){
  const c=T.tc[art.topic]||T.accent;
  return <div style={{padding:"24px 32px",maxWidth:800,margin:"0 auto"}}>
    <button onClick={onBack} style={{background:"none",border:"none",color:T.accent,fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:20}}>Back to results</button>
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {art.topic&&<Badge label={art.topic} color={c}/>}
      {(art.pubTypes||[]).map(t=><Badge key={t} label={t} color={T.accent3}/>)}
    </div>
    <h1 style={{fontSize:22,fontWeight:700,lineHeight:1.4,color:T.text,margin:"0 0 12px",fontFamily:DF}}>{art.title}</h1>
    <div style={{fontSize:13,color:T.sec,marginBottom:4}}>{(art.authors||[]).join(", ")}</div>
    <div style={{fontSize:12,color:T.muted,fontStyle:"italic",marginBottom:16}}>{art.journal} - {art.pubDate}</div>
    <div style={{display:"flex",gap:8,marginBottom:20}}>
      {art.doi&&<a href={"https://doi.org/"+art.doi} target="_blank" rel="noopener" style={{padding:"6px 14px",borderRadius:8,background:T.accent,color:"#fff",fontSize:12,fontWeight:600,textDecoration:"none"}}>DOI</a>}
      {art.pmid&&<a href={"https://pubmed.ncbi.nlm.nih.gov/"+art.pmid} target="_blank" rel="noopener" style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+T.border,color:T.sec,fontSize:12,fontWeight:600,textDecoration:"none"}}>PubMed</a>}
    </div>
    {art.abstract&&<Card style={{marginBottom:16}}><h3 style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1}}>Abstract</h3><p style={{fontSize:14,lineHeight:1.75,color:T.text,margin:0}}>{art.abstract}</p></Card>}
    {art.keywords?.length>0&&<Card><h3 style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:1}}>Keywords</h3><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{art.keywords.map(k=><span key={k} style={{padding:"4px 10px",borderRadius:20,fontSize:11,background:c+"12",color:c}}>{k}</span>)}</div></Card>}
  </div>;
}

function SearchTab({onSelect}){
  const[query,setQuery]=useState("");const[topic,setTopic]=useState(null);
  const[liveRes,setLiveRes]=useState(null);const[loading,setLoading]=useState(false);const[mode,setMode]=useState("featured");
  const featured=useMemo(()=>{let a=ARTICLES;if(topic)a=a.filter(x=>x.topic===topic);if(query.trim()){const q=query.toLowerCase();a=a.filter(x=>(x.title||"").toLowerCase().includes(q)||(x.abstract||"").toLowerCase().includes(q)||(x.keywords||[]).some(k=>k.toLowerCase().includes(q)));}return a;},[query,topic]);

  const search=async()=>{
    if(!query.trim())return;setLoading(true);setMode("live");setLiveRes(null);
    try{
      const text=await askClaude("Search PubMed for: "+query+". Return up to 8 recent articles. For each give PMID, title, authors (first 3), journal, date, DOI, and 1-sentence summary. Format as JSON array. JSON only, no other text.",true);
      const m=text.match(/\[[\s\S]*?\]/);
      if(m){const p=JSON.parse(m[0]);setLiveRes(p.map(a=>({...a,abstract:a.summary||"",_live:true})));}
      else{setLiveRes([{title:"Results",abstract:text,_live:true}]);}
    }catch{setLiveRes([{title:"Error",abstract:"Could not search PubMed. Browse featured articles.",_live:true}]);}
    setLoading(false);
  };

  return <div>
    <div style={{padding:"0 32px",marginBottom:12}}>
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1,display:"flex",alignItems:"center",background:T.panel,border:"1.5px solid "+T.border,borderRadius:10,padding:"0 14px"}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()}
            placeholder="Search all of PubMed - any topic, drug, gene, disease..."
            style={{flex:1,border:"none",outline:"none",padding:"11px 12px",fontSize:14,color:T.text,background:"transparent",fontFamily:BF}}/>
        </div>
        <button onClick={search} disabled={!query.trim()||loading}
          style={{padding:"10px 20px",borderRadius:10,border:"none",background:!query.trim()||loading?T.border:T.accent,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Search PubMed</button>
      </div>
      <p style={{fontSize:11,color:T.muted,margin:"6px 0 0"}}>Press Enter to query 36M+ PubMed articles via Claude AI</p>
    </div>
    <div style={{display:"flex",gap:4,padding:"0 32px",marginBottom:12}}>
      <button onClick={()=>setMode("featured")} style={{padding:"6px 16px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:mode==="featured"?T.accent+"14":"transparent",color:mode==="featured"?T.accent:T.muted}}>Featured ({ARTICLES.length})</button>
      {liveRes&&<button onClick={()=>setMode("live")} style={{padding:"6px 16px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:mode==="live"?T.accent2+"14":"transparent",color:mode==="live"?T.accent2:T.muted}}>Live ({liveRes.length})</button>}
    </div>
    {mode==="featured"&&<div style={{display:"flex",gap:6,padding:"0 32px",marginBottom:12,flexWrap:"wrap"}}>
      {TOPICS.map(t=><button key={t} onClick={()=>setTopic(topic===t?null:t)} style={{padding:"5px 13px",borderRadius:20,fontSize:11,fontWeight:600,border:topic===t?"2px solid "+T.tc[t]:"1.5px solid "+T.border,background:topic===t?T.tc[t]+"12":"transparent",color:topic===t?T.tc[t]:T.sec,cursor:"pointer"}}>{t}</button>)}
    </div>}
    {loading&&<Dots/>}
    {mode==="live"&&liveRes&&!loading&&liveRes.map((a,i)=><ArticleCard key={i} art={a} live onClick={()=>onSelect(a)}/>)}
    {mode==="featured"&&!loading&&featured.map(a=><ArticleCard key={a.pmid} art={a} onClick={()=>onSelect(a)}/>)}
  </div>;
}

function ChatTab(){
  const[q,setQ]=useState("");const[msgs,setMsgs]=useState([]);const[loading,setLoading]=useState(false);const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const SAMPLES=["Latest CRISPR clinical trials?","GLP-1 agonists for obesity?","mRNA cancer vaccine breakthroughs","Amyloid-targeting Alzheimer drugs?","AI in drug discovery?","CAR-T therapy for solid tumors"];

  const ask=async(text)=>{
    const query=text||q.trim();if(!query)return;setQ("");
    setMsgs(p=>[...p,{role:"user",text:query}]);setLoading(true);
    try{
      const resp=await askClaude("You are BioInsight AI with PubMed access. Answer: "+query+". Search PubMed, cite PMIDs/DOIs. Be concise.",true);
      setMsgs(p=>[...p,{role:"ai",text:resp||"No response."}]);
    }catch{setMsgs(p=>[...p,{role:"ai",text:"Could not connect. Try again."}]);}
    setLoading(false);
  };

  const fmt=(text)=>text.split("\n").map((line,i)=>{
    if(line.startsWith("##"))return <h3 key={i} style={{fontSize:15,fontWeight:700,color:T.text,margin:"12px 0 6px",fontFamily:DF}}>{line.replace(/^#+\s*/,"")}</h3>;
    if(line.startsWith("- "))return <div key={i} style={{display:"flex",gap:8,fontSize:13,lineHeight:1.6,color:T.sec,marginBottom:3}}><span style={{color:T.accent}}>*</span><span>{line.slice(2)}</span></div>;
    if(!line.trim())return <div key={i} style={{height:4}}/>;
    return <p key={i} style={{fontSize:13,lineHeight:1.65,color:T.sec,margin:"2px 0"}}>{line}</p>;
  });

  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 200px)",minHeight:500}}>
    <div style={{flex:1,overflow:"auto",padding:"24px 32px"}}>
      {msgs.length===0&&<div style={{textAlign:"center",paddingTop:40}}>
        <h2 style={{fontSize:18,fontWeight:700,color:T.text,margin:"0 0 6px",fontFamily:DF}}>Ask about biomedical research</h2>
        <p style={{fontSize:13,color:T.muted,maxWidth:480,margin:"0 auto 20px"}}>Powered by Claude AI + live PubMed search across 36M+ articles</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxWidth:520,margin:"0 auto"}}>
          {SAMPLES.map((s,i)=><button key={i} onClick={()=>ask(s)} style={{padding:"10px 14px",borderRadius:10,border:"1px solid "+T.border,background:T.panel,fontSize:12,color:T.sec,cursor:"pointer",textAlign:"left",fontFamily:BF}}>{s}</button>)}
        </div>
      </div>}
      {msgs.map((m,i)=><div key={i} style={{marginBottom:18,display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
        {m.role==="user"
          ?<div style={{maxWidth:"70%",padding:"10px 16px",borderRadius:"14px 14px 4px 14px",background:T.accent,color:"#fff",fontSize:13}}>{m.text}</div>
          :<div style={{maxWidth:"90%",width:"100%"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,"+T.accent+","+T.accent2+")",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:9,fontWeight:700}}>AI</span></div>
              <span style={{fontSize:11,fontWeight:600,color:T.accent}}>BioInsight AI</span>
              <Badge label="Live PubMed" color={T.accent2}/>
            </div>
            <div style={{padding:"14px 18px",borderRadius:"4px 14px 14px 14px",background:T.panel,border:"1px solid "+T.border}}>{fmt(m.text)}</div>
          </div>}
      </div>)}
      {loading&&<Dots/>}
      <div ref={endRef}/>
    </div>
    <div style={{padding:"14px 32px 18px",borderTop:"1px solid "+T.border,background:T.bg}}>
      <div style={{display:"flex",gap:8}}>
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&ask()}
          placeholder="Ask about any biomedical topic..."
          style={{flex:1,padding:"10px 14px",border:"1.5px solid "+T.border,borderRadius:10,fontSize:13,color:T.text,background:T.panel,fontFamily:BF,outline:"none"}}/>
        <button onClick={()=>ask()} disabled={!q.trim()||loading}
          style={{width:42,height:42,borderRadius:10,border:"none",background:!q.trim()||loading?T.border:T.accent,color:"#fff",cursor:"pointer",fontSize:16}}>Go</button>
      </div>
    </div>
  </div>;
}

function TrendsTab(){
  const td=TOPICS.map(t=>({name:t.length>18?t.slice(0,16)+"...":t,full:t,n:ARTICLES.filter(a=>a.topic===t).length,total:DB.totalResults[t]||0,color:T.tc[t]}));
  const jc={};ARTICLES.forEach(a=>{if(a.journal)jc[a.journal]=(jc[a.journal]||0)+1;});
  const topJ=Object.entries(jc).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,c])=>({name:n.length>22?n.slice(0,20)+"...":n,count:c}));
  const PIE=["#B44D2C","#2D6B56","#7B4BAF","#3B5998","#C17E2F"];

  return <div style={{padding:"24px 32px"}}>
    <h2 style={{fontSize:20,fontWeight:700,color:T.text,margin:"0 0 4px",fontFamily:DF}}>Research Trends</h2>
    <p style={{fontSize:13,color:T.muted,margin:"0 0 20px"}}>PubMed landscape across 5 hot biomedical topics</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:12,marginBottom:24}}>
      {td.map(t=><Card key={t.full} style={{textAlign:"center",borderTop:"3px solid "+t.color}}>
        <div style={{fontSize:22,fontWeight:700,color:t.color,fontFamily:DF}}>{(t.total/1000).toFixed(1)}K</div>
        <div style={{fontSize:10,color:T.muted,textTransform:"uppercase",fontWeight:600}}>on PubMed</div>
        <div style={{fontSize:11,color:T.sec,marginTop:6,lineHeight:1.3}}>{t.full}</div>
        <div style={{fontSize:10,color:T.muted,marginTop:4}}>{t.n} featured</div>
      </Card>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card>
        <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase"}}>Top Journals</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topJ} layout="vertical" margin={{top:4,right:12,left:4,bottom:4}}>
            <XAxis type="number" tick={{fontSize:11,fill:T.muted}} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:T.sec}} width={120} axisLine={false} tickLine={false}/>
            <Tooltip content={<CTooltip/>}/>
            <Bar dataKey="count" name="Articles" fill={T.accent} radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase"}}>PubMed Scale by Topic</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={td.map(t=>({name:t.full,value:t.total}))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2} strokeWidth={0}>
              {td.map((t,i)=><Cell key={i} fill={PIE[i]}/>)}
            </Pie>
            <Tooltip content={<CTooltip/>}/>
            <Legend wrapperStyle={{fontSize:10}} iconSize={8}/>
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  </div>;
}

export default function BioInsight(){
  const[tab,setTab]=useState("search");const[sel,setSel]=useState(null);
  return <div style={{minHeight:"100vh",background:T.bg,fontFamily:BF}}>
    <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Nunito+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <style>{"@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}"}</style>
    <div style={{padding:"14px 28px",display:"flex",alignItems:"center",gap:20,borderBottom:"1px solid "+T.border,background:T.bg,position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,"+T.accent+","+T.accent2+")",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
        </div>
        <div>
          <h1 style={{margin:0,fontSize:18,fontWeight:700,color:T.text,fontFamily:DF,lineHeight:1}}>BioInsight</h1>
          <p style={{margin:0,fontSize:10,color:T.muted,letterSpacing:0.5}}>Biomedical Literature Intelligence</p>
        </div>
      </div>
      <div style={{display:"flex",gap:2,marginLeft:"auto"}}>
        {[["search","Search"],["chat","Chat"],["trends","Trends"]].map(([id,label])=>
          <button key={id} onClick={()=>{setTab(id);setSel(null);}} style={{padding:"8px 14px",borderRadius:8,border:"none",background:tab===id?T.accent+"14":"transparent",color:tab===id?T.accent:T.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>
        )}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,background:T.accent2+"12",fontSize:10,fontWeight:600,color:T.accent2}}>
        <span style={{width:6,height:6,borderRadius:"50%",background:T.accent2}}/>Live PubMed + 50 Featured
      </div>
    </div>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      {sel?<Detail art={sel} onBack={()=>setSel(null)}/>
        :tab==="search"?<SearchTab onSelect={a=>setSel(a)}/>
        :tab==="chat"?<ChatTab/>
        :<TrendsTab/>}
    </div>
  </div>;
}
