# AGENTS.md — Development Guardrails & Rules

## Project Scope
Comic Downloader Web is a local web application for downloading and archiving digital comics/manga.
- **Backend**: Node.js, Express, Puppeteer (with stealth plugin).
- **Frontend**: React 18, Vite.

## Rules for Coding Agents
1. **Focus**: Keep changes minimal, modular, and focused on one phase/feature at a time.
2. **Sub-Agent Execution**: Disable internal `<think>` tags / chain-of-thought in sub-agent prompts to maintain high performance and prevent timeouts.
3. **Verification Before Committing**:
   - Verify frontend builds cleanly: `cd frontend && npm run build`
   - Run linter/type checks when available.
   - Run backend check: `cd backend && node -c src/server.js`
4. **Git Branching**: Never push directly to `main`. Create a feature branch `feature/<feature-name>`, commit changes, and submit a Pull Request via `gh pr create`.
5. **No Hallucinated Packages**: Pinned dependency updates must be verified against npm before modifying `package.json`.
