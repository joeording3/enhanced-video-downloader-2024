# Extension Integration Tests

This directory contains **integration tests** for the extension. Unit tests are located in
`extension/src/**/__tests__/`.

## Test Organization

### ✅ **Integration Tests (Keep Here)**

- **`background.test.ts`** - Comprehensive background script integration testing
- **`background-simple.test.ts`** - Simple background functionality tests
- **`background.util.test.ts`** - Background utility function integration tests
- **`content.behavior.test.ts`** - Content script UI behavior and interactions
- **`content.extra.test.ts`** - Additional content script edge cases
- **`content.state.test.ts`** - Content script state management
- **`content.test.ts`** - Core content script functionality
- **`content.ui.test.ts`** - Content script UI components
- **`content.util.test.ts`** - Content script utility functions
- **`popup.test.ts`** - Popup UI integration tests
- **`popup-settings.test.ts`** - Popup settings functionality
- **`popup.advanced.test.ts`** - Advanced popup features
- **`popup.queue.test.ts`** - Popup queue management
- **`popup.util.test.ts`** - Popup utility functions
- **`options.*.test.ts`** - Options page functionality
- **`history.*.test.ts`** - History management
- **`playwright-e2e.spec.js`** - End-to-end browser testing

### ❌ **Unit Tests (Moved to Source)**

- ~~`background-logic.test.ts`~~ → `extension/src/__tests__/background-logic.test.ts`
- ~~`background-queue.test.ts`~~ → `extension/src/__tests__/background-queue.test.ts`
- ~~`youtube_enhance.test.ts`~~ → `extension/src/__tests__/youtube_enhance.test.ts`
- ~~`content-logic.test.ts`~~ → `extension/src/__tests__/content-logic.test.ts`

## Test Strategy

### **Unit Tests** (`extension/src/**/__tests__/`)

- Test individual functions and modules
- Fast execution
- Isolated testing
- Co-located with source code

### **Integration Tests** (`tests/extension/`)

- Test multiple components working together
- Test UI interactions and behaviors
- Test end-to-end workflows
- Test Chrome API integrations

## Running Tests

```bash
# Run unit tests only
npm test -- --testPathPattern="extension/src"

# Run integration tests only
npm test -- --testPathPattern="tests/extension"

# Run all tests
npm test
```

## Avoiding Duplication

- **Unit tests** should only exist in `extension/src/**/__tests__/`
- **Integration tests** should only exist in `tests/extension/`
- Each test should have a clear, unique purpose
- Avoid testing the same functionality in both unit and integration tests
