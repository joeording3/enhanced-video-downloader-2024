## Unused Code Report

Date: 2025-08-10

### Executive Summary

- TypeScript: Many exported symbols are only used within their own module ("used in module"). Convert such exports to internal where appropriate to reduce surface area.
- Python: Vulture flags several Flask route handlers and Click/CLI helpers as unused (60% confidence). Many are likely false positives due to decorators or dynamic usage. A small whitelist plus selective refactors will reduce noise.

### TypeScript Findings (ts-prune)

Command: `npx ts-prune -p tsconfig.json --error`

Key observations:

- `extension/src/popup.ts`: `updateToggleButtonState` appears exported but unused by other modules.
- `extension/src/core/constants.ts`: Numerous exported constants/types (e.g., `isValidPort`, `getStorageKey`, enums) are only referenced in-module.
- `extension/src/options.ts`, `extension/src/popup.ts`, `extension/src/core/*`, and `extension/src/types/index.ts` show many "used in module" exports.

Recommendations:

- For symbols used only within the same file: remove `export` to make them internal.
- For types exported from `extension/src/types/index.ts` but not consumed externally: keep exported if they serve as the public type surface; otherwise, scalpel-reduce to the minimal API actually used.
- Add a ts-prune allowlist for intentional public exports that lack direct references (e.g., externally-consumed types). Example: create `ts-prune.json` with `ignore` patterns or annotate with `/* ts-prune-ignore-next */` where supported.

Suggested next steps:

1. Audit `core/constants.ts` and `types/index.ts`; de-export items used only internally.
2. Re-run `make lint-unused-ts` and ensure no functional/regression issues.
3. If any exports are part of the intended public API, document them in `extension/src/extension-overview.md` and add to the ts-prune ignore list.

### Python Findings (vulture)

Command: `./.venv/bin/vulture server tests --min-confidence 60`

Highlights (representative subset):

- Flask routes flagged (decorator/dynamic usage → likely false positives):
  - `server/api/download_bp.py`: `cleanup_failed_download`, `gallery_dl`, `cancel_download`, `pause_download`, `resume_download`, `set_priority` (60%)
  - `server/api/restart_bp.py`: `managed_restart_route` (60%)
- CLI helpers/commands (verify or remove):
  - `server/cli_helpers.py`: `create_lock_file_cli`, `read_lock_file`, `run_gunicorn_server`, `set_config_value`, `build_extension_scripts`, `configure_console_logging`, `derive_server_settings`, `handle_existing_instance`
  - `server/cli_main.py`: `start_server`, `stop_server`, `restart_server_command`, `disable_launchagents_cmd`, `SERVER_MAIN_SCRIPT`
  - `server/cli/history.py`: `list_history`
  - `server/cli/serve.py`: `serve_command`
- Config/schemas/constants (consider cleanup or confirm dynamic usage):
  - `server/constants.py`: `is_valid_port`, several DEFAULT/TEST_* constants
  - `server/schemas.py`: multiple `model_config` variables and validators
- Tests: many `pytestmark`, `side_effect`, temporary variables flagged (expected noise when including tests).

Recommendations:

- Whitelist route handlers and Click commands in a `vulture_whitelist.py` to avoid false positives from decorators/dynamic registration.
  - Example whitelist entries: names of Flask view functions and click commands.
- For genuine dead code:
  - Remove unused CLI aliases and legacy helpers if superseded.
  - Collapse duplicate or migrated constants; keep only the canonical ones.
  - Delete unreferenced validators/fields in `schemas.py` if no longer required; otherwise ensure they are referenced by pydantic models.
- For tests: accept noise or add a vulture `--exclude` for tests if desired. Since we purposely include tests, alternatively raise `--min-confidence` to 80 to reduce noise, or add small, focused allowlist entries (e.g., common `pytestmark`, `side_effect`).

Proposed vulture workflow improvements:

1. Add `reports/vulture_whitelist.py` with known dynamic/decorated callables (Flask routes, Click commands).
2. Update Makefile target to use `--make-whitelist` / `--whitelist vulture_whitelist.py` (or just import the whitelist module) and possibly `--min-confidence 80` after initial cleanup.
3. Periodically revisit the whitelist to prune items that become truly unused.

### Automation and CI

- Current targets:
  - `make lint-unused-ts` (ts-prune)
  - `make lint-unused-py` (vulture)
  - `make lint-unused` runs both.
- Recommendation: keep these non-blocking until triage is complete. After cleaning up or whitelisting, integrate into CI as a warning step, then later as an enforced gate.

### Action Plan (Incremental)

Week 1:

- TS: De-export internal-only symbols in `core/constants.ts` and `popup.ts` (`updateToggleButtonState`).
- Python: Remove or mark as deprecated unused CLI helpers in `server/cli_helpers.py` and `server/cli_main.py` after confirming no call sites.

Week 2:

- Create and apply `vulture_whitelist.py` for Flask/Click dynamic callables and noisy test patterns; consider raising confidence to 80.
- TS: Introduce ts-prune ignore list for intentional public types.

Week 3:

- Re-run `make lint-unused`; convert remaining true positives into removals or explicit references; update docs for public API.
- Enable a CI job to run `make lint-unused` and upload the report artifact.

### Appendix A: Raw Findings (abridged)

- ts-prune notable: `popup.ts:updateToggleButtonState`; numerous `core/constants.ts` exports "used in module" only.
- vulture notable: route handlers in `download_bp.py`, CLI helpers in `cli_helpers.py`, command symbols in `cli_main.py`, constants/validators in `constants.py` and `schemas.py`, plus expected test noise (`pytestmark`, `side_effect`).
