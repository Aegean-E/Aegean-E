# Decisions

Why this project is built the way it is, oldest first. One entry per decision that changes a
contract, a dependency, a data format or the architecture; IDs are consecutive and never reused.

### ADR-001: AIKit Cockpit Integration and Profile Regression Testing
- **Date**: 2026-10-25
- **Status**: Accepted
- **Context**: Aegean-E is the GitHub profile repository for the account, housing developer information, project links and sponsorship configurations. It lacked AIKit workspace memory, automated regression gates, and standardized navigation references.
- **Decision**: Integrate Aegean-E with AIKit cockpit architecture, add `.aikit/` governance memory, introduce `tests/test_profile.py` verifying document integrity and link validity via Python stdlib `unittest`, and establish cold-start quick references and structure catalog in `README.md`.
- **Consequences**: Aegean-E passes all Phase 4 verification gates (hygiene, guidelines, secrets, tests); changes are trackable and recoverable through AIKit ledger and disruption recovery.

### ADR-002: Rename the profile project to AegeanWorks
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: The GitHub account is now AegeanWorks, while the profile project, folder, links, funding configuration, and commercial-license document still used the Aegean-E identity. The old profile also mixed a private-era structure with third-party stats cards and did not state which repositories were public.
- **Decision**: Rename the project folder to `AegeanWorks`, rewrite `README.md` around an original SVG banner and a curated public project atlas, update every repository link to `github.com/AegeanWorks`, and switch funding and licensing references to the AegeanWorks identity. Keep the Patreon handle as `Aegean-E` because `patreon.com/AegeanWorks` does not exist.
- **Consequences**: The profile now reflects the current account, mentions only repositories verified public through the GitHub API, and remains guarded by static link allowlist tests.
