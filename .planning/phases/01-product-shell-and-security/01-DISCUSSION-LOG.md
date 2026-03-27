# Phase 1: Product Shell and Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 01-product-shell-and-security
**Areas discussed:** Onboarding Flow, Unlock and Lock Behavior, Recovery-Key Experience, Account Setup Details

---

## Onboarding Flow

**Questions asked**
- Should onboarding be a linear wizard or a visible stepper?
- Which onboarding steps should be present and in what order?
- If the app closes midway, should onboarding resume or restart?
- Where should the user land after onboarding?

**User choices**
- Use a linear wizard.
- Keep the proposed step order: Welcome, Household name / owner profile, PIN setup, Recovery key display + confirmation, Account profile setup, Finish.
- Resume where the user left off.
- Land on the dashboard with a prompt to do the first import.

**Notes**
- The proposed onboarding step list was explicitly accepted as-is.

---

## Unlock and Lock Behavior

**Questions asked**
- What should the lock screen show besides PIN entry?
- What should happen after repeated failed PIN attempts?
- When should session locking happen outside the idle timeout?
- Should there be a manual `Lock now` action?

**User choices**
- Include household/app name, last unlocked account context, theme branding, and quick actions for restore from backup and recovery.
- Use exponential backoff for failed attempts.
- Lock on Windows session lock or sleep.
- Include a manual `Lock now` action.

**Notes**
- Minimize-triggered immediate lock was not chosen; OS lock/sleep is the explicit non-idle lock trigger.

---

## Recovery-Key Experience

**Questions asked**
- How should the recovery key be presented?
- How strict should confirmation be?
- What should happen when the recovery key is used later?
- Should recovery-key use create an audit/security event?

**User choices**
- Present both a generated code format and recovery words.
- Require download/copy confirmation.
- Reset the PIN and rotate to a new recovery key.
- Record a prominent audit/security event.

**Notes**
- The user did not request re-entry validation of the key; confirmation is based on saved/downloaded acknowledgment.

---

## Account Setup Details

**Questions asked**
- Which fields should exist on the single account profile?
- Should opening balance be part of onboarding or later?
- Should the owner be able to edit the account profile later?
- Should account creation be mandatory during onboarding or lazy after first import if skipped?

**User choices**
- Capture account display name, fixed ICICI bank name, account holder name, optional masked account number / nickname, base currency, and optional opening balance.
- Keep opening balance optional later in Accounts.
- Let the owner edit the account profile later.
- Support lazy account creation from first successful import if onboarding account setup is skipped.

**Notes**
- This creates an important planning dependency between onboarding state and future import flow handoff.

## the agent's Discretion

- Exact lock-screen composition and visual hierarchy
- Exact wizard copy and progress treatment
- Exact exponential-backoff schedule
- Exact recovery-key formatting details

## Deferred Ideas

None.
