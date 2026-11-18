/**
 * Zod fragments shared by several tool input schemas.
 *
 * Tool-specific fields stay next to their tool in src/tools/*; only fragments
 * that are byte-for-byte identical across tools live here.
 */
import { z } from "zod";

/** Zero-based pagination offset used by every `query_*` tool. */
export const offsetParam = z.number().int().min(0).default(0);

/**
 * Page size (1-100) with a per-tool default.
 *
 * @param {number} defaultValue
 */
export function limitParam(defaultValue) {
  return z.number().int().min(1).max(100).default(defaultValue);
}
