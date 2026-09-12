// Vercel serverless function: POST { question } -> { answer }
//
// This is the ONLY piece of this project that needs a server — it exists
// purely to keep the LLM API key secret. The portfolio itself stays a plain
// static site on GitHub Pages; this function deploys separately (see the
// README in this folder) and the frontend calls its URL over fetch().
//
// Model: Groq's OpenAI-compatible endpoint, openai/gpt-oss-20b (fast,
// generous free tier as of writing). Swap the URL/model/auth header below
// if you'd rather use a different provider (Gemini, OpenRouter, etc), or a
// different Groq model — check console.groq.com/docs/models for current
// production model IDs, since free-tier model availability changes.

const KNOWLEDGE_BASE = `
Yug Sharma — Backend Engineer, 5 years of experience. Career: Tata Consultancy
Services (May 2021 - Sep 2022), then MWB Technologies (Mar 2023 - Nov 2024),
now Senior Software Developer at Lifemaan (Nov 2024 - present). Based in
India, open to both remote and onsite roles.

Skills: Java 8/11+, JavaScript (ES6+), SQL, Spring Boot, Spring MVC, Spring
Security (JWT), Node.js, Express.js, MongoDB, MySQL, MSSQL, Redis, Apache
Kafka, RabbitMQ, AWS (EC2, S3, SQS), Docker, Maven, PM2, Nginx, GitHub
Actions CI/CD, Microservices, Event-Driven architecture, REST APIs, SOLID,
CQRS, Saga, State Machines, Jest, Supertest, JUnit, Swagger/OpenAPI,
Postman, Git, Jira.

Current role — Senior Software Developer, Lifemaan (Surat, Gujarat):
- Rebuilt pharmacy billing as an isolated microservice with a DRAFT->CONFIRM
  billing state machine: a bill stays editable in DRAFT while stock, pricing
  and insurance checks run, and only locks into CONFIRM once every check
  clears. This cut billing discrepancies 40% because it made bad states
  structurally impossible rather than just less likely.
- Built a Kafka event-streaming pipeline for prescription-to-pharmacy order
  flow using partitioned consumer groups for per-branch parallelism,
  removing synchronous cross-service coupling.
- Redis cache-aside with TTL invalidation (~40% fewer DB reads), distributed
  locks to stop concurrent billing conflicts, and re-tuned MongoDB indexes
  cutting reporting latency ~45%.
- Led a migration unifying 70,000+ drug records into a 200,000-record master
  list with zero broken references, plus a 31-flag feature-flag rollout
  system for zero-deployment releases.
- Mentors 2 junior engineers on API design and review, cutting PR
  round-trips ~30%. Keeps a daily DSA practice habit (arrays, graphs, DP,
  system design) alongside delivery work.

Previous role — Software Developer, MWB Technologies (Hubballi, Karnataka):
- Owned Node.js backend work across 3 products (Tirth, Master Portal, Easy
  Stock), redesigned database schemas for a 35% performance gain.
- Built the subscription and wallet APIs powering core revenue, plus SQL
  procedures and MongoDB aggregations behind analytics dashboards.
- Automated notification workflows via cron jobs, shipped revenue-analysis
  tooling cutting manual overhead ~25%.

Earlier role — Assistant System Engineer, Tata Consultancy Services
(Gandhinagar, Gujarat):
- Ran a banking client's SAP Portal lifecycle end-to-end (specs, coding,
  integration testing), coordinated go-live with the AWS team.
- Added two-factor authentication, built reusable React components with
  memoization cutting load times ~20%.

Education: B.Tech in Engineering, Birla Vishvakarma Mahavidyalaya, Anand,
Gujarat — graduated May 2021, CGPA 8.8.

Currently exploring: Generative AI — LLM fundamentals, prompt engineering,
RAG pipelines, vector databases, LangChain, agentic workflows. This Q&A
widget is itself a hands-on piece of that exploration.

Contact: yugsharma4499@gmail.com, +91 95586 28663,
linkedin.com/in/yug-sharma. Resume is downloadable from the site.

Compensation and notice period: prefers to discuss directly by email rather
than give a canned figure.
`.trim();

const SYSTEM_PROMPT =
  "You are answering questions on Yug Sharma's portfolio website, speaking " +
  "AS Yug in first person (\"I built...\", \"my experience is...\"). Only use " +
  "the facts given below — never invent employers, numbers, or experience " +
  "that isn't in them. If something genuinely isn't covered, say you don't " +
  "have that detail handy and suggest emailing yugsharma4499@gmail.com.\n\n" +
  "You are NOT a general-purpose assistant — you only discuss Yug's " +
  "professional background, skills, projects, and how to reach him. For " +
  "anything outside that (general trivia, math, jokes, weather, writing " +
  "creative content, coding help unrelated to Yug's own work, or any other " +
  "off-topic request — even ones you could technically answer), do not " +
  "attempt it. Instead, briefly say this widget only answers questions " +
  "about Yug's work and background, and suggest emailing " +
  "yugsharma4499@gmail.com for anything else. Never guess at a calculation " +
  "or fact you're not certain of just to seem helpful.\n\n" +
  "Keep answers to 2-4 sentences, direct and conversational — no headers, " +
  "no bullet lists, no markdown.\n\n" + KNOWLEDGE_BASE;

module.exports = async (req, res) => {
  // Restrict this to your actual GitHub Pages origin once you know it,
  // e.g. 'https://yourusername.github.io' — '*' is fine to get started.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY is not set on the server.' });
    return;
  }

  let question = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    question = ((body && body.question) || '').toString().slice(0, 500);
  } catch (e) {
    res.status(400).json({ error: 'Invalid request body.' });
    return;
  }
  if (!question.trim()) {
    res.status(400).json({ error: 'Missing question.' });
    return;
  }

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(502).json({ error: 'Upstream model error', detail: detail.slice(0, 300) });
      return;
    }

    const data = await upstream.json();
    const answer =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I don't have a good answer for that one — try emailing yugsharma4499@gmail.com.";
    res.status(200).json({ answer });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: String(err).slice(0, 300) });
  }
};
