type Listener = (state: Record<string, unknown>, changedPath: string) => void;
type PathListener = (value: unknown) => void;

export interface StateStore {
  get: (path: string) => unknown;
  set: (path: string, value: unknown) => void;
  subscribe: (listener: Listener) => () => void;
  subscribePath: (path: string, listener: PathListener) => () => void;
  getSnapshot: () => Record<string, unknown>;
}

/**
 * Parse a JSON Pointer (RFC 6901) into path segments.
 * "" → [], "/user/name" → ["user", "name"]
 */
export function parsePointer(pointer: string): string[] {
  if (pointer === '' || pointer === '/') return [];
  if (!pointer.startsWith('/')) {
    throw new Error(`Invalid JSON Pointer: "${pointer}" — must start with "/"`);
  }
  return pointer
    .slice(1)
    .split('/')
    .map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'));
}

export function getByPath(obj: unknown, segments: string[]): unknown {
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = Number(seg);
      if (Number.isNaN(index)) return undefined;
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return current;
}

function setByPath(obj: unknown, segments: string[], value: unknown): unknown {
  if (segments.length === 0) {
    return value;
  }

  const [head, ...rest] = segments;

  if (Array.isArray(obj)) {
    const result = [...obj];
    const index = Number(head);
    if (rest.length === 0) {
      result[index] = value;
    } else {
      result[index] = setByPath(result[index] ?? {}, rest, value);
    }
    return result;
  }

  const result = { ...(obj as Record<string, unknown>) };
  if (rest.length === 0) {
    result[head] = value;
  } else {
    const child = result[head];
    const nextObj = (child !== null && child !== undefined && typeof child === 'object')
      ? child
      : {};
    result[head] = setByPath(nextObj, rest, value);
  }

  return result;
}

export function createStateStore(initialState: Record<string, unknown> = {}): StateStore {
  let state = { ...initialState };
  const listeners = new Set<Listener>();
  const pathListeners = new Map<string, Set<PathListener>>();

  function get(path: string): unknown {
    const segments = parsePointer(path);
    return getByPath(state, segments);
  }

  function set(path: string, value: unknown): void {
    const segments = parsePointer(path);
    const oldValue = getByPath(state, segments);
    if (oldValue === value) return;

    state = setByPath(state, segments, value) as Record<string, unknown>;

    for (const listener of listeners) {
      listener(state, path);
    }

    for (const [listenedPath, pathLsnrs] of pathListeners) {
      if (path === listenedPath || listenedPath.startsWith(path + '/') || path.startsWith(listenedPath + '/')) {
        const newValue = getByPath(state, parsePointer(listenedPath));
        for (const lsnr of pathLsnrs) {
          lsnr(newValue);
        }
      }
    }
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  function subscribePath(path: string, listener: PathListener): () => void {
    if (!pathListeners.has(path)) {
      pathListeners.set(path, new Set());
    }
    pathListeners.get(path)!.add(listener);
    return () => {
      const s = pathListeners.get(path);
      if (s) {
        s.delete(listener);
        if (s.size === 0) pathListeners.delete(path);
      }
    };
  }

  function getSnapshot(): Record<string, unknown> {
    return state;
  }

  return { get, set, subscribe, subscribePath, getSnapshot };
}
