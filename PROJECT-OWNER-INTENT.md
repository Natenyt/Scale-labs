# Project owner intent (read this first)

This file is for **you**—another developer or AI agent working in this repository. It explains *why* Scale Labs exists, what the owner cares about, and how to make decisions that match that intent. It is not customer-facing copy.

For product narrative, see [scale-labs-description.md](scale-labs-description.md). For slides and hackathon pitch, see [pitch-decription.md](pitch-decription.md).

---

## Who is building this

**Davlat Eshnazarov** know as Nathan Allard (Team 10x) is the primary builder: full-stack, product, and architecture. The product brand is **Scale Labs**; the team name **Team 10x** remains for legal and early hackathon history.

I started this as a **real startup idea**—something I believed could become a business in Uzbekistan and beyond, solving call-center cost and repetitive customer calls. I still believe the problem is real and the approach (modular voice workflows + data integrations) is sound.

**Today my situation is different:** I have a demanding full-time job. I cannot treat Scale Labs as a full-time company right now. I am still building the project because:

1. **Diploma / academic delivery** — I need a working, demonstrable end-to-end system, not a slide deck alone.
2. **Momentum** — The prototype already works in important ways; abandoning it would waste learning and early traction (e.g. first pilot interest).
3. **Option value** — When I have more time, this codebase should be a credible base to continue as a product, not a throwaway homework repo.

So: **optimize for finishing a strong prototype and diploma demo**, not for enterprise perfection or infinite scope.

---

## What I am trying to achieve

### Near term (now)

- A **credible live demo**: English voice (and Uzbek when ready), workflow editor, test call from the browser, at least one real integration (Notion), call logs and metrics visible in the dashboard.
- **Modular story that holds up in presentation**: “One platform, many use cases” via workflows—not three separate fake products.
- **Speed over purity**: Ship the smallest change that makes the demo or defense Q&A better. Avoid large refactors unless they unblock the above.
- **Honest prototype boundaries**: Do not claim in UI or docs that billing, HubSpot, squads, etc. exist if they are placeholders.

### Medium term (if I return to this seriously)

- Pilot customers in Uzbekistan (banks, telco, e-commerce, logistics) with **one vertical workflow + one integration** at a time.
- Uzbek voice quality good enough for local pilots.
- More connectors (CRM, internal APIs) using the same **tool + webhook** pattern as Notion.
- Possibly hire for integrations, voice tuning, or sales—not for rewriting the stack from scratch.

### Long term (intent, not commitment)

- Scale Labs as **infrastructure for autonomous customer communication**: voice first, chat and other channels when the core is stable.
- Business model around usage/seats—not selling “a bank bot” as a separate SKU.
- I am **not** trying to build a niche-only tool; new use cases should appear as **new workflows**, not new codebases.

---

## What Scale Labs is *in my head*

I do not have a fixed list of every industry we will serve. The problem class is stable:

> Organizations make **many similar phone calls** and pay **many humans** to repeat the same scripts. Scale Labs replaces that with **configured agents** that can **read and write business data** when the flow requires it.

Examples I care about (not exhaustive):

- Lead qualification, CSAT surveys, appointment scheduling (templates already in repo).
- Payment and debt reminders (consumer loans, university fees, utilities).
- Fraud / step-up verification after suspicious login.
- Delivery status and failed-delivery callbacks.
- Telecom balance and plan FAQs.

**The workflow system is the product.** Agents, phone numbers, integrations, and logs exist to **run and operate** those workflows. If a feature does not help design, test, deploy, or observe workflows, it is lower priority unless diploma/demo explicitly needs it.

---

## How I want the codebase treated

### Do

- **Match existing patterns** in `frontend/` (Next.js App Router, React 19, workflows store, Vapi compile/sync) and `backend/` (Django REST, org scoping, webhooks).
- **Keep changes focused**—one concern per PR-sized diff; no drive-by refactors.
- **Preserve modularity**—new behavior via workflow nodes, tools, or compile rules—not hard-coded “bank mode.”
- **Prefer working E2E** over perfect abstractions—a sync that works beats a theoretical integration layer.
- **Document honestly** in code comments when something is “Day 9” / prototype / placeholder.
- **Use** [scale-labs-description.md](scale-labs-description.md) for outward-facing tone: grounded, not hype.

### Do not

- **Expand scope** for “nice to have” (billing UI, squads, monitoring) unless I ask or diploma checklist requires it.
- **Break the demo path**: create workflow → save/sync → test call in browser → see logs/metrics.
- **Introduce heavy new dependencies** without a clear payoff for demo or maintenance.
- **Rewrite marketing/docs** to name third-party voice vendors—we present Scale Labs as our platform; see “Technical reality” below for what *you* need to know internally.
- **Assume I have time to review huge diffs**—smaller, explainable changes win.

### UI and UX

- Dark studio aesthetic already in the app—stay consistent (shadcn, Tailwind, existing layout).
- Workflow canvas and test panel are **showcase features** for presentation—invest in clarity there when touching voice/workflows.
- Skeleton loading and instant navigation patterns are intentional for perceived performance—keep them.

---

## Technical reality (for agents only)

This section is **internal**. Public docs ([scale-labs-description.md](scale-labs-description.md)) describe the product in our own terms.

**Current stack truth:**

- **Voice runtime and telephony** are integrated via a **third-party voice API** (assistant/workflow sync, web calls, phone numbers, call logs, metrics). The frontend compiles local workflow graphs to that provider’s format; the backend proxies org-scoped operations and hosts webhooks (e.g. Notion tools during calls).
- **Speech and language models** are configured per agent (e.g. English vs Uzbek paths)—not built from scratch by us.
- **What we own:** product UI, workflow model, compiler, org/auth, Notion tool handlers, BFF routes, dashboard, and orchestration glue.

When coding, **use the real integration points** (sync routes, webhooks, env vars like API keys)—do not rip out the voice layer to “replace with custom telephony” unless I explicitly request it. Diploma timeline does not allow rebuilding a telco stack.

If you add features, implement them **against the existing voice/workflow pipeline** unless I open a dedicated migration task.

---

## Presentation vs engineering

| Audience | Message |
|----------|---------|
| **Customers / jury / investors** | Scale Labs is our modular platform; learnings from industry voice-workflow products; see scale-labs-description.md. |
| **This repo / agents** | Prototype on integrated voice infrastructure; ship demos; be honest about gaps in appendix of description doc. |
| **Me** | I need to pass diploma and show millatumidi.uz-style pilot potential without pretending the product is GA. |

When in doubt, ask: **Does this help the owner demo and defend the project in the next few weeks?** If no, defer.

---

## Priority order when choosing work

1. **Broken demo path** (cannot sync workflow, cannot test call, canvas broken, logs empty).
2. **Diploma-visible quality** (Uzbek voice, template workflows, live canvas, one integration story).
3. **Correctness and security** for org scoping, tokens, webhooks.
4. **UX polish** on workflow/agents/dashboard.
5. **New integrations** only when demo script needs them.
6. **Roadmap items** (billing, squads, HubSpot UI, monitoring pages)—placeholders until I say otherwise.

---

## How I think about “modular”

- **Not modular:** separate repos per industry, copy-paste IVR scripts, hard-coded “if bank then …” in React components.
- **Modular:** node types + conditions + tools + templates; compile to runtime payload; same studio for CSAT and fraud call.

New use cases should add **template JSON**, **tool definitions**, or **compiler rules**—not a fork of the app.

---

## Communication and uncertainty

- I may not know every capability Scale Labs “should” have long term—that is OK. The platform should **discover use cases over time**.
- I prefer **realistic** language in docs and UI (“prototype”, “coming soon”) over fake completeness.
- If a task would make the public story lie (e.g. “fully self-hosted voice stack” while we use an API), **flag it** and propose honest wording or a scoped technical task.

---

## Related files

| File | Purpose |
|------|---------|
| [scale-labs-description.md](scale-labs-description.md) | Full product description for presentations and agents learning the *what* |
| [BILLING-MODEL.md](BILLING-MODEL.md) | Subscription tiers, limits, add-ons, metering (customer-facing model) |
| Demo presentation login | Email `demo@acme.inc` / password `AcmeDemo2026!` — org **Acme Inc**, Scale plan, rich mock data |
| [pitch-decription.md](pitch-decription.md) | Pitch deck / hackathon narrative |
| [backend/docs/TENANCY_AND_VAPI.md](backend/docs/TENANCY_AND_VAPI.md) | Tenancy and voice API integration (technical) |
| [frontend/AGENTS.md](frontend/AGENTS.md) | Next.js-specific agent rules |

---

## One paragraph summary for agents

**Build fast, stay modular, protect the demo.** Scale Labs is my diploma-grade prototype and a possible future business: a workflow-first voice agent studio for repetitive customer calls, aimed first at Uzbekistan-style markets. I am time-constrained; favor focused PRs, existing Vapi-backed voice pipeline, and honest prototype boundaries. Extend the product through workflows, tools, and templates—not through per-customer forks or marketing fiction.

When you finish a task, leave the repo closer to: *open workflow → test call → see active node on canvas → read transcript in logs*—that is the story I need to tell.
