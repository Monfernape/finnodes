# TypeScript Conventions

Use this guide when changing TypeScript types or resolving type errors.

## Type Safety

- Do not use type assertions such as `as`, angle-bracket assertions, or other assertion-based shortcuts to silence TypeScript errors.
- Fix the type at the source when possible.
- If a value is genuinely unknown at runtime, narrow it with an explicit type guard before use.
