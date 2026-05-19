# Claude Agent Entrypoint

<!-- decapod-validator-entrypoint
includes .decapod CLI-only jail rule
includes Docker workspace mandate
includes elevated-permissions mandate
includes per-agent session password mandate
-->

Router pointer: `core/DECAPOD.md`. Read it with `decapod docs show core/DECAPOD.md`; use `decapod docs show docs/...` for embedded docs.

Jail rule: .decapod access is CLI-only; .decapod files are accessed only via decapod CLI.

Docker workspace mandate: Docker git workspaces live under `.decapod/workspaces` through `decapod workspace ensure --container`.

Elevated-permissions mandate: request elevated permissions before Docker/container workspace commands.

Per-agent session password mandate: use a dedicated `DECAPOD_SESSION_PASSWORD`.

Claim-before-work mandate and task creation mandate: run `decapod todo add "<task>"` and `decapod todo claim --id <task-id>`.

Core constitution ingestion mandate: run `decapod docs ingest`.

Version update step: `cargo install decapod`.

Follow `AGENTS.md` for the repository operating contract.
