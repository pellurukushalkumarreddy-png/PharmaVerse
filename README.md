# PharmaVerse

**Pharma Data Intelligence Platform** — An integrated suite of 4 specialized tools for clinical trials, drug discovery, biomedical research, and regulatory data, powered by a RAG chatbot.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-6-CA4245?logo=reactrouter&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-7-F9A03C?logo=d3.js&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-2-22B5BF)
![Claude AI](https://img.shields.io/badge/Claude_AI-Sonnet_4-6366F1)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/PharmaVerse.git
cd PharmaVerse
npm install
npm run dev
```

Opens at `http://localhost:3000`

---

## Platform Overview

### Home — RAG Pharma Chatbot
The landing page features an AI chatbot that can answer any pharmaceutical question by searching **PubMed** (36M+ articles) and **openFDA** (29K+ drugs) in real time. Supports **image upload** — take a photo of any medicine packaging, pill, or prescription and get instant identification and information.

### Use Case 1: TrialLens — Clinical Trials Intelligence
Search, analyze, and compare 400,000+ clinical trials from ClinicalTrials.gov.

| Module | Description |
|--------|-------------|
| Search | Full-text search with phase/status filters |
| Analytics | Phase distribution, timelines, top sponsors |
| Compare | Head-to-head sponsor comparison with radar charts |
| Eligibility | Patient-trial matching with scoring |
| AI Insights | Natural language Q&A powered by Claude AI |

### Use Case 2: DrugNexus — Drug-Target Knowledge Graph
Interactive D3.js force-directed network graph mapping drugs → protein targets → diseases.

| Module | Description |
|--------|-------------|
| Explore | Interactive network graph with drag, search |
| Drug Profile | Molecular properties, mechanism of action, indications |
| Target Profile | Protein details, gene symbols, UniProt links |
| Pathways | Drug → Target → Disease flow visualization |
| Compare | Head-to-head drug comparison with radar charts |

### Use Case 3: BioInsight — Biomedical Literature Intelligence
Search 36M+ PubMed articles live via Claude AI + PubMed MCP server.

| Module | Description |
|--------|-------------|
| Search | Live PubMed search + 50 featured articles with topic filters |
| Chat | Ask questions, get AI answers grounded in PubMed data |
| Trends | Publication analytics, top journals, topic scale |

### Use Case 4: FDAForge — FDA Drug Approval Pipeline
End-to-end ETL pipeline with live openFDA API search and analytics.

| Module | Description |
|--------|-------------|
| Pipeline | Visual ETL architecture diagram + data quality metrics |
| Approvals | Timeline with year/type/route filters |
| Analytics | Review priority, dosage forms, pharmacologic classes |
| Sponsors | Top sponsors all-time vs recent |
| Explorer | Live openFDA search (29K+ drugs) + embedded data browser |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite 5 |
| Routing | React Router v6 |
| Visualization | Recharts, D3.js (force-directed graphs) |
| AI | Claude API (Sonnet 4) + PubMed MCP Server |
| Data | ClinicalTrials.gov, ChEMBL, PubMed, openFDA |
| Image Analysis | Claude Vision (medicine identification) |

## Project Structure

```
src/
├── main.jsx                          # React + Router entry
├── App.jsx                           # Routes + layout
├── styles/global.css                 # Global styles
├── platform/
│   ├── Sidebar.jsx                   # Navigation sidebar
│   ├── HomePage.jsx                  # RAG chatbot + use-case cards
│   └── helpers.js                    # queryPharmaRAG, tool config
└── tools/
    ├── triallens/
    │   ├── TrialLens.jsx             # Full TrialLens app
    │   └── data.json                 # 150+ clinical trials
    ├── drugnexus/
    │   ├── DrugNexus.jsx             # Full DrugNexus app
    │   └── data.json                 # 20 drugs, 22 targets, 173 diseases
    ├── bioinsight/
    │   ├── BioInsight.jsx            # Full BioInsight app
    │   └── data.json                 # 50 featured PubMed articles
    └── fdaforge/
        ├── FDAForge.jsx              # Full FDAForge app
        └── data.json                 # 145 FDA drug approvals
```

## Data Sources (all free, no API keys needed)

| Source | Access | Data |
|--------|--------|------|
| ClinicalTrials.gov | Embedded (CORS blocked) | 150+ trials across 5 conditions |
| ChEMBL (EMBL-EBI) | Embedded | 20 drugs, 22 targets, 173 diseases |
| PubMed | Live via Claude MCP | 36M+ biomedical articles |
| openFDA | Live (CORS supported) | 29K+ drug applications |

## Deployment

```bash
npm run build    # → dist/
```

Deploy `dist/` to **Vercel**, **Netlify**, or **GitHub Pages**.

For Vercel: connect your GitHub repo → auto-deploys on push.

## License

MIT
