/**
 * The sales module's shared logic.
 *
 * Everything here is pure and safe to import from a client component. Data
 * access lives in `./queries` and is deliberately left out of this barrel, so
 * a server-only import never gets pulled into a browser bundle by accident.
 */
export * from "./constants";
export * from "./dates";
export * from "./leads";
export * from "./outcomes";
export * from "./owners";
export * from "./strategies";
