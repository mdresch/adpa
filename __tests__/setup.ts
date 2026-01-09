/**
 * Jest setup file for test utilities and global configurations
 * This file is run before each test file
 */

import '@testing-library/jest-dom'

// Suppress console errors/warnings in tests unless explicitly needed
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}
