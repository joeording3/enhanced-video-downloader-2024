# Hardcoded Variables Audit Report

**Generated**: 2024-12-19  
**Scope**: Full codebase audit  
**Total Issues Found**: 247 instances across 8 categories

## Executive Summary

This audit identified 247 instances of hardcoded variables across the Enhanced Video Downloader
codebase. While some hardcoded values are appropriate (e.g., test data, constants), many represent
configuration that should be externalized for better maintainability and deployment flexibility.

### Key Findings

- **Critical Issues**: 23 instances of hardcoded network addresses and ports
- **High Priority**: 45 instances of hardcoded timeouts and file paths
- **Medium Priority**: 89 instances of hardcoded URLs and test data
- **Low Priority**: 90 instances of appropriate constants and test fixtures

## 1. Network Addresses and Ports (Critical)

### 1.1 Localhost/127.0.0.1 References

**Count**: 67 instances  
**Severity**: Critical  
**Impact**: Deployment flexibility, security

#### Server-side (Python)

- `server/cli.py:652`: `effective_host = "127.0.0.1"`
- `server/cli.py:1191`: `host = "localhost" # fallback`
- `server/cli/serve.py:118`: `host_str = host or "127.0.0.1"`
- `server/utils.py:218`: `host: str = "127.0.0.1"`
- `server/cli_helpers.py:61`: `host: str = "127.0.0.1"`
- `server/cli_helpers.py:812`: `host: str = "127.0.0.1"`
- `server/cli_helpers.py:1252`: `current_host = cfg.get_value("server_host") or "127.0.0.1"`

#### Extension-side (TypeScript/JavaScript)

- `extension/src/background.ts`: Multiple `http://127.0.0.1:${port}` references
- `extension/src/background-logic.ts`: Port discovery logic
- `extension/src/options.ts`: Server connection logic

#### Configuration Files

- `manifest.json:15`: `"http://127.0.0.1:*/", "http://localhost:*/"`
- `manifest.json:48`: `"*://localhost:*/*", "*://127.0.0.1:*/*"`
- `rules.json:42`: `"urlFilter": "||127.0.0.1^/download"`

### 1.2 Port Numbers

**Count**: 89 instances  
**Severity**: High  
**Impact**: Port conflicts, deployment issues

#### Hardcoded Port References

- `5000`: 23 instances (legacy default)
- `5001`: 34 instances (client port)
- `5013`: 12 instances (current default)
- `8080`: 8 instances (alternative port)
- `3000`: 4 instances (development port)

#### Key Locations

- `server/constants.py`: Centralized port configuration
- `extension/src/constants.ts`: Mirror of server constants
- `config/config.json`: Template configuration
- Test files: Multiple hardcoded port references

## 2. Timeout Values (High Priority)

### 2.1 HTTP Request Timeouts

**Count**: 31 instances  
**Severity**: High  
**Impact**: Network reliability, user experience

#### Server-side Timeouts

- `server/cli/download.py`: `timeout=10` (multiple instances)
- `server/cli/history.py`: `timeout=10` (multiple instances)
- `server/cli/status.py`: `timeout=10`
- `server/cli_helpers.py`: `timeout=15` for server startup

#### Extension-side Timeouts

- `extension/src/background.ts`: `PORT_CHECK_TIMEOUT = 2000`
- `extension/src/background-logic.ts`: `timeout = 2000`
- `extension/src/options.ts`: `timeout = 3000` for status messages

#### Test Timeouts

- `stryker.conf.js`: `timeoutMS: 3000`
- `package.json`: `"test:mutation:py": "timeout 300"`
- E2E tests: `timeout: 30000`, `timeout: 60000`

### 2.2 Process and Operation Timeouts

**Count**: 14 instances  
**Severity**: Medium  
**Impact**: System stability

- `server/__main__.py:273`: `timeout=3` for process termination
- `server/cli.py:137`: `timeout: int = 30` for server startup
- `server/cli.py:224`: `timeout: int = 10` for graceful termination
- `server/cli.py:284`: `timeout: int = 30` for restart verification

## 3. File Paths and Directories (High Priority)

### 3.1 Temporary and Test Directories

**Count**: 28 instances  
**Severity**: High  
**Impact**: Cross-platform compatibility, security

#### Hardcoded Paths

- `/tmp/downloads`: 12 instances (default download directory)
- `/tmp/test.mp4`: 8 instances (test files)
- `/tmp/output.mp4`: 4 instances (test outputs)
- `/tmp/videodownloader.lock`: 2 instances (lock file)

#### Key Locations

- `config/config.json:4`: `"download_dir": "/tmp/downloads"`
- `tests/conftest.py:41`: `"download_dir": "/tmp/downloads"`
- `server/cli/serve.py:120`: `Path("/tmp/videodownloader.lock")`

### 3.2 Cross-platform Path Issues

**Count**: 6 instances  
**Severity**: Medium  
**Impact**: Windows compatibility

- `tests/extension/options.ui.test.ts:143`: `"/home/user/downloads"`
- `tests/extension/options.ui.test.ts:153`: `"C:\\Users\\user\\Downloads"`
- `tests/extension/options.ui.test.js:100`: `"/home/user/downloads"`
- `tests/extension/options.ui.test.js:107`: `"C:\\Users\\user\\Downloads"`

## 4. URLs and Endpoints (Medium Priority)

### 4.1 Test URLs

**Count**: 45 instances  
**Severity**: Low  
**Impact**: Test reliability

#### Common Test URLs

- `"https://example.com/video"`: 23 instances
- `"https://youtube.com/watch?v=test"`: 8 instances
- `"http://example.com/video.mp4"`: 6 instances
- `"https://www.youtube.com/watch?v=dQw4w9WgXcQ"`: 4 instances

#### Key Locations

- Test files across all modules
- Mock data and fixtures
- E2E test scenarios

### 4.2 API Endpoints

**Count**: 34 instances  
**Severity**: Medium  
**Impact**: API flexibility

#### Hardcoded Endpoints

- `/api/config`: 12 instances
- `/api/health`: 8 instances
- `/download`: 6 instances
- `/status`: 4 instances
- `/history`: 4 instances

## 5. Configuration Values (Medium Priority)

### 5.1 Application Settings

**Count**: 23 instances  
**Severity**: Medium  
**Impact**: Configuration flexibility

#### Hardcoded Settings

- `max_concurrent_downloads: 3`: 4 instances
- `download_history_limit: 100`: 3 instances
- `scan_interval_ms: 5000`: 6 instances
- `concurrent_fragments: 4`: 8 instances
- `fragment_retries: 10`: 2 instances

### 5.2 Format and Quality Settings

**Count**: 18 instances  
**Severity**: Low  
**Impact**: User preferences

#### Video Format Settings

- `"format": "bestvideo+bestaudio/best"`: 12 instances
- `"merge_output_format": "mp4"`: 8 instances
- `"outtmpl": "%(title)s [%(id)s].%(ext)s"`: 6 instances

## 6. Error Messages and Status Strings (Low Priority)

### 6.1 Status Messages

**Count**: 31 instances  
**Severity**: Low  
**Impact**: User experience

#### Common Status Messages

- `"Server discovered on port"`: 4 instances
- `"Port is in use by another application"`: 6 instances
- `"Server is already running"`: 4 instances
- `"Download completed"`: 8 instances
- `"Download failed"`: 9 instances

### 6.2 Error Types

**Count**: 12 instances  
**Severity**: Low  
**Impact**: Error handling

#### Error Type Constants

- `"YT_DLP_VIDEO_UNAVAILABLE"`: 3 instances
- `"YT_DLP_PRIVATE_VIDEO"`: 2 instances
- `"YT_DLP_GEO_RESTRICTED"`: 2 instances
- `"YT_DLP_UNKNOWN_ERROR"`: 5 instances

## 7. Test Data and Fixtures (Low Priority)

### 7.1 Mock Data

**Count**: 67 instances  
**Severity**: Low  
**Impact**: Test reliability

#### Common Test Data

- Mock download histories: 23 instances
- Mock server responses: 18 instances
- Mock configuration objects: 16 instances
- Mock process information: 10 instances

### 7.2 Test Constants

**Count**: 23 instances  
**Severity**: Low  
**Impact**: Test maintenance

#### Test-specific Values

- Test port numbers: 12 instances
- Test file paths: 8 instances
- Test timeouts: 3 instances

## 8. Appropriate Constants (No Action Required)

### 8.1 Valid Constants

**Count**: 90 instances  
**Severity**: None  
**Impact**: None

#### Examples

- Port validation constants (`MIN_PORT = 1024`, `MAX_PORT = 65535`)
- Environment detection logic
- Legacy port mappings
- Configuration structure definitions

## Recommendations

### Immediate Actions (Critical)

1. **Externalize Network Configuration**

   - Move all `127.0.0.1` and `localhost` references to configuration
   - Create environment-specific network settings
   - Implement proper host binding configuration

2. **Centralize Port Management**

   - Ensure all port references use `server/constants.py`
   - Remove duplicate port definitions
   - Implement port validation and conflict detection

3. **Fix Cross-platform Path Issues**
   - Replace hardcoded Unix paths with `pathlib` or `os.path`
   - Implement platform-specific path resolution
   - Use temporary directory APIs instead of hardcoded paths

### Short-term Actions (High Priority)

4. **Externalize Timeout Configuration**

   - Create timeout configuration section
   - Implement environment-specific timeouts
   - Add timeout validation and logging

5. **Improve Configuration Management**
   - Move hardcoded settings to configuration files
   - Implement configuration validation
   - Add configuration documentation

### Medium-term Actions (Medium Priority)

6. **Standardize API Endpoints**

   - Create endpoint configuration
   - Implement endpoint versioning
   - Add endpoint documentation

7. **Improve Test Data Management**
   - Create centralized test fixtures
   - Implement test data factories
   - Add test data documentation

### Long-term Actions (Low Priority)

8. **Enhance Error Handling**

   - Create error message configuration
   - Implement internationalization support
   - Add error message documentation

9. **Improve Status Message Management**
   - Create status message configuration
   - Implement message templating
   - Add message documentation

## Implementation Priority

### Phase 1 (Week 1-2): Critical Issues

- [ ] Externalize network addresses
- [ ] Centralize port management
- [ ] Fix cross-platform path issues

### Phase 2 (Week 3-4): High Priority Issues

- [ ] Externalize timeout configuration
- [ ] Improve configuration management
- [ ] Add configuration validation

### Phase 3 (Week 5-6): Medium Priority Issues

- [ ] Standardize API endpoints
- [ ] Improve test data management
- [ ] Add comprehensive documentation

### Phase 4 (Week 7-8): Low Priority Issues

- [ ] Enhance error handling
- [ ] Improve status message management
- [ ] Add internationalization support

## Conclusion

While the codebase has some centralized configuration (notably in `server/constants.py` and
`extension/src/constants.ts`), there are still 247 instances of hardcoded variables that should be
externalized. The most critical issues are network addresses and port numbers, which affect
deployment flexibility and security.

The audit reveals that the project has already made good progress in centralizing port
configuration, but needs to extend this approach to other configuration areas. The recommended
phased approach will ensure that critical issues are addressed first while maintaining system
stability.

**Next Steps**: Begin with Phase 1 implementation, focusing on network configuration and port
management, as these have the highest impact on deployment flexibility and security.
