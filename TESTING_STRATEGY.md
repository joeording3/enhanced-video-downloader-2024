# Testing Strategy: Unit vs Integration Testing with Jest

## Overview

This project now implements a comprehensive testing strategy using **Jest for both unit and
integration testing**, providing the best of both worlds:

- **Fast, reliable unit tests** for isolated functionality
- **Real HTTP integration tests** for end-to-end behavior
- **Single test runner** (Jest) for consistent tooling and reporting

## Test Structure

### 1. Unit Tests (`extension/src/__tests__/`)

- **Purpose**: Test individual functions and components in isolation
- **Environment**: Mocked Chrome APIs, no external services
- **Speed**: Fast execution (< 100ms per test)
- **Coverage**: High coverage of internal logic and error paths

**Example**: Testing `GET_LOGS` in test mode (immediate error responses)

### 2. Integration Tests (`tests/integration/`)

- **Purpose**: Test real HTTP interactions and non-test-mode behavior
- **Environment**: Mock Express server, real network calls
- **Speed**: Moderate execution (100-500ms per test)
- **Coverage**: End-to-end functionality with actual HTTP endpoints

**Example**: Testing `GET_LOGS` with real server responses and query parameters

### 3. E2E Tests (Playwright)

- **Purpose**: Full browser automation and user interaction testing
- **Environment**: Real browser, real extension
- **Speed**: Slow execution (2-10s per test)
- **Coverage**: Complete user workflows

## Running Tests

```bash
# Run all tests (unit + integration)
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run specific test file
npm test -- --testPathPattern=background.message.handlers.test.ts

# Run with coverage
npm run test:coverage
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
testMatch: [
  "**/extension/src/__tests__/**/*.test.ts",     // Unit tests
  "**/tests/extension/**/*.test.js",             // Legacy tests
  "**/tests/integration/**/*.test.ts",           // Integration tests
],
```

### Environment Detection

The background script automatically detects the test environment:

```typescript
const isTestEnvironment =
  typeof process !== "undefined" && (process.env.JEST_WORKER_ID || process.env.NODE_ENV === "test");
```

## Example: Logs Functionality Testing

### Unit Test (Test Mode)

```typescript
it("getLogs test-mode path: returns error when no port cached", async () => {
  // Mock storage to return no port
  (chrome.storage.local.get as any) = jest.fn().mockImplementation(() => ({}));

  const cb = jest.fn();
  await handler({ type: "getLogs" }, {}, cb);

  expect(cb).toHaveBeenCalledWith({
    status: "error",
    message: "Server not available",
  });
});
```

### Integration Test (Non-Test Mode)

```typescript
it("returns success and includes query params when provided", async () => {
  // Mock process.env to simulate non-test environment
  process.env = { ...originalProcess, JEST_WORKER_ID: undefined };

  // Mock Express server provides real HTTP endpoints
  app.get("/api/logs", (req, res) => {
    const { lines, recent } = req.query;
    // ... handle query parameters
    res.send("logline1\nlogline2");
  });

  const cb = jest.fn();
  await handler({ type: "getLogs", lines: 50, recent: true }, {}, cb);

  expect(cb).toHaveBeenCalledWith({
    status: "success",
    data: expect.stringContaining("logline"),
  });
});
```

## Benefits of This Approach

### 1. **Comprehensive Coverage**

- Unit tests cover fast error paths and edge cases
- Integration tests cover real HTTP behavior and fallbacks
- No functionality is left untested

### 2. **Fast Development Cycle**

- Unit tests run in milliseconds for quick feedback
- Integration tests run when you need to verify HTTP behavior
- Separate test suites allow focused testing

### 3. **Real-World Validation**

- Integration tests use actual HTTP requests/responses
- Tests real endpoint fallback behavior (e.g., `/api/logs` → `/logs`)
- Validates actual network error handling

### 4. **Maintainable Test Suite**

- Clear separation of concerns
- Easy to understand what each test validates
- Consistent Jest tooling across all test types

## Migration from Legacy Tests

The previously skipped tests have been restructured:

**Before**: Tests were skipped because they required HTTP functionality

```typescript
it.skip("getLogs returns success and includes query params when provided", async () => {
  // This would never work in unit test environment
});
```

**After**: Tests are properly categorized

```typescript
// Unit test: test-mode behavior
it("getLogs test-mode path: returns error when no port cached", async () => {
  // Tests immediate error response
});

// Integration test: non-test-mode behavior
it("returns success and includes query params when provided", async () => {
  // Tests real HTTP functionality
});
```

## Best Practices

### 1. **Test Naming**

- Unit tests: `"functionality test-mode path: expected behavior"`
- Integration tests: `"functionality non-test-mode: expected behavior"`

### 2. **Mock Management**

- Always restore mocks in `afterEach` or test cleanup
- Use descriptive mock names for clarity
- Mock at the lowest level possible

### 3. **Environment Setup**

- Unit tests: Use default Jest environment
- Integration tests: Override `process.env` as needed
- Clean up environment changes after each test

### 4. **Server Management**

- Start mock servers in `beforeAll`
- Clean up servers in `afterAll`
- Use random ports to avoid conflicts

## Future Enhancements

### 1. **Test Categories**

```bash
npm run test:unit:background      # Background script unit tests
npm run test:unit:core           # Core functionality unit tests
npm run test:integration:api     # API integration tests
npm run test:integration:ui      # UI integration tests
```

### 2. **Performance Testing**

- Add performance benchmarks to integration tests
- Measure response times and throughput
- Track performance regressions

### 3. **Contract Testing**

- Validate API contracts between extension and server
- Test backward compatibility
- Ensure API versioning works correctly

## Conclusion

This testing strategy provides:

✅ **Fast unit tests** for development feedback ✅ **Comprehensive integration tests** for real
functionality ✅ **Single toolchain** (Jest) for consistency ✅ **Clear separation** of test
responsibilities ✅ **Maintainable test suite** that grows with the project

By using Jest for both unit and integration testing, we get the best of both worlds: the speed and
reliability of unit tests, plus the real-world validation of integration tests, all with consistent
tooling and reporting.
