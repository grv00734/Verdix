# Verdix

## AI-Powered Legal Intelligence Platform for India

Verdix is an AI-driven legal intelligence platform designed to democratize access to justice in India. The system analyzes legal problems in natural language, retrieves live judicial precedents, predicts probable outcomes, and connects clients with verified lawyers based on specialization and performance data.

---

## 1. Problem Statement

### 1.1 For Citizens

- Legal discovery is opaque and dependent on informal recommendations.
- No structured way to evaluate lawyer specialization or performance.
- Legal terminology creates accessibility barriers.
- Rural and non-English-speaking populations remain underserved.

### 1.2 For Lawyers

- Legal research is time-intensive and manually driven.
- Case law retrieval lacks structured automation.
- Junior associates spend excessive time on precedent search.
- No transparent digital performance profiling system exists.

### 1.3 Market Gap

India lacks a centralized legal intelligence infrastructure that integrates case analysis, precedent retrieval, and structured lawyer matching.

---

## 2. Solution Overview

Verdix is built on a live Retrieval-Augmented Generation (RAG) architecture that provides:

1. Natural language case intake  
2. Automated legal classification  
3. Live precedent retrieval  
4. Contextual legal reasoning  
5. Outcome probability estimation  
6. Data-driven lawyer matching  

---

## 3. Core Features

### 3.1 AI Case Intelligence Engine

- Plain-language case input  
- Automated legal categorization  
- Structured legal interpretation  

### 3.2 Live Precedent Retrieval (RAG Architecture)

- Real-time Indian Kanoon integration  
- Embedding-based similarity search  
- Context-aware case synthesis  

### 3.3 Lawyer Intelligence System

- Specialization mapping  
- Performance-based ranking  
- Location-agnostic discovery  

### 3.4 Predictive Justice Analytics (Roadmap)

- Win probability scoring  
- Judge behavior modeling  
- Risk assessment engine  

### 3.5 Multilingual Voice Interface (Roadmap)

- Regional language support  
- Speech-to-text input  
- AI-driven voice responses  

### 3.6 Blockchain Evidence Locker (Roadmap)

- Tamper-proof document hashing  
- Smart contract-based timestamping  
- Immutable proof-of-existence  

---

## 4. System Architecture

### 4.1 Frontend

- React.js  
- TypeScript  
- Tailwind CSS  

### 4.2 Backend

- Node.js  
- Express.js  
- MongoDB Atlas  
- JWT Authentication  
- Role-Based Access Control  

### 4.3 AI/ML Layer

- LLM-based reasoning engine  
- Retrieval-Augmented Generation  
- Vector similarity search  
- Predictive modeling framework  

### 4.4 Infrastructure

- Docker containerization  
- CI/CD pipeline  
- Cloud deployment (AWS / GCP)  
- Secure object storage  
- HTTPS with TLS encryption  

---

## 5. User Flow

### 5.1 Client Journey

1. User submits legal issue  
2. AI classifies case  
3. System retrieves precedents  
4. AI synthesizes analysis  
5. Platform recommends lawyers  

### 5.2 Lawyer Journey

1. Lawyer registration and verification  
2. AI research assistant access  
3. Lead acquisition  
4. Digital reputation building  

---

## 6. Monetization Model

### 6.1 Citizens

Freemium model:
- Basic case classification (Free)  
- Detailed legal intelligence reports (Paid)  

### 6.2 Lawyers

SaaS subscription:
- AI research tools  
- Draft automation  
- Lead generation  
- Analytics dashboard  

---

## 7. Security and Compliance

- JWT-based authentication  
- Role-based authorization  
- Encrypted document storage  
- Secure API integrations  
- Audit logging  

---

## 8. Development Setup

### 8.1 Clone Repository

```bash
git clone https://github.com/your-username/verdix.git
```
### 8.2 Run Backend

```bash
cd backend
cp .env.example .env      # then fill in MONGODB_URI, JWT_SECRET, XAI_API_KEY
npm install
npm run dev               # starts on PORT (default 5001)
```

### 8.3 Run Frontend

```bash
cd frontend
npm install
npm start                 # starts on http://localhost:3000
```

The frontend talks to the backend at `REACT_APP_API_URL` (defaults to
`http://localhost:5001/api`).

---

## 9. Precedent Data — Indian Kanoon Crawler

Verdix populates its precedent database by **crawling the public Indian Kanoon
website** (no paid API key required). The crawler is polite by default:
configurable request delay, exponential-backoff retries, and de-duplicated
storage in MongoDB.

### 9.1 Populate the database (CLI)

```bash
cd backend
npm run crawl                                  # crawl the default seed queries
npm run crawl -- --limit 8 "Section 302 IPC"   # custom query / docs-per-query
npm run crawl -- --no-embed "bail" "dowry"     # skip vector embeddings
```

### 9.2 Crawl via API

| Method | Endpoint                          | Description                                  |
| ------ | --------------------------------- | -------------------------------------------- |
| `POST` | `/api/kanoon/search`              | Live search (returns results, no storage)    |
| `POST` | `/api/kanoon/sync`                | Crawl + store + embed (`{ queries, limit }`) |
| `POST` | `/api/kanoon/fetch-single`        | Crawl one judgment by URL                    |
| `GET`  | `/api/kanoon/stats`               | Indexed-case statistics                      |
| `GET`  | `/api/kanoon/recommended-queries` | Suggested seed queries                       |

Crawler behaviour is tuned via `KANOON_CRAWL_DELAY_MS`, `KANOON_MAX_RETRIES`,
`KANOON_TIMEOUT_MS`, and `KANOON_USER_AGENT` (see `.env.example`). Please crawl
responsibly and respect the source site's terms of use.

