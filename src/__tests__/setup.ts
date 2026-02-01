/**
 * Test setup file
 *
 * This file is preloaded before all tests to configure the test environment.
 * It suppresses console.error output to reduce noise from expected error handling tests.
 */

// Replace console.error with a no-op during tests
// This prevents noisy output when testing error handling paths
console.error = () => {};
