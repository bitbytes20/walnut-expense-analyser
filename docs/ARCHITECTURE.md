# Walnut Expense Analyser Architecture

## Current Architecture Direction

The product is a greenfield Windows desktop application with a modular local-first architecture. Phase 1 establishes the shell, persistence boundary, onboarding/session model, and security services so later phases can add import, review, categories, dashboard analytics, audit, and settings without reworking the app foundation.

## Architectural Principles

- Local-first by default
- Offline-first for core workflows
- Shared contracts between desktop layers
- Strong separation between UI shell, desktop services, persistence, and domain state
- Privacy-preserving storage and diagnostics
- Future-safe boundaries for later web/mobile extraction

## Phase 1 Technical Shape

### Desktop Runtime

- Electron desktop shell
- React + TypeScript renderer
- Vite-based frontend/build tooling
- Preload bridge for typed IPC access between renderer and main process

### Persistence Layer

- SQLite for local application data
- Typed persistence/repository boundary in the Electron main process
- Initial tables planned for:
  - app settings
  - onboarding progress
  - security state
  - security events
  - account profiles

### Shared Contracts

Shared TypeScript contracts are expected to define:

- shell state
- onboarding step model
- account profile draft model
- security state and recovery/reset contracts

These shared contracts are meant to prevent renderer-only ad hoc state and keep Phase 1–8 aligned on typed interfaces.

## Runtime Boundaries

### Renderer

Responsible for:

- application shell
- onboarding wizard
- lock screen
- empty dashboard handoff
- user-facing settings and security surfaces in later phases

The renderer should not own persistence or security implementation details directly.

### Preload / IPC

Responsible for:

- exposing safe typed app APIs to the renderer
- mediating shell-state and security operations
- hiding direct database/runtime internals from UI code

### Main Process

Responsible for:

- window lifecycle
- persistence setup
- secure state transitions
- lock/relock orchestration
- backup/restore entry points
- diagnostics and local crash handling in later phases

## Phase 1 Planned Components

Based on the approved plan set, Phase 1 is expected to establish:

- top-level app shell routing between `onboarding`, `locked`, and `dashboard`
- onboarding flow state machine
- account profile persistence for a single ICICI account
- PIN verification and backoff handling
- session lock handling for launch, idle timeout, and OS lock/sleep
- recovery-key reset with key rotation and security-event logging

## Planned Data Model Boundaries

### Onboarding

- current step
- completed steps
- resumable progress

### Account Profile

- fixed bank name: `ICICI`
- account display name
- account holder name
- optional masked account number or nickname
- base currency
- optional opening balance metadata

### Security

- PIN hash
- failed-attempt counters
- cooldown state
- encrypted/secured recovery material
- last unlocked account context
- security event log references

## UI System Constraints

From the approved Phase 1 UI contract:

- premium finance-dashboard visual language
- Manrope typography
- warm neutral shell palette with teal accent and strong destructive red
- shell-based onboarding and lock experience, not generic dialogs
- centered task panel as the primary onboarding focal point
- explicit keyboard behavior, validation feedback, and state messaging

## Near-Term Phase Expansion

After Phase 1, the same architecture should support:

- statement import pipeline
- review queue and import history
- transaction ledger and search
- categories and rules
- dashboard analytics
- audit and diagnostics
- owner settings and release hardening

## Notable Deferred Architecture

These remain intentionally deferred until later phases:

- additional bank adapters
- multi-account aggregation
- sync infrastructure
- web/mobile clients
- budgeting engine
- AI summary pipeline

## Source Material

- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/phases/01-product-shell-and-security/01-CONTEXT.md`
- `.planning/phases/01-product-shell-and-security/01-UI-SPEC.md`
- `.planning/phases/01-product-shell-and-security/01-01-PLAN.md`
- `.planning/phases/01-product-shell-and-security/01-02-PLAN.md`
- `.planning/phases/01-product-shell-and-security/01-03-PLAN.md`
