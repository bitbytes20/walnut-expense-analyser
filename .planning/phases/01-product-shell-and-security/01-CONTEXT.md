# Phase 1: Product Shell and Security - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the desktop shell and first-run experience that establishes trust, device ownership, and the single-account posture. This phase covers guided onboarding, the release-1 account setup flow, PIN protection, lock behavior, and the recovery-key flow. Statement import, dashboard analytics, and settings breadth beyond security are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Onboarding Flow
- **D-01:** Onboarding should be a linear wizard with `Next` and `Back`, not a visible stepper-style setup.
- **D-02:** The onboarding step order is: Welcome, Household name / owner profile, PIN setup, Recovery key display + confirmation, Account profile setup, Finish.
- **D-03:** If the app closes during onboarding, the flow should resume where the user left off rather than restarting.
- **D-04:** Completing onboarding should land the owner on the dashboard with an empty-state prompt to import the first statement.

### Unlock and Lock Behavior
- **D-05:** The lock screen should include the household/app name, last unlocked account context, theme branding, and quick actions for `Restore from backup` and `Use recovery key`.
- **D-06:** Failed PIN attempts should trigger exponential backoff rather than a permanent lockout.
- **D-07:** The app should lock immediately when the Windows session is locked or the machine goes to sleep; it does not need to lock immediately on minimize.
- **D-08:** The desktop shell should expose a manual `Lock now` action from day one.

### Recovery-Key Experience
- **D-09:** Onboarding should present the recovery key in both a generated code format and a recovery-words format.
- **D-10:** Recovery-key confirmation should require copy/download confirmation before the user can proceed.
- **D-11:** Using the recovery key later should reset the PIN and rotate to a new recovery key.
- **D-12:** Recovery-key use must create a prominent audit/security event.

### Account Setup Details
- **D-13:** The release-1 account profile should capture account display name, fixed bank name `ICICI`, account holder name, optional masked account number or nickname, base currency, and optional opening balance metadata.
- **D-14:** Opening balance should not block onboarding and should instead be editable later from the Accounts screen.
- **D-15:** The owner should be able to edit the account profile later from the Accounts screen.
- **D-16:** If the owner skips account setup during onboarding, the account profile should be created lazily from the first successful import and then lightly confirmed later.

### the agent's Discretion
- Visual treatment for the lock screen within the premium finance-dashboard brand language
- Exact wording, layout, and progress indicators inside the linear onboarding wizard
- Exact exponential-backoff thresholds and cooldown durations
- Exact format length and presentation details of the generated recovery code versus recovery words

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning artifacts
- `.planning/PROJECT.md` - Product vision, release-1 constraints, trust/privacy posture, and locked product decisions
- `.planning/REQUIREMENTS.md` - Phase-linked requirements including `ONBD-01`, `SECU-01`, `SECU-02`, and `ACCT-01`
- `.planning/ROADMAP.md` - Phase 1 goal, success criteria, and release sequencing
- `.planning/STATE.md` - Current project status and immediate planning focus

No external specs - requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet - the repository is greenfield and contains no application source code or reusable UI/security modules.

### Established Patterns
- No code-level patterns exist yet; planning should establish modular boundaries between desktop shell, onboarding/session state, security services, and future domain logic.
- GSD planning artifacts are the current source of truth and should drive implementation structure.

### Integration Points
- New implementation will become the first application code in the repo and should define the desktop shell entrypoint, onboarding state flow, session lock handling, and security storage boundaries.
- Phase 1 choices should leave clear extension points for later phases: account import flow, dashboard shell routing, audit events, and owner settings.

</code_context>

<specifics>
## Specific Ideas

- The app should feel like a premium finance dashboard even in onboarding and lock states, not a generic utility setup flow.
- The lock screen should feel informative and branded, not just a bare PIN dialog.
- Dashboard is the post-onboarding landing page, but its Phase 1 role is specifically an empty-state launch point into first import.
- Lazy account creation is acceptable if the owner skips account setup, which means onboarding and import must cooperate cleanly.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---
*Phase: 01-product-shell-and-security*
*Context gathered: 2026-03-27*
