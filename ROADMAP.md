# ROADMAP.md — Development Phases

## Phase 1: Environment & Guardrails Setup [COMPLETED]
- **Goal**: Establish Titus-style AI workflow guardrails and CI pipeline.
- **Exit Criteria**:
  - `AGENTS.md`, `SPEC.md`, `ROADMAP.md`, `TASKS.md` checked in.
  - GitHub Actions CI workflow initialized.
  - Local verification scripts configured.

## Phase 2: Modular Architecture & Progress Tracking [CURRENT]
- **Goal**: Refactor backend scrapers into modular factory components and enhance frontend download progress tracking.
- **Exit Criteria**:
  - Modular scraper architecture (`base-scraper`, `factory`, `generic`) active.
  - Express API download route refactored with `core/progress` tracking.
  - Frontend `ProgressBar` component rendering download states accurately.
  - Local verification and build passes cleanly.

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
