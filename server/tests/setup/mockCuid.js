// Mock stub for @paralleldrive/cuid2 (see integration-setup.js for why it's
// mocked). Math.random() here only fabricates a placeholder string for a
// mocked ID generator in test setup -- never a real identifier, never used
// for anything security-sensitive.
module.exports = {
  createId: () => `mock-cuid-${Math.random().toString(36).slice(2)}`,
  init: () => () => `mock-cuid-${Math.random().toString(36).slice(2)}`,
  getConstants: () => ({}),
  isCuid: () => true
};
