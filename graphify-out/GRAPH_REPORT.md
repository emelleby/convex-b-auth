# Graph Report - .  (2026-05-05)

## Corpus Check
- 179 files · ~95,053 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 375 nodes · 398 edges · 92 communities (75 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 30 edges
2. `getLocale()` - 16 edges
3. `Input()` - 12 edges
4. `toLocale()` - 12 edges
5. `localizeUrl()` - 12 edges
6. `DropdownMenuTrigger()` - 9 edges
7. `resolveLocaleWithStrategies()` - 9 edges
8. `DialogDescription()` - 8 edges
9. `getStrategyForUrl()` - 8 edges
10. `shouldRedirect()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `fetch()` --calls--> `paraglideMiddleware()`  [INFERRED]
  src/server.ts → src/paraglide/server.js
- `NavProjects()` --calls--> `useSidebar()`  [INFERRED]
  src/components/nav-projects.tsx → src/components/ui/sidebar.tsx
- `handleChange()` --calls--> `number()`  [INFERRED]
  src/components/form-fields/NumberField.tsx → src/paraglide/registry.js

## Communities (92 total, 17 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.0
Nodes (35): aggregateGroups(), assertIsLocale(), defaultUrlPatternExtractLocale(), defineCustomClientStrategy(), defineCustomServerStrategy(), deLocalizeHref(), deLocalizeUrl(), deLocalizeUrlDefaultPattern() (+27 more)

### Community 2 - "Community 2"
Cohesion: 0.0
Nodes (6): AppSidebar(), NavProjects(), NavSecondary(), useIsMobile(), DropdownMenuTrigger(), useSidebar()

### Community 3 - "Community 3"
Cohesion: 0.0
Nodes (5): focusFirstError(), handleClose(), handleOpenChange(), DialogDescription(), Skeleton()

### Community 4 - "Community 4"
Cohesion: 0.0
Nodes (4): handleChange(), number(), plural(), Input()

### Community 6 - "Community 6"
Cohesion: 0.0
Nodes (5): Better Auth, createAuth(), createAuthOptions(), requireAuth(), Organization Plugin

### Community 10 - "Community 10"
Cohesion: 0.0
Nodes (4): NotFound(), getRouter(), getContext(), TanStackQueryProvider()

### Community 13 - "Community 13"
Cohesion: 0.0
Nodes (4): cloneRequestWithFallback(), createMockAsyncLocalStorage(), paraglideMiddleware(), fetch()

### Community 14 - "Community 14"
Cohesion: 0.0
Nodes (6): authComponent (Better Auth Instance), Auth Portal, Auth Helpers, Better Auth Adapter API, Better Auth Component Backend, Better Auth Component Schema

### Community 15 - "Community 15"
Cohesion: 0.0
Nodes (4): Convex Better Auth Application, ParaglideJS, TanStack Router, TanStack Start

### Community 22 - "Community 22"
Cohesion: 0.0
Nodes (3): App Sidebar, Team/Org Switcher, Authenticated Layout Route

## Knowledge Gaps
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.