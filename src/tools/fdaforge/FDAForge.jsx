import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid, AreaChart, Area } from "recharts";

import DB from "./data.json";
const DRUGS = DB.drugs;
const C = {
  bg: "#F4F5F7", panel: "#FFFFFF", card: "#FFFFFF",
  border: "#DFE1E6", dark: "#172B4D", sec: "#44546F", muted: "#8993A4",
  green: "#1B813E", greenBg: "#E3FCEF", blue: "#0052CC", blueBg: "#DEEBFF",
  amber: "#FF8B00", amberBg: "#FFF7E6", red: "#DE350B", redBg: "#FFEBE6",
  purple: "#6554C0", purpleBg: "#EAE6FF",
};
const SF = "'Space Grotesk','DM Sans',system-ui,sans-serif";
const MF = "'JetBrains Mono',monospace";
const PIE = [C.green, C.blue, C.amber, C.purple, C.red, "#8993A4", "#00B8D9", "#36B37E"];

function Badge({label,color,bg}){return <span style={{padding:"3px 10px",borderRadius:4,fontSize:10,fontWeight:700,background:bg||C.greenBg,color:color||C.green,letterSpacing:0.5,textTransform:"uppercase"}}>{label}</span>}
function Card({children,style:s}){return <div style={{background:C.card,borderRadius:8,border:"1px solid "+C.border,padding:20,...s}}>{children}</div>}
function Stat({label,value,color,sub}){return <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:700,color:color||C.dark,fontFamily:SF}}>{value}</div><div style={{fontSize:10,color:C.muted,textTransform:"uppercase",fontWeight:600,letterSpacing:0.8,marginTop:2}}>{label}</div>{sub&&<div style={{fontSize:10,color:C.sec,marginTop:2}}>{sub}</div>}</div>}
function CTip({active,payload,label}){if(!active||!payload?.length)return null;return <div style={{background:"#fff",border:"1px solid "+C.border,borderRadius:6,padding:"8px 12px",fontSize:12,color:C.dark,boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}><div style={{fontWeight:600,marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i}><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:p.color||p.fill,marginRight:6}}/>{p.name}: <b>{p.value}</b></div>)}</div>}

// Pipeline diagram
function PipelineTab(){
  const steps=[
    {name:"Extract",desc:"openFDA API",detail:`${DRUGS.length} drug records fetched`,color:C.blue,bg:C.blueBg},
    {name:"Transform",desc:"Clean & Enrich",detail:"Normalize sponsors, parse dates, classify",color:C.amber,bg:C.amberBg},
    {name:"Load",desc:"Structured JSON",detail:"Indexed by year, sponsor, route, class",color:C.green,bg:C.greenBg},
    {name:"Visualize",desc:"React Dashboard",detail:"Charts, filters, search, analytics",color:C.purple,bg:C.purpleBg},
  ];
  const yc={};const tc={};const rc={};
  DRUGS.forEach(d=>{yc[d.year]=(yc[d.year]||0)+1;tc[d.appType]=(tc[d.appType]||0)+1;rc[d.reviewPriority||"UNKNOWN"]=(rc[d.reviewPriority]||0)+1;});

  return <div style={{padding:"24px 32px"}}>
    <h2 style={{fontSize:22,fontWeight:700,color:C.dark,margin:"0 0 4px",fontFamily:SF}}>ETL Pipeline Architecture</h2>
    <p style={{fontSize:13,color:C.sec,margin:"0 0 24px"}}>End-to-end data pipeline: FDA drug approvals from API to dashboard</p>

    <Card style={{marginBottom:24,padding:32}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        {steps.map((s,i)=><React.Fragment key={s.name}>
          <div style={{flex:1,textAlign:"center",padding:20,borderRadius:8,border:"2px solid "+s.color+"40",background:s.bg}}>
            <div style={{fontSize:11,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{s.name}</div>
            <div style={{fontSize:14,fontWeight:600,color:C.dark}}>{s.desc}</div>
            <div style={{fontSize:11,color:C.sec,marginTop:4}}>{s.detail}</div>
          </div>
          {i<steps.length-1&&<div style={{fontSize:20,color:C.muted,flexShrink:0}}>→</div>}
        </React.Fragment>)}
      </div>
    </Card>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:24}}>
      <Card><Stat label="Total Drugs" value={DRUGS.length} color={C.green}/></Card>
      <Card><Stat label="NDAs" value={tc["NDA"]||0} color={C.blue} sub="New Drug Applications"/></Card>
      <Card><Stat label="BLAs" value={tc["BLA"]||0} color={C.purple} sub="Biologic Licenses"/></Card>
      <Card><Stat label="Year Range" value={DB.meta.dateRange} color={C.amber}/></Card>
    </div>

    <Card>
      <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Data Quality Summary</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
        {[
          {l:"With approval date",v:DRUGS.filter(d=>d.approvalDate).length,t:DRUGS.length},
          {l:"With review priority",v:DRUGS.filter(d=>d.reviewPriority&&d.reviewPriority!=="UNKNOWN").length,t:DRUGS.length},
          {l:"With pharma class",v:DRUGS.filter(d=>d.pharmClass).length,t:DRUGS.length},
        ].map(x=><div key={x.l}>
          <div style={{fontSize:13,fontWeight:600,color:C.dark}}>{x.l}</div>
          <div style={{height:6,borderRadius:3,background:C.border,marginTop:6}}>
            <div style={{height:6,borderRadius:3,background:C.green,width:Math.round(x.v/x.t*100)+"%"}}/>
          </div>
          <div style={{fontSize:11,color:C.muted,marginTop:4}}>{x.v}/{x.t} ({Math.round(x.v/x.t*100)}%)</div>
        </div>)}
      </div>
    </Card>
  </div>;
}

// Approvals timeline
function ApprovalsTab(){
  const[typeF,setTypeF]=useState(null);const[routeF,setRouteF]=useState(null);
  const filtered=useMemo(()=>{let d=DRUGS;if(typeF)d=d.filter(x=>x.appType===typeF);if(routeF)d=d.filter(x=>x.route===routeF);return d;},[typeF,routeF]);
  const yc={};filtered.forEach(d=>{if(d.year)yc[d.year]=(yc[d.year]||0)+1;});
  const yearData=Object.entries(yc).sort().map(([y,c])=>({year:y,approvals:c}));
  const routes={};DRUGS.forEach(d=>{if(d.route)routes[d.route]=(routes[d.route]||0)+1;});
  const topRoutes=Object.entries(routes).sort((a,b)=>b[1]-a[1]).slice(0,6);

  return <div style={{padding:"24px 32px"}}>
    <h2 style={{fontSize:22,fontWeight:700,color:C.dark,margin:"0 0 4px",fontFamily:SF}}>Drug Approvals Timeline</h2>
    <p style={{fontSize:13,color:C.sec,margin:"0 0 16px"}}>{filtered.length} approvals{typeF?" ("+typeF+")":""}{routeF?" via "+routeF:""}</p>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {["NDA","BLA"].map(t=><button key={t} onClick={()=>setTypeF(typeF===t?null:t)} style={{padding:"5px 14px",borderRadius:4,fontSize:11,fontWeight:700,border:typeF===t?"2px solid "+C.blue:"1px solid "+C.border,background:typeF===t?C.blueBg:"#fff",color:typeF===t?C.blue:C.sec,cursor:"pointer"}}>{t}</button>)}
      <span style={{width:1,background:C.border,margin:"0 4px"}}/>
      {topRoutes.slice(0,4).map(([r])=><button key={r} onClick={()=>setRouteF(routeF===r?null:r)} style={{padding:"5px 14px",borderRadius:4,fontSize:11,fontWeight:600,border:routeF===r?"2px solid "+C.green:"1px solid "+C.border,background:routeF===r?C.greenBg:"#fff",color:routeF===r?C.green:C.sec,cursor:"pointer"}}>{r}</button>)}
    </div>

    <Card style={{marginBottom:16}}>
      <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Approvals Per Year</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={yearData} margin={{top:4,right:8,left:-10,bottom:4}}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
          <XAxis dataKey="year" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
          <Tooltip content={<CTip/>}/>
          <Area type="monotone" dataKey="approvals" name="Approvals" stroke={C.green} fill={C.green+"30"} strokeWidth={2}/>
        </AreaChart>
      </ResponsiveContainer>
    </Card>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card>
        <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>By Route</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={topRoutes.map(([n,c])=>({name:n,count:c}))} layout="vertical" margin={{top:4,right:12,left:4,bottom:4}}>
            <XAxis type="number" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:C.sec}} width={80} axisLine={false} tickLine={false}/>
            <Tooltip content={<CTip/>}/><Bar dataKey="count" name="Drugs" fill={C.blue} radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>NDA vs BLA</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart><Pie data={[{name:"NDA",value:DRUGS.filter(d=>d.appType==="NDA").length},{name:"BLA",value:DRUGS.filter(d=>d.appType==="BLA").length}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} strokeWidth={0}>
            <Cell fill={C.blue}/><Cell fill={C.purple}/>
          </Pie><Tooltip content={<CTip/>}/><Legend wrapperStyle={{fontSize:11}} iconSize={8}/></PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  </div>;
}

// Review Analytics
function AnalyticsTab(){
  const rc={};DRUGS.forEach(d=>{const r=d.reviewPriority||"UNKNOWN";rc[r]=(rc[r]||0)+1;});
  const reviewData=Object.entries(rc).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({name:n,value:v}));
  const sc={};DRUGS.forEach(d=>{if(d.subClassDesc)sc[d.subClassDesc]=(sc[d.subClassDesc]||0)+1;});
  const subData=Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,v])=>({name:n.length>35?n.slice(0,33)+"...":n,value:v}));
  const dc={};DRUGS.forEach(d=>{if(d.dosage)dc[d.dosage]=(dc[d.dosage]||0)+1;});
  const dosData=Object.entries(dc).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,v])=>({name:n.length>20?n.slice(0,18)+"...":n,count:v}));
  const pc={};DRUGS.forEach(d=>{if(d.pharmClass)pc[d.pharmClass]=(pc[d.pharmClass]||0)+1;});
  const classData=Object.entries(pc).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,v])=>({name:n.length>30?n.slice(0,28)+"...":n,count:v}));

  const priCount=DRUGS.filter(d=>d.reviewPriority==="PRIORITY").length;
  const stdCount=DRUGS.filter(d=>d.reviewPriority==="STANDARD").length;

  return <div style={{padding:"24px 32px"}}>
    <h2 style={{fontSize:22,fontWeight:700,color:C.dark,margin:"0 0 4px",fontFamily:SF}}>Review Analytics</h2>
    <p style={{fontSize:13,color:C.sec,margin:"0 0 20px"}}>FDA review classifications and drug characteristics</p>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:24}}>
      <Card><Stat label="Priority Review" value={priCount} color={C.amber} sub={Math.round(priCount/DRUGS.length*100)+"% of all"}/></Card>
      <Card><Stat label="Standard Review" value={stdCount} color={C.blue} sub={Math.round(stdCount/DRUGS.length*100)+"% of all"}/></Card>
      <Card><Stat label="Unique Pharma Classes" value={Object.keys(pc).length} color={C.purple}/></Card>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
      <Card>
        <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Review Priority</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart><Pie data={reviewData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2} strokeWidth={0}>
            {reviewData.map((e,i)=><Cell key={i} fill={PIE[i]}/>)}</Pie>
            <Tooltip content={<CTip/>}/><Legend wrapperStyle={{fontSize:10}} iconSize={8}/>
          </PieChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Dosage Forms</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dosData} layout="vertical" margin={{top:4,right:12,left:4,bottom:4}}>
            <XAxis type="number" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:C.sec}} width={100} axisLine={false} tickLine={false}/>
            <Tooltip content={<CTip/>}/><Bar dataKey="count" name="Drugs" fill={C.amber} radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card>
        <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Submission Classifications</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={subData} layout="vertical" margin={{top:4,right:12,left:4,bottom:4}}>
            <XAxis type="number" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:8,fill:C.sec}} width={160} axisLine={false} tickLine={false}/>
            <Tooltip content={<CTip/>}/><Bar dataKey="value" name="Drugs" fill={C.green} radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Top Pharmacologic Classes</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={classData} layout="vertical" margin={{top:4,right:12,left:4,bottom:4}}>
            <XAxis type="number" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:8,fill:C.sec}} width={160} axisLine={false} tickLine={false}/>
            <Tooltip content={<CTip/>}/><Bar dataKey="count" name="Drugs" fill={C.purple} radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  </div>;
}

// Sponsors
function SponsorsTab(){
  const sc={};DRUGS.forEach(d=>{if(d.sponsor)sc[d.sponsor]=(sc[d.sponsor]||0)+1;});
  const topS=Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([n,c])=>({name:n.length>20?n.slice(0,18)+"...":n,full:n,count:c}));
  const recent=DRUGS.filter(d=>d.year>="2020");
  const rsc={};recent.forEach(d=>{if(d.sponsor)rsc[d.sponsor]=(rsc[d.sponsor]||0)+1;});
  const recentTop=Object.entries(rsc).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([n,c])=>({name:n.length>18?n.slice(0,16)+"...":n,count:c}));

  return <div style={{padding:"24px 32px"}}>
    <h2 style={{fontSize:22,fontWeight:700,color:C.dark,margin:"0 0 4px",fontFamily:SF}}>Sponsor Analytics</h2>
    <p style={{fontSize:13,color:C.sec,margin:"0 0 20px"}}>{Object.keys(sc).length} unique sponsors across {DRUGS.length} approvals</p>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
      <Card>
        <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Top Sponsors (All Time)</h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={topS} layout="vertical" margin={{top:4,right:12,left:4,bottom:4}}>
            <XAxis type="number" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:C.sec}} width={100} axisLine={false} tickLine={false}/>
            <Tooltip content={<CTip/>}/><Bar dataKey="count" name="Approvals" fill={C.blue} radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <h3 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Most Active (2020+)</h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={recentTop} layout="vertical" margin={{top:4,right:12,left:4,bottom:4}}>
            <XAxis type="number" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:C.sec}} width={100} axisLine={false} tickLine={false}/>
            <Tooltip content={<CTip/>}/><Bar dataKey="count" name="Approvals" fill={C.green} radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  </div>;
}

// Explorer (Live openFDA search + embedded data)
function ExplorerTab(){
  const[query,setQuery]=useState("");const[typeF,setTypeF]=useState(null);
  const[liveRes,setLiveRes]=useState(null);const[loading,setLoading]=useState(false);const[mode,setMode]=useState("embedded");
  const filtered=useMemo(()=>{let d=DRUGS;if(typeF)d=d.filter(x=>x.appType===typeF);if(query.trim()){const q=query.toLowerCase();d=d.filter(x=>(x.brand||"").toLowerCase().includes(q)||(x.generic||"").toLowerCase().includes(q)||(x.sponsor||"").toLowerCase().includes(q)||(x.pharmClass||"").toLowerCase().includes(q));}return d;},[query,typeF]);
  const[sel,setSel]=useState(null);

  const liveSearch=async()=>{
    if(!query.trim())return;setLoading(true);setMode("live");setLiveRes(null);
    try{
      const q=encodeURIComponent(query);
      const url="https://api.fda.gov/drug/drugsfda.json?search=openfda.brand_name:"+q+"+openfda.generic_name:"+q+"+sponsor_name:"+q+"&limit=20";
      const r=await fetch(url);const data=await r.json();
      if(data.results){
        const parsed=data.results.map(r=>{
          const prods=r.products||[];const subs=r.submissions||[];const ofd=r.openfda||{};
          const p=prods[0]||{};
          let aDate="",rp="",scd="";
          for(const s of subs){if(s.submission_type==="ORIG"&&s.submission_number==="1"){aDate=s.submission_status_date||"";rp=s.review_priority||"";scd=s.submission_class_code_description||"";break;}}
          if(!aDate)for(const s of subs){if(s.submission_status==="AP"){aDate=s.submission_status_date||"";rp=s.review_priority||"";scd=s.submission_class_code_description||"";break;}}
          return{appNum:r.application_number||"",appType:r.application_number?.startsWith("BLA")?"BLA":"NDA",brand:p.brand_name||"",generic:(ofd.generic_name||[""])[0]||(p.active_ingredients||[]).map(i=>i.name).join(", "),sponsor:r.sponsor_name||"",approvalDate:aDate,year:aDate?.slice(0,4)||"",route:p.route||"",dosage:p.dosage_form||"",reviewPriority:rp,subClassDesc:scd,pharmClass:(ofd.pharm_class_epc||[""])[0],_live:true};
        }).filter(d=>d.brand);
        setLiveRes(parsed);
      }else{setLiveRes([]);}
    }catch(e){console.error(e);setLiveRes([]);}
    setLoading(false);
  };

  if(sel){
    const d=sel;
    return <div style={{padding:"24px 32px",maxWidth:800,margin:"0 auto"}}>
      <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:C.blue,fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:20}}>Back</button>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        {d._live&&<Badge label="LIVE" color={C.green} bg={C.greenBg}/>}
        <Badge label={d.appType} color={d.appType==="BLA"?C.purple:C.blue} bg={d.appType==="BLA"?C.purpleBg:C.blueBg}/>
        {d.reviewPriority&&d.reviewPriority!=="UNKNOWN"&&<Badge label={d.reviewPriority} color={d.reviewPriority==="PRIORITY"?C.amber:C.green} bg={d.reviewPriority==="PRIORITY"?C.amberBg:C.greenBg}/>}
      </div>
      <h1 style={{fontSize:24,fontWeight:700,color:C.dark,margin:"0 0 4px",fontFamily:SF}}>{d.brand}</h1>
      <p style={{fontSize:14,color:C.sec,margin:"0 0 16px",fontStyle:"italic"}}>{d.generic}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[["Sponsor",d.sponsor],["Approved",d.approvalDate?.replace(/(\d{4})(\d{2})(\d{2})/,"$1-$2-$3")],["App #",d.appNum],["Route",d.route],["Dosage",d.dosage],["Class",d.pharmClass||"N/A"]].map(([l,v])=>v&&<div key={l} style={{padding:"12px 14px",background:C.bg,borderRadius:6,border:"1px solid "+C.border}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.8}}>{l}</div>
          <div style={{fontSize:13,fontWeight:500,color:C.dark,marginTop:4}}>{v}</div>
        </div>)}
      </div>
      {d.subClassDesc&&<Card><div style={{fontSize:12,color:C.sec}}><strong>Classification:</strong> {d.subClassDesc}</div></Card>}
    </div>;
  }

  return <div style={{padding:"24px 32px"}}>
    <h2 style={{fontSize:22,fontWeight:700,color:C.dark,margin:"0 0 4px",fontFamily:SF}}>Drug Explorer</h2>
    <p style={{fontSize:13,color:C.sec,margin:"0 0 16px"}}>Search the full openFDA database (29,000+ drugs) or browse {DRUGS.length} embedded records</p>
    <div style={{display:"flex",gap:8,marginBottom:8}}>
      <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&liveSearch()}
        placeholder="Search any drug - brand, generic, sponsor..."
        style={{flex:1,padding:"10px 14px",borderRadius:6,border:"1.5px solid "+C.border,fontSize:14,color:C.dark,background:"#fff",fontFamily:SF,outline:"none"}}/>
      <button onClick={liveSearch} disabled={!query.trim()||loading}
        style={{padding:"8px 18px",borderRadius:6,border:"none",background:!query.trim()||loading?C.border:C.green,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Search FDA</button>
      {["NDA","BLA"].map(t=><button key={t} onClick={()=>{setTypeF(typeF===t?null:t);setMode("embedded");}} style={{padding:"8px 16px",borderRadius:6,fontSize:11,fontWeight:700,border:typeF===t?"2px solid "+C.blue:"1px solid "+C.border,background:typeF===t?C.blueBg:"#fff",color:typeF===t?C.blue:C.sec,cursor:"pointer"}}>{t}</button>)}
    </div>
    <p style={{fontSize:10,color:C.muted,margin:"0 0 12px"}}>Press Enter or click Search FDA to query the live openFDA API (29K+ records)</p>
    <div style={{display:"flex",gap:4,marginBottom:12}}>
      <button onClick={()=>setMode("embedded")} style={{padding:"5px 14px",borderRadius:4,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",background:mode==="embedded"?C.blueBg:"transparent",color:mode==="embedded"?C.blue:C.muted}}>Embedded ({DRUGS.length})</button>
      {liveRes!==null&&<button onClick={()=>setMode("live")} style={{padding:"5px 14px",borderRadius:4,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",background:mode==="live"?C.greenBg:"transparent",color:mode==="live"?C.green:C.muted}}>Live ({liveRes.length})</button>}
    </div>
    {loading&&<div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center",padding:30}}><span style={{fontSize:13,color:C.muted}}>Querying openFDA API...</span></div>}
    {mode==="live"&&liveRes&&!loading&&<><div style={{fontSize:12,color:C.green,fontWeight:600,marginBottom:10}}>{liveRes.length} live results from openFDA</div>
      {liveRes.length===0&&<div style={{padding:40,textAlign:"center",color:C.muted}}>No results found. Try a different search term.</div>}
      {liveRes.map((d,i)=><DrugRow key={i} d={d} onClick={()=>setSel(d)} live/>)}</>}
    {mode==="embedded"&&!loading&&<><div style={{fontSize:12,color:C.muted,marginBottom:10}}>{filtered.length} embedded results</div>
      {filtered.slice(0,50).map(d=><DrugRow key={d.appNum} d={d} onClick={()=>setSel(d)}/>)}</>}
  </div>;
}

function DrugRow({d,onClick,live}){
  return <div onClick={onClick} style={{padding:"14px 18px",background:"#fff",borderBottom:"1px solid "+C.border,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
    onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
    <div>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
        {live&&<Badge label="LIVE" color={C.green} bg={C.greenBg}/>}
        <Badge label={d.appType} color={d.appType==="BLA"?C.purple:C.blue} bg={d.appType==="BLA"?C.purpleBg:C.blueBg}/>
        {d.reviewPriority==="PRIORITY"&&<Badge label="PRIORITY" color={C.amber} bg={C.amberBg}/>}
        <span style={{fontSize:10,color:C.muted,fontFamily:MF}}>{d.appNum}</span>
      </div>
      <div style={{fontSize:14,fontWeight:600,color:C.dark}}>{d.brand}</div>
      <div style={{fontSize:12,color:C.sec}}>{d.generic} | {d.sponsor}</div>
    </div>
    <div style={{textAlign:"right",flexShrink:0}}>
      <div style={{fontSize:13,fontWeight:600,color:C.dark}}>{d.year}</div>
      <div style={{fontSize:10,color:C.muted}}>{d.route}</div>
    </div>
  </div>;
}

const TABS=[["pipeline","Pipeline"],["approvals","Approvals"],["analytics","Analytics"],["sponsors","Sponsors"],["explorer","Explorer"]];

export default function FDAForge(){
  const[tab,setTab]=useState("pipeline");
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:SF}}>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <div style={{padding:"12px 28px",display:"flex",alignItems:"center",gap:20,borderBottom:"1px solid "+C.border,background:"#fff",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:6,background:"linear-gradient(135deg,"+C.green+","+C.blue+")",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div>
          <h1 style={{margin:0,fontSize:18,fontWeight:700,color:C.dark,lineHeight:1}}>FDAForge</h1>
          <p style={{margin:0,fontSize:10,color:C.muted,letterSpacing:0.5}}>FDA Drug Approval Pipeline</p>
        </div>
      </div>
      <div style={{display:"flex",gap:2,marginLeft:"auto"}}>
        {TABS.map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{padding:"8px 14px",borderRadius:6,border:"none",background:tab===id?C.greenBg:"transparent",color:tab===id?C.green:C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>)}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:4,background:C.greenBg,fontSize:10,fontWeight:700,color:C.green}}>
        <span style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>Live openFDA
      </div>
    </div>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      {tab==="pipeline"&&<PipelineTab/>}
      {tab==="approvals"&&<ApprovalsTab/>}
      {tab==="analytics"&&<AnalyticsTab/>}
      {tab==="sponsors"&&<SponsorsTab/>}
      {tab==="explorer"&&<ExplorerTab/>}
    </div>
  </div>;
}
