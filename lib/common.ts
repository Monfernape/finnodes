export function ensureUnreachable(value: never, message?: string): never {
  throw new Error(
    message || `Unreachable code hit with value ${String(value)}`
  );
}

export function assertNever(value: string): asserts value is never {
  throw new Error(`Unknown route: ${value}`);
}
