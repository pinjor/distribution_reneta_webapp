# RENATA DMS — Corporate Blue Theme Migration Guide

**Official brand color:** `#0C4DA1`  
**Selected palette:** Corporate Blue (supersedes Navy & Teal / Option A)  
**Current migration status:** Dashboard, Distribution Cockpit, Stock Receipt  
**Theme toggle / preference:** Unchanged (`ThemeContext` + `localStorage.theme`)

Navy & Teal (`#183153` / `#168A83`) is **superseded** and must not be used on newly migrated pages.

---

## Official Light Mode Palette

| Token | Hex |
|---|---|
| Primary Brand | `#0C4DA1` |
| Primary Hover | `#093D82` |
| Secondary Blue | `#2874C7` |
| Page Background | `#F5F7FB` |
| Card Surface | `#FFFFFF` |
| Primary Text | `#1E293B` |
| Secondary Text | `#64748B` |
| Border | `#E2E8F0` |
| Soft Blue Background | `#EAF2FC` |
| Muted Surface | `#F1F5F9` |

## Official Dark Mode Palette

| Token | Hex |
|---|---|
| Page Background | `#0B1220` |
| Card Surface | `#151F30` |
| Elevated Surface | `#1B2A40` |
| Interactive Primary | `#70ADFF` |
| Interactive Hover | `#9AC6FF` |
| Secondary Blue | `#4594E8` |
| Primary Text | `#F1F5F9` |
| Secondary Text | `#A9B8CC` |
| Border | `#2C3B50` |
| Soft Blue Background | `#1B304D` |

---

## Semantic Theme Tokens

Defined in `src/styles/navy-teal-theme.css` as `--nt-*` variables (light on `:root`, dark under `.dark`):

| Semantic role | CSS variable |
|---|---|
| App background | `--nt-bg` |
| Card / surface | `--nt-surface` |
| Elevated surface | `--nt-elevated` |
| Primary brand / interactive | `--nt-primary` / `--nt-primary-hover` |
| Secondary blue | `--nt-accent` / `--nt-accent-hover` |
| Soft blue fill | `--nt-soft` |
| Text | `--nt-text` |
| Muted text | `--nt-text-secondary` |
| Borders | `--nt-border` |
| Muted fill | `--nt-muted` |
| Focus | `--nt-focus` |
| Disabled | `--nt-disabled` |
| Success / Warning / Danger / Info | `--nt-success*`, `--nt-warning*`, `--nt-danger*`, `--nt-info*` |

Legacy cyan brand tokens (`--brand-from`, `--brand-to`, …) remain the **global default** for unmigrated pages.

Tailwind utilities:

- `brand-*` — legacy cyan globally; remapped to Corporate Blue **inside** `.theme-scope-navy-teal`
- `nt-*` — always resolve to `--nt-*` (safe for migrated pages / new work)

The isolation class remains `.theme-scope-navy-teal` so existing `ThemeScope` wrappers keep working.

---

## Architecture

1. **Existing theme system reused**
   - `ThemeProvider` / `useTheme` (`src/contexts/ThemeContext.tsx`)
   - `document.documentElement` class `light` | `dark`
   - Preference persisted in `localStorage.theme` (`light` | `dark`)
   - Header theme toggle unchanged
   - No system-preference auto-switch was present; none added

2. **Foundation**
   - `src/styles/navy-teal-theme.css` — `--nt-*` Corporate Blue tokens + `.theme-scope-navy-teal` remapping
   - Imported from `src/main.tsx` before `index.css`
   - Tailwind `brand.*` / `nt.*` colors resolve via CSS variables with `color-mix` opacity support

3. **Isolation strategy**
   - Migrated pages wrap content in `<ThemeScope>` (`src/components/theme/ThemeScope.tsx`)
   - Scope remaps `--brand-*` and local shadcn surface tokens **only inside the wrapper**
   - Sidebar + header stay outside the scope → keep legacy chrome
   - Unmigrated pages do not use `ThemeScope` → unchanged appearance

```
MainLayout
├── AppSidebar          ← legacy theme (not scoped)
├── AppHeader           ← legacy theme (not scoped)
└── page content
    └── ThemeScope      ← Corporate Blue (Dashboard, Distribution Cockpit)
        └── page UI
```

---

## Dashboard Migration Details

Applied Corporate Blue (light + dark) to:

- Dashboard page background (`#F5F7FB` / `#0B1220`)
- KPI cards (white / layered dark surfaces, blue icon accents)
- Order Management Status section + status cards
- Quick Actions **grid** (layout unchanged; colors only)
- Expiry Alerts **compact list** (layout unchanged; colors only; severity rose/amber/slate preserved)
- Stock / pipeline charts (Corporate Blue series)
- Borders, icons, text, hover/focus via remapped brand tokens

**Preserved layouts (not redesigned):**

- Navbar dynamic page title
- No welcome gradient banner
- KPI / Order Status / Quick Actions grid / compact Expiry Alerts list
- Spacing, typography, breakpoints, handlers, APIs, KPI calculations

---

## Distribution Cockpit Migration Details

Applied Corporate Blue + Dashboard Quick Actions card grid:

- Removed oversized `PageHeader` gradient banner (title remains in navbar)
- Replaced accordion `ExpandCards` with `QuickActionsGrid` per module group
- Groups still come from `getCockpitSections()` (same labels, order, icons, paths, descriptions)
- Section headings show live module counts from visible items
- Content-driven height; no accordion min-height

**Not changed:** routes, handlers, sidebar, permissions, `SIDEBAR_MENU` structure.

---

## Stock Receipt Migration Details

- Removed oversized `PageHeader` banner (navbar title/subtitle remain)
- Form + Recent Receipts in compact Corporate Blue cards
- EBS verification panel restyled only; verify handler, toasts, and disabled states unchanged
- Field ids, required flags, batch numeric validation, storage/depot option values, submit/cancel unchanged

---

## How to Migrate the Next Page

After Dashboard approval:

1. Import `ThemeScope` from `@/components/theme/ThemeScope`.
2. Wrap the page root content:

```tsx
return (
  <ThemeScope className="-mx-6 -my-6 min-h-full px-6 py-6">
    {/* existing page JSX — no layout/logic changes */}
  </ThemeScope>
);
```

3. Prefer existing `brand-*` utilities (auto-remapped inside the scope) or `nt-*` / `--nt-*` for new accents.
4. Do **not** wrap `MainLayout`, sidebar, or header.
5. Verify Light + Dark modes and that sibling routes still show the legacy cyan theme.
6. Update this guide’s migration status line.

Helper utilities live in `src/lib/navyTealTheme.ts`.

---

## Files Changed (Corporate Blue Dashboard phase)

| File | Change |
|---|---|
| `src/styles/navy-teal-theme.css` | `--nt-*` tokens → Corporate Blue; brand remapping; glow RGB |
| `src/lib/navyTealTheme.ts` | Comments updated (scope class retained) |
| `src/components/theme/ThemeScope.tsx` | Comments updated |
| `src/components/dashboard/StockChart.tsx` | Chart series → Corporate Blue |
| `src/components/dashboard/DispatchChart.tsx` | Chart series → Corporate Blue |
| `tailwind.config.ts` | `nt.soft` token |
| `THEME_MIGRATION_GUIDE.md` | This document |

Dashboard layout files (`Dashboard.tsx`, Quick Actions, Expiry Alerts, KPI cards) were not structurally changed.

---

## Testing Results

| Check | Result |
|---|---|
| `npx vite build` | Pass (run after this change) |
| Dashboard Light Mode | Corporate Blue `#0C4DA1` accents, white cards, `#F5F7FB` background |
| Dashboard Dark Mode | Layered navy surfaces + `#70ADFF` interactive accents |
| Theme toggle Light ↔ Dark | Preserved (`ThemeContext`) |
| Preference persistence | `localStorage.theme` unchanged |
| Sidebar / header | Outside scope — not recolored |
| Other routes | Legacy cyan brand (no ThemeScope) |
| KPI / order status / Quick Actions / Expiry Alerts | Presentation colors only — logic unchanged |

Run locally:

```bash
# inside frontend container or local Vite
npx vite build
```
