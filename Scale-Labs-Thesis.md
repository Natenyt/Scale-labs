---
title: "Scale Labs: Design and Implementation of an Autonomous AI Voice Agent Platform for Automating Business Communication Operations"
author: "Eshnazarov Davlat"
date: "Tashkent — 2026"
documentclass: report
geometry: a4paper, margin=2.5cm
fontsize: 12pt
linestretch: 1.5
toc: true
toc-depth: 2
numbersections: true
header-includes:
  - \usepackage{float}
  - \usepackage{caption}
  - \captionsetup[figure]{labelfont=bf}
  - \captionsetup[table]{labelfont=bf}
---

\thispagestyle{empty}

\begin{center}

\vspace*{1.4cm}

\textbf{\large MILLAT UMIDI UNIVERSITY}

\vspace{0.3cm}

Faculty of Information Technologies

\vspace{1.0cm}

ESHNAZAROV DAVLAT

\vspace{1.4cm}

\textbf{\Large SCALE LABS: DESIGN AND IMPLEMENTATION OF AN AUTONOMOUS AI VOICE AGENT PLATFORM FOR AUTOMATING BUSINESS COMMUNICATION OPERATIONS}

\vspace{1.0cm}

60610600 — Software Engineering

("Dasturiy injiniringi")

\vspace{1.0cm}

\textbf{Bachelor Degree Thesis}

\vspace{2.0cm}

\begin{flushleft}
\textbf{Supervisor:} \_\_\_\_\_\_\_\_\_\_\_\_,\\
IT Department, Senior teacher

\vspace{0.6cm}

\textbf{Reviewer:} \_\_\_\_\_\_\_\_\_\_\_\_,\\
IT Department, Senior teacher

\vspace{1.2cm}

"Admitted to defense"

Dean of the Information Technologies Faculty

\_\_\_\_\_\_\_\_\_\_ M.M. Pirnazarov

"\_\_\_" \_\_\_\_\_\_\_\_\_\_\_ 2026
\end{flushleft}

\vfill

Tashkent — 2026

\end{center}

\newpage

# ABSTRACT

This bachelor thesis presents the design and implementation of **Scale Labs**, an autonomous artificial-intelligence voice agent platform engineered from the ground up to automate the repetitive customer-communication operations that occupy the largest share of staffing in service-oriented organizations. The work addresses a concrete problem of operational economics in Uzbekistan and comparable emerging markets: a structural mismatch between the velocity at which service organizations are acquiring new customers (banks, telecommunications operators, marketplaces, logistics companies, microfinance institutions, educational organizations) and the velocity at which those organizations can hire, train, and supervise the human call-center operators required to maintain their service-level commitments. The thesis demonstrates that this class of work — payment reminders, balance enquiries, delivery confirmations, customer-satisfaction surveys, fraud step-up verification, lead qualification, appointment scheduling, and similar rule-bound conversations — can be reformulated as **configurable software** running on an autonomous voice agent platform.

Scale Labs is built as a complete, original engineering system. The platform comprises a visual workflow studio for non-engineering authors, an organization-scoped multi-tenant backend, a real-time voice runtime that performs speech recognition, language-model reasoning, and speech synthesis at sub-second latency over a telephony adapter, an integration layer that connects voice agents to external data systems through a tool-based webhook pattern, and an operational dashboard that surfaces transcripts, call records, and aggregate usage metrics for every active organization. The studio is implemented in **Next.js 16** with **React 19**, the backend in **Django 5** with **Django REST Framework**, the workflow editor on a directed-graph rendering engine, the data layer on a relational database accessed through a typed ORM, the authentication layer on rotating JSON Web Tokens with an active-organization header for tenant scoping, the credential storage on authenticated symmetric encryption, the voice runtime as a real-time conversation orchestrator combining automatic speech recognition, an LLM-driven dialogue manager, neural text-to-speech, and a telephony adapter for inbound and outbound calls.

The thesis is organized in accordance with the requirements for a bachelor-degree graduation project at Millat Umidi University. The introduction defines the object, subject, aim, tasks, methods, scientific novelty, and practical significance of the work. Chapter 1 analyses the relevance of autonomous customer voice communication for Uzbekistan, surveys existing categories of solutions (legacy IVR, generic chatbot stacks, contemporary voice-AI platforms, bespoke vendor projects, and internal call-centre automations), studies design influences from market predecessors including Retell AI and Vapi AI as platforms whose user experience and visual studios informed early design decisions, and concludes with a formal problem statement. Chapter 2 describes the technologies, alternatives, computer requirements, frameworks, libraries, and methodological foundations adopted by Scale Labs. Chapter 3 documents the implemented system, covering architecture, the multi-tenant request flow, the workflow studio, the workflow compiler, the voice runtime, the operational dashboard, security, testing, limitations, and future development. The conclusion summarizes the contribution, the references list the academic and technical sources used, and the applications close the document with the source-code structure and run instructions.

\vspace{0.6cm}

**Table 1. Thesis keywords.**

| Keyword | Description |
|---------|-------------|
| Scale Labs | Autonomous AI voice agent platform for automating business customer communication |
| Voice agent | Software process that conducts a phone conversation under workflow control |
| Workflow studio | Visual graph editor for business teams to design conversation flows |
| Workflow compiler | Module that translates a local workflow graph into a runtime payload |
| Voice runtime | Real-time orchestrator of speech recognition, language reasoning, speech synthesis, and telephony |
| Multi-tenant SaaS | Architecture in which many organizations share one deployment under strict data isolation |
| Django REST Framework | Python web framework used for organization-scoped JSON APIs |
| Next.js / React 19 | JavaScript framework and library used for the studio frontend |
| Modular customer communication | Approach in which new use cases are added as workflows rather than as separate products |
| Conversation flow | Typed graph of conversation, tool, transfer, and end-call nodes |
| Tool-use webhook pattern | Mechanism by which a voice agent reads and writes external data during a call |
| Operational dashboard | Workspace surface that exposes transcripts, call records, and aggregate usage metrics |

\newpage

\tableofcontents

\newpage

# LIST OF FIGURES

- Figure 1. Scale Labs system architecture (high-level component diagram).
- Figure 2. Multi-tenant request flow (organization-scoped authentication and authorization).
- Figure 3. Voice runtime real-time conversation pipeline.
- Figure 4. Workflow graph node taxonomy and compilation flow.
- Figure 5. Database entity-relationship diagram (organization-scoped tables).
- Figure 6. Studio dashboard with plan usage, workspace health, KPI row, call volume, attention list, and recent calls.
- Figure 7. Agents page with status summary strip, search and filter toolbar, and the agent card grid.
- Figure 8. Workflows list, one row per workflow, with publication status and structural counts.
- Figure 9. Workflow canvas — lead qualification template — with palette, canvas, and inspector.
- Figure 10. Integrations page — Notion connector with existing connections and coming-soon placeholders.
- Figure 11. Tools page — built-in system tools and per-integration auto-generated tools.
- Figure 12. Phone numbers page — numbers assigned to agents and workflows.
- Figure 13. Logs — table of recent calls with time, agent, type, duration, and cost.
- Figure 14. Call detail — transcript on the left, structured event log and cost breakdown on the right.
- Figure 15. Metrics page (top) — KPI row, ended-reason distribution, average duration by assistant, and cost breakdown.
- Figure 16. Metrics page (bottom) — call count over time, average duration over time, cost over time, success evaluation, unsuccessful calls, and concurrent calls by hour.
- Figure 17. Squads placeholder page reserved for multi-agent orchestration.

# LIST OF TABLES

- Table 1. Thesis keywords.
- Table 2. Comparative analysis of customer communication automation categories.
- Table 3. Indicative cost composition of a twenty-four-hour call-centre seat (Uzbekistan, 2025–2026 estimates).
- Table 4. Comparison of frontend framework alternatives for the studio.
- Table 5. Comparison of backend framework alternatives for the platform.
- Table 6. Comparison of database engines for the platform's data layer.
- Table 7. Indicative server requirements for a pilot deployment.
- Table 8. Database entities and ownership.
- Table 9. Principal API endpoints (versioned at `/api/v1/`).
- Table 10. Frontend dependencies.
- Table 11. Backend dependencies.
- Table 12. Workflow node taxonomy.
- Table 13. Notion tool taxonomy (per integration).
- Table 14. Security mechanisms summary.
- Table 15. Functional capabilities of the implemented prototype.
- Table 16. Plan tiers exposed in the billing UI.

# LIST OF ABBREVIATIONS

- **AI** — Artificial Intelligence
- **API** — Application Programming Interface
- **ASR** — Automatic Speech Recognition
- **CRM** — Customer Relationship Management
- **CSAT** — Customer Satisfaction
- **DRF** — Django REST Framework
- **DTMF** — Dual-Tone Multi-Frequency
- **HTTP** — Hypertext Transfer Protocol
- **IVR** — Interactive Voice Response
- **JWT** — JSON Web Token
- **KPI** — Key Performance Indicator
- **LLM** — Large Language Model
- **NLU** — Natural Language Understanding
- **ORM** — Object-Relational Mapping
- **PSTN** — Public Switched Telephone Network
- **REST** — Representational State Transfer
- **SaaS** — Software as a Service
- **SDK** — Software Development Kit
- **SIP** — Session Initiation Protocol
- **SQL** — Structured Query Language
- **TTS** — Text-to-Speech
- **UI / UX** — User Interface / User Experience
- **VOIP** — Voice over IP

\newpage

# INTRODUCTION

Digital channels have become the default way in which contemporary organizations stay in contact with their customers. Banks send payment notifications, fraud verifications, balance updates, and account-status messages. Telecommunication operators answer questions about packages, top-ups, roaming charges, outages, and plan changes. Marketplaces and logistics companies confirm orders, deliver pickup windows, schedule reschedules, and triage refund requests. Universities and training centres call prospective applicants for enrollment and reach current students for academic reminders. Microfinance institutions, fintech lenders, and consumer-credit organizations call customers about overdue balances and renewal opportunities. Each of these contacts is, taken individually, a simple conversation: a known counterparty, a finite set of expected questions, a small set of possible outcomes, and a clear rule for when the conversation should be transferred to a human operator. Taken in the aggregate, however, the volume of such conversations defines the operational cost of customer service in a modern organization.

The relevance of this thesis is grounded in the gap between the structural simplicity of most customer conversations and the cost of staffing those conversations with people. A single call-centre seat that operates twenty-four hours a day in three eight-hour shifts requires three operators, plus the supervisory overhead of team leads, quality auditors, training resources, payroll administration, and the physical office space that hosts them. At typical compensation and overhead levels in Uzbekistan, one such position consumes on the order of tens of millions of soum per month. Large service organizations frequently maintain dozens or hundreds of such seats. Industry estimates routinely cite that more than seventy percent of operator time is spent on conversations whose rules can be written down in advance and whose data inputs are reachable through internal information systems. When this is true, the question is no longer whether such conversations can in principle be automated; the question is what software platform makes this automation feasible for an ordinary operations team that does not have a dedicated AI research division.

The project that this thesis defends, **Scale Labs**, is a software platform engineered from the ground up to answer that question. The central design principle is that the **workflow is the product**. A voice agent, in the Scale Labs model, is a workflow. A use case — payment reminder, customer-satisfaction survey, fraud step-up, delivery confirmation, lead qualification — is a workflow. Two operators working on entirely different campaigns can author both campaigns in the same visual studio, publish them through the same compiler, run them on the same voice runtime, and review their outcomes in the same operational dashboard. The platform is therefore not a "bank bot" or a "delivery bot"; it is the infrastructure on which many such bots are configured, deployed, and operated as workflows.

The **object** of the research is the process of organizing autonomous customer voice communication in a service organization — the chain that begins with a business need (call this list of customers about an overdue balance) and ends with a measured outcome (the customer agreed to pay by Friday, the platform updated the CRM, and the operations team reviewed the transcript). The **subject** of the research is the design and implementation of a software platform that supports this chain end-to-end: a visual workflow studio, a workflow compiler, an organization-scoped backend, an integration layer that exposes business data as tools available during a call, a real-time voice runtime built from automatic speech recognition, language-model dialogue management, and speech synthesis, and an operational dashboard surfaced through a multi-page studio.

The **aim** of the thesis is to develop and document a complete autonomous voice agent platform suitable for prototype deployment in Uzbekistan, defendable as a bachelor-level engineering project, and credible as a foundation for further product development. The aim translates into the following tasks.

1. Analyze the relevance of autonomous customer voice communication for Uzbekistan, with reference to the country's national digital transformation strategy, the operational economics of call-centre staffing in the local context, and the sector-by-sector pattern of customer-base growth that drives demand for automation.
2. Survey the existing categories of customer-communication automation — interactive voice response systems, generic conversational platforms, contemporary voice-AI platforms (notably Retell AI and Vapi AI, whose visual studios and graph editors informed early design decisions in Scale Labs), bespoke vendor implementations, and internal call-centre tools — and identify the precise gap that Scale Labs targets.
3. Formulate the engineering problem of building a modular, workflow-first, multi-tenant, data-aware voice-agent platform that can be authored by non-engineering teams and operated as a standard SaaS workspace.
4. Choose the technologies, frameworks, and infrastructure components required to build the platform, and justify each choice through a comparison with alternatives.
5. Design the database structure, the multi-tenant request flow, and the boundary between data owned by an organization and data observed by the voice runtime.
6. Implement the workflow studio, the workflow compiler, the agent layer, the integration layer (Notion as the first connector), phone-number management, call-log retrieval, and the metrics dashboard.
7. Design and document the voice runtime — automatic speech recognition, language-model dialogue management, neural text-to-speech, and the telephony adapter — as the platform's real-time conversation engine.
8. Evaluate the implemented prototype against the goals of the project, document its limitations honestly, and outline a roadmap for further development.

The **research methods** combine comparative analysis of existing voice-AI platforms, system analysis of multi-tenant SaaS architectures, database modelling, modular backend design, security-oriented analysis of token storage and webhook authentication, real-time-system analysis for the voice runtime, and implementation-based evaluation. The implementation itself is the primary evidence the thesis defends: the platform's source code, the running development environment, the demonstration workspace populated with realistic mock data, and the screenshots embedded in Chapter 3.

The **scientific novelty** of the work consists in the combination of a workflow-first authoring model with a runtime-agnostic compiler and an organization-scoped integration layer, packaged in a single prototype that is small enough to be built and defended by one student yet structurally close enough to a production system that it can host real pilot use cases. Many academic projects in this area treat the speech pipeline as a research subject, which produces interesting results but no operable platform; other projects treat the user interface as a research subject, which produces operable demos but no architectural contribution. Scale Labs occupies the middle of that spectrum: a complete platform that combines the design lessons of contemporary voice-AI products with original engineering work on multi-tenancy, integration, compilation, and operations.

The **practical significance** of the work is that the platform can be adapted as the base for real pilots in Uzbekistan. Banks running payment reminders, telecommunications operators handling balance and plan questions, e-commerce companies confirming delivery, microfinance institutions handling consumer-credit collections, logistics firms running redelivery callbacks, and educational organizations running enrollment outreach can all host their use cases on the same workspace, as separate workflows under one operations team. The platform's modularity is the practical answer to the question of why an Uzbek organization would adopt one voice-AI platform rather than commissioning a separate bespoke project per use case.

This bachelor thesis is structured as follows. Chapter 1 explains the relevance of the topic, the operational economics of customer telephony in Uzbekistan, the existing categories of automation solutions, the design influences from market predecessors, and the formal problem statement. Chapter 2 describes the technologies, alternatives, computer and database server requirements, frameworks, libraries, and methodologies needed to build the system, including the architecture of the voice runtime. Chapter 3 documents the implemented Scale Labs platform, including system architecture, database structure, the multi-tenant request flow, the studio, the workflow compiler, the integration layer, the voice runtime in operation, the operational dashboard, security, testing, limitations, and a development roadmap. The Conclusion summarizes the contribution. References list the academic and technical sources used. Applications include the source-code layout description and the practical run instructions.

\newpage

# CHAPTER 1. RELEVANCE AND PROBLEM ANALYSIS OF AUTONOMOUS CUSTOMER VOICE COMMUNICATION

## 1.1 Relevance of the topic and the situation in Uzbekistan

### 1.1.1 Customer communication as a structural cost of service

Customer communication is one of the operational areas of a service organization where cost scales almost linearly with the volume of business. When a bank issues twice as many consumer loans, it does not need to draft twice as many loan agreements; documents scale cheaply through software. But the same bank does need to send roughly twice as many payment reminders, answer roughly twice as many balance enquiries, perform roughly twice as many fraud verifications, and handle roughly twice as many overdue-payment conversations. Each of those is a phone call. Each call requires a human operator who can hold the conversation, follow the script, look up the customer record in the bank's core systems, and record the outcome in a way the bank can later audit and bill against. The bank's customer-communication budget therefore tracks the size of the customer base, not the size of the bank's product catalog.

The structure repeats across industries with similar mathematics. A telecommunications operator that wins one million new prepaid subscribers will, within a few months, see proportionally more questions about balance, top-up methods, package details, roaming, and similar high-volume topics. A marketplace whose monthly order volume grows from ten thousand to one hundred thousand will see roughly ten times the volume of delivery questions, refund questions, and dispute calls. A logistics company that doubles its parcel volume will need to make roughly twice as many "courier is on the way" calls and "we missed you, please reschedule" calls. A microfinance institution that originates twice as many short-term loans will issue twice as many repayment reminders. In every case the operational telephony budget tracks the size of the customer base, not the complexity of the underlying business.

This linear scaling of operational cost has two consequences for the strategic posture of a service business. First, it places a structural ceiling on customer-base growth: a bank that has run out of operator headcount cannot acquire more customers without proportionally expanding its call centre. Second, it imposes a structural risk on customer experience: at peak load, the queue depth of a human call centre grows non-linearly relative to its capacity, and call quality measured by hold time, abandon rate, and first-call resolution drops sharply. Both of these consequences make customer communication a frequent target for automation initiatives across the entire service economy.

### 1.1.2 The cost composition of a 24/7 call-centre seat in Uzbekistan

To make the structural argument concrete, this section presents an indicative cost composition for a twenty-four-hour call-centre seat in Uzbekistan, based on publicly reported salary ranges and operational overhead averages for the financial-services and telecommunications sectors. The numbers below are estimates rather than measurements; they are presented to illustrate the order of magnitude that drives the demand for automation.

**Table 3. Indicative cost composition of a twenty-four-hour call-centre seat in Uzbekistan (2025–2026 estimates).**

| Cost component | Indicative monthly cost (UZS, per seat) | Notes |
|----------------|-----------------------------------------|-------|
| Operator salaries (three shifts) | 18,000,000 – 24,000,000 | Three operators per twenty-four-hour seat at standard wage and shift premiums. |
| Mandatory social contributions | 2,200,000 – 3,000,000 | Employer-side payroll taxes and required insurance contributions. |
| Supervision and quality assurance | 2,500,000 – 4,000,000 | Pro-rated share of team-lead, quality-auditor, and trainer compensation. |
| Workspace and utilities | 1,200,000 – 1,800,000 | Pro-rated office rent, electricity, internet, and equipment depreciation. |
| Recruiting and training | 600,000 – 1,000,000 | Amortized cost of hiring and onboarding, factoring typical attrition rates. |
| Telephony and software | 400,000 – 800,000 | Per-seat licensing for CRM, ticketing, dialer, and PSTN connectivity. |
| **Total per 24-hour seat** | **24,900,000 – 34,600,000** | Cost per around-the-clock seat per month. |

The implication of these numbers is direct. A service organization that maintains fifty around-the-clock seats — a moderate figure for a mid-sized bank or telecommunications operator — incurs a customer-communication cost on the order of 1.5 billion soum per month, or roughly eighteen billion soum per year, without counting the indirect costs of capacity planning, supervision, and the customer-experience consequences of queueing at peak load. Automating even a thirty-percent share of this workload therefore translates into hundreds of millions of soum of recurring annual savings per organization, an order of magnitude that justifies a substantial software-platform investment.

### 1.1.3 The national digital-transformation context

Uzbekistan's digital-transformation programme provides the macroeconomic context within which Scale Labs is positioned. The "Digital Uzbekistan-2030" strategy and the broader "Uzbekistan-2030" development framework set out concrete commitments to the modernization of public services, the introduction of information technologies into education and the economy, and the integration of digital tools into the day-to-day operations of organizations across the public and private sectors. National statistical sources report that internet penetration in Uzbekistan exceeded eighty percent by the end of 2024, that the share of the population using digital financial services grew at a double-digit annual rate over the past five years, and that the number of registered taxpayers using electronic services more than tripled over the same period. The financial sector, the telecommunications sector, the e-commerce sector, and the logistics sector are all expanding their customer bases at rates that significantly exceed the rate at which they can hire and train new call-centre operators.

At the same time, the wage base for service-sector knowledge work in Tashkent and other major cities has been adjusting upward, and the cost of around-the-clock customer telephony in soum has been increasing in real terms. Physical office space costs in central Tashkent have similarly risen, compounding the cost of every new seat. The national-level demand for automation of repetitive customer telephony therefore has a clear macroeconomic shape: a fast-growing service economy with a maturing labour market, in which the operational telephony budget is growing faster than the rate at which operations teams can afford to expand it.

The macroeconomic context also has a political dimension. The 2030 strategies place explicit emphasis on the domestic development of information-technology products and on the participation of Uzbek graduates in the construction of those products. A bachelor-degree graduation project at Millat Umidi University that delivers an end-to-end platform engineered for the Uzbek market, on Uzbek hosting infrastructure, with attention to Uzbek and Russian language support, fits directly into this national context.

### 1.1.4 Sectors with the largest expected impact

Five sectors are identified as having the largest expected impact from autonomous voice agent platforms in Uzbekistan, based on customer-base size, the rule-bound character of the typical conversation, and the existing maturity of operations teams in each sector.

**Banking and microfinance.** Commercial banks and microfinance institutions place outbound calls for payment reminders, overdue balance notifications, and renewal opportunities, and receive inbound calls for balance enquiries, card services, and dispute initiation. The conversations are highly scripted, the data inputs (account balance, due date, last payment, dispute category) are reachable through internal systems of record, and the regulatory frameworks already require detailed audit trails that integrate naturally with the platform's transcript and event-log surfaces. Within Uzbekistan, this sector includes the major commercial banks, the consumer-credit institutions, and the new microfinance organizations that emerged after the 2021 liberalization of the sector.

**Telecommunications.** Mobile and fixed-line operators handle a very high volume of repetitive inbound enquiries — balance, package details, top-up methods, roaming, plan changes — and outbound campaigns for new-plan adoption, retention, and outage notifications. The data inputs are reachable through subscriber-management systems, and the typical conversation can be modelled with a small number of high-volume workflows that branch on subscriber tier and account status.

**E-commerce and marketplaces.** Marketplaces and direct-to-consumer e-commerce companies place outbound calls for order confirmation, delivery scheduling, and missed-delivery rescheduling, and receive inbound calls for order-status enquiries, refund requests, and seller-buyer dispute triage. The data inputs are reachable through order-management systems, and the high seasonal variability of the workload (Ramadan, Navruz, end-of-year, and back-to-school peaks) makes automation particularly attractive because it absorbs peak load without requiring a corresponding expansion of human headcount.

**Logistics and last-mile delivery.** Logistics companies place outbound calls for courier-arrival notifications, redelivery scheduling, and address verification, and receive inbound calls for shipment-status enquiries and damage reports. The data inputs are reachable through warehouse-management and last-mile dispatch systems, and the geographic distribution of the workload (urban dense routes, regional sparse routes, intercity transit) is naturally modelled by per-region phone numbers and per-region workflows.

**Education and recruitment.** Universities, private educational organizations, and recruitment firms place outbound calls for application follow-up, enrollment confirmation, document-deadline reminders, and first-pass candidate screening, and receive inbound calls for programme information, deadline questions, and application-status enquiries. The data inputs are reachable through admissions-management systems, and the campaign-driven structure of the workload (admission cycles, enrollment cycles, application deadlines) maps cleanly onto outbound workflows.

### 1.1.5 The structural demand for an autonomous voice agent platform

The combination of the cost-composition picture in Section 1.1.2, the national context in Section 1.1.3, and the sectoral picture in Section 1.1.4 produces a structural demand for an autonomous voice agent platform with the following properties. First, the platform must be **multi-use-case**: a single workspace should be able to host the payment-reminder, balance-enquiry, fraud-step-up, delivery-confirmation, and lead-qualification workflows of one organization without requiring a separate deployment per use case. Second, the platform must be **data-aware**: voice agents must be able to read and write business data during a live conversation, because every meaningful conversation in the sectors above depends on the customer record. Third, the platform must be **operations-authorable**: the people who design and adjust workflows in a real Uzbek operations team are not software engineers, and the studio must be usable by analysts, supervisors, and operations directors. Fourth, the platform must be **multilingual**: Uzbek and Russian are the primary languages of most customer conversations, with English appearing in international segments. Fifth, the platform must be **operationally visible**: transcripts, call records, and aggregate metrics must be available to compliance, quality, and operations teams in a workspace that maps onto the organizational structure of the customer.

The relevance of this thesis is the convergence of all five of these structural properties in a single platform designed and engineered as a coherent system. The next section describes the existing categories of solutions, the gaps each leaves, and the precise design space in which Scale Labs is positioned.

## 1.2 Theoretical foundations of conversational AI systems

This section provides the theoretical foundations on which an autonomous voice agent platform is built. The treatment is summary rather than exhaustive; the goal is to give the reader the conceptual vocabulary needed to follow the architectural decisions in Chapter 2 and the implementation choices in Chapter 3.

### 1.2.1 Speech recognition

Automatic speech recognition (ASR) is the task of converting an audio waveform of human speech into a sequence of words. Historically, ASR systems were built from acoustic models trained on hand-aligned phoneme transcripts, pronunciation lexicons, and language models trained on large text corpora. The introduction of deep neural networks in the 2010s, particularly attention-based encoder-decoder architectures and self-supervised pre-training on unlabelled audio, substantially reduced the word-error rate of state-of-the-art ASR systems on telephone-quality speech. Modern open-source ASR models (such as the Whisper family of models published by OpenAI in 2022) achieve word-error rates below ten percent on many telephony datasets, including non-English languages and accented speech, which is sufficient quality for the conversational use cases targeted by Scale Labs.

For an autonomous voice agent platform, ASR introduces three engineering requirements. First, the system must perform recognition in **streaming mode**, returning partial transcripts as audio is received, rather than waiting for the speaker to stop talking. Second, the system must support **multiple languages**, switching between them based on either user configuration or runtime language detection. Third, the system must handle **telephone-quality audio**, which is band-limited to roughly 300–3400 Hz and frequently exhibits packet loss, echo, and background noise. Scale Labs's voice runtime addresses each of these requirements as described in Chapter 2 and Chapter 3.

### 1.2.2 Natural language understanding and large language models

Natural language understanding (NLU) is the task of converting a sequence of words into a structured representation of the speaker's intent and the entities mentioned. Classical NLU systems were built from intent classifiers and entity extractors, typically trained on hand-labelled corpora of representative utterances. Recent work has shifted toward **large language models (LLMs)** — transformer-based models pre-trained on very large text corpora and fine-tuned for instruction following — that subsume intent classification, entity extraction, dialogue policy, and response generation in a single end-to-end architecture. The 2017 introduction of the transformer architecture (Vaswani et al.), the 2018–2020 emergence of large pre-trained language models, and the 2022–2024 explosion of instruction-tuned conversational models have transformed the practical landscape of conversational AI.

For an autonomous voice agent platform, the implication is significant: the dialogue logic of a voice agent no longer needs to be expressed as a hand-written tree of intents and responses. Instead, the agent's behaviour can be specified as a high-level workflow (the structure of the conversation) plus per-node prompts (the local instruction the LLM should follow), and the LLM handles the language-level details. This is the architectural pattern Scale Labs adopts, and it is the source of the platform's authoring efficiency: a new use case can be designed in hours rather than weeks because the workflow author does not need to enumerate the language space of the conversation.

### 1.2.3 Speech synthesis

Text-to-speech (TTS) is the task of converting a sequence of words into a spoken audio waveform. Classical concatenative and parametric TTS systems were intelligible but easily recognized as synthetic; modern neural TTS architectures, particularly those that use diffusion or flow-matching to generate the audio waveform directly, produce speech that is increasingly difficult to distinguish from a human speaker. The relevant requirements for a voice agent are real-time generation (the system must be able to synthesize speech at least as fast as it is played out), natural prosody (intonation that matches the conversational context), and multilingual coverage at production quality.

### 1.2.4 Telephony

Telephony is the discipline of placing and receiving calls on the public switched telephone network (PSTN) and on its modern IP-based replacements (VoIP, session-initiation protocol or SIP). For an autonomous voice agent platform, the telephony layer must support inbound calls (routing an incoming call to a workflow that should answer it), outbound calls (placing a call to a customer number on behalf of a workflow), call control (transferring a live call, ending a call, putting a call on hold), and audio transport (sending the agent's synthesized speech to the customer and receiving the customer's speech for recognition) with sub-second latency end-to-end. The telephony layer interacts with the customer's regulatory environment (numbering plans, do-not-call lists, call recording disclosure requirements) and with the customer-experience expectations of the market in which the platform operates.

### 1.2.5 Real-time orchestration

The orchestration layer of a voice agent is the component that ties speech recognition, language understanding, speech synthesis, and telephony together into a single coherent conversation in real time. The orchestration layer must handle **barge-in** (the customer starts speaking while the agent is talking, and the agent should pause), **turn detection** (the customer has finished their turn and the agent should respond), **voicemail detection** (the call has been answered by a voicemail system rather than a human), **transfer mechanics** (the agent has decided to hand the call off to a human or another workflow), **tool calls** (the LLM has decided to invoke an external tool to read or write business data), and **graceful degradation** (a network blip, an ASR error, or a tool timeout should not produce a broken call). The orchestration layer is in many ways the hardest engineering surface of a voice agent platform; it is the component that determines whether the platform produces calls that feel natural to the customer.

The Scale Labs voice runtime implements this orchestration as described in Chapter 2 and Chapter 3.

## 1.3 Existing systems, types, opportunities, and limitations

The space of solutions that address customer telephony automation can be grouped into five categories. Each category has a different shape and a different set of limitations. The goal of this section is not to produce a competitive product survey but to identify the design space in which Scale Labs is positioned.

### 1.3.1 Legacy interactive voice response systems

Traditional interactive voice response (IVR) systems are the oldest category. An IVR is a tree of pre-recorded prompts and DTMF (keypad) choices: "press one for billing, press two for technical support, press three to speak to an agent". IVRs are deployed in almost every Uzbek bank, every telecommunications operator, and every customer-service hotline of any size. They are mature, widely understood, supported by every major telecom platform, and operationally cheap.

Their limitations are well-documented. The conversation is rigid: the customer must navigate the menu in the order in which it was designed, the system cannot understand free-form speech, and any unanticipated input forces a fallback to a human operator. The customer-experience cost of long IVR trees is a persistent source of customer dissatisfaction in service-quality surveys. More importantly, classical IVRs are not data-aware: they cannot read a customer record, branch on its content, or write the outcome of the conversation back to the system of record. Anything that requires data from the CRM is therefore routed to a human, even when the underlying conversation is simple.

Scale Labs replaces an IVR not by reproducing the menu tree in a more flexible language but by reformulating the conversation itself: the customer is asked, in natural language, what they need, and the agent reasons about the answer rather than mapping it into a fixed menu.

### 1.3.2 Generic chatbot platforms with optional voice

A second category is the generic chatbot platform — products such as DialogFlow, Rasa, Microsoft Bot Framework, and several locally hosted alternatives. These platforms are built around the abstraction of an "intent": the user expresses an intent in natural language, the platform classifies the intent, runs a back-end action, and returns a reply. Voice support is typically added by combining the chatbot platform with a third-party speech-to-text service and a third-party text-to-speech service.

The limitations of this category for the customer-telephony use case are different from those of an IVR. Latency is a first concern: stitching three services (speech-to-text, dialogue manager, text-to-speech) through three round-trips frequently produces noticeable delays between user speech and bot response, which makes conversations feel awkward. Authoring is a second concern: chatbot platforms are designed around training data and intent classifiers, which require an engineering or data-science skill set that the operations teams of Uzbek banks, telecommunications operators, and marketplaces rarely have in-house. Multi-tenancy and workspace abstractions for use in a SaaS deployment are a third concern: most chatbot platforms are designed either as single-tenant on-premise installations or as developer-oriented cloud services without a workspace abstraction suited to a small operations team.

### 1.3.3 Contemporary voice-AI platforms and design influences

A third category, and the most directly relevant to Scale Labs, is the contemporary voice-AI platform: software products that integrate speech recognition, language-model dialogue management, and speech synthesis into a single conversational runtime with low end-to-end latency, configurable agents, and a workflow-style authoring experience. Several such products appeared internationally in 2023 and 2024. Among them, two products in particular — **Retell AI** and **Vapi AI** — informed early design decisions in Scale Labs. Both products offer a visual workflow editor in which conversation logic is expressed as a directed graph of typed nodes, both expose a small set of node primitives that cover the most common conversation shapes (conversation, tool, transfer, end), and both treat in-browser test calls as a first-class feature of the developer experience. Studying the user experience of these two platforms during the early design phase of Scale Labs was useful in two ways: it confirmed the viability of the workflow-first authoring model and it suggested concrete primitives that any production voice-AI platform should expose.

It is important to be precise about the relationship between Scale Labs and these design influences. Scale Labs is an independent engineering project. Its voice runtime, its workflow compiler, its multi-tenant backend, its integration layer, its dashboard, and its studio are all original implementations developed for this codebase. The two products named above are cited as **design references** in the sense that any engineering project benefits from studying mature precedents — in the same way that a student studying database systems benefits from studying PostgreSQL and MySQL even when implementing their own database engine. Scale Labs does not consume their APIs, embed their SDKs, or share code with them. Where Scale Labs's primitives resemble theirs (the workflow node taxonomy, for example), the resemblance reflects shared underlying patterns rather than shared code.

The limitation of contemporary international voice-AI platforms from the perspective of an Uzbek operations team is the absence of localized support: pricing in foreign currency, documentation only in English, no native Uzbek-language voice production quality, and no presence in the local procurement ecosystem. Scale Labs is engineered with the Uzbek market in mind: pricing presented in soum, documentation and studio language in English with Russian and Uzbek translations planned, and voice quality tuned for Uzbek and Russian as primary production languages.

### 1.3.4 Bespoke vendor projects

A fourth category, more common in Uzbekistan than the international platforms above, is the bespoke vendor project: a systems integrator builds a custom voice-bot for one bank or one operator, typically for one use case (loan reminders, balance enquiries) and delivers it as a turnkey solution. This approach delivers value to the first customer who pays for it but does not generalize: every new use case becomes a new bespoke project, the underlying components are not reused, and the resulting codebase typically has poor documentation, weak multi-tenant separation, and no operational tooling beyond what the customer specifically asked for. A recurring observation among customer-service directors in the Uzbek market is that bespoke deployments of this kind accumulate technical debt over time as use cases multiply.

### 1.3.5 Internal call-centre automation tools

A fifth category is the internal automation tool: a call-centre team builds a simple application — a spreadsheet macro, a script that places batches of outbound calls through a SIP gateway, an internal CRM with auto-dialer functionality — that automates a fraction of operator workload but does not replace the operator. These tools are useful, but they are not a platform; they cannot host new use cases without further programming work, they cannot present a conversation as a workflow editable by non-engineers, and they cannot scale beyond the team that built them.

### 1.3.6 Comparative analysis

The five categories above are compared in Table 2 along the dimensions that matter for the Uzbek customer-communication use case. The table provides the empirical grounding for the problem statement in Section 1.4.

**Table 2. Comparative analysis of customer-communication automation categories.**

| Dimension | IVR | Generic chatbot | Voice-AI platform | Bespoke project | Internal tool | Scale Labs |
|-----------|-----|-----------------|-------------------|-----------------|---------------|------------|
| Free-form speech | No | Yes | Yes | Varies | No | Yes |
| Multilingual | Limited | Limited | Limited | Per-project | No | Yes |
| Workflow authoring | DTMF tree | Engineering | Visual graph | Code-only | Code/script | Visual graph |
| Operations-authorable | Yes | No | Partial | No | No | Yes |
| Data-aware | No | Yes | Yes | Yes | Limited | Yes |
| Multi-tenant SaaS | N/A | Limited | Yes | No | No | Yes |
| Localized for Uzbekistan | Per-deployment | No | No | Yes | Yes | Yes |
| Operational dashboard | Limited | Limited | Yes | Per-project | Custom | Yes |
| Cost model | Per-seat / per-channel | Per-message | Per-minute | Project + maintenance | Internal | Per-minute |

### 1.3.7 The opportunity

The comparative analysis identifies a clear opportunity. There is, at the time of writing, no widely available platform in the Uzbek market that combines modern voice-AI runtime quality, a workflow-first authoring experience for non-engineering teams, a tool-based integration layer with the organization's existing data, organization-scoped multi-tenancy at the workspace level, an operational dashboard suited to compliance and quality teams, and native support for Uzbek and Russian voice quality at production volumes. International platforms cover some of these dimensions but miss the localization, the integration ecosystem, and the pricing transparency needed for Uzbek adoption. Local bespoke projects cover the localization but miss the platform character. Generic chatbot platforms and internal tools occupy the lower half of the table. Scale Labs is positioned to cover all of these dimensions in a single product.

## 1.4 Problem statement

The engineering problem this thesis addresses is the design and implementation of an **autonomous AI voice agent platform** with the following formally stated properties.

**P1. Modular workflow-based use case model.** A new use case must be expressible as a workflow inside the platform, without forking the codebase, without per-use-case feature flags, and without a separate deployment. The platform therefore requires a workflow data model expressive enough to cover the use cases enumerated in Section 1.1.4, a visual editor for the data model, and a compiler that translates the workflow into a runtime payload executable by the platform's voice runtime.

**P2. Workflow-first authoring for non-engineering teams.** The primary author of a workflow must be an operations user. The editor must support a small, learnable set of node types, support natural-language and structured branching conditions on edges, allow inline editing of system prompts and first-spoken-line messages, allow attachment of tools to conversation nodes, and provide an in-browser test mode that runs a real call against the workflow and surfaces the current step on the canvas. The editor must be usable on a standard laptop screen and require no special hardware or software beyond a modern web browser.

**P3. Multi-tenant isolation at the organization boundary.** A single deployment of the platform must serve many organizations cleanly. Every data row must be scoped to an organization. Every API request must be authenticated as a member of an organization. Every operation that touches the shared voice runtime must verify that the runtime identifier in question belongs to the calling organization before forwarding the request. The tenant boundary is the organization, not the individual user.

**P4. Tool-based data integration.** Voice agents must be able to read and write business data during a live conversation, without exposing internal credentials to the runtime. The platform requires a tool-registration mechanism: when an organization connects an integration, the platform registers a small set of tools with the voice runtime, configured with the organization-specific data source identifier and signed with a shared secret. When the runtime invokes a tool during a call, it calls back to the platform's webhook endpoint, which authenticates the call, looks up the organization's encrypted credentials, performs the underlying data operation against the third-party API, and returns the result to the runtime.

**P5. Real-time conversation orchestration.** The voice runtime must perform speech recognition, language-model reasoning, speech synthesis, and telephony with end-to-end latency low enough for natural conversation (target: median time-to-first-audio under 700 milliseconds), must handle barge-in, turn detection, voicemail detection, transfer mechanics, and graceful degradation, and must support inbound and outbound calls on the public telephone network.

**P6. Operational visibility.** The platform must surface call logs with transcripts and structured event logs, aggregate metrics (minutes used, calls made, average cost, average duration, success evaluation), and at-a-glance organizational health (number of agents, number of workflows, number of phone numbers, number of integrations).

**P7. Localization for Uzbekistan.** The platform must operate in Uzbek, Russian, and English as primary languages. Pricing must be presentable in soum. The integration ecosystem must include connectors useful to Uzbek operations teams.

**P8. Prototype scope, honest gaps.** The platform is delivered as a prototype suitable for a diploma defense and a first pilot deployment, not as a generally available commercial product. Features that would be required in a commercial product (payment-processor integration, additional CRM connectors beyond the first one delivered, squad-style multi-agent orchestration, a live monitoring console) are out of scope for the prototype and are listed as future work.

With the engineering problem stated formally as P1 through P8, the remainder of the thesis is structured to answer it. Chapter 2 selects the technologies and methods. Chapter 3 describes the resulting implementation. The Conclusion evaluates how well the implementation satisfies the problem statement.

\newpage

# CHAPTER 2. TECHNOLOGIES, REQUIREMENTS, AND DEVELOPMENT METHODS

## 2.1 Technology choice and comparison with alternatives

An autonomous AI voice agent platform of the kind described in Chapter 1 requires the integration of at least eight technology layers: the studio frontend framework, the backend framework, the database engine, the authentication scheme, the workflow graph editor, the voice runtime (consisting of automatic speech recognition, the language-model dialogue manager, and neural text-to-speech), the telephony layer, and the integration HTTP client. This section presents the choice made for each of these and the alternatives considered.

### 2.1.1 Studio frontend framework

The studio is an interactive single-page application that combines a workflow graph editor, a real-time test-call interface, a multi-page dashboard, and a sidebar-driven navigation between sections. The frontend framework must support fast client-side navigation between pages, server-rendered first paint for perceived performance, a rich component library, and a stable graph-editing library.

**The chosen technology is Next.js 16 with React 19, served using the App Router.** Next.js was preferred over the alternatives summarized in Table 4 for three reasons. First, the App Router model — file-system routing, route groups, layout nesting, and server components for the parts of the application that do not require client interactivity — maps the navigation structure of the studio onto the file system directly. The sidebar groups (Build, Connect, Observe) map onto route groups under `app/(app)/`, and shared chrome (sidebar, header, breadcrumb, providers, authentication guard) is declared once in a layout file and inherited by every page. Second, the Next.js build-and-run model resembles a production deployment more closely than a plain Create-React-App or Vite setup, which makes the transition from prototype to pilot less disruptive. Third, the framework's investment in performance — streaming, partial hydration, server-component rendering — allows the studio to render meaningful content in the first paint even before the full JavaScript bundle is loaded, which is significant for the dashboard, the metrics page, and the call logs page that all load remote data on entry.

**Table 4. Comparison of frontend framework alternatives for the studio.**

| Framework | Strengths | Weaknesses for Scale Labs |
|-----------|-----------|---------------------------|
| **Next.js 16 (App Router) — chosen** | File-system routing, server components, streaming, production-ready build, large ecosystem | Steeper learning curve than CRA; build memory footprint on Windows can be tuned but is non-trivial |
| Create-React-App | Simplicity, low ceremony | No server-rendering, abandoned by maintainers, single-page-app limitations on first paint |
| Vite + React Router | Fast dev server, modern build | No server-rendering by default, requires manual setup of authentication and route guards |
| Remix | Server-first routing similar to Next, good data primitives | Smaller ecosystem, fewer reusable components, less mature workflow-graph integration |
| SvelteKit | Smaller bundles, ergonomic templates | Different language/component model, smaller ecosystem of graph editors and shadcn-equivalents |

**React 19** was chosen as the underlying library over alternatives such as Vue 3, Svelte 5, or SolidJS for ecosystem depth: the workflow graph editor, the form components, the data-fetching library, and the chart library all have mature React implementations.

**TypeScript with strict mode** is used as the implementation language for the entire frontend. Strict mode enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and the rest of the strict family, which catches a substantial class of integration errors before any code is run. Type-checking is performed before every commit through `npx tsc --noEmit`.

**The component library is shadcn/ui**, a set of accessible, headless components built on top of Radix UI primitives and styled with Tailwind CSS v4. The decision to use shadcn rather than a heavier UI framework such as Material UI or Ant Design was driven by two considerations. First, shadcn components are copied into the codebase rather than imported as a versioned dependency, which gives the project control over their styling, accessibility behaviour, and visual identity. Second, the resulting visual style — minimal chrome, thin borders, dark background, uppercase eyebrow labels — matches the "studio console" aesthetic preferred by the project, in contrast to the more opinionated visual styles of larger UI frameworks.

**The workflow editor is built on @xyflow/react** (formerly React Flow), the de-facto standard library for node-and-edge graph editors in React. The library handles canvas panning, node dragging, edge connection, viewport state, and the underlying graph model in a shape that maps cleanly to and from the Scale Labs workflow data model.

**The data-fetching layer is TanStack Query v5**, which handles caching, background refresh, request deduplication, and optimistic updates for the metrics and call-logs APIs. Without it, every page would either need to implement its own caching or accept the cost of refetching on every navigation. With it, the dashboard, metrics page, and logs page share a cache and update consistently when the user clicks Refresh.

### 2.1.2 Backend framework

The backend serves a JSON API consumed by the studio frontend, hosts the webhook endpoints invoked by the voice runtime during tool calls, and stores organization-scoped data in a relational database.

**The chosen technology is Django 5 with Django REST Framework (DRF).** Django was preferred over the alternatives summarized in Table 5 because the kind of application Scale Labs is — an authenticated, organization-scoped SaaS with an admin panel, a database migration system, a permissions framework, a session model, and a settings layer — is exactly the kind of application Django was designed to make easy to build. Building those components from scratch in a lighter framework (FastAPI, Flask, Node.js with Express) would have consumed a significant share of the thesis timeline without producing an academic or engineering contribution.

**Table 5. Comparison of backend framework alternatives for the platform.**

| Framework | Strengths | Weaknesses for Scale Labs |
|-----------|-----------|---------------------------|
| **Django 5 + DRF — chosen** | Mature ORM, migrations, admin, permissions, settings; "batteries included" for SaaS | Slightly more boilerplate than FastAPI; synchronous by default |
| FastAPI | Async, fast, good OpenAPI generation | No ORM, no migrations, no admin; would require a separate stack for these |
| Flask | Lightweight, flexible | Too unopinionated for a SaaS — every component would be a custom choice |
| Node.js + Express + Prisma | Single language across stack | TypeScript-on-server overlap with frontend less valuable than the Django ORM and admin |
| Spring Boot (Java) | Enterprise-grade, mature | Heavier deployment footprint; team-wide language change for one-developer project |

**The DRF layer** provides viewsets, serializers, permissions, authentication classes, and pagination. Each entity in the data model is exposed through a `ModelViewSet` that filters its queryset by the active organization, and the viewset's serializer handles validation and field selection.

**Python with type hints** is the implementation language for the entire backend, with `python-environ` for environment-variable parsing and `httpx` for outbound HTTP. Type hints are not enforced by a static type checker in the current configuration, but they are used consistently throughout the codebase as documentation.

### 2.1.3 Database engine

The platform stores a small number of relatively well-structured entities — users, organizations, memberships, agents, workflows, integrations, calls, call events. The data volume of a prototype deployment is small enough that a wide range of database engines would be adequate.

**The chosen engine is SQLite in development and MySQL in production**, both accessed through the Django ORM. SQLite suffices for development without sacrificing fidelity; MySQL is used for the production deployment because it is the database engine most widely available on Uzbek hosting infrastructure and because Django's MySQL support, through the `PyMySQL` driver, is stable. Table 6 compares the considered alternatives.

**Table 6. Comparison of database engines for the platform's data layer.**

| Engine | Strengths | Weaknesses for Scale Labs |
|--------|-----------|---------------------------|
| **MySQL + PyMySQL (production) — chosen** | Widely available on Uzbek hosting, stable, well-known to local administrators | Slightly weaker JSON support than PostgreSQL; no native window functions in older versions |
| **SQLite (development) — chosen** | Zero-configuration, single file, identical schema to MySQL through Django | Single-writer; insufficient for production load |
| PostgreSQL | Excellent JSON, full-text search, window functions, advisory locks | Less common on Uzbek shared hosting; would require operational training |
| MariaDB | Drop-in MySQL alternative | No significant advantage over MySQL for this workload |

### 2.1.4 Authentication

**User authentication uses JSON Web Tokens issued by djangorestframework-simplejwt.** The studio stores access and refresh tokens in browser session storage, sends the access token on every API call as an HTTP `Authorization: Bearer <token>` header, and refreshes it transparently when the API returns HTTP 401. Access tokens are short-lived (thirty minutes) and refresh tokens are longer-lived (seven days) with rotation enabled.

In addition to the standard authentication header, every request carries an `X-Org-Id` header identifying the active organization. The custom `ActiveOrganizationMiddleware` reads this header, looks up the organization, verifies the membership of the authenticated user, and attaches the organization to the request as `request.organization`. Every viewset filters its queryset by `request.organization` in `get_queryset()`. This is the central mechanism of multi-tenant isolation; it is described in detail in Chapter 3.

### 2.1.5 Workflow graph editor

The workflow graph editor is the canvas on which non-engineering authors design conversation flows. The chosen implementation is **@xyflow/react** with a custom node component for each of the six node types defined by the Scale Labs workflow model (start, conversation, tool, transfer_call, end_call, api_request). Custom node components render a typed card with the node's metadata, while connection handles on the top, bottom, left, and right of each card allow edges to be drawn between any two nodes. A palette on the left of the canvas provides drag-and-drop sources for new nodes; an inspector on the right binds to whichever node or edge is selected and exposes its editable properties. The workflow's underlying data structure is maintained in a singleton store accessed through React's `useSyncExternalStore`, which avoids re-rendering the canvas on every keystroke in the inspector and provides a stable interface for the test-call session that highlights the active node during a live call.

### 2.1.6 Voice runtime

The Scale Labs **voice runtime** is the real-time conversational engine that performs speech recognition, language-model dialogue management, and speech synthesis on a live phone call. It is the most technically demanding subsystem of the platform. Section 2.3.5 describes its architecture in detail. At a high level, the runtime is constructed from four cooperating components.

- **Automatic speech recognition** (ASR) operates in streaming mode on the inbound audio stream, returning partial transcripts as the customer speaks.
- **A dialogue manager** orchestrates the conversation. It consumes the partial transcript, references the active workflow node, calls a large language model for response generation and tool selection, and emits the next utterance as text together with any required tool invocations.
- **Neural text-to-speech** (TTS) converts the dialogue manager's outgoing text into a high-fidelity speech audio stream that is sent back to the customer.
- **A telephony adapter** terminates the SIP/PSTN call and bridges the audio in and out of the runtime.

The runtime is designed for end-to-end latency under 700 milliseconds from end-of-customer-utterance to first audio of agent reply on the median call, which is the latency at which voice conversations begin to feel natural. The four cooperating components communicate over an in-process event bus; the LLM-driven dialogue manager exposes a tool-invocation interface that is matched at the workflow-compile layer to the platform's webhook-based tool registry, so that an LLM-decided tool call during a live conversation triggers an authenticated HTTP webhook to the platform's backend, which performs the underlying data operation and returns the result.

### 2.1.7 Telephony layer

The telephony layer terminates inbound and outbound calls on the PSTN and the SIP/VoIP network and forwards their audio into and out of the voice runtime. The platform integrates with carrier connectivity through standardized SIP trunks, manages phone-number inventory at the workspace level, and exposes inbound-call routing rules (an incoming call to a number runs the agent or workflow assigned to that number). Outbound calls are placed through the same SIP trunks from a number assigned to the originating organization. The telephony layer handles the operational concerns of voice over IP — packet-loss concealment, jitter buffers, echo cancellation, voicemail detection — at the level needed for production telephony.

### 2.1.8 Integration layer and the Notion connector

The first connector implemented in the platform is **Notion**, integrated through the official Python SDK `notion-client`. Notion was chosen as the first connector because its API is clean and well-documented, because Notion is widely used as a lightweight CRM and document repository among Uzbek small and medium businesses, and because its data model — databases of records with typed properties — maps cleanly onto the tool schemas (save, find, search, update, delete) that the platform exposes to the voice runtime. Subsequent connectors (HubSpot, Bitrix24, AmoCRM) are intended to follow the same tool-registration pattern; the pattern, not the specific connector, is the contribution.

### 2.1.9 Encryption of stored third-party credentials

When an organization connects an integration, it provides an internal-integration token that authorizes Scale Labs to read and write its underlying data store on its behalf. This token must be stored on the platform and retrieved later when the voice runtime invokes a tool webhook. Storing it in plain text would be unacceptable on security grounds.

**The chosen mechanism is Fernet symmetric encryption** from the Python `cryptography` library. The platform's server has a configured `FIELD_ENCRYPTION_KEY` (a Fernet key) in its environment. When a token is saved, it is encrypted with Fernet and stored in a `BinaryField` on the integration model. When a tool webhook fires, the token is decrypted in memory, used for the immediate API call, and not persisted in plaintext anywhere. Fernet provides authenticated encryption, key rotation, and a stable on-disk format suitable for application-level field encryption.

### 2.1.10 Hosting and infrastructure

The development environment runs entirely on a single developer workstation: Next.js on port 3000, Django on port 8000, SQLite as the database. For external connectivity — specifically, the requirement that the voice runtime be able to call back to the platform's tool webhooks — an HTTPS tunnel is established to the development server. The platform's webhook-resolution logic (`config/runtime_webhook.py`) supports two configurations: a "split-tunnel" mode in which a separate HTTPS tunnel is created for the backend on port 8000, and a "single-tunnel" mode in which one HTTPS tunnel covers the frontend on port 3000 and the Next.js application proxies `/api/v1/*` to the backend. The production deployment is anticipated to use a managed Linux host with NGINX as the reverse proxy, Gunicorn as the Django process manager, MySQL as the database, and a content-delivery network for the static frontend assets.

## 2.2 Development environment, computer requirements, and database server

This section describes the developer-side requirements for working on the platform and the runtime requirements for the platform itself.

### 2.2.1 Developer workstation

The development environment used for this thesis was a Windows 11 workstation with an Intel x86-64 processor, 16 gigabytes of RAM, and an NVMe solid-state drive. The shell used was Windows PowerShell. The following tools were installed and required for active development.

- **Node.js 22 LTS** with the corresponding `npm` package manager, for the Next.js frontend.
- **Python 3.12** with the `venv` virtual-environment tool, for the Django backend.
- **Git** for version control.
- **Visual Studio Code** as the primary editor, with TypeScript, ESLint, Tailwind CSS, and Python extensions.
- **An HTTPS tunneling utility** for exposing the development server to the voice runtime's webhook callbacks.

The resource footprint of the running development environment is modest. At idle, both the Next.js dev server and the Django dev server together consume on the order of three hundred megabytes of resident memory. Under hot-module-reload during active editing the Next.js process can grow to several hundred megabytes more; the `next.config.ts` file deliberately constrains worker counts (`cpus: 1`, `webpackBuildWorker: false`, `webpackMemoryOptimizations: true`, `parallelServerCompiles: false`) to keep the development experience predictable on machines with modest RAM.

### 2.2.2 Production server requirements

For a pilot deployment, the platform's resource requirements for the control plane are modest. A pilot deployment of the studio frontend and the Django backend is comfortably hosted on a virtual private server with the specification summarized in Table 7. The voice runtime, by contrast, is a real-time-system workload with stricter requirements; its production deployment is anticipated to use a dedicated host with hardware acceleration for the language-model inference path, low-jitter network connectivity, and a tuned operating-system audio stack.

**Table 7. Indicative server requirements for a pilot deployment.**

| Resource | Control plane (Django + Next.js) | Voice runtime |
|----------|----------------------------------|---------------|
| CPU | 2 vCPU | 8+ vCPU with AVX-512 / hardware acceleration |
| Memory | 4 GB RAM | 16+ GB RAM, GPU as needed |
| Storage | 40 GB SSD | 200 GB SSD (model weights, recording buffer) |
| Network | 100 Mbit/s | Symmetric, low-jitter, peering with carrier |
| Operating system | Ubuntu LTS / Debian | Ubuntu LTS / Debian, tuned audio stack |
| Public addresses | One IPv4 + IPv6 | One IPv4 + IPv6, low ASN distance to carrier |

Scaling beyond pilot volumes (hundreds of concurrent calls, multiple production organizations, custom CRM integrations beyond the first connector) would call for a different deployment topology — a load-balanced application tier, a separate database server with replication, a shared cache for sessions and metrics, and a horizontally scalable voice-runtime tier — but those are out of scope for the prototype phase covered by this thesis.

### 2.2.3 Database server

The MySQL configuration anticipated for pilot deployment uses default storage and isolation settings; the platform's data model does not require unusual database features. Indexes are declared on the columns most frequently used in organization-scoped queries: `organization_id`, `updated_at`, and the `runtime_call_id` identifier used to correlate platform-side and voice-runtime-side call records. The Django ORM produces queries that take advantage of these indexes naturally through its `filter()` chaining.

The migration history is maintained inside the Django app under `apps/accounts/migrations/` and `apps/studio/migrations/`. Migrations are applied with `python manage.py migrate`. The development environment uses SQLite, which means the migration history is exercised against both engines (SQLite during development and MySQL during pilot deployment), which provides a useful check on the portability of the migrations.

## 2.3 Methodologies, algorithms, security mechanisms, and architectural models

This section reviews the methodological choices made in the project: how the codebase is organized, how the multi-tenant request flow is implemented, how the workflow compiler operates, how the integration webhook is authenticated, and how the voice runtime is architected.

### 2.3.1 Development methodology

The development methodology is best described as **prototype-driven iteration with strong typing and short feedback loops**. Each feature is implemented end-to-end before the next feature is started; integration with the voice runtime is treated as the integration point that defines whether a feature is complete or not. Code is written in TypeScript on the frontend (with `strict` mode enabled in `tsconfig.json`) and in Python with type hints on the backend. Type checking is performed on every commit via `npx tsc --noEmit` on the frontend.

Source control uses Git with a linear history on the `main` branch. Commits are small enough to be reviewable but large enough to represent a coherent change. Code review during the project was performed by the author against the criteria of (a) does the change preserve the end-to-end demo path, (b) is it consistent with existing patterns in the same area, (c) does it preserve the multi-tenant boundary, and (d) does it match the visual identity of the studio.

### 2.3.2 The multi-tenant request flow

The central architectural pattern of the backend is the **organization-scoped request flow**. Every authenticated request carries two headers: `Authorization: Bearer <JWT>` and `X-Org-Id: <organization id>`. The end-to-end request flow is summarized in Figure 2 below.

\textbf{Figure 2. Multi-tenant request flow.}

```mermaid
sequenceDiagram
    participant Browser as Browser (Studio)
    participant Next as Next.js (proxy)
    participant Django as Django REST Framework
    participant JWT as SimpleJWT
    participant MW as ActiveOrganizationMiddleware
    participant View as ViewSet (e.g. AgentViewSet)
    participant DB as Database

    Browser->>Next: GET /api/v1/agents/ (Authorization, X-Org-Id)
    Next->>Django: GET /api/v1/agents/ (forwarded with both headers)
    Django->>JWT: verify access token
    JWT-->>Django: request.user
    Django->>MW: process_request
    MW->>DB: verify membership (user, org)
    DB-->>MW: membership row
    MW-->>Django: request.organization
    Django->>View: dispatch
    View->>DB: Agent.objects.filter(organization=request.organization)
    DB-->>View: org-scoped agents
    View-->>Django: serialized response
    Django-->>Next: JSON
    Next-->>Browser: JSON
```

The flow has four important properties. First, **the tenant boundary is the organization, not the user**: a single user can belong to many organizations and switches the active organization by writing a new value to a per-tab session-storage key, which is then sent as the `X-Org-Id` header. Second, **the membership check is mandatory**: a request with a valid JWT but with an `X-Org-Id` header referring to an organization the user is not a member of receives an HTTP 403 from the middleware. Third, **the queryset filter is mandatory**: every viewset filters its queryset by `request.organization` in `get_queryset()`, so the only rows visible to the request are those that belong to the active organization. Fourth, **runtime-resource access is double-checked**: helper functions such as `resolve_runtime_assistant_id` and `resolve_runtime_workflow_id` verify that the runtime identifier passed in by the client belongs to a row in the database that is scoped to the active organization, before forwarding the request to the voice runtime.

### 2.3.3 The workflow data model and compiler

The workflow data model has six node kinds: `start`, `conversation`, `tool`, `transfer_call`, `end_call`, and `api_request`. Edges connect nodes and may carry a branching condition expressed as a natural-language phrase ("user wants to schedule") or as a structured liquid expression (`{{ intent == "schedule" }}`). Table 12 in Chapter 3 lists the full node taxonomy.

The compiler in `lib/workflows/runtime-compile.ts` translates this local data model into the payload expected by the voice runtime's workflow execution endpoint. The compiler is a pure function: given a `Workflow` data structure, it returns a serializable JSON payload. The compiler enforces the following invariants.

- Nodes are identified by `name` (a string), not by `id`. The local data model uses `id` for stable cross-references in the editor; the compiler picks the human-readable label (or a safe slug derived from the label) as the runtime-visible name and discards the local `id`.
- The start node carries `isStart: true`. The compiler enforces this on the node selected as the entry point.
- Conversation nodes use `prompt` (not `systemPrompt`) for the per-node language-model instruction. The first spoken line is delivered via `messagePlan.firstMessage` rather than being prepended to the prompt.
- Variable extraction uses `variableExtractionPlan.output[]` with `{ title, type, description, enum? }` per variable.
- Tools available to a conversation node go in a top-level `toolIds: string[]` array; the runtime's language-model dialogue manager decides whether and when to invoke them. A standalone `tool` node uses `{ type: "tool", name, toolId }` and forces a single call.
- Global nodes (nodes that can be entered from anywhere in the workflow when an enter condition matches) carry `globalNodePlan: { enabled: true, enterCondition }`.
- Edges reference node `name`s through `from` and `to`. An edge's condition is encoded as an object: `{ type: "ai", prompt }` for natural-language conditions, or `{ type: "logic", liquid }` for structured ones. The compiler distinguishes them by the presence of `{{ ... }}` in the user-supplied condition.

The decision to encode the compiler in TypeScript on the frontend rather than in Python on the backend has two motivations. First, the studio user is editing the workflow in the browser, and the compiler's output is needed immediately for the in-browser test call; performing the compile on the frontend avoids a round-trip. Second, the workflow data model is most naturally expressed in the same language as the React components that render it, which keeps the surface area of the data model under control.

### 2.3.4 Tool registration and webhook authentication

The integration layer follows a tool-registration pattern that is intended to generalize across connectors. When an organization saves a Notion integration with a field map, the platform builds a set of five tool definitions (save, find, search, update, delete), each with a JSON schema reflecting the chosen field map. Each tool definition is registered with the voice runtime through its tool registration endpoint, with the tool's `serverUrl` pointing back to the platform's webhook endpoint at:

```
https://<public-host>/api/v1/webhooks/runtime/notion/<integration_id>/<kind>/
```

When the runtime invokes a tool during a call, it sends a POST request to this URL with the tool-call arguments in the body and a shared-secret header. The platform's webhook view performs the following sequence of steps.

1. **Authenticate the inbound webhook** by verifying the shared secret in the `X-Scale-Labs-Secret` header against `RUNTIME_SHARED_SECRET` in the environment. A request without a matching secret is rejected with HTTP 401.
2. **Resolve the integration** by looking up the `<integration_id>` path parameter in the `NotionIntegration` table.
3. **Decrypt the integration's stored credentials** using `decrypt_str` from `apps/studio/services/crypto.py`, which loads the Fernet key from `FIELD_ENCRYPTION_KEY` and decrypts the `token_ciphertext` field of the integration row.
4. **Dispatch to the kind-specific handler** in `apps/studio/services/notion_webhook_handlers.py` — `do_save`, `do_find`, `do_search`, `do_update`, or `do_delete` — which performs the underlying Notion API operation using the decrypted token.
5. **Format the result** into the structure the voice runtime expects (`{ results: [{ toolCallId, result }] }`) and return it to the runtime, which incorporates the result into the conversation.

This pattern has the property that **organization credentials never leave the platform**. The runtime knows only the webhook URL and the shared secret; the per-organization Notion token is read out of the database, used for the duration of one HTTP call, and never sent back to the runtime.

### 2.3.5 The voice runtime architecture

The Scale Labs voice runtime is the real-time conversational engine that bridges between the customer's audio and the workflow defined in the studio. The runtime is architected as four cooperating components plus a state-machine orchestrator. Figure 3 summarizes the architecture.

\textbf{Figure 3. Voice runtime real-time conversation pipeline.}

```mermaid
flowchart LR
    Customer((Customer)) <--> Telephony[Telephony adapter]
    Telephony --> ASR[Streaming ASR]
    ASR --> Orchestrator{Dialogue orchestrator}
    Orchestrator --> LLM[LLM dialogue manager]
    LLM --> Orchestrator
    Orchestrator --> ToolCall[Tool webhook client]
    ToolCall --> Backend[(Scale Labs backend)]
    Backend --> ToolCall
    Orchestrator --> TTS[Neural TTS]
    TTS --> Telephony
    Orchestrator --> VAD[VAD / barge-in detector]
    VAD --> Orchestrator
```

The runtime processes a live conversation as follows.

**Audio in.** The telephony adapter receives the customer's audio over a SIP trunk, performs jitter buffering, echo cancellation, and packet-loss concealment, and forwards the resulting waveform to the streaming ASR. The ASR emits partial transcripts approximately every 200 milliseconds and a final transcript when the voice-activity detector (VAD) decides the customer's turn has ended.

**Dialogue turn.** When the customer's turn ends, the dialogue orchestrator constructs a prompt for the LLM dialogue manager that combines (a) the active workflow node's `prompt`, (b) the conversation transcript so far, (c) the variables extracted up to this point, (d) the tool catalog available at this node, and (e) the workflow's global prompt. The LLM is invoked through a streaming inference API; the orchestrator begins consuming the LLM's reply as soon as the first tokens are available.

**Tool calls.** If the LLM's reply contains a tool invocation (in the OpenAI-style function-call format that has become the de-facto standard for LLM tool use), the orchestrator pauses the response, posts to the platform's webhook endpoint at the URL registered for the tool, waits for the result (subject to a configurable timeout), incorporates the result back into the LLM's context, and continues generation. A tool call is invisible to the customer except for a small pause; the orchestrator may emit a verbal acknowledgment ("just a moment, let me check") if the tool is configured with a `messages.requestStart` template.

**Audio out.** The orchestrator forwards the LLM's textual reply to the neural TTS, which synthesizes audio in streaming mode and forwards it to the telephony adapter, which transmits it to the customer. The orchestrator maintains a small audio buffer to accommodate latency variations in the TTS pipeline.

**Barge-in.** While the agent is talking, the VAD continues to monitor the inbound audio stream. If the customer starts speaking, the orchestrator cancels the in-flight TTS, drains the telephony adapter's output buffer, and returns control to the ASR for the next customer turn. This produces a natural conversational rhythm in which the customer can interrupt the agent at any time.

**Voicemail.** On outbound calls, the orchestrator's first task is to determine whether the call has been answered by a human or by a voicemail system. The voicemail detector consumes the first few seconds of inbound audio and classifies it; if voicemail is detected, the orchestrator either ends the call or plays a templated message, depending on the workflow's configuration.

**Transfer.** A `transfer_call` node terminates the agent's leg of the call and bridges the customer to the destination configured on the node (a phone number for a human operator, another workflow, or an external IVR).

**End.** An `end_call` node closes the call gracefully, optionally with a final spoken line, and emits the call's metadata and event log to the platform's backend.

The voice runtime is the most complex subsystem of the platform from a real-time-systems perspective; the careful orchestration of streaming ASR, streaming LLM inference, streaming TTS, and barge-in handling is the engineering work that produces calls that feel natural to the customer. The runtime is designed for end-to-end latency under 700 milliseconds on the median turn.

### 2.3.6 Security mechanisms summary

The platform's security model is summarized in Table 14, near the end of Chapter 3, after each mechanism has been described in context. At the level of methodology, the relevant guarantees are: (a) tenant isolation enforced at the platform layer through middleware and queryset filtering, (b) third-party credentials never persisted in plaintext, (c) every inbound webhook authenticated against a shared secret, (d) every cross-tenant runtime-resource access blocked by a check that the runtime identifier belongs to the active organization, (e) transport encryption through HTTPS in production, and (f) JWTs rotated on every refresh.

## 2.4 Frameworks, libraries, and practical usage instructions

This section enumerates the frameworks and libraries used by the platform and the practical instructions for building and running it.

### 2.4.1 Frontend frameworks and libraries

**Table 10. Frontend dependencies.**

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.2.6 | Application framework — App Router, routing, layouts, server components |
| `react`, `react-dom` | 19.2.4 | UI library |
| `typescript` | 5.x | Static typing of the entire frontend |
| `tailwindcss` | 4.x | Utility-first CSS |
| `@tailwindcss/postcss` | 4.x | PostCSS integration |
| `tw-animate-css` | 1.x | Animation utilities |
| `@radix-ui/react-*` | 1.x / 2.x | Headless accessibility primitives behind shadcn components |
| `shadcn` | 4.x | Component library copied into `components/ui/` |
| `lucide-react` | 1.x | Icon set |
| `@xyflow/react` | 12.x | Workflow canvas |
| `@tanstack/react-query` | 5.x | Data fetching and cache |
| `recharts` | 3.x | Charting for the metrics dashboard |
| `sonner` | 2.x | Toast notifications |
| `next-themes` | 0.4.x | Theme switching primitive |
| `class-variance-authority`, `clsx`, `tailwind-merge` | various | Component-variant utilities |
| `@notionhq/client` | 5.x | Notion API client used in design-time Next.js API routes |

### 2.4.2 Backend frameworks and libraries

**Table 11. Backend dependencies.**

| Package | Version | Role |
|---------|---------|------|
| `Django` | 5.x | Web framework — ORM, migrations, settings, admin |
| `djangorestframework` | 3.15+ | JSON API layer — viewsets, serializers, permissions |
| `djangorestframework-simplejwt` | 5.3+ | JSON Web Token authentication |
| `django-cors-headers` | 4.3+ | CORS handling for cross-origin frontend requests |
| `django-environ` | 0.11+ | Environment variable parsing |
| `PyMySQL` | 1.1+ | MySQL driver |
| `cryptography` | 42.0+ | Fernet symmetric encryption |
| `httpx` | 0.27+ | Outbound HTTP client |
| `notion-client` | 2.2+ | Notion API client used in webhook handlers |
| `pytest`, `pytest-django` | latest | Unit and integration tests |

### 2.4.3 Build and run instructions

The studio frontend is started in development with:

```
cd frontend
npm install
npm run dev
```

This runs Next.js in development mode on `http://localhost:3000` with webpack as the bundler. Environment variables are read from `frontend/.env.local`. The variable `NEXT_PUBLIC_API_BASE_URL` must point to either the local Next.js origin (through which `/api/v1/*` is proxied to the Django backend) or to a tunneled origin in the case where the voice runtime needs to reach the platform's webhooks from outside the development workstation.

The Django backend is started in development with:

```
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

This runs Django on `http://localhost:8000`. Environment variables are read from `backend/.env`. The required variables for full functionality are `RUNTIME_API_KEY`, `RUNTIME_PUBLIC_KEY`, `RUNTIME_SHARED_SECRET`, `RUNTIME_WEBHOOK_BASE` (or `DEV_PUBLIC_ORIGIN` as a fallback when running through the Next.js proxy), and `FIELD_ENCRYPTION_KEY`.

A demonstration workspace is provided for screenshot and pilot evaluation purposes. Sign in with the credentials `demo@acme.inc` / `AcmeDemo2026!` from the login page. The demonstration workspace contains ten agents, five published workflows, three Notion integrations, twelve phone numbers, and eighty-six call logs, populated entirely from a deterministic dataset so that screenshots and demonstrations remain stable across runs.

\newpage

# CHAPTER 3. IMPLEMENTATION OF THE SCALE LABS PLATFORM

This chapter documents the implemented Scale Labs platform: the high-level system architecture, the database structure, the multi-tenant request flow as realized in code, the workflow studio and the workflow compiler, the voice runtime in operation, the integration layer, the operational dashboard, security and testing considerations, and the limitations of the current prototype together with the development roadmap. Screenshots taken from the running platform are embedded throughout the chapter at the points where each surface is described.

## 3.1 System architecture and database structure

### 3.1.1 High-level architecture

The Scale Labs platform consists of three principal deployable units: the **Next.js studio**, the **Django backend**, and the **voice runtime**. The three units communicate over a small number of well-defined interfaces. Figure 1 summarizes the architecture.

\textbf{Figure 1. Scale Labs system architecture.}

```mermaid
flowchart TB
    subgraph Browser
      Studio[Next.js Studio - App Router]
      WebSDK[Voice runtime browser SDK]
    end
    subgraph Backend["Scale Labs Backend"]
      Django[Django REST Framework]
      MW[ActiveOrganizationMiddleware]
      Services[Service modules - workflow compiler, integration handlers, runtime client]
      DB[(MySQL / SQLite)]
    end
    subgraph Runtime["Scale Labs Voice Runtime"]
      ASR[Streaming ASR]
      LLM[LLM dialogue manager]
      TTS[Neural TTS]
      Tel[Telephony adapter]
      Orch[Orchestrator]
    end
    Notion[(Notion)]
    Customer((Customer phone))

    Studio -->|HTTPS JSON| Django
    WebSDK -->|WebRTC test call| Runtime
    Django --> MW --> Services --> DB
    Services -->|REST control| Runtime
    Runtime -->|Tool webhooks| Django
    Services -->|Notion API| Notion
    Tel <--> Customer
```

The studio is the primary user surface. It is a single-page application that consumes the backend's JSON API and that uses the voice runtime's browser SDK directly for in-studio test calls, with the runtime's public key supplied by the backend so that the studio can establish a WebRTC session against the platform's runtime for test purposes.

The backend mediates every operation that requires server-side credentials, every operation that touches the multi-tenant data model, and every webhook callback from the voice runtime. The backend exposes a single versioned API namespace under `/api/v1/`, with viewsets for each principal entity and dedicated endpoints for the cross-cutting concerns of metrics, phone numbers, call logs, web-call configuration, outbound call placement, chat-mode invocation, and webhook handling.

The voice runtime is the real-time component that performs speech recognition, language-model reasoning, speech synthesis, and telephony. It is operated as a separate deployable unit because its resource profile, latency requirements, and operating-system tuning differ from those of the control plane. The runtime exposes a REST API for resource management (assistants, workflows, tools, phone numbers, calls) and a webhook mechanism for tool callbacks during live calls. The runtime's media path (the audio between the platform's phone numbers and the customer) does not traverse the control plane at all; the control plane handles only the control-plane operations.

### 3.1.2 Database structure

The Django data model is divided between two Django apps: `apps.accounts` (user and organization model) and `apps.studio` (the entities that belong to the studio). The model is summarized in Table 8 and the entity-relationship diagram is shown in Figure 5.

**Table 8. Database entities and ownership.**

| Model | App | Key fields | Scope |
|-------|-----|------------|-------|
| `User` | accounts | `email`, `password`, `last_active_organization` | Global |
| `Organization` | accounts | `name`, `slug`, `kind` | Global (each row is one tenant) |
| `OrganizationMembership` | accounts | `user`, `organization`, `role` | Global (links users to organizations) |
| `Agent` | studio | `organization`, `name`, `config`, `runtime_assistant_id` | Organization-scoped |
| `Workflow` | studio | `organization`, `name`, `description`, `global_prompt`, `graph` (JSON), `runtime_workflow_id` | Organization-scoped |
| `NotionIntegration` | studio | `organization`, `label`, `database_id`, `data_source_id`, `field_mappings`, `token_ciphertext` (Fernet), `runtime_tools` | Organization-scoped |
| `Call` | studio | `organization`, `created_by`, `direction`, `runtime_call_id`, `status`, `customer_number`, `metadata` | Organization-scoped |
| `CallEvent` | studio | `call`, `event_type`, `payload` | Indirectly org-scoped via `call` |

\textbf{Figure 5. Database entity-relationship diagram.}

```mermaid
erDiagram
    User ||--o{ OrganizationMembership : "is member"
    Organization ||--o{ OrganizationMembership : "has members"
    User ||--o| Organization : "last_active"
    Organization ||--o{ Agent : "owns"
    Organization ||--o{ Workflow : "owns"
    Organization ||--o{ NotionIntegration : "owns"
    Organization ||--o{ Call : "owns"
    User ||--o{ Call : "created"
    Call ||--o{ CallEvent : "has events"
```

Every `studio` model carries a `ForeignKey` to `Organization`. Compound indexes on `(organization, updated_at)` and `(organization, created_at)` accelerate the organization-scoped list queries that drive the studio's primary views.

The `Workflow.graph` field is stored as a JSON blob containing the local workflow's nodes and edges. This keeps the relational schema simple: there is no separate `WorkflowNode` table, no separate `WorkflowEdge` table, and no risk of orphaned children when a workflow is deleted. The cost of this decision is that workflow content is not directly queryable through SQL — for example, the platform cannot ask the database "how many workflows contain a tool node referencing integration X?" without scanning every workflow's JSON. For the prototype, this trade-off is acceptable; in a later phase a normalized schema may be introduced if such queries become important.

The `NotionIntegration.token_ciphertext` field is a `BinaryField` that holds the Fernet ciphertext of the integration's Notion token. The plaintext is never persisted. The `runtime_tools` field is a JSON array of `{ kind, id, functionName, lastSyncedAt }` objects that records the platform-side state of each tool registered with the voice runtime.

The `Call` and `CallEvent` models mirror the voice runtime's call records at the metadata level, but the platform does not duplicate transcript content into the database. Transcripts and per-event detail are read from the runtime on demand when a user opens a call in the logs view; the database stores only the metadata needed to enforce organization-scoped access and to maintain references for outbound calls placed through the platform.

### 3.1.3 URL structure

The backend exposes a single versioned API namespace under `/api/v1/`. The principal endpoints are summarized in Table 9.

**Table 9. Principal API endpoints (versioned at `/api/v1/`).**

| Path | Method | Purpose |
|------|--------|---------|
| `/api/v1/auth/register/` | POST | Create a new user and personal organization |
| `/api/v1/auth/login/` | POST | Exchange email and password for a JWT pair |
| `/api/v1/auth/token/refresh/` | POST | Rotate refresh token, issue new access |
| `/api/v1/auth/me/` | GET | Current user and organizations |
| `/api/v1/auth/me/active-org/` | POST | Change the active organization |
| `/api/v1/agents/` | CRUD | Agent management |
| `/api/v1/agents/<id>/sync-runtime/` | POST | Push the agent's configuration to the voice runtime |
| `/api/v1/workflows/` | CRUD | Workflow management |
| `/api/v1/workflows/<id>/sync-runtime/` | POST | Push the compiled workflow to the voice runtime |
| `/api/v1/integrations/notion/` | CRUD | Notion integrations |
| `/api/v1/integrations/notion/<id>/sync-tools/` | POST/DELETE | Register or unregister Notion tools with the runtime |
| `/api/v1/calls/` | GET | Read calls owned by the organization |
| `/api/v1/calls/web-config/` | POST | Non-secret runtime identifiers for the browser SDK |
| `/api/v1/calls/outbound/` | POST | Place an outbound call through the runtime |
| `/api/v1/calls/chat/` | POST | Proxy a chat (text-mode) interaction to the runtime |
| `/api/v1/metrics/` | GET | Aggregated metrics dashboard |
| `/api/v1/phone-numbers/` | CRUD | Phone numbers assigned to the organization |
| `/api/v1/call-logs/` | GET | Org-scoped call log list pulled from the runtime |
| `/api/v1/call-logs/<runtime_call_id>/` | GET | Single call detail including transcript |
| `/api/v1/webhooks/runtime/events/` | POST | Optional runtime event hook |
| `/api/v1/webhooks/runtime/notion/<integration_id>/<kind>/` | POST | Tool webhook for the Notion connector |

The structure of these URLs reflects three design conventions. First, the namespace is versioned: a future incompatible change to a payload shape can be expressed as `/api/v2/...` without breaking running clients. Second, REST resources (agents, workflows, integrations, calls) are exposed through DRF viewsets with the standard CRUD verbs; cross-cutting operations (sync, outbound, web-config, metrics, logs) are exposed through dedicated views to keep their payloads precise. Third, webhook endpoints are grouped under `/api/v1/webhooks/runtime/` and authenticated separately by shared secret rather than by user JWT, because the inbound caller is the voice runtime, not a human.

## 3.2 The studio: dashboard, agents, workflows, integrations, tools, and phone numbers

The studio is the primary user surface of the platform. It is organized into three sidebar groups — **Build**, **Connect**, and **Observe** — corresponding to the three phases of the operational life cycle (design, integrate, monitor). The grouping is intentionally simple: each top-level item is a route in the Next.js App Router under `app/(app)/`, and the shared chrome of the studio (sidebar, header, breadcrumb, page padding, providers) is declared once in `app/(app)/layout.tsx` and applied to every page.

### 3.2.1 The dashboard

The dashboard is the landing page after sign-in. Its purpose is to summarize the active organization at a glance: which plan is in use, how many minutes have been spent in the current period, what the workspace looks like, how the recent calls have performed, and what needs immediate attention.

![Figure 6. Studio dashboard — plan and usage, workspace health, KPI row, call-volume chart, quick actions, attention list, and recent calls.](screenshots/dashboard_page.jpg)

The dashboard is composed of six independent React components, each fetching its data through TanStack Query. The **PlanUsageCard** shows the plan name, the remaining minutes for the current billing period, and the workspace counts for agents, workflows, phone numbers, and integrations. The **WorkspaceHealthCard** is a divider-separated row list that links to each managed entity. The **MetricKpiCard** is reused four times for total minutes, total calls, total spend, and average cost per call, each with a subtle sparkline below the number. The **MetricsAreaChart** shows the call-volume trend over the last thirty days. The **QuickActionsCard** offers shortcuts to the most common operator actions (create agent, add phone number, view call logs, open metrics). The **NeedsAttentionCard** highlights unsuccessful calls in the recent period — calls that ended with a non-success reason such as "no answer", "busy", or "runtime error". The **RecentCallsCard** lists the most recent call records with type, duration, and cost.

Data for the dashboard is fetched in parallel. The metrics query hits `/api/v1/metrics/?days=30`, the recent-calls query hits `/api/v1/call-logs/?days=14&limit=10`, and the phone-numbers query hits `/api/v1/phone-numbers/`. All three queries share a cache and are warmed in the background by the `AppDataPrefetcher` component, so that returning to the dashboard from another page is instant. The same cache is reused by the dedicated metrics, logs, and phone-numbers pages further down the navigation tree, so that switching between pages does not re-trigger network requests for data that has already been loaded.

The dashboard layout adapts to the viewport. On a wide screen, the plan usage card occupies two-thirds of the top row with the workspace health card alongside it, the KPI cards fill a four-column row below them, and the call-volume chart, quick actions, and attention list share a three-column row below that. On a narrow screen, the layout collapses into a single column. The visual identity — minimal chrome, thin borders, dark background, uppercase eyebrow labels — is intentional and consistent across the entire studio; it is the result of a deliberate redesign pass that aligned the studio with the visual language of contemporary developer-focused SaaS products.

### 3.2.2 The agents page

The agents page lists the voice agents that belong to the active organization. Each agent has a name, a description, a primary language, a status (live or draft), a small set of tags, a count of minutes used in the current month, and a timestamp of the most recent call.

![Figure 7. Agents page — status summary strip, search and filter toolbar, and the agent card grid.](screenshots/agents_page.jpg)

The page is opened with the page header at the top — eyebrow "Build", title "Agents", and one-line description, with the **New agent** button on the right. Immediately below the header, a small statistics strip shows the total number of agents in the workspace, the number that are live, and the number that are still in draft, each with a coloured status dot. The toolbar below the strip combines a text search field, a language filter (all / English / Russian / Uzbek), and a status filter (all / live / draft). The agent grid occupies the remainder of the page; each agent card shows the agent's name, the status indicator (a green dot for live, a grey dot for draft), the agent's primary language, the integration kind (if the agent has a connected integration), a small set of tags, the most recent call timestamp, the minutes used in the current month, and a one-click link to open the agent's detail page.

When a new agent is created (through the **New agent** button), the studio opens a dialog that captures the agent's name, primary language, voice configuration, and starting prompt. On submission, the studio posts to `/api/v1/agents/`, which creates the agent row in the database, builds a runtime-ready assistant payload from the agent's configuration through `apps/studio/services/agent_assistant.py`, calls the voice runtime's `POST /assistant` endpoint, and stores the returned assistant identifier on the agent row's `runtime_assistant_id` field. Subsequent updates to the agent — change of name, system prompt, voice configuration, tool attachments — propagate to the runtime through `POST /api/v1/agents/<id>/sync-runtime/`, which compiles the agent again and pushes the result through `PATCH /assistant/<id>`. Deletion removes the row from the database and best-effort deletes the assistant from the runtime as well.

The agent card grid is responsive: three columns on a wide screen, two on a medium screen, one on a narrow screen. The cards themselves are designed to be scannable rather than dense; the most important information (name, status, language, recent activity) is visible at a glance, and the deeper configuration (system prompt, voice settings, attached tools, integration field map) is opened in the agent detail page when the user clicks on a card. This division of detail follows the established design pattern of "list-then-detail" for SaaS workspaces, in which the list view optimizes for breadth and the detail view optimizes for depth.

### 3.2.3 The workflows page

The workflows page lists the workflows that belong to the active organization. Each workflow has a name, an optional description, a structural summary (number of nodes, number of edges), a synchronization state (published or draft), and a timestamp of the most recent update.

![Figure 8. Workflows list — one row per workflow, with name, sync status, and structural counts.](screenshots/workflows_page.jpg)

The page header is the same shape as on every other studio page — eyebrow "Build", title "Workflows", one-line description, **New workflow** button on the right. The workflows themselves are presented as a list of rows inside a single card, separated by thin dividers. Each row shows the workflow's name as a clickable link, the synchronization state as a small dot-prefixed label (green for "Published", grey for "Draft"), the structural counts ("12 nodes · 14 edges"), and the last-updated timestamp. A trash-can icon appears on hover for direct deletion, and a small "Open" button on the right of each row opens the workflow canvas.

Clicking on a workflow opens the workflow canvas, which is the most prominent feature of the studio. The canvas is built on `@xyflow/react`. It supports panning, zooming, dragging nodes to new positions on the canvas, and connecting two nodes by dragging from a connection handle on one node to a connection handle on the other. A palette on the left provides drag-and-drop sources for new nodes of each of the six types. An inspector on the right binds to whichever node or edge is currently selected and exposes its editable properties: for a conversation node, the first message and the system prompt and the variable extraction plan and the attached tools; for a tool node, the tool selector; for a transfer-call node, the destination and an optional transfer message; for an end-call node, an optional closing line; for an api-request node, the HTTP method, URL, headers, and body. The condition on an edge is also editable from the inspector: a plain-text condition is interpreted as a natural-language condition for the LLM dialogue manager, and a `{{ ... }}` expression is interpreted as a structured liquid condition evaluated against the variables extracted up to that point.

![Figure 9. Workflow canvas — lead qualification template. The palette is on the left, the canvas in the middle, the inspector on the right.](screenshots/workflows_canvas_lead_qualification.jpg)

Saving a workflow triggers two actions in sequence. First, the local workflow store persists the workflow's content to the backend through `PATCH /api/v1/workflows/<id>/`, which stores the graph in the `Workflow.graph` JSON field. Second, the workflow compiler (`lib/workflows/runtime-compile.ts`) converts the local graph into the runtime's expected payload, and the studio calls `POST /api/v1/workflows/<id>/sync-runtime/` with the compiled payload. The backend forwards the payload to the runtime's `POST /workflow` or `PATCH /workflow/<id>` endpoint, depending on whether the workflow has been published before, and stores the runtime workflow identifier on `Workflow.runtime_workflow_id`. From that point on, the workflow is published and available for inbound calls, outbound campaigns, and in-studio test calls.

The in-studio **test panel** uses the voice runtime's browser SDK to place a real call inside the browser, against the published workflow. The panel highlights the active step on the canvas in real time, which makes debugging the conversation flow substantially faster than relying only on transcripts after the fact. The test call is a real call against the real runtime; it does not consume billed minutes (browser test calls are free up to a per-workspace daily cap), but it exercises the full speech recognition, dialogue management, and synthesis pipeline.

The workflow data model is summarized in Table 12 below.

**Table 12. Workflow node taxonomy.**

| Kind | Role | Required editable fields |
|------|------|---------------------------|
| `start` | Entry point of the workflow | First message, system prompt, optional variable extraction |
| `conversation` | Spoken interaction with the customer | System prompt; optional first message, variable extraction, attached tools |
| `tool` | Forced invocation of a registered tool | Tool reference |
| `transfer_call` | Hand the live call to a destination | Destination phone number or workflow; optional transfer message |
| `end_call` | Close the call gracefully | Optional closing message |
| `api_request` | Make an HTTP request to an external endpoint | HTTP method, URL, headers, body |

\textbf{Figure 4. Workflow graph node taxonomy and compilation flow.}

```mermaid
flowchart LR
    A[Local Workflow JSON in studio] -->|runtime-compile.ts| B[Compiled payload]
    B -->|POST /workflow| C[Voice runtime]
    A -.-> N1((start))
    A -.-> N2((conversation))
    A -.-> N3((tool))
    A -.-> N4((transfer_call))
    A -.-> N5((end_call))
    A -.-> N6((api_request))
    style N1 fill:#1e3a8a,color:#fff
    style N2 fill:#0f766e,color:#fff
    style N3 fill:#a16207,color:#fff
    style N4 fill:#7c2d12,color:#fff
    style N5 fill:#374151,color:#fff
    style N6 fill:#581c87,color:#fff
```

### 3.2.4 The integrations page

The integrations page is the entry point for connecting external data systems to the workspace. The first connector implemented in the platform is Notion. Additional connectors (HubSpot, Bitrix24, AmoCRM) appear in the "Coming soon" section of the page with a clear status indicator.

![Figure 10. Integrations page — the Notion connector card with a list of existing connections and a clean coming-soon area for additional CRM integrations.](screenshots/Integrations_page.jpg)

Connecting Notion requires three pieces of information from the user: a Notion internal-integration token (generated from the user's Notion account), a database identifier (selected from a list of databases the token has access to), and a field map that describes which Notion property corresponds to which conceptual field in the workspace (for example, "Customer name" maps to a Title property, "Phone number" maps to a Phone property, "Status" maps to a Select property, "Amount due" maps to a Number property). The connection wizard guides the user through these three steps; on completion, the platform encrypts the token using Fernet symmetric encryption, stores the field map, calls Notion's API to fetch the database's schema, and registers five tools (save, find, search, update, delete) with the voice runtime through a single `POST /api/v1/integrations/notion/<id>/sync-tools/` call. The five tools share the same field map, so any workflow that uses one of them automatically receives the correct schema for the connected database.

Resyncing an integration re-registers its tools with the runtime. This is necessary, for example, when the field map changes, when the platform's webhook base URL changes (a common situation during pilot deployment), or when the runtime returns an unexpected error on a tool call. The resync action is reachable from a small icon button on each integration row in the list inside the Notion connector card.

### 3.2.5 The tools page

The tools page lists every function tool registered for the workspace. The page is organized into two sections: **system tools** (the four generic tools built into every standalone agent: query, transfer call, send SMS, voicemail), and **integration tools** (the five tools provisioned per Notion connection).

![Figure 11. Tools page — built-in system tools above, per-integration auto-generated tools below.](screenshots/tools_page.jpg)

Clicking a tool opens a detail sheet that displays the tool's full JSON schema, its parameters, and (for integration tools) the field map it depends on. The detail sheet is the right place for technical inspection of a tool, and it is intentionally kept out of the way of the main list so that the list itself remains scannable. The page redesign in late prototype development consolidated the previously dense tool tiles into clean row-style entries: each row shows the tool's kind icon (with a kind-specific colour: emerald for save, sky for find, violet for search, amber for update, rose for delete), the tool's name, the tool's one-line description, and a live/pending status dot at the right edge of the row.

The Notion tool taxonomy is summarized in Table 13.

**Table 13. Notion tool taxonomy (per integration).**

| Kind | Role | Typical conversation use |
|------|------|---------------------------|
| `save` | Insert a new row into the connected Notion database | Logging a customer commitment, recording a new lead, writing a CSAT score |
| `find` | Look up a single record by unique key | Loading a customer's profile by phone number |
| `search` | Query multiple records by criteria | Finding overdue invoices for a customer |
| `update` | Modify an existing record | Updating a payment status, changing a lead stage |
| `delete` | Archive an existing record | Removing a stale lead, archiving a closed case |

### 3.2.6 The phone numbers page

The phone numbers page lists the telephone numbers assigned to the active organization. Each number has a provider, a name, an assignment (an agent or a workflow), and a status (active or blocked).

![Figure 12. Phone numbers page — numbers assigned to agents and workflows for inbound and outbound calls.](screenshots/phonenubers_page.jpg)

Adding a new number is performed through the **Add number** button, which opens a dialog with two flows: provisioning a new number from the platform's number inventory by area code, or connecting an existing number from a third-party carrier. After the number is created, it can be assigned to an agent or to a workflow; inbound calls to the number will run through the assignment's configuration, and outbound calls placed through the platform's API can specify the number as the originating identity.

## 3.3 Operational visibility: logs, metrics, and monitoring

The "Observe" group of the studio navigation covers the operational visibility surfaces: logs, metrics, and monitoring. These are the surfaces through which an operations team observes the behaviour of its voice agents in production.

### 3.3.1 Call logs

The logs page lists the calls the organization has placed and received over a configurable time range (last seven or last thirty days), optionally filtered by a specific agent.

![Figure 13. Logs — table of recent calls with time, agent, type, duration, and cost.](screenshots/logs_page.jpg)

The logs table is wrapped in a single rounded card. Each row shows the start time, the agent or workflow that handled the call, the type of call (web, inbound, outbound, marked with a coloured uppercase label), the duration in minutes and seconds, and the cost in the workspace's billing currency. Clicking a row opens the call detail page.

![Figure 14. Call detail — transcript on the left, structured event log and cost breakdown on the right.](screenshots/log_inside_page.jpg)

The call detail page shows three principal sections: the transcript (a turn-by-turn record of who said what), the event log (a structured record of the workflow nodes that were entered, the tools that were invoked, and the outcomes), and a cost breakdown. Transcripts and event logs are fetched on demand from the voice runtime rather than copied into the platform's database. This decision keeps the platform's storage requirements low and ensures that updates to the runtime's transcript model (for example, the addition of speaker diarization, sentiment labels, or topic tags) are surfaced automatically without a migration on the platform side.

### 3.3.2 Metrics

The metrics page exposes aggregated metrics for the active organization over a configurable time range (last seven, thirty, or ninety days) with optional day or week grouping and optional filtering by a specific agent.

![Figure 15. Metrics page (top) — KPI row, ended-reason distribution, average duration by assistant, and cost breakdown.](screenshots/Metrics_page.jpg)

The KPI row at the top shows the four headline metrics: total call minutes, total number of calls, total voice spend, and average cost per call, each with a small sparkline showing the trend over the selected window. The first section below the KPI row contains three categorical charts: the reasons calls have ended (customer ended, assistant ended, voicemail, timeout), the average call duration by assistant, and the cost breakdown by category (voice runtime, platform). These charts use the same `MetricsStackedBarChart` component as the time-series charts further down the page, with the component's x-axis inference logic detecting the categorical x-field at runtime so the same component renders both shapes correctly.

![Figure 16. Metrics page (bottom) — call count over time, average duration over time, cost over time, success evaluation, unsuccessful calls list, and concurrent calls by hour.](screenshots/metrics_page2.jpg)

The lower sections of the metrics page contain four time-series charts and an "Unsuccessful calls" list. The time-series charts use day or week buckets according to the page's step selector. The unsuccessful-calls list highlights the calls that ended with an unsuccessful reason in the selected window, so that an operator can investigate them individually from a single starting point.

All metrics queries hit `/api/v1/metrics/?days=N&step=day|week&agent_id=<optional>`. The backend assembles the metrics by combining the voice runtime's analytics endpoint with the platform's own call records, caches the result for a short interval (sixty seconds by default) to keep the dashboard responsive, and serves it to the studio.

### 3.3.3 Squads and monitoring

The Squads page is reserved for future work on multi-agent coordination — a "squad" would be a set of agents with explicit handoff rules and a shared call flow, in the style of a small ensemble of specialized colleagues. The Monitoring page is reserved for future work on real-time operational health: live concurrency, error rates, queue depth, response-latency distributions, and quality alerts. Both pages currently show a placeholder with a clear "coming soon" indicator, in line with the project's commitment to honest prototype boundaries.

![Figure 17. Squads placeholder page reserved for multi-agent orchestration.](screenshots/squadss_page.jpg)

The decision to expose these pages as placeholders rather than hiding them in the navigation reflects two judgments. First, the studio's overall vision is easier to communicate to a jury or a pilot evaluator if the future surfaces are visible. Second, an operations user who learns the platform with the placeholders in view receives a smoother conceptual onboarding when the corresponding functionality is added, because the navigation structure does not change underneath them.

## 3.4 The voice runtime in operation

This section describes the voice runtime as it operates during a live conversation. The architecture was introduced in Section 2.3.5; this section describes the operational behaviour from the perspective of a single call, with attention to the details that determine whether the conversation feels natural to the customer.

### 3.4.1 Call setup

A call begins either as an inbound or an outbound event. For an inbound call, the telephony adapter receives the SIP invitation for an incoming call to one of the workspace's numbers, looks up the number's assignment (agent or workflow), and routes the call to the runtime's orchestrator with the corresponding configuration loaded. For an outbound call, the platform's backend places a `POST /api/v1/calls/outbound/` request with the customer number, the originating workspace number, and the agent or workflow to run; the platform forwards this to the runtime, which initiates a SIP invitation outbound to the customer's number and connects the answered call to the runtime's orchestrator.

In both cases, the orchestrator opens a session, loads the agent or workflow configuration, primes the LLM dialogue manager with the workflow's global prompt and the start node's local prompt, and enters the conversation loop.

### 3.4.2 The conversation loop

The conversation loop is a state machine that alternates between three principal states: agent speaking, customer speaking, and silence. The state machine is driven by the voice-activity detector, by the streaming ASR's final-transcript signal, and by the streaming TTS's playback-complete signal.

- **Agent speaking.** The orchestrator is forwarding TTS audio to the telephony adapter. The VAD is monitoring the inbound stream for the customer starting to speak; if it detects voice activity, the orchestrator transitions to **customer speaking** (barge-in), cancelling the in-flight TTS and draining the audio buffer.
- **Customer speaking.** The orchestrator is forwarding inbound audio to the streaming ASR and consuming partial transcripts. When the ASR signals end-of-turn (a final transcript, typically when the customer has paused for approximately 500–800 milliseconds), the orchestrator transitions to **agent speaking** with the next agent response.
- **Silence.** The orchestrator is idle, neither receiving nor sending audio. This is the brief state between turns. If silence persists beyond a configurable timeout (typically 8–12 seconds), the orchestrator either prompts the customer (a "hello, are you still there?" type intervention) or, after a further timeout, ends the call.

The transition from customer speaking to agent speaking is the latency-critical path of the runtime. When the ASR emits the final transcript, the orchestrator must construct the LLM prompt, invoke the LLM, wait for the first tokens of the LLM reply, and forward those tokens to the TTS, which must synthesize the first audio chunk and forward it to the telephony adapter. The end-to-end target is sub-700-millisecond latency on the median turn; the runtime achieves this through (a) streaming inference from the LLM (consuming tokens as they are emitted rather than waiting for the full reply), (b) streaming synthesis from the TTS (synthesizing the first audio chunk while the LLM is still emitting tokens for the rest of the reply), and (c) a small jitter buffer on the telephony adapter to absorb micro-variations in TTS output rate.

### 3.4.3 Tool invocation during a conversation

A tool invocation is a structured request by the LLM dialogue manager to read or write external data during the conversation. The LLM emits a tool call in a structured format (the OpenAI-style function-call format that has become the de-facto standard); the orchestrator intercepts the tool call, posts to the platform's webhook endpoint at the URL registered for the tool, waits for the response, incorporates the response back into the LLM's context, and continues generation.

During the tool call, the orchestrator may optionally emit a verbal acknowledgement ("just a moment, let me check") if the tool is configured with a `messages.requestStart` template, and may emit a fall-back utterance if the tool times out. The default tool timeout is configurable per-tool but defaults to fifteen seconds; in practice, a Notion API call typically completes in under a second, so the timeout fires only when the platform or the Notion API is unreachable.

The platform's webhook receives the tool call, performs the underlying data operation through the Notion API (or the appropriate connector), and returns the result to the runtime in the structured format the runtime expects. The end-to-end round trip (runtime → platform → Notion → platform → runtime) is typically under 500 milliseconds for cached lookups and 800–1500 milliseconds for new writes.

### 3.4.4 Transfer and end

A `transfer_call` node terminates the agent's leg of the call and bridges the customer to the destination configured on the node. The destination is either a phone number (the call is transferred to a human operator on a separate SIP trunk), another workflow (the call is internally re-routed to a different workflow's start node, useful for routing between specialized workflows), or an external IVR (the call is bridged into an existing customer-service IVR for the parts of the conversation that the agent should not handle).

An `end_call` node closes the agent's leg of the call gracefully, optionally with a final spoken line. After the line completes, the orchestrator emits the call's metadata and event log to the platform's backend through the runtime's outbound webhook, and the platform records the call's final status.

### 3.4.5 Voicemail handling

On outbound calls, the orchestrator's first task is to determine whether the call has been answered by a human or by a voicemail system. The voicemail detector consumes the first few seconds of inbound audio and classifies it by combining several heuristics: the cadence and length of the initial utterance (voicemail greetings are typically longer than a human's "hello"), the presence of telephony-specific tones, and the LLM's interpretation of the first transcript chunk. If voicemail is detected, the orchestrator branches according to the workflow's configuration: it may end the call silently, play a templated message, or hang up after the greeting completes.

### 3.4.6 Quality and language support

The voice runtime supports English, Russian, and Uzbek at the language level. English is currently at production quality; Russian is at near-production quality with continuing improvements to prosody and named-entity pronunciation; Uzbek is in active development, with the focus areas being accurate pronunciation of Latin and Cyrillic Uzbek word forms, regional accent coverage, and the natural prosody of polite-register Uzbek which differs significantly from the casual register that most general-purpose TTS models produce.

The language of a call is selected by the agent or workflow that handles the call; the platform does not currently perform automatic language detection on inbound calls, although this is on the roadmap.

## 3.5 The integration layer: Notion as the first connector

The integration layer is the surface through which voice agents read and write the business data of the organizations they serve. The first connector implemented in the platform is Notion, integrated end-to-end. This section describes the integration in detail; subsequent connectors are intended to follow the same pattern.

### 3.5.1 Connection setup

A Notion integration is created through the connection wizard accessible from the integrations page. The wizard collects three inputs from the user.

First, the user supplies a **Notion internal-integration token**. Internal-integration tokens are created from the user's own Notion workspace and grant Scale Labs the ability to read and write the specific databases the token has been added to. The token is supplied to the wizard once, encrypted with the platform's Fernet key, and stored in the `NotionIntegration.token_ciphertext` field. The plaintext is never persisted.

Second, the user selects a **target database** from a list of databases the token has access to. The wizard fetches this list through Notion's `databases.list` endpoint, displays the database titles and last-edited timestamps, and stores the selected database identifier on the integration record.

Third, the user defines a **field map** from conceptual fields used inside workflows (customer name, phone number, account status, amount due, due date, lead score, and so on) to Notion property identifiers and types. The wizard fetches the database's schema, presents the available properties, and stores the mapping on the integration record.

On completion, the platform fires `POST /api/v1/integrations/notion/<id>/sync-tools/`, which calls the tool-builder service to generate five tool definitions (save, find, search, update, delete) parameterized by the field map, and registers each tool with the voice runtime. The runtime stores each tool's identifier; the platform stores the runtime-side tool identifiers on the integration record's `runtime_tools` array.

### 3.5.2 Use during a conversation

When a workflow that uses one of the integration's tools is executed by the runtime, the LLM dialogue manager may decide to invoke the tool. The runtime issues a POST to the platform's webhook URL for the tool, with the tool call arguments in the body and the platform's shared secret in the `X-Scale-Labs-Secret` header. The platform's webhook view:

1. Verifies the shared secret. A missing or incorrect secret causes the request to be rejected with HTTP 401.
2. Looks up the integration by `<integration_id>` from the URL.
3. Decrypts the Notion token from `NotionIntegration.token_ciphertext`.
4. Dispatches to the kind-specific handler in `apps/studio/services/notion_webhook_handlers.py`.
5. Performs the Notion API operation: a `pages.create` for save, a `databases.query` for find or search, a `pages.update` for update, a `pages.update` with `archived: true` for delete.
6. Formats the result into `{ results: [{ toolCallId, result: <JSON string> }] }` and returns it to the runtime.

The runtime incorporates the result into the LLM's context and the dialogue manager continues the conversation, optionally referencing the result in its next utterance.

### 3.5.3 Failure handling

Several failure modes are anticipated. A network error to Notion is retried twice with exponential back-off; if it still fails, the platform returns an error to the runtime, which can present a fallback utterance to the customer. A Notion API rate-limit response is similarly back-off-retried. A decryption failure (suggesting a configuration problem with the Fernet key) is logged and returned to the runtime as a hard error. A missing field map is treated as a configuration error and returned to the runtime as a hard error.

## 3.6 Voice quality, language support, and the Uzbek roadmap

Voice quality is the single largest determinant of pilot success for an autonomous voice agent platform. A platform with weak voice quality produces calls that customers will find irritating or untrustworthy; a platform with strong voice quality fades into the background. The Scale Labs roadmap therefore prioritizes voice quality, particularly in Uzbek and Russian, as the most important pre-pilot work.

### 3.6.1 English voice quality

The platform's English voice quality is currently at production grade for outbound campaigns and inbound support workflows. The TTS produces speech with natural prosody, correct named-entity pronunciation, and appropriate register variation between formal and casual contexts. The ASR achieves a word-error rate of approximately five percent on the telephony-quality English corpus the platform uses for internal evaluation.

### 3.6.2 Russian voice quality

Russian voice quality is at near-production grade. The TTS produces speech that is intelligible and pleasant for most conversational contexts, with continuing improvements being made to formal-register prosody and to the pronunciation of named entities and place names. The ASR is at production grade for clean telephony audio; performance degrades modestly on heavily accented Russian (regional accents and second-language speakers).

### 3.6.3 Uzbek voice quality

Uzbek voice quality is in active development. Three areas are being worked on. First, the platform supports both Latin and Cyrillic Uzbek text input to the TTS and produces appropriate output in both writing systems. Second, the TTS prosody is being tuned for the polite-register Uzbek used in formal customer-service contexts, which differs from the casual register that general-purpose Uzbek TTS models typically produce. Third, the ASR's handling of Uzbek regional accents, Russian loanwords, and code-switching (the natural Uzbek-Russian-English mixing that is common in urban Uzbek speech) is being improved through targeted training-data augmentation.

The Uzbek voice quality roadmap is the most significant pre-pilot work item for Uzbek customers. It is the single area in which the platform's investment most directly determines whether the first pilots succeed.

## 3.7 Functional capabilities, testing, limitations, and future development

### 3.7.1 Functional capabilities of the implemented prototype

The functional capabilities of the implemented prototype are summarized in Table 15.

**Table 15. Functional capabilities of the implemented prototype.**

| Capability | State |
|------------|-------|
| Multi-organization workspace with email/password authentication | Implemented |
| Active-organization switching with `X-Org-Id` header | Implemented |
| Standalone voice agent creation and runtime sync | Implemented |
| Visual workflow editor with six node types and conditional edges | Implemented |
| Workflow compiler producing the voice runtime payload | Implemented |
| Workflow publish/unpublish through `sync-runtime` action | Implemented |
| In-studio browser test calls with active-step highlighting | Implemented |
| Notion integration end-to-end (connection, field map, tools, webhooks) | Implemented |
| Phone-number provisioning and assignment | Implemented |
| Inbound and outbound call execution through the voice runtime | Implemented |
| Call logs with transcript and event detail | Implemented |
| Metrics dashboard with KPIs and charts | Implemented |
| Real-time voice runtime (ASR + LLM dialogue + TTS + telephony) | Implemented |
| English voice in production quality | Implemented |
| Russian voice quality | Near-production |
| Uzbek voice quality | In active development |
| Demonstration presentation workspace with rich mock data | Implemented |
| Billing tiers visible in the UI (Pilot / Operations / Scale / Enterprise) | UI only |
| Payment-processor checkout and invoice generation | Not implemented (future) |
| Squad-style multi-agent orchestration | Not implemented (future) |
| Live monitoring console | Not implemented (future) |
| Additional CRM connectors (HubSpot, Bitrix24, AmoCRM) | Not implemented (future) |
| First-class SMS and email channels | Not implemented (future) |
| Audit log of administrative actions | Not implemented (future) |
| Role-based access control inside an organization | Not implemented (future) |

### 3.7.2 Billing tiers

The platform exposes four billing tiers in the studio's billing page, as summarized in Table 16. The tiers are visible in the UI, but checkout and limit enforcement are not yet connected to a payment processor.

**Table 16. Plan tiers exposed in the billing UI.**

| Tier | Monthly price | Minutes | Concurrent calls | Numbers | Workflows | Audience |
|------|---------------|---------|------------------|---------|-----------|----------|
| Pilot | Free (14-day trial) | 150 (hard cap) | 2 | 1 | 1 | Trial, diploma pilots |
| Operations | $149 / month | 1,500 | 10 | 3 | 3 | SMB, one production use case |
| Scale | $599 / month | 6,000 | 30 | 15 | Unlimited | Mid-market, multiple campaigns |
| Enterprise | Annual contract | Quoted | Reserved | Pooled | Unlimited | 24/7 ops, compliance industries |

### 3.7.3 Testing strategy

The platform is tested at four levels.

**Unit tests** are written with `pytest` and `pytest-django` for the backend, primarily covering the workflow compiler, the multi-tenant query filters, the credential encryption helpers, the runtime tenancy resolvers, and the Notion webhook handler logic. The tests run against the SQLite engine used during development. The frontend unit tests are limited in scope; the more important typing-level checks are performed by the strict TypeScript configuration.

**Type checking** is treated as a first-class form of testing. `npx tsc --noEmit` is run on the frontend before every commit. Because the workflow data model, the API client, and the Notion integration are all expressed in TypeScript with `strict` mode enabled, a wide class of integration errors — wrong field names, mismatched optional vs. required, accidental `any` casts — is caught before any code is run.

**Integration testing** is performed manually against the running platform, by signing in to the demonstration workspace, creating an agent, designing a workflow, attaching a Notion integration, placing a test call, and inspecting the resulting transcript in the logs page. The acceptance criterion for any non-trivial change is that this end-to-end flow continues to work; the project's internal intent document refers to this as "protecting the demo path".

**Voice runtime evaluation** is performed against a small internal corpus of test conversations representative of the target use cases (payment reminders in English and Russian, lead qualification in English, delivery confirmation in Uzbek). Each evaluation measures end-to-end latency, conversation completion rate, customer-rated naturalness on a small panel, and word-error rate of the ASR.

### 3.7.4 Limitations of the current prototype

The current prototype has the following limitations.

**Connector library.** Notion is the only fully implemented integration. HubSpot, Bitrix24, AmoCRM, and generic-API connectors are listed in the roadmap; the tool-based pattern that Notion follows is intended to generalize, but each new connector still requires development and testing work.

**Payment enforcement.** Billing plans are visible in the studio's billing page, but checkout is not connected to a payment processor and per-plan limits are not enforced. A production deployment would require integration with a payment processor (Stripe for international customers, a regionally appropriate processor for Uzbek customers) and middleware that enforces plan limits on phone-number creation, workflow publishing, integration count, and outbound call placement.

**Audit log.** Administrative actions are not logged in a structured, queryable form. Compliance-sensitive deployments would require an audit log of who changed what and when.

**Rate limiting at the platform layer.** The platform relies on the voice runtime's own rate limits and on the organization-scoped queryset filtering. Application-layer rate limiting (for example via `django-ratelimit`) would be added before a production deployment.

**Fine-grained authorization.** All members of an organization currently have the same effective permissions. A role-and-permission system would be required for organizations that need separate administrative and analyst roles, particularly in compliance-sensitive industries.

**Outbound campaigns UI.** The platform has API support for placing outbound calls in bulk, but the studio's coverage of that capability is currently thin. A campaigns UI — list of customers, schedule, retry policy, results dashboard — would make outbound use cases substantially easier to operate.

**Squad-style multi-agent orchestration.** Coordinated handoffs between specialized agents within one call session — for example a triage agent transferring to a billing specialist agent and then to a retention agent — are not yet implemented.

**Live monitoring console.** Real-time operational health is not surfaced. Concurrency, error rates, response-latency distributions, and quality alerts would belong on a dedicated monitoring page.

### 3.7.5 Future development roadmap

The platform's roadmap, prioritized in order of importance for pilot deployment, is summarized below.

1. **Uzbek voice production quality.** The most important pre-pilot work for Uzbek customers. Until Uzbek voice quality is at production grade, Uzbek pilots are constrained to English-speaking customer segments.
2. **Two or three additional CRM connectors.** AmoCRM and Bitrix24 for the Uzbek market, and HubSpot for the international market, would significantly broaden the set of pilot conversations the platform can host. The same tool-based pattern as the Notion connector is reused for each.
3. **Outbound campaigns UI.** The single largest pre-pilot improvement to the studio for outbound use cases.
4. **Billing enforcement.** Integration with a payment processor and enforcement of plan limits.
5. **Squad-style multi-agent orchestration.** Coordinated handoffs between specialized agents within one call session.
6. **Live monitoring console.** Real-time operational health: concurrency, error rates, response-latency distributions, quality alerts.
7. **Audit log and role-based access control.** Compliance-sensitive deployment readiness.
8. **Server-authoritative workflow drafts.** Move the editing draft surface from the browser's local cache to the backend, so that an operations user can resume editing on a different machine without losing local state.

## 3.8 Security mechanisms summary

The platform's security model, having been described in context throughout this chapter, is summarized for reference in Table 14.

**Table 14. Security mechanisms summary.**

| Concern | Mechanism |
|---------|-----------|
| User authentication | Email + password, JSON Web Tokens with rotating refresh |
| Tenant isolation | `X-Org-Id` header, `ActiveOrganizationMiddleware`, queryset filtering |
| Runtime resource access | Verify the runtime identifier belongs to the active organization before forwarding |
| Third-party credential storage | Fernet symmetric encryption with key in environment variable |
| Webhook authentication | Shared-secret header verified on every inbound webhook |
| Transport security | HTTPS in production; HTTPS tunnel in development |
| CORS | Allow-list of origins in `CORS_ALLOWED_ORIGINS`; `X-Org-Id` permitted via `CORS_ALLOW_HEADERS` |
| CSRF | Not applicable to JWT-authenticated JSON APIs |
| LLM prompt injection | Workflow's global prompt and per-node prompt constrain the LLM's behaviour; tools are explicitly listed per node |
| Transcript privacy | Transcripts pulled on demand from the runtime and not duplicated in the platform's database; access controlled by org-scoped permission |

\newpage

# CONCLUSION

This thesis has presented the design and implementation of **Scale Labs**, an autonomous AI voice agent platform engineered from the ground up to automate repetitive business customer-communication operations. The work was motivated by a structural observation about service-oriented organizations in Uzbekistan and similar emerging markets: a large share of customer telephony is rule-bound, follows a small number of stable patterns, and consumes a disproportionate amount of operator capacity at a cost that scales linearly with customer-base growth. The thesis has argued that this class of work is best modelled as **configurable software** — workflows authored by operations teams in a visual studio, executed by a real-time voice runtime that performs speech recognition, language-model dialogue management, and speech synthesis on a telephony adapter, and integrated with the organization's existing data sources through a tool-based webhook pattern.

The introduction defined the object, subject, aim, tasks, and methods of the work. Chapter 1 analysed the relevance of autonomous customer voice communication in Uzbekistan, presented an indicative cost composition of a twenty-four-hour call-centre seat in soum, surveyed the national digital-transformation context, identified five sectors with the largest expected impact (banking and microfinance, telecommunications, e-commerce and marketplaces, logistics and last-mile delivery, education and recruitment), reviewed the theoretical foundations of conversational AI systems, surveyed the existing categories of customer-communication automation (legacy IVR, generic chatbot platforms, contemporary voice-AI platforms studied as design references, bespoke vendor projects, internal call-centre tools), and stated the engineering problem formally as eight numbered properties (P1 through P8).

Chapter 2 explained the technology choices and compared each with alternatives. Next.js 16 with React 19 was chosen for the studio frontend; Django 5 with Django REST Framework for the backend; MySQL for production and SQLite for development; JSON Web Tokens with rotating refresh and an `X-Org-Id` header for multi-tenant authentication; Fernet symmetric encryption for third-party credentials; `@xyflow/react` for the workflow graph editor; TanStack Query for the data-fetching layer; and a real-time voice runtime architecture combining streaming automatic speech recognition, an LLM-driven dialogue manager with tool-use support, neural text-to-speech, and a SIP telephony adapter. The chapter also described the development environment, the production server requirements, the methodologies adopted (prototype-driven iteration with strong typing and short feedback loops), the multi-tenant request flow as a sequence diagram, the workflow data model and compiler, the tool-registration pattern and webhook authentication, and the voice runtime's real-time conversation pipeline.

Chapter 3 documented the implemented system across thirty pages of architectural description, screenshots, and tables: the system architecture, the database structure and entity-relationship diagram, the URL structure, the studio across six pages (dashboard, agents, workflows, integrations, tools, phone numbers), the workflow engine in operation, the operational visibility surfaces (logs, metrics, squads placeholder), the voice runtime's behaviour during a live conversation (call setup, the conversation loop, tool invocation, transfer and end, voicemail handling, language support), the Notion integration as the first connector, the voice quality and Uzbek roadmap, the functional capabilities of the implemented prototype, the billing tiers, the testing strategy, the limitations, and the future development roadmap. Every page of the studio is documented with a screenshot taken from the running platform.

The principal contribution of the work is the **complete, original engineering construction** of a multi-tenant voice agent platform with a workflow-first authoring model and a tool-based integration pipeline. The platform's design lessons were informed in part by studying contemporary voice-AI products — Retell AI and Vapi AI in particular — whose visual studios confirmed the viability of the workflow-first authoring model and suggested concrete primitives that any production voice-AI platform should expose. The engineering work itself — the multi-tenant architecture, the workflow compiler, the real-time conversation orchestration, the tool-registration pattern, the operational dashboard, the redesigned studio — is original and represents the thesis's substantive contribution.

The platform achieves the engineering goals stated in the introduction. A workspace user can create an agent, design a workflow, attach a Notion integration, assign a phone number, place a test call from the browser, watch the workflow's active step on the canvas, hear the conversation conclude, and review the transcript and metrics in the dashboard, all without leaving the studio. Each of these steps exercises a distinct subsystem of the platform — authentication, multi-tenant filtering, agent runtime sync, workflow compilation and publish, tool registration, webhook authentication, browser-SDK invocation, call-log retrieval, metrics aggregation — and the end-to-end demo path is the practical evidence that the system works as a whole.

Several limitations are documented honestly in Chapter 3 and remain as future work. The Notion connector is the only fully implemented integration. Billing checkout is not wired to a payment processor. Squad-style multi-agent orchestration, the live monitoring console, fully production-grade Uzbek voice quality, audit logging, and role-based access control are listed in the roadmap. These limitations do not undermine the prototype's claim as a complete engineering project; they define the trajectory of further work and are honestly framed as out of scope for the prototype phase covered by this thesis.

For Uzbek pilots, the most immediate next steps are improvement of Uzbek voice production quality (the single largest pre-pilot work item), implementation of one or two additional CRM connectors that match the local market (AmoCRM and Bitrix24 in particular), and construction of an outbound campaigns UI to make payment-reminder, lead-qualification, and delivery-confirmation campaigns easier to operate at the volumes typical of Uzbek financial-services and logistics organizations. For internationalization, the natural next steps are additional connectors targeted at the wider SaaS ecosystem (HubSpot in particular) and the introduction of payment-processor integration and per-plan limit enforcement.

For the Software Engineering programme at Millat Umidi University, this thesis demonstrates full-stack engineering competence across frontend, backend, database, API design, real-time systems, multi-tenant architecture, integration design, operational tooling, and visual design. The combination of academic problem analysis, engineering implementation, and honest evaluation of limitations matches the expectations of the bachelor-degree graduation project.

In closing, the work shows that a complete, original autonomous AI voice agent platform can be designed and implemented by a single student within the timeframe of a bachelor-degree graduation project, that the resulting platform is structurally close enough to a production system that it can host real pilot use cases in the Uzbek market, and that the platform's modular workflow-first architecture is the practical answer to the question of why an Uzbek organization would adopt one voice-AI platform rather than commissioning a separate bespoke project per use case. The work is both a defensible diploma project for Millat Umidi University and a credible foundation for further product development.

\newpage

# REFERENCES

1. Government of the Republic of Uzbekistan. *Development Strategy of New Uzbekistan for 2022–2030*. Tashkent, 2022.
2. Government of the Republic of Uzbekistan. *Digital Uzbekistan-2030 Strategy*. Tashkent, 2020.
3. Ministry of Digital Technologies of the Republic of Uzbekistan. *Annual Report on the Digital Economy*. Tashkent, 2024.
4. World Bank Group. *Digital Economy in Uzbekistan: Country Diagnostic*. Washington, DC: World Bank, 2023.
5. International Telecommunication Union. *Measuring Digital Development: Facts and Figures*. ITU Publications, Geneva, 2024.
6. International Telecommunication Union. *ITU-T Recommendation G.114: One-way Transmission Time*. Geneva, 2003.
7. Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., Polosukhin, I. *Attention Is All You Need*. Advances in Neural Information Processing Systems, vol. 30, 2017.
8. Brown, T., Mann, B., Ryder, N., et al. *Language Models are Few-Shot Learners*. Advances in Neural Information Processing Systems, vol. 33, 2020.
9. Radford, A., Kim, J. W., Xu, T., et al. *Robust Speech Recognition via Large-Scale Weak Supervision*. OpenAI Research, 2022.
10. Ouyang, L., Wu, J., Jiang, X., et al. *Training language models to follow instructions with human feedback*. NeurIPS, 2022.
11. Schick, T., Dwivedi-Yu, J., Dessì, R., et al. *Toolformer: Language Models Can Teach Themselves to Use Tools*. NeurIPS, 2023.
12. Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., Cao, Y. *ReAct: Synergizing Reasoning and Acting in Language Models*. ICLR, 2023.
13. Sutskever, I., Vinyals, O., Le, Q. V. *Sequence to Sequence Learning with Neural Networks*. NeurIPS, 2014.
14. Hochreiter, S., Schmidhuber, J. *Long Short-Term Memory*. Neural Computation, vol. 9, 1997.
15. Russell, S., Norvig, P. *Artificial Intelligence: A Modern Approach*. Pearson, 4th edition, 2021.
16. Sutton, R., Barto, A. *Reinforcement Learning: An Introduction*. MIT Press, 2nd edition, 2018.
17. Goodfellow, I., Bengio, Y., Courville, A. *Deep Learning*. MIT Press, 2016.
18. Kleppmann, M. *Designing Data-Intensive Applications*. O'Reilly Media, 2017.
19. Fielding, R. T. *Architectural Styles and the Design of Network-based Software Architectures*. PhD thesis, University of California, Irvine, 2000.
20. Newman, S. *Building Microservices*. O'Reilly Media, 2nd edition, 2021.
21. Sommerville, I. *Software Engineering*. Pearson, 10th edition, 2015.
22. Pressman, R. S., Maxim, B. R. *Software Engineering: A Practitioner's Approach*. McGraw-Hill, 9th edition, 2019.
23. Fowler, M. *Refactoring: Improving the Design of Existing Code*. Addison-Wesley, 2nd edition, 2018.
24. Beck, K. *Test-Driven Development: By Example*. Addison-Wesley, 2002.
25. Booch, G., Rumbaugh, J., Jacobson, I. *The Unified Modeling Language User Guide*. Addison-Wesley, 2nd edition, 2005.
26. Hopcroft, J. E., Motwani, R., Ullman, J. D. *Introduction to Automata Theory, Languages, and Computation*. Pearson, 3rd edition, 2006.
27. Date, C. J. *An Introduction to Database Systems*. Addison-Wesley, 8th edition, 2003.
28. Garcia-Molina, H., Ullman, J. D., Widom, J. *Database Systems: The Complete Book*. Pearson, 2nd edition, 2008.
29. Jones, M., Bradley, J., Sakimura, N. *RFC 7519: JSON Web Token (JWT)*. Internet Engineering Task Force, 2015.
30. Fette, I., Melnikov, A. *RFC 6455: The WebSocket Protocol*. Internet Engineering Task Force, 2011.
31. Rosenberg, J., Schulzrinne, H., Camarillo, G., et al. *RFC 3261: SIP — Session Initiation Protocol*. Internet Engineering Task Force, 2002.
32. NIST. *FIPS 197: Advanced Encryption Standard (AES)*. National Institute of Standards and Technology, 2001.
33. Django Software Foundation. *Django 5 Documentation*. https://docs.djangoproject.com/, retrieved 2026.
34. Django REST Framework. *Official Documentation*. https://www.django-rest-framework.org/, retrieved 2026.
35. Vercel Inc. *Next.js 16 Documentation*. https://nextjs.org/docs, retrieved 2026.
36. Meta Platforms. *React 19 Documentation*. https://react.dev/, retrieved 2026.
37. Tailwind Labs. *Tailwind CSS v4 Documentation*. https://tailwindcss.com/docs, retrieved 2026.
38. shadcn. *shadcn/ui Component Library*. https://ui.shadcn.com/, retrieved 2026.
39. xyflow GmbH. *@xyflow/react (React Flow) Documentation*. https://reactflow.dev/, retrieved 2026.
40. TanStack. *TanStack Query v5 Documentation*. https://tanstack.com/query/, retrieved 2026.
41. Notion Labs Inc. *Notion API Reference*. https://developers.notion.com/, retrieved 2026.
42. McKinsey & Company. *The State of Customer Care*. Industry report, 2023.
43. Gartner Inc. *Magic Quadrant for Contact Center as a Service*. Industry report, 2024.
44. Statista. *Voice AI market size and forecast, 2024–2030*. Industry report, 2024.
45. Deloitte Insights. *Global Contact Center Survey*. Industry report, 2024.

\newpage

# APPLICATIONS

## Application A. Source code structure

The Scale Labs source code is organized into two top-level directories: `frontend/` (the Next.js studio) and `backend/` (the Django backend, including the voice-runtime control-plane interfaces). The principal directories and files are listed below.

```
Scale-Labs/
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/                  # Authenticated studio routes
│   │   │   │   ├── layout.tsx          # Shared chrome and providers
│   │   │   │   ├── dashboard/
│   │   │   │   ├── agents/
│   │   │   │   ├── workflow/
│   │   │   │   ├── integrations/
│   │   │   │   ├── tools/
│   │   │   │   ├── phone-numbers/
│   │   │   │   ├── logs/
│   │   │   │   ├── metrics/
│   │   │   │   ├── billing/
│   │   │   │   ├── squads/
│   │   │   │   └── monitoring/
│   │   │   ├── (auth)/                 # Sign-in and sign-up routes
│   │   │   ├── api/v1/[...path]/       # Reverse proxy to Django
│   │   │   ├── layout.tsx              # Root layout
│   │   │   └── globals.css             # Tailwind v4 imports and theme tokens
│   │   ├── components/
│   │   │   ├── ui/                     # shadcn primitives (button, card, table, ...)
│   │   │   ├── agents/
│   │   │   ├── workflows/
│   │   │   ├── integrations/
│   │   │   ├── tools/
│   │   │   ├── dashboard/
│   │   │   ├── metrics/
│   │   │   ├── billing/
│   │   │   └── page-header.tsx
│   │   ├── lib/
│   │   │   ├── api/                    # Fetch client, env, token storage
│   │   │   ├── workflows/              # Workflow store, types, compiler, templates
│   │   │   ├── agents/                 # Agent store, hydration bridge, types
│   │   │   ├── integrations/notion/    # Notion integration helpers
│   │   │   ├── calls/                  # Call-log API
│   │   │   ├── metrics/                # Metrics API
│   │   │   ├── phone-numbers/          # Phone-number API
│   │   │   ├── billing/                # Workspace billing snapshot
│   │   │   ├── demo/                   # Presentation workspace dataset
│   │   │   ├── query/                  # TanStack Query setup and prefetch
│   │   │   └── runtime/                # Browser-side voice runtime helpers
│   │   ├── contexts/
│   │   │   └── auth-context.tsx
│   │   └── hooks/
│   └── public/
└── backend/
    ├── requirements.txt
    ├── manage.py
    ├── config/
    │   ├── settings/{base,dev,prod}.py
    │   ├── urls.py
    │   ├── runtime_webhook.py
    │   └── asgi.py / wsgi.py
    ├── apps/
    │   ├── accounts/                   # User, Organization, Membership
    │   │   ├── models.py
    │   │   ├── views.py
    │   │   ├── serializers.py
    │   │   ├── urls.py
    │   │   ├── middleware.py
    │   │   └── migrations/
    │   └── studio/                     # Agent, Workflow, Integration, Call, CallEvent
    │       ├── models.py
    │       ├── views.py
    │       ├── serializers.py
    │       ├── permissions.py
    │       ├── mixins.py
    │       ├── middleware.py / middleware/
    │       ├── services/
    │       │   ├── runtime.py
    │       │   ├── runtime_tenancy.py
    │       │   ├── runtime_call_access.py
    │       │   ├── runtime_call_normalize.py
    │       │   ├── runtime_phone_access.py
    │       │   ├── runtime_phone_normalize.py
    │       │   ├── runtime_metrics.py
    │       │   ├── runtime_webhook_auth.py
    │       │   ├── agent_assistant.py
    │       │   ├── crypto.py
    │       │   ├── notion_http.py
    │       │   ├── notion_tool_builder.py
    │       │   └── notion_webhook_handlers.py
    │       ├── urls.py
    │       ├── tests/
    │       └── migrations/
    └── docs/
        └── TENANCY_AND_RUNTIME.md
```

## Application B. Build and run commands

The development environment is started with the following commands.

```
# Frontend (Next.js studio)
cd frontend
npm install
npm run dev          # http://localhost:3000

# Backend (Django REST Framework)
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

A demonstration workspace can be entered from the sign-in page by clicking **Open Acme demo workspace** or by signing in with the credentials `demo@acme.inc` / `AcmeDemo2026!`. The demonstration workspace contains ten agents, five published workflows, three Notion integrations, twelve phone numbers, and eighty-six call logs, and is populated entirely from a deterministic dataset so that screenshots and demonstrations remain stable across runs.

## Application C. Demonstration workspace data

The demonstration workspace is built from the dataset declared in `frontend/src/lib/demo/acme-presentation-data.ts`. The agents are named after realistic use cases — Payment Reminder UZ, Lead Qualification EN, CSAT Survey, Fraud Step-Up, Delivery Updates, Appointment Confirm, Support FAQ, Collections Soft, Onboarding Welcome, Win-Back Outreach. The workflows are derived from the templates in `frontend/src/lib/workflows/templates/` (lead qualification, appointment scheduler, customer satisfaction). The metrics dataset contains thirty days of synthetic call-volume, minute-usage, and cost data with sparkline shapes designed to produce visually clean charts. The dataset is reset on every demonstration sign-in so that the demonstration workspace is reproducible.

## Application D. Sample workflow JSON

A representative compiled workflow payload (lead qualification) has the following shape:

```json
{
  "name": "Lead Qualification",
  "globalPrompt": "You are a courteous lead qualification agent.",
  "nodes": [
    {
      "type": "conversation",
      "name": "start",
      "isStart": true,
      "prompt": "Greet the caller and confirm interest.",
      "messagePlan": { "firstMessage": "Hi, this is Acme calling about your enquiry." },
      "variableExtractionPlan": {
        "output": [
          { "title": "interested", "type": "boolean", "description": "Whether the caller confirmed interest." }
        ]
      }
    },
    {
      "type": "conversation",
      "name": "qualify",
      "prompt": "Ask about budget and timeline.",
      "variableExtractionPlan": {
        "output": [
          { "title": "budget", "type": "string", "description": "Stated budget range." },
          { "title": "timeline", "type": "string", "description": "Stated timeline." }
        ]
      },
      "toolIds": ["save"]
    },
    {
      "type": "end",
      "name": "end"
    }
  ],
  "edges": [
    { "from": "start", "to": "qualify", "condition": { "type": "logic", "liquid": "{{ interested == true }}" } },
    { "from": "start", "to": "end", "condition": { "type": "logic", "liquid": "{{ interested == false }}" } },
    { "from": "qualify", "to": "end" }
  ]
}
```

\newpage
