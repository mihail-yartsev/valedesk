# Portable Migration Checklist

Use this file while executing the skill to keep migration work reusable across different Electron applications.

## Inventory Template

Fill this template before code changes:

```md
## App Baseline
- App name:
- Target OS:
- Current Electron version:
- Build tooling (vite/webpack/esbuild):
- Packaging (electron-builder/forge/custom):

## Runtime Topology
- Renderer entrypoints:
- Main process modules:
- Preload modules:
- IPC channels/events:

## Data and State
- Databases:
- Settings files:
- User profile paths:
- Logs/cache/temp paths:

## OS Integrations
- File dialogs:
- Open external URLs:
- Notifications:
- Tray/menu:
- Global shortcuts:

## Risky Dependencies
- Native Node modules:
- Browser automation deps:
- Electron-only APIs:
```

## Deliverables Template

Create these outputs for each migration:

```md
1. Migration Strategy
- Strategy: sidecar-first | host-first | hybrid
- Rationale:
- Excluded scope for v1:

2. IPC Mapping
- old channel -> new tauri command/event
- ownership: host | sidecar
- validation status:

3. Tool Parity
- tool/function
- status: host-native | sidecar | deferred
- owner:
- ETA:

4. Data Migration
- source paths/formats
- destination schema
- idempotency method
- rollback approach

5. Security Controls
- cwd/path sandbox status
- URL validation status
- capability allowlist status
- negative tests status
```

## Go/No-Go Checklist

- [ ] No direct `window.electron` usage remains in runtime UI path.
- [ ] Core user journeys pass in Tauri dev build.
- [ ] Persistence works across restart.
- [ ] Data migration works on real legacy profile sample.
- [ ] Security negative tests pass (path traversal, invalid URL, policy bypass attempts).
- [ ] Release artifact installs and launches on clean target OS.
- [ ] Rollback path to previous stable release is documented.
