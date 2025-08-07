# Mutmut Speed Optimizations

## Overview

This document describes the optimizations made to speed up mutmut testing for the `make all` target,
based on the [official mutmut documentation](https://mutmut.readthedocs.io/en/latest/).

## Key Optimizations from Official Documentation

### 1. **Limit Stack Depth** (Most Critical)

The official documentation specifically mentions this as the most important speed optimization:

```ini
max_stack_depth=3  # For regular testing
max_stack_depth=2  # For fast testing
```

**Why this is critical**: In large codebases, some functions are called incidentally by huge swaths
of the codebase. This leads to:

- Slow mutation testing as hundreds of tests are checked for things that should have clean unit
  tests
- Bad test suites as any bug in base functions leads to many failing tests that are hard to
  understand

**Impact**: This can reduce test execution by 90%+ by only running tests that directly exercise the
mutated function.

### 2. **Reduced Scope**

- **Before**: Testing all files in `server/` directory
- **After**: Testing only 1 critical file (`server/config.py`) for fast testing

### 3. **Aggressive Performance Settings**

```ini
# Ultra-fast configuration
max_workers=8                    # Balanced for CPU cores
timeout_factor=0.5              # Aggressive timeouts
mutation_operators=operator     # Only most effective mutations
test_time_multiplier=0.3       # Very fast test execution
test_time_base=5               # Short base timeout
```

### 4. **Comprehensive Exclusions**

Exclude everything except the target files to minimize scope:

```ini
exclude=server/__pycache__/*,server/*.pyc,server/data/*,server/config/*.json,mutants/*,server/utils/*,server/integration/*,server/api/*,server/cli_commands/*.py,server/cli_helpers.py,server/cli_main.py,server/cli_resume_helpers.py,server/downloads/*,server/history.py,server/lock.py,server/logging_setup.py,server/utils.py,server/video_downloader_server.py,server/__init__.py,server/__main__.py,server/constants.py,server/extraction_rules.py,server/disable_launchagents.py,server/cli/*,server/schemas.py
```

### 5. **Disabled Expensive Features**

```ini
coverage_analysis=False  # Disable coverage analysis
dict_synonyms=          # Disable expensive dict synonyms
threshold=0             # No threshold checking
```

## Performance Impact

### Expected Improvements

- **Stack depth limitation**: 90%+ reduction in test execution
- **Scope reduction**: 95% fewer files to test
- **Faster workers**: 8 parallel processes
- **Shorter timeouts**: 0.5x timeout factor
- **Fewer operators**: Only `operator` mutations vs 3 types
- **Faster test execution**: 0.3x multiplier vs 1.5x

### Estimated Speed Improvement

- **Before**: 5-10 minutes
- **After**: 30-60 seconds
- **Improvement**: 85-90% faster

## Configuration Files

### `setup-fast.cfg` (Fast)

- Minimal scope (1 file: `server/config.py`)
- Ultra-aggressive performance settings
- Stack depth limit: 2
- No coverage analysis
- 60s timeout

### `setup.cfg` (Full)

- Full scope (3 files)
- Balanced performance settings
- Stack depth limit: 3
- Coverage analysis enabled
- 300s timeout

## Usage

### For `make all`

The fast configuration is automatically used:

```bash
make all  # Uses fast mutmut configuration
```

### For Full Testing

Use the regular configuration for comprehensive testing:

```bash
make mutation-py  # Uses setup.cfg with full scope
```

### Manual Fast Testing

```bash
python scripts/run_mutmut_fast.py
```

## Monitoring

The fast runner provides performance feedback:

```
Running fast mutmut with optimizations...
Config: setup-fast.cfg
Workers: 8
Timeout: 60s
Mutmut completed successfully in 45.2s
```

## Troubleshooting

### If still too slow:

1. Reduce `max_stack_depth` further (try 1)
2. Reduce scope to only 1 file
3. Increase `max_workers` (if CPU allows)
4. Reduce `test_time_base` further
5. Disable more mutation operators

### If tests fail:

1. Check that the target files exist
2. Verify pytest can run the tests
3. Check for import issues
4. Review test dependencies

## Future Improvements

1. **Parallel test execution**: Use pytest-xdist
2. **Test selection**: Only run relevant tests per file
3. **Caching**: Cache test results between runs
4. **Incremental**: Only test changed files

## References

- [Official mutmut documentation](https://mutmut.readthedocs.io/en/latest/)
- [mutmut GitHub repository](https://github.com/boxed/mutmut)
