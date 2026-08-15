# DevNodes

DevNodes is a mobile-first company workspace built with Next.js, Supabase, and TypeScript.

## Essentials

- Package manager: `yarn`
- Use this file only for instructions that apply to every task.

## GitHub Network Checks

- If a GitHub CLI authentication or API check fails inside the sandbox, retry
  the same read-only check with network escalation before treating the session
  as unauthenticated.
- Ask the user to sign in only when the escalated check also confirms that the
  GitHub credentials are missing or invalid.

## Task-Specific Docs

- [Mobile-Native Experience](./docs/agents/mobile-native-experience.md)
- [PWA Behavior](./docs/agents/pwa.md)
- [TypeScript Conventions](./docs/agents/typescript.md)
