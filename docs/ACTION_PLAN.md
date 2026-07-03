# microfeed → personal-website CMS — Action Plan

Your reference for driving the rebuild. Implementation agent = Sonnet (200K). Companion file: [AGENT_PROMPTS.md](./AGENT_PROMPTS.md).

GitHub Issues (fork `kiran-brahma/microfeed`): master PRD #1; phase epics #2–#8.

---

## What we're building

Turn the single-purpose podcast CMS into a personal-website CMS via a **code-declared Content Type registry**.

- **Record types:** `podcast_episode` (media + iTunes + RSS), `blog_article` (richtext + tags + RSS), `photo` (image + caption + tags).
- **Aggregator types:** `gallery` (explicit ordered curation of photos), `landing_page` (dynamic filter by type + tags).
- **Clean slate** — no back-compat, DB empty. Relational tags/relations. Strict validation. Soft-delete + hard-purge. Bulk ops. Modern schema-driven admin (headlessui v2 + TipTap). Fixed modern per-type web templates (Mustache theming removed). CI test gate.

Full decisions live in issue #1. Don't re-decide — it's settled.

---

## How each task runs (the loop)

1. Open the task's prompt in [AGENT_PROMPTS.md](./AGENT_PROMPTS.md). Paste into a fresh Sonnet session.
2. Agent reads master PRD #1 + the epic, does **one task only**, **tests-first** (red → green).
3. Agent stops when code-complete and `yarn test` is green.
4. **Outsource review** — paste the Reviewer prompt (bottom of AGENT_PROMPTS.md) into a sub-agent. Full checklist: tests+coverage, spec conformance, no scope creep/regressions, standards + SQL-injection safety.
5. Fix any CONFIRMED/PLAUSIBLE findings. Re-run tests.
6. Commit, tick the box below, move to the next task.

**One task = one session.** Never bundle tasks. Respect dependencies.

---

## Execution order & progress

Do top-to-bottom. Deps in parens must be merged first.

### Phase 0 — Foundations & test harness (#2)
- [ ] 0.1 Schema migration (items +content_type/+slug; tags, item_tags, item_relations)
- [ ] 0.2 better-sqlite3 D1-substitute test harness (0.1)
- [ ] 0.3 CI test gate before deploy (0.2)

### Phase 1 — Data layer split (#3)  · needs Phase 0
- [ ] 1.1 QueryBuilder — pure, parameterized, injection-safe
- [ ] 1.2 Paginator — pure cursor logic (1.1)
- [ ] 1.3 Repositories: Item/Channel/Settings (1.1, 1.2)
- [ ] 1.4 Retire FeedDb SQL internals (1.3)

### Phase 2 — Content Type registry (#4)  · needs Phase 1
- [ ] 2.1 Field-kind primitives (validate/map, pure)
- [ ] 2.2 ContentTypeRegistry — declare 5 types (2.1)
- [ ] 2.3 Data-driven item mapper + validator (2.1, 2.2)

### Phase 3 — CRUD seam (#5)  · needs Phases 1–2
- [ ] 3.1 ContentService create/update + strict validation
- [ ] 3.2 Soft delete + restore (3.1)
- [ ] 3.3 Hard purge + R2 media cleanup (3.2; links need Phase 4)
- [ ] 3.4 Bulk operations (3.1; bulkTag needs Phase 4)
- [ ] 3.5 Type-aware API handlers (3.1–3.4)

### Phase 4 — Taxonomy & relations (#6)  · needs Phases 1,3
- [ ] 4.1 TagRepo + tag CRUD
- [ ] 4.2 Item↔tag linking + tags field kind wiring (4.1)
- [ ] 4.3 Ordered gallery membership + reference field kind (4.2)
- [ ] 4.4 Aggregation resolver (gallery + landing) (4.2, 4.3)

### Phase 5 — Admin UI (#7)  · needs Phases 2–4 (5.1a–c can start early)
- [ ] 5.1a Upgrade @headlessui/react → v2
- [ ] 5.1b Replace react-quill → TipTap
- [ ] 5.1c Restyle shared admin components (5.1a)
- [ ] 5.2 Schema-driven FormRenderer (core + simple widgets) (Phase 2, 5.1)
- [ ] 5.3a Media/image upload widget (5.2)
- [ ] 5.3b Type picker + new/edit flow (5.2, 5.3a, Phase 3)
- [ ] 5.3c Item list + filtering (Phases 3,4)
- [ ] 5.3d Bulk actions in list (5.3c, 3.4)
- [ ] 5.4a Tag manager screen (4.1)
- [ ] 5.4b Tags widget — multiselect + inline add (5.2, Phase 4)
- [ ] 5.5a Gallery curator (5.2, 4.3)
- [ ] 5.5b Landing filter builder (5.2, 4.4)

### Phase 6 — Public web + feeds (#8)  · needs Phases 2–4
- [ ] 6.1 Registry-driven JSON feed builder
- [ ] 6.2 RSS: podcast (iTunes) + blog (6.1)
- [ ] 6.3a Type-prefixed routing + record-type templates (6.1)
- [ ] 6.3b Remove Mustache custom-code theming (6.3a)
- [ ] 6.4 Aggregator web rendering: gallery + landing (6.3a, Phase 4)
- [ ] 6.5 Registry-generated OpenAPI spec (Phases 2,3,4)

**37 tasks.** Phases 0→4 are the backbone (build in order). Phases 5 and 6 both sit on 2–4 and can run in parallel by two agents once Phase 4 is done.

---

## Definition of done (whole project)
Registry owns all types; add-a-type = one file. Complete CRUD (create/update/soft-delete/restore/purge/bulk) with strict validation. Tags + galleries + landing pages work. Every type has a modern public page + appears in JSON; podcast + blog have RSS. All SQL parameterized. Tests green, CI gates deploys.

## Guardrails
- Issues target the **fork** `kiran-brahma/microfeed`, not upstream `microfeed/microfeed`.
- Agent must **stop and ask** if anything is genuinely undecided — never assume.
- No task touches files outside its scope. Review enforces this.
