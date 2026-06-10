# CLAUDE.md — Youth Allocation Platform

Guidance for Claude Code when working in this package.

> **Canonical demo location:** the maintained, deployed offline demo is
> `Camp Platform/demo-site/allocation-platform.html` (served at
> https://yc-camp-demo.vercel.app/allocation-platform.html, alongside
> `allocation-exec.html` and `allocation-training.html`). The `demo-site/` copy in
> **this** folder is the original snapshot. The "Demo-site UI patterns" below track
> the deployed version.

## What this is

A **youth ministry platform for YS Brisbane** — phone-first SPA backed by a TypeScript/Express API. Allocation is a core feature within a broader ministry insight and management tool. Backend-agnostic architecture identical in structure to the Youth Camp Platform.

## Commands

```bash
npm install
npm run dev          # backend + frontend on http://localhost:4300 (tsx watch)
npm run start        # same, no watch
npm run typecheck    # tsc --noEmit (strict)
npm run test         # vitest
```

Default port: **4300**. Set `PORT=xxxx` to override.

## Architecture

```
api (Express) → controllers → services → repositories (interfaces) → core
```

- **`src/core/`** — pure types, entities, enums, Zod schemas, errors. No imports from other layers.
- **`src/repositories/`** — interfaces (DB-swap surface) + in-memory implementations + JSON file persistence.
- **`src/services/`** — all business logic + RBAC. Depend on repo *interfaces* only.
- **`src/api/`** — thin controllers → declarative route table (`http/router.ts`) → Express adapter.
- **`src/container.ts`** — composition root. The ONLY file that names concrete repositories.

## Role hierarchy

| Role | Scope | Key capabilities |
|------|-------|-----------------|
| `grade` | Own grade + **own gender** | List own grade/gender students; manage leaders for their cohort; allocate same-gender students from any grade. Each grade has separate female/male logins (e.g. `grade9f` / `grade9m`). |
| `quad` | Own quad (e.g. Girls Yr 7–9) | Full allocation **within their gender + bracket**: add leaders, allocate/de-allocate, edit/remove (new leaders auto-set to the quad's gender; year focus limited to the bracket). Sees only same-gender leaders/students. |
| `director` | Ministry-wide | All of above + import CSV data |
| `admin` | All + back office | Everything + settings, accounts, year-rollover |

There is always exactly one `admin` account. It cannot be deleted.

### Grade login gender scoping

Grade accounts carry a `gender` field. `scopeS` and `scopeL` filter by it so each login sees only their cohort (e.g. Grade 9 Girls login sees only female Grade 9 students and female-scoped leaders). The cross-grade search in the allocation picker still operates across all same-gender students ministry-wide.

## Quads

Four quads group students by age bracket + gender:
- `g79` — Girls Year 7–9
- `b79` — Boys Year 7–9
- `g1012` — Girls Year 10–12
- `b1012` — Boys Year 10–12

Quad is computed automatically from `grade + gender` via `computeQuad()` in enums.

## Cross-grade allocation rule

Grade logins can search for and allocate students from OTHER grades as long as the student shares the same gender as the leader. This supports the use case where a leader works across grades.

## Key design rules

- **RBAC in one file**: `src/services/access-control.ts`. Never scatter role checks.
- **Validation inside services**: all external input parsed with Zod inside the service.
- **Repos return deep clones**: base repository clones on every read/write.
- **Extensionless imports**: ESM, `moduleResolution: "Bundler"`, no `.js` extensions.
- **Strict TypeScript**: `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`.

## Frontend files

| File | Purpose |
|------|---------|
| `public/index.html` | Implementation-ready SPA — calls the Express backend via relative API paths |
| `demo-site/allocation-platform.html` | Standalone offline demo — all API calls handled by embedded MockAPI |

## Seed demo accounts (password: `demo1234`)

| Email | Role | Scope |
|-------|------|-------|
| `admin@youth.ministry` | admin | All |
| `director@youth.ministry` | director | All |
| `g79@youth.ministry` | quad | Girls Yr 7–9 |
| `b79@youth.ministry` | quad | Boys Yr 7–9 |
| `g1012@youth.ministry` | quad | Girls Yr 10–12 |
| `b1012@youth.ministry` | quad | Boys Yr 10–12 |
| `grade7f@youth.ministry` | grade | Grade 7 Girls |
| `grade7m@youth.ministry` | grade | Grade 7 Boys |
| `grade8f@youth.ministry` | grade | Grade 8 Girls |
| `grade8m@youth.ministry` | grade | Grade 8 Boys |
| `grade9f@youth.ministry` | grade | Grade 9 Girls |
| `grade9m@youth.ministry` | grade | Grade 9 Boys |
| `grade10f@youth.ministry` | grade | Grade 10 Girls |
| `grade10m@youth.ministry` | grade | Grade 10 Boys |
| `grade11f@youth.ministry` | grade | Grade 11 Girls |
| `grade11m@youth.ministry` | grade | Grade 11 Boys |
| `grade12f@youth.ministry` | grade | Grade 12 Girls |
| `grade12m@youth.ministry` | grade | Grade 12 Boys |

Quick login buttons in the demo: admin, director, g79, b79, grade7f, grade7m, grade10f, grade10m

## Demo-site UI patterns

The demo (`demo-site/allocation-platform.html`) is a standalone single-file app. Key conventions:

- **App name**: "YS Brisbane" (not "Youth Allocation")
- **Bottom nav** (4 tabs, role-specific):
  - Grade: Home | My Students | Trends | At Risk
  - Quad: Home | Leaders & Alloc | Trends | At Risk
  - Director: Home | Leaders & Alloc | Trends | At Risk
  - Admin: Home | Leaders & Alloc | Trends | At Risk
- **Quick Actions** on Home = `navItems().slice(4)` — items that overflow the bottom 4. Appear as tiles **above** the quad/grade overview cards.
  - Grade: Leaders & Alloc | Student Search
  - Quad: Student Search | My Students
  - Director: Student Search | My Students | Import
  - Admin: Student Search | My Students | Import | Admin
- **Leaders & Allocation** (`leaders` route) is a merged page for all roles — leader cards with capacity gauges, student picker, add/edit/remove. Grade filter chips for quad (bracket only); grade + gender filter chips for director/admin. `renderAllocate()`, `renderMyQuad()`, `renderQuadView()` all redirect to `go('leaders')`. **Quads now have the same add/edit/allocate powers** (scoped to their gender + bracket via `scopeL`/`scopeS`); the old view-only banner is gone. The editable-roles flag `ce` includes `quad`. Helpers `quadGender(q)` / `quadGrades(q)` derive the quad's gender and year bracket.
- **Home hero card** shows a compact 2-row table (Youth row + Groups row, Unique + Avg/wk columns) for this term, plus previous-term in matching format. (The old collapsible "Grade detail" dropdown was removed.) Row label format: `Youth (N)` and `Groups (N)` where N is sessions/weeks run.
- **Grade logins**: home shows allocation summary as a compact 4-column single-row strip (Total / Alloc / Pending / At Risk). No "By Quad" cards.
- **Director/Admin home**: "Attendance by Quad" tiles (Youth + Groups, Unique + Avg) — each tile is **tappable to expand inline** into per-grade rows (`_homeQuadOpen` + `toggleHomeQuad`). **Quad home** gets an equivalent "Attendance by Grade" tile per year in its bracket. Shared helpers: `attTile()`, `svcSessFor()`, `homeGradeMini()`.
- **Student detail modal** (`showSD`): besides contact + attendance, the **Leader Assignments** section lists current leaders (deduped) with inline Remove, plus a **"Search a leader to assign"** box (`sdLeaderSearch` / `sdEligibleLeaders` / `assignSD` / `unassignSD`) that lists eligible leaders (actor scope ∩ student gender + grade) and assigns in place, re-rendering both the modal and the page behind.
- **My Students** (`renderLeaderView`): condensed rows (name + yr/gender/bday inline; student + parent number on one line); birthday via `fmtBday` → `DD-MM-YYYY`; two dot rows — green Fridays (`s.hist`) and **teal lifegroups** (synthesised by `glHist(s)`, not stored); Year/Gender filter buttons (`_lvF`) that narrow the leader dropdown (quad: years in bracket; director/admin: years + gender).
- **Add-Students picker** (`openPicker`): sticky header with an always-visible ✕ close; assigned rows have a `−` de-allocate (`remPick`); add/remove call `pickerSyncBg()` (`render()`) so the Leaders page behind stays current. Inserts go through `addAllocation()` (no duplicates).
- **At Risk**: declining students (50–75%) now carry seeded previous-term data, so the small "Prev term" line + trend arrow show for them too (not just at-risk/stopped).
- **Trends page — three-number stat card** (`statCard` helper):
  - Every Fridays chart is followed by a 3-column stat card: **Unique attenders · Avg students/session · Avg sessions/student**, each with a `prev: N` comparison line.
  - Every Lifegroups section uses the same 3-column card plus a `grpBar` breadth bar (unique/enrolled ratio with fill colour).
  - `statCard(nums, labels, prevs)` — variable column count (2 or 3), auto-adjusts font size.
  - `grpBar(uniq, enrolled)` — renders the breadth bar.
  - `avgAtt(sessions)` — computes avg headcount from session array.
  - `twoNum(n1,l1,n2,l2,prevLine)` — thin wrapper around `statCard` for 2-column use.
- **Trends Fridays drill-down**:
  - Grade: ministry overview chart + grade-specific chart with 3-number card.
  - Quad: ministry overview + quad chart with 3-number card + per-grade inline rows.
  - Director/Admin: collapsible quad cards (show inline Unique/Avg when collapsed) → expand for chart + 3-number card → collapsible grade rows → expand for grade chart + 3-number card. `_trQuadOpen` (quad key) and `_trGradeOpen` (grade number) control expand state.
- **Trends Lifegroups drill-down**:
  - `lifegroupStats(scope)` returns per-lifegroup stats including `weeksRun`, `avgPerSess` (avg students/session), `avg` (avg sessions/student).
  - Grade: shows individual lifegroup cards directly (no expand needed).
  - Quad: overview card + per-grade cards that expand to individual groups.
  - Director/Admin: same as quad but all 6 grades.
  - `_trGradeOpen` (null or grade number) controls which grade is expanded.
- **Trends scroll preservation**: `renderTrends` saves `.pg.scrollTop` before `setApp()` and restores it via `requestAnimationFrame` after render, so expand/collapse dropdowns don't jump to the top.
- **Lifegroup stats** count only enrolled students (`gT > 0`) — not the full cohort.
- **Demo localStorage persistence**: the demo persists `allocations`, `leaders`, `settings`, `importHistory`, `auditLog`, and `_c` (ID counter) to `localStorage` under the key `yap_demo_v2` so changes survive page refresh. Key functions: `persist()` (call after every mutation), `restorePersistedData()` (called at startup — returns `true` if data was restored, skipping the allocation seed), `clearPersistedData()` (called by Full Reset). Students are always re-seeded deterministically from code on each load — only user-driven changes to allocations and leaders need persistence. On startup `boot()` runs **`dedupeAllocations()`** to strip any duplicate `(sid,lid)` rows from older saved state, and every allocation insert goes through **`addAllocation(sid,lid,role)`** which refuses duplicates — together these prevent a leader being listed multiple times for one student.
- **Phone mode**: header extends up behind Dynamic Island (`padding-top: 50px`); `.pg` has `overflow-x:hidden`; `.alc` cards have `overflow:hidden` to prevent allocate view overflow.
- **CSS-only charts**: `.cchart`/`.ccol`/`.ccol-bar` column; `.pb`/`.pf` progress bar. No external libraries.
- **Icon registry** (`IC` object): all icons are inline SVG strings. `team` icon = 3-person group (used for My Students nav item).

## Environment variables

```
PORT=4300
NODE_ENV=production
PERSISTENCE=json          # optional: saves to DATA_DIR/*.json
DATA_DIR=./data
CORS_ORIGINS=*
```
