> Goal: Keep this codebase **scure, clean, readable, maintainable, and suitable for multi-language support**.

## 1) Primary Priorities

1. **Before any new EAS build:** When adding or changing native dependencies (e.g. date picker, notifications, native modules), update `frontend/app.json` plugins (and any required config) first; then take the build. Never take a new build without this, or you risk "Unimplemented component" and wasted builds.
2. **Security first** (no leaks, no weak auth assumptions)
3. **Clarity / understandability**
4. **Maintainability / consistency**
5. **Reuse before new code**
6. **After each update, concise explanation on what have been done, what was the problem, and do we need new expo build?**
7. **I am developing on windows and using EAS, I take builds on cloud and use them on my iPhone. Consider this scenario always.**
8. **Product-level quality is key on any code and component**

## 2) Before Writing Any Code (mandatory)

- **Search the codebase first** for existing components/functions/hooks/types/services that already solve it (or are close).
- Identify the **correct layer** (UI, business logic, data access, validation, shared utility).
- Match existing **naming and patterns** in nearby code.
- Prefer **extending/reusing** over creating a duplicate.

## 3) Clean Code Rules (non-obvious but critical)

- Keep functions/components **small and single-purpose**.
- Use **blank lines** between logical blocks.
- Add **short comments at the top of logical blocks** (not noisy line-by-line comments)
- Prefer **explicit code** over clever shortcuts.
- Do not introduce multiple names for the same concept.
- Do not hardcode user-facing UI text directly in components if it should be translatable.

## 4) Reuse & Duplication Rules

- Do not create a second version of existing logic/UI unless truly different.
- If something repeats and will likely repeat again, extract a reusable unit.
- Shared UI must stay generic (no feature/business logic inside).
- Reuse is good; over-abstraction is not. Keep contracts simple.

## 5) Security Constitution (non-negotiable)

- **Never expose secrets** in client code, public env vars, logs, errors, or comments.
- **Never log sensitive data** (tokens, passwords, auth headers, OTPs, keys, personal payloads).
- Treat **all external input as untrusted** → validate/normalize at boundaries.
- Enforce **authorization near sensitive data access**, not only in UI/route layer.
- **Fail closed** on auth/security uncertainty.
- Do not leak internal errors/stack traces to client

## 6) Architecture & Placement Rules

- Do not mix too much in one file/component:
  - UI rendering
  - business logic
  - data fetching
  - data transformation
  - authorization
- NEVER USE EMOJIS
- Keep code where it logically belongs.
- API/network calls must be centralized under a main API/services folder (not scattered across UI files). Organize that folder clearly by domain/resource (auth, profile, payments, etc.) and keep UI/components free of direct fetch/axios calls.
- User-facing text should go through a localization/i18n layer (keys/resources), not be scattered as hardcoded strings across UI files.

## 7) Folder Organization (general principle, not strict structure)

Organize folders **by responsibility + feature/domain**, not by randomness.

Use this decision rule:

- **Feature/domain folders** for UI, hooks, business logic, validation, and types tied to one app area (auth, profile, payments, etc.)
- **Shared folders** only for truly reusable code used across multiple features
- **Main API/services folder** for all network calls, organized by domain/resource (auth, profile, payments, etc.)
- **Low-level utility/lib folders** for generic helpers/adapters
- **Config folders** only for configuration (and never secrets in client config)
- **Assets folder** for static files/animations/images
- **i18n/localization folder** for translation resources, locale config, and localization helpers

### Good folder grouping criteria

Group code based on:

- **What problem/domain it belongs to** (feature)
- **What role it plays** (UI / business logic / API/network / validation / types / localization)
- **How reusable it is** (feature-specific vs shared)

### Avoid

- giant `utils/` dump
- giant `components/` dump with mixed domains

## 8) Change Safety Rules

- Do not silently break existing behavior/contracts/types.
- Do not add broad temporary hacks without marking them.
- If you add a temporary workaround, mark it clearly with `TODO` + reason.

## 9) Error / Fallback Rules

- Do not hide failures with silent fallbacks unless intentional and documented.
- Security/auth code must not “fail open.”
- Use safe errors for users; keep sensitive diagnostics internal.

## 10) Internationalization / Multi-language Rules

- Assume the app supports multiple languages.
- Keep user-facing strings translatable (use i18n keys/resources instead of hardcoded text in UI).
- Prefer stable translation keys and consistent naming.
- Do not build logic based on translated display text.
- Format dates, numbers, and currencies in a locale-aware way when relevant.

##11) Theme / Styling Rules (Dark-Light)

- App supports **light and dark theme**, check frontend/theme directory.
- Do not hardcode UI colors, always use colors within frontend/theme/colors.ts. If a component's color is not defined in there, add it there first and use it.
