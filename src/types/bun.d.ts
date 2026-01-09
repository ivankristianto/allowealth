/**
 * Type declarations for Bun-specific modules
 *
 * These declarations provide TypeScript support for Bun's built-in modules
 * that don't have separate type definitions.
 */

declare module 'bun:sqlite' {
  export default class Database {
    constructor(path: string, options?: { readonly?: boolean });
    close(): void;
    exec(sql: string): void;
    query(sql: string): (params?: any[]) => any[];
    prepare(sql: string): PreparedStatement;
    serialize(): Uint8Array;
    load(buffer: Uint8Array): void;
    inTransaction: boolean;
  }

  export interface PreparedStatement {
    run(params?: any[]): void;
    get(params?: any[]): any | null;
    all(params?: any[]): any[];
    values(params?: any[]): any[][];
    finalize(): void;
  }
}

declare module 'bun:test' {
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;

  export function mock<T extends (...args: any[]) => any>(
    fn?: T
  ): ReturnType<T> extends Promise<any>
    ? Mock<ReturnType<T>>
    : Mock<ReturnType<T> extends (...args: any[]) => any ? ReturnType<T> : T>;

  export interface Mock<T> {
    (...args: any[]): any;
    mockReturnValueOnce(value: any): Mock<T>;
    mockReturnValue(value: any): Mock<T>;
    mockResolvedValueOnce(value: any): Mock<T>;
    mockResolvedValue(value: any): Mock<T>;
    mockRejectedValueOnce(value: any): Mock<T>;
    mockRejectedValue(value: any): Mock<T>;
    mockImplementation(fn: (...args: any[]) => any): Mock<T>;
    mockClear(): void;
    mockReset(): void;
    calls: any[][];
  }

  export interface Matchers {
    toBe(expected: any): void | Promise<void>;
    toEqual(expected: any): void | Promise<void>;
    toHaveLength(length: number): void | Promise<void>;
    toThrow(expected?: string | RegExp): void | Promise<void>;
    toMatch(snapshot: any): void | Promise<void>;
    toBeTruthy(): void | Promise<void>;
    toBeFalsy(): void | Promise<void>;
    toBeNull(): void | Promise<void>;
    toBeUndefined(): void | Promise<void>;
    toBeDefined(): void | Promise<void>;
    toBeGreaterThan(value: number): void | Promise<void>;
    toBeLessThan(value: number): void | Promise<void>;
    toContain(item: any): void | Promise<void>;
    toHaveProperty(property: string | string[], value?: any): void | Promise<void>;
    rejects: Matchers;
    resolves: Matchers;
  }

  export function expect(value: any): Matchers;
}
