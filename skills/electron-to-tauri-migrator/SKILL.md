---
name: electron-to-tauri-migrator
description: Migrate desktop applications from Electron to Tauri with a phased, low-regression workflow. Use when requests involve planning or implementing Electron-to-Tauri migration, designing host/sidecar architecture, porting IPC and persistence, reducing Electron-only dependencies, or validating cross-platform packaging and cutover readiness.
---

# Electron To Tauri Migrator

## Overview

Plan and execute migration from Electron to Tauri without big-bang rewrite.
Prioritize functional parity, data safety, and release reliability before optimization.

## Workflow Decision Tree

Select migration strategy before editing code:

1. Choose `sidecar-first` if the app has heavy Node runtime dependencies (Playwright, native Node modules, complex tool ecosystem).
1. Choose `host-first` if backend logic is small and can be moved directly into Rust.
1. Choose `hybrid` if security-sensitive operations must move to Rust first, while the rest stays in Node temporarily.

Default to `sidecar-first` when uncertainty is high.

## Migration Workflow

Follow the steps in order and produce outputs for each step.

### 1) Baseline Inventory

Collect:

- UI framework and entrypoints.
- Electron main/preload IPC contract.
- Backend modules and tool registry.
- Persistence layout (SQLite/JSON/files).
- OS integration points (dialogs, shell open, notifications, tray, global shortcuts).

Output:

- Architecture map and dependency inventory.

Use: `references/portable-checklist.md` ("Inventory Template").

### 2) Platform Adapter in UI

Implement a platform adapter layer:

- `sendClientEvent`
- `onServerEvent`
- `invoke`
- `send`
- host helpers (`selectDirectory`, `openExternal`, `buildInfo`, and equivalents used in app)

Requirements:

- Remove direct `window.electron` usage from UI components/hooks.
- Keep Electron adapter operational until cutover.

Output:

- UI that runs through adapters in both Electron and Tauri.

### 3) Tauri Host Bootstrap

Create `src-tauri` host:

- Configure `devUrl` and `frontendDist`.
- Implement minimum host commands for parity.
- Implement event bridge to UI.

Requirements:

- Fail fast on unsupported channels.
- Log host command failures with event context.

Output:

- UI working in `cargo tauri dev`.

### 4) Sidecar Bridge (if using sidecar-first/hybrid)

Run backend as sidecar process and bridge events:

- Use newline-delimited JSON messages.
- Forward client events to sidecar.
- Emit sidecar server events to UI.
- Capture sidecar logs and stderr.

Requirements:

- Pass user-data path through env.
- Add startup checks for missing sidecar binary.
- Add deterministic sidecar path resolution per build mode.

Output:

- Functional parity for core flows before deep rewrites.

### 5) Persistence and Data Migration

Move persistent state ownership to Tauri host:

- Sessions and messages.
- Settings and provider/model configs.
- Any todo/task metadata needed for restart continuity.

Requirements:

- Add one-time migration from legacy JSON/files into DB.
- Reset stale `running` sessions on startup.
- Keep migration idempotent.

Output:

- Data survives restart and app migration.

### 6) Security Hardening

Enforce host-side controls:

- CWD/path sandbox for file operations.
- External URL validation.
- Minimal Tauri capabilities.
- Permission gates for risky operations.

Requirements:

- Never rely on UI-only checks.
- Include negative tests (path traversal, unauthorized path, invalid URL scheme).

Output:

- Security behavior equivalent or stricter than previous Electron build.

### 7) Tool Parity and Decomposition

Classify each tool/function:

- `host-native`
- `sidecar`
- `deferred` (explicitly disabled with visible error)

Requirements:

- Keep a parity table and owner for each deferred item.
- Preserve names/IO contract when possible to avoid model prompt regressions.

Output:

- Controlled migration backlog instead of hidden feature loss.

### 8) Packaging and Cutover

Build and validate release artifacts:

- Include sidecar binaries/resources when applicable.
- Ensure target-triple naming consistency.
- Validate installation on clean OS environments.

Requirements:

- Produce rollback plan before removing Electron release lane.
- Run smoke tests for startup, session resume, settings, and critical tools.

Output:

- Cutover-ready Tauri release with rollback option.

## Quality Gates

Do not mark migration complete until all gates pass:

1. UI parity gate: no direct Electron API usage in UI runtime path.
1. IPC gate: typed and versioned client/server events documented.
1. Data gate: migration executed without data loss on real sample profiles.
1. Security gate: negative tests for path/URL/policy checks pass.
1. Release gate: reproducible CI build and install smoke tests pass.

## Required Deliverables

Produce these artifacts during migration:

1. Migration plan with phase owners and timelines.
1. IPC event matrix (old channel -> new command/event).
1. Tool parity matrix with `host-native/sidecar/deferred`.
1. Data migration spec and rollback plan.
1. Final validation summary with passed/failed gates.

Use: `references/portable-checklist.md` ("Deliverables Template" and "Go/No-Go Checklist").
