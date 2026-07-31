# ROADMAP.md — Development Phases

## Phase 1: Environment & Guardrails Setup [CURRENT]
- **Goal**: Establish Titus-style AI workflow guardrails and CI pipeline.
- **Exit Criteria**:
  - `AGENTS.md`, `SPEC.md`, `ROADMAP.md`, `TASKS.md` checked in.
  - GitHub Actions CI workflow initialized.
  - Local verification scripts configured.

## Phase 2: Stability & Test Harness Enhancement
- **Goal**: Add unit/integration tests for scrapers and Express routes.
- **Exit Criteria**:
  - Automated test runner for backend scrapers.
  - Frontend component smoke tests.

## Phase 3: Scraper Engine Optimization
- **Goal**: Improve anti-bot detection resilience and error handling.
- **Exit Criteria**:
  - Auto-retry mechanism for failed image downloads.
  - Clear user-facing error logs on scraper timeout.

## Phase 4: UI/UX Improvements
- **Goal**: Modernize frontend download queue and dark mode theme.
- **Exit Criteria**:
  - Mobile responsive layouts.
  - Download queue cancellation & pause options.
