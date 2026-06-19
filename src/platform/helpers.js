const MCP_PUBMED = "https://pubmed.mcp.claude.com/mcp";
const FDA_BASE = "https://api.fda.gov/drug";

export async function queryPharmaRAG(question, imageData) {
  let fdaContext = "";
  const terms = question.replace(/[?.,!]/g, "").split(" ").filter(w => w.length > 3).slice(0, 2).join("+");
  if (terms) {
    try {
      const r = await fetch(FDA_BASE + "/drugsfda.json?search=openfda.brand_name:" + terms + "+openfda.generic_name:" + terms + "&limit=5");
      const d = await r.json();
      if (d.results) {
        fdaContext = d.results.map(r => {
          const p = (r.products || [])[0] || {};
          const s = (r.submissions || []).find(x => x.submission_type === "ORIG") || r.submissions?.[0] || {};
          return "FDA: " + (p.brand_name || "?") + " (" + r.application_number + ") | Sponsor: " + r.sponsor_name + " | Approved: " + (s.submission_status_date || "?");
        }).join("\n");
      }
    } catch (e) {}
  }

  const sysText = "You are PharmaVerse AI, a pharmaceutical intelligence assistant with access to PubMed (36M+ articles) and openFDA data. Answer thoroughly, cite PMIDs and FDA application numbers." +
    (imageData ? " The user uploaded an image. Identify medicines, pills, packaging, prescriptions, or medical documents." : "") +
    (fdaContext ? "\n\nopenFDA:\n" + fdaContext : "") +
    "\n\nQuestion: " + question;

  const content = [];
  if (imageData) {
    content.push({ type: "image", source: { type: "base64", media_type: imageData.type, data: imageData.base64 } });
  }
  content.push({ type: "text", text: sysText });

  const body = {
    model: "claude-sonnet-4-20250514", max_tokens: 4000,
    messages: [{ role: "user", content }],
    mcp_servers: [{ type: "url", url: MCP_PUBMED, name: "pubmed" }],
  };
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json();
  return (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n") || "Could not generate a response.";
}

export const TOOLS = [
  { id: "triallens", name: "TrialLens", icon: "\u{1F52C}", color: "#7C3AED", bg: "#F5F3FF", desc: "Clinical Trials Intelligence", sub: "Search, analyze & compare 400,000+ clinical trials", tags: ["Search","Analytics","Compare","Eligibility","AI Insights"] },
  { id: "drugnexus", name: "DrugNexus", icon: "\u2B21", color: "#E85D3A", bg: "#FFF7ED", desc: "Drug-Target Knowledge Graph", sub: "Interactive network graph mapping drugs to targets and diseases", tags: ["D3.js Graph","Drug Profiles","Pathways","Compare"] },
  { id: "bioinsight", name: "BioInsight", icon: "\u{1F4D6}", color: "#B44D2C", bg: "#FEF2F2", desc: "Biomedical Literature", sub: "Search 36M+ PubMed articles with Claude AI", tags: ["Live Search","AI Summary","Chat","Trends"] },
  { id: "fdaforge", name: "FDAForge", icon: "\u2699", color: "#1B813E", bg: "#F0FDF4", desc: "FDA Approvals Pipeline", sub: "ETL pipeline with live openFDA search and analytics", tags: ["Pipeline","Approvals","Analytics","Explorer"] },
];
