# TASKS.md — Active Work Items

## Current Phase: Bug Fix — Download Full Comic File Generation & Fallback Extraction
- [x] Create feature branch `feature/fix-download-full-zip-and-chapter-extraction`.
- [x] Fix filename matching and CBZ path registration in `backend/src/download-full.js`.
- [x] Replace mock zip string stubs with actual binary file reading (`fs.readFileSync`).
- [x] Write master zip archive directly to disk (`fs.writeFileSync`).
- [x] Add DOM fallback selector image extraction strategy in `extractChapterImageUrls`.
- [x] Run backend verification tests.
- [ ] Open Pull Request and merge into `main` after CI pass.
