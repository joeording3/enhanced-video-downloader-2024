# Mutation Testing Guide

## Overview

This project uses **mutmut** for Python mutation testing and **Stryker** for JavaScript/TypeScript
mutation testing.

## Python Mutation Testing (mutmut)

### Configuration

Mutation testing is configured in `setup.cfg`:

```ini
[mutmut]
paths_to_mutate=server/
backup=False
runner=python -m pytest
tests_dir=tests/
max_workers=8
timeout_factor=2.0
enable_speed_report=True
exclude=server/__pycache__/*,server/*.pyc,server/data/*,server/config/*.json,mutants/*
mutation_operators=operator,comparison,boolean
test_time_multiplier=1.5
test_time_base=30
coverage_analysis=True
```

### Commands

**Direct mutmut commands (recommended):**

```bash
# Run mutation testing
mutmut run

# View results
mutmut results

# View specific mutant details
mutmut show <mutant_name>

# Apply a specific mutation
mutmut apply <mutant_name>
```

**Make targets (with timeouts):**

```bash
make mutation-py              # Full testing (10min timeout)
make mutation-py-fast         # Fast testing (5min timeout)
make mutation-py-minimal      # Minimal testing (3min timeout)
make mutation-py-quick        # Quick testing (3min timeout)
make mutation-py-analyze      # View results
```

### Performance Notes

- **Full testing**: Tests entire `server/` directory (can be slow)
- **Fast testing**: Uses timeouts to prevent hanging
- **Configuration**: Uses exclude patterns to focus on critical modules
- **Workers**: Set to 8 for parallel execution
- **Timeouts**: Aggressive timeouts to prevent hanging

### Troubleshooting

**If mutation testing hangs:**

1. Use timeouts: `timeout 300 mutmut run`
2. Reduce workers: Set `max_workers=4` in setup.cfg
3. Increase timeouts: Set `timeout_factor=3.0` in setup.cfg

**If you get FileNotFoundError:**

- Check that `paths_to_mutate` points to existing directories/files
- Ensure exclude patterns don't exclude everything

## JavaScript/TypeScript Mutation Testing (Stryker)

### Commands

```bash
# Run Stryker mutation testing
npm run test:mutation:js

# Run fast Stryker testing
npm run test:mutation:js:fast
```

### Configuration

Stryker configuration is in `stryker.conf.js`.

## Why Direct Commands?

We removed the Python wrapper scripts (`optimize_mutmut.py`, etc.) because:

1. **Simplicity**: Direct `mutmut run` is simpler than wrapper scripts
2. **Reliability**: Fewer moving parts = fewer things to break
3. **Transparency**: Direct output from mutmut is clearer
4. **Maintenance**: No need to maintain wrapper scripts

The `setup.cfg` file handles all the configuration, making wrapper scripts unnecessary.

## Best Practices

1. **Use timeouts**: Always use timeouts to prevent hanging
2. **Start small**: Use `make mutation-py-quick` for quick feedback
3. **Check results**: Use `mutmut results` to see what happened
4. **Focus on critical modules**: The exclude patterns focus testing on important code
5. **Monitor performance**: If tests are too slow, adjust timeouts or reduce scope
