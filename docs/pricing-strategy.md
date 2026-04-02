# Sermonize Pricing Strategy

_Last updated: 2026-04-02_

## ICP

**Primary: Regular church-goers (B2C)**
People who attend church weekly, watch/listen to sermons on YouTube or podcasts, and want to engage more deeply with the content. Not pastors. Not seminary students. Not church staff.

- No professional ROI — purely discretionary spend
- Already habituated to free faith apps (YouVersion sets the baseline expectation)
- Willing to pay when a product becomes part of a weekly habit (see: Hallow, Glorify)
- Engagement pattern: Sunday sermon → mid-week revisit, small group prep, personal study

**Secondary (don't optimize for):**
- Seminary / theology students — academic use, price-sensitive
- Para-church content consumers — podcast listeners, online-only church members

---

## Competitive Landscape

### Faith tech (consumer)
| Product | Model | Price | Notes |
|---|---|---|---|
| YouVersion (Bible App) | Free | $0 | 500M+ downloads; sets "faith = free" expectation |
| Logos Bible Software | Freemium + paid tiers | $0–$500+ one-time | Desktop-first, deep study tools, engaged buyers pay a lot |
| Hallow (prayer/meditation) | Freemium | $7.99/mo or $59.99/yr | Strong annual conversion, faith-specific |
| Glorify (prayer/devotional) | Freemium | $6.99/mo or $49.99/yr | Similar to Hallow, slightly cheaper |

### AI sermon tools
| Product | Audience | Price | Notes |
|---|---|---|---|
| Pulpit AI | Pastors (sermon writing) | ~$30–50/mo | B2B/prosumer, wrong ICP for us |
| SermonGPT | Pastors | ~$20/mo | Sermon generation, not consumption |

### AI transcript/chat tools (pricing anchors)
| Product | Model | Price |
|---|---|---|
| Otter.ai | Freemium | $16.99/mo pro |
| Fireflies | Freemium | $18/mo pro |
| NotebookLM | Free (Google) | $0 |

**Key observation:** NotebookLM is free and does "chat with content" well. This is the mental model users will bring to Sermonize. The faith-specific layer + sermon-specific UX (timestamps, verses, discussion questions) is the justification for charging.

---

## Cost Structure

Per sermon (approx. 60 min):
- AssemblyAI transcription: ~$0.37
- OpenAI notes generation (structured output): ~$0.02
- OpenAI chat (per session, ~10 turns): ~$0.05–0.15

**A heavily-used free user could cost ~$1–2/month in API costs.** Free tier must be capped.

---

## Pricing Recommendation

### Model: Freemium with annual-push

**Free tier**
- 3 sermons/month
- Full notes (summary, highlights, verses, discussion questions, prayer)
- No chat

**Pro — $7.99/month or $59.99/year (~$5/mo)**
- Unlimited sermons
- Full chat on any sermon
- History + saved sermons
- Priority processing

**Push annual hard.** Hallow and Glorify both report higher LTV and lower churn on annual subscribers. At $59.99/yr vs. $7.99/mo ($95.88/yr), annual is a 37% discount — strong enough to convert.

### Rationale
- Hallow/Glorify validate ~$6–12/mo for engaged believers in a habit-forming faith app
- Free tier converts when the product becomes part of a weekly rhythm (Sunday → mid-week)
- Chat is the upsell hook: notes are useful, but conversation is sticky
- $59.99/yr is psychologically below $60 and close to Hallow's $59.99/yr anchor

---

## Key Differentiators vs. Logos

Logos is the closest premium consumer faith product but:
- Logos is a general Bible study library, not sermon-specific
- Logos requires users to import/find content; Sermonize ingests any YouTube sermon instantly
- Logos has no timestamped engagement or chat
- Logos desktop-first; Sermonize is web-first / mobile-ready

Sermonize's moat: **sermon-specific context** — timestamped quotes, verse extraction, discussion questions, and prayer tied to a specific sermon a user just watched.

---

## Open Questions

- When to introduce church/team plan (seat-based, higher ACV) — not a priority at v0.1
- Whether to offer a credit-based model for very casual users (e.g., $1.99 for 5 sermons) as a lower-friction entry point
- 5-day devotional plan per sermon as a Pro-only feature (not yet built)
