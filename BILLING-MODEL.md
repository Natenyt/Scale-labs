# Scale Labs — Billing model

Customer-facing packaging for Scale Labs: subscription tiers, limits, add-ons, and metering rules. This document is the source of truth for pricing UI and future Stripe/Django enforcement.

For product context see [scale-labs-description.md](scale-labs-description.md). For owner priorities see [PROJECT-OWNER-INTENT.md](PROJECT-OWNER-INTENT.md).

---

## Philosophy

1. **Sell outcomes, not components** — Customers buy **voice minutes**, phone lines, and production workflows. Invoices do not itemize speech recognition, language models, or telephony separately.
2. **Land with one workflow** — Lower tiers cap published workflows so teams start with one use case (reminders, CSAT, lead qual) and expand when value is proven.
3. **Protect margin** — Underlying all-in voice infrastructure cost is typically **~$0.25–0.35 per minute**. Retail rates below ~$0.18/min need a sufficient monthly platform fee or overage markup.
4. **Uzbekistan-ready** — List prices in **USD** on the product; offer **UZS invoicing** and local payment for pilots and Enterprise (e.g. first customers in Uzbekistan). UZS figures in this doc are indicative (~**12,500 UZS / USD**); update FX at sale time.
5. **Prototype honesty** — Limits and plans can be shown in the UI before payment enforcement ships; do not block demos on metering until backend enforcement exists.

---

## The Scale Labs minute

One **Scale Labs minute** = one minute of connected voice conversation (inbound or outbound), including speech, reasoning, synthesis, and telephony on standard routes. Tool calls and webhook actions during that minute are included. **Browser test calls** in the studio are free up to a daily cap (recommended **30 minutes / day / workspace**) so building and diploma demos do not consume production quota.

---

## Subscription plans

### Pilot (free trial — 14 days)

**Audience:** Evaluation, diploma pilots, first partner onboarding without a card.

| Dimension | Limit |
|-----------|--------|
| Price | **$0** (14-day trial) |
| Voice minutes | **150** total (hard cap for trial period) |
| Overage | Not available — upgrade required |
| Concurrent calls | **2** |
| Phone numbers | **1** |
| Agents | **2** |
| Published workflows | **1** |
| Data connections | **1** (e.g. one Notion database) |
| Workspace seats | **2** |
| Log retention | **7 days** |
| Support | Documentation |

---

### Operations

**Audience:** SMB running **one production use case** (payment reminders, CSAT, lead qualification).

| Dimension | Limit |
|-----------|--------|
| Price | **$149 / month** (~**1.9M UZS**) |
| Included minutes | **1,500 / month** |
| Overage | **$0.24 / min** |
| Concurrent calls | **10** |
| Phone numbers | **3** |
| Agents | **10** |
| Published workflows | **3** |
| Data connections | **3** |
| Workspace seats | **5** |
| Log retention | **30 days** |
| Support | Email (2 business days) |

**Positioning:** Roughly one call-center shift of outbound reminders or inbound FAQ for a mid-size team.

---

### Scale

**Audience:** Mid-market — multiple campaigns, bank/telco pilots, e-commerce with several flows.

| Dimension | Limit |
|-----------|--------|
| Price | **$599 / month** |
| Included minutes | **6,000 / month** |
| Overage | **$0.20 / min** |
| Concurrent calls | **30** |
| Phone numbers | **15** |
| Agents | Unlimited |
| Published workflows | Unlimited |
| Data connections | **10** |
| Workspace seats | **15** |
| Log retention | **90 days** |
| Support | Priority email + onboarding call |
| Extras | Full template library, exportable analytics |

---

### Enterprise

**Audience:** 24/7 operations, compliance-sensitive industries, high volume, Uzbek/Russian production at scale.

| Dimension | Typical deal |
|-----------|----------------|
| Price | **Annual contract** — platform fee + committed minutes |
| Effective rate | **$0.14–0.18 / min** at committed volume |
| Included minutes | **50,000–500,000+ / month** (quoted) |
| Concurrent calls | **Reserved** (e.g. 50–200+) |
| Phone numbers | Unlimited or pooled |
| Agents / workflows | Unlimited |
| Data connections | Custom CRM/API + optional on-prem webhook |
| Workspace seats | Unlimited; SSO when available |
| Log retention | **1 year+** (with compliance add-on) |
| Support | Named contact, SLA (e.g. 99.5%), incident channel |

**Sales motion:** Forecast from `calls_per_day × average_duration × active_days`, plus peak concurrency for reserved capacity.

---

## Add-on modules

Sold on top of **Operations** or **Scale**; often bundled into Enterprise.

| Module | Description | Price (indicative) |
|--------|-------------|-------------------|
| **Minute pack** | +1,000 prepaid minutes; valid 12 months | **$120** one-time |
| **Phone line pack** | +5 dedicated numbers | **$40 / month** |
| **Uzbek & Russian voice** | Premium localized STT/TTS + prompt QA for UZ/RU production | **$199 / month** |
| **Trust & compliance** | Extended retention, audit export, PII handling in logs, DPA — *only after features ship* | **$499 / month** |

---

## Unit economics (internal)

Use this when quoting Enterprise or judging whether a pilot is sustainable.

| Input | Typical range |
|-------|----------------|
| All-in provider cost per voice minute | $0.25–0.35 |
| Target gross margin on usage | 35–50% after infra |
| Operations plan at full 1,500 min | ~$0.10/min effective — margin from base fee + overage |
| Scale plan at full 6,000 min | ~$0.10/min effective — same pattern |
| Overage minutes | Primary margin lever when customers exceed bundle |

**Rules of thumb:**

- Do not sell unlimited minutes on self-serve tiers.
- Hard-cap **Pilot**; soft-cap paid tiers with overage or minute packs.
- Track **cost per org per month** from call logs (already normalized in the API) against invoiced revenue.

---

## Uzbekistan market

- **Problem fit:** 24/7 call centers and three-shift staffing are expensive in UZS; autonomous voice for repetitive calls maps directly to bank, telco, marketplace, and logistics buyers.
- **Pricing presentation:** Show USD in product; sales can quote **UZS** on contracts using spot FX.
- **Pilot path:** **Pilot** tier or Enterprise pilot for first logos (e.g. local commerce/media) without requiring international cards.
- **Language:** **Uzbek & Russian voice** add-on or Enterprise bundle — aligns with product roadmap, not a separate product SKU.

---

## Metering and enforcement (implementation)

### Billable

| Meter | Source |
|-------|--------|
| Voice minutes | Sum of connected call duration per organization per billing period from call logs |

### Limits (block or prompt upgrade)

| Limit | Notes |
|-------|--------|
| Concurrent active calls | Real-time session count |
| Phone numbers | Count assigned to org |
| Published workflows | Workflows with successful sync / live flag |
| Data connections | Integration records (Notion DB = 1 connection) |
| Workspace seats | Org membership count |

### Free / excluded

| Usage | Policy |
|-------|--------|
| Browser studio test | Free, cap e.g. 30 min/day/org |
| Tool invocations during a billed minute | Included in Scale Labs minute |

### Future backend fields (suggested)

```text
Organization.plan_id          → pilot | operations | scale | enterprise
Organization.billing_period_start
Organization.minutes_included
Organization.minutes_used
Organization.trial_ends_at    → Pilot only
Organization.stripe_customer_id
```

---

## Implementation checklist

- [ ] `BILLING-MODEL.md` (this file) — done
- [ ] Mock plans in `frontend/src/lib/mock/billing.ts` aligned with tiers
- [ ] Billing page pricing grid (UI only)
- [ ] Django `Plan` on `Organization` + usage aggregation job
- [ ] Enforce limits on: phone number create, workflow sync, integration create, outbound call start
- [ ] Stripe Checkout / Customer Portal
- [ ] Invoice PDF or Stripe-hosted invoices
- [ ] Admin view: provider cost vs revenue per org

---

## UI copy (customer-facing)

Under plan prices:

> **All-in voice minute** — speech, AI, and phone connection included. No surprise line items.

Enterprise CTA:

> **Talk to us** — Volume pricing, reserved capacity, Uzbek/Russian production, and custom CRM connectors.

---

## Related files

| File | Role |
|------|------|
| [frontend/src/lib/mock/billing.ts](frontend/src/lib/mock/billing.ts) | Plan definitions for dashboard and billing UI |
| [frontend/src/app/(app)/billing/page.tsx](frontend/src/app/(app)/billing/page.tsx) | Plans & usage page |
| [frontend/src/components/dashboard/plan-usage-card.tsx](frontend/src/components/dashboard/plan-usage-card.tsx) | Dashboard usage summary |

---

*Last updated to match the four-tier model: Pilot, Operations, Scale, Enterprise.*
