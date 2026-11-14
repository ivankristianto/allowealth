/**
 * Bundles the split OpenAPI YAML (openapi.yml + openapi/**) into one document.
 * Path files are inlined; schemas, responses and parameters are hoisted into
 * `components` and referenced locally. Unresolvable refs throw.
 */

import { dirname, join, normalize, basename, extname } from 'node:path/posix';

type JsonObject = Record<string, unknown>;
type ComponentKind = 'schemas' | 'responses' | 'parameters';

/** Returns a source file's text by repo-relative path (e.g. `openapi/paths/recurring.yml`). */
export type ReadOpenApiSource = (path: string) => string;

const COMPONENT_DIRS: Record<string, ComponentKind> = {
  'openapi/schemas': 'schemas',
  'openapi/responses': 'responses',
  'openapi/parameters': 'parameters',
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function pointerSegments(pointer: string): string[] {
  return pointer.split('/').filter((segment) => segment !== '').map(decodePointerSegment);
}

export function bundleOpenApiDocument(
  readSource: ReadOpenApiSource,
  entry = 'openapi.yml'
): JsonObject {
  const parsed = new Map<string, unknown>();
  const hoisted = new Map<string, string>();
  const components: Record<ComponentKind, JsonObject> = {
    schemas: {},
    responses: {},
    parameters: {},
  };
  const inlining: string[] = [];

  function load(file: string): unknown {
    if (!parsed.has(file)) {
      let text: string;
      try {
        text = readSource(file);
      } catch {
        throw new Error(`OpenAPI source not found: ${file}`);
      }
      parsed.set(file, Bun.YAML.parse(text));
    }
    return parsed.get(file);
  }

  function resolvePointer(file: string, pointer: string): unknown {
    let node = load(file);
    for (const segment of pointerSegments(pointer)) {
      if (!isObject(node) || !(segment in node)) {
        throw new Error(`Unresolved OpenAPI $ref: ${file}#${pointer}`);
      }
      node = node[segment];
    }
    return node;
  }

  function parseRef(ref: string, fromFile: string): { file: string; pointer: string } {
    const hashIndex = ref.indexOf('#');
    const filePart = hashIndex === -1 ? ref : ref.slice(0, hashIndex);
    const pointer = hashIndex === -1 ? '' : ref.slice(hashIndex + 1);
    const file = filePart ? normalize(join(dirname(fromFile), filePart)) : fromFile;
    return { file, pointer };
  }

  function componentKind(file: string): ComponentKind | null {
    return COMPONENT_DIRS[dirname(file)] ?? null;
  }

  function componentName(file: string, pointer: string): string {
    const segments = pointerSegments(pointer);
    const raw = segments.at(-1) ?? basename(file, extname(file));
    return raw.replace(/[^A-Za-z0-9._-]/g, '_');
  }

  function hoist(kind: ComponentKind, file: string, pointer: string, preferredName?: string) {
    const key = `${file}#${pointer}`;
    const existing = hoisted.get(key);
    if (existing) return existing;

    if (preferredName && preferredName in components[kind]) {
      throw new Error(`Duplicate OpenAPI component name: ${kind}/${preferredName}`);
    }
    const base = preferredName ?? componentName(file, pointer);
    let name = base;
    for (let suffix = 2; name in components[kind]; suffix++) name = `${base}${suffix}`;

    // Register before walking so self-referencing schemas point at themselves.
    hoisted.set(key, name);
    components[kind][name] = {};
    components[kind][name] = walk(resolvePointer(file, pointer), file);
    return name;
  }

  function walk(node: unknown, file: string): unknown {
    if (Array.isArray(node)) return node.map((item) => walk(item, file));
    if (!isObject(node)) return node;

    const { $ref: ref, ...rest } = node;
    const siblings = Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [key, walk(value, file)])
    );
    if (typeof ref !== 'string') return siblings;

    // Local refs in the entry file already point into the bundled document.
    if (ref.startsWith('#') && file === entry) return { $ref: ref, ...siblings };

    const target = parseRef(ref, file);
    const kind = componentKind(target.file);
    if (kind) {
      const name = hoist(kind, target.file, target.pointer);
      return { $ref: `#/components/${kind}/${name}`, ...siblings };
    }

    const key = `${target.file}#${target.pointer}`;
    if (inlining.includes(key)) throw new Error(`Circular OpenAPI $ref: ${key}`);
    inlining.push(key);
    const inlined = walk(resolvePointer(target.file, target.pointer), target.file);
    inlining.pop();
    return isObject(inlined) ? { ...inlined, ...siblings } : inlined;
  }

  const root = load(entry);
  if (!isObject(root)) throw new Error(`OpenAPI entry is not an object: ${entry}`);

  const rootComponents = isObject(root.components) ? root.components : {};
  const extraComponents: JsonObject = {};

  // Root component names win, so `#/components/schemas/X` written in the root stays valid.
  for (const [section, entries] of Object.entries(rootComponents)) {
    if (!isObject(entries)) continue;
    const kind = section in components ? (section as ComponentKind) : null;
    for (const [name, value] of Object.entries(entries)) {
      const ref = isObject(value) && typeof value.$ref === 'string' ? value.$ref : null;
      const target = ref && !ref.startsWith('#') ? parseRef(ref, entry) : null;
      if (kind && target && componentKind(target.file) === kind) {
        const hoistedName = hoist(kind, target.file, target.pointer, name);
        if (hoistedName !== name) {
          components[kind][name] = { $ref: `#/components/${kind}/${hoistedName}` };
        }
        continue;
      }
      if (kind) {
        components[kind][name] = walk(value, entry);
      } else {
        const sectionOut = (extraComponents[section] ??= {}) as JsonObject;
        sectionOut[name] = walk(value, entry);
      }
    }
  }

  const withoutComponents: JsonObject = { ...root };
  delete withoutComponents.components;
  const bundled = walk(withoutComponents, entry) as JsonObject;

  return {
    ...bundled,
    components: { ...extraComponents, ...components },
  };
}
