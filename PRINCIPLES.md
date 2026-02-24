> Goal: Keep this codebase **scure, clean, readable, and maintainable**.

## 1) Primary Priorities

1. **Security first** (no leaks, no weak auth assumptions)
2. **Clarity / understandability**
3. **Maintainability / consistency**
4. **Reuse before new code**

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
- Keep code where it logically belongs.
- API/network calls must be centralized under a main API/services folder (not scattered across UI files). Organize that folder clearly by domain/resource (auth, profile, payments, etc.) and keep UI/components free of direct fetch/axios calls.

## 7) Folder Organization (general principle, not strict structure)

Organize folders **by responsibility + feature/domain**, not by randomness.

Use this decision rule:

- **Feature/domain folders** for UI, hooks, business logic, validation, and types tied to one app area (auth, profile, payments, etc.)
- **Shared folders** only for truly reusable code used across multiple features
- **Main API/services folder** for all network calls, organized by domain/resource (auth, profile, payments, etc.)
- **Low-level utility/lib folders** for generic helpers/adapters
- **Config folders** only for configuration (and never secrets in client config)
- **Assets folder** for static files/animations/images

### Good folder grouping criteria

Group code based on:

- **What problem/domain it belongs to** (feature)
- **What role it plays** (UI / business logic / API/network / validation / types)
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
