import '@testing-library/jest-dom/vitest';

// Each test file starts from a clean mock backend.
beforeEach(() => {
  localStorage.clear();
});
