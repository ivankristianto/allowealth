/**
 * Base class for aborts whose message is the whole point: each one names the
 * config field or flag that resolves it.
 *
 * The CLI prints these as their message alone, with no stack trace. Matching by
 * class rather than by constructor name keeps that check compiler-checked and
 * safe under minification.
 */
export class DirectiveError extends Error {}
