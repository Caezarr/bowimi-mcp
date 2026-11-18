/**
 * Helpers for building MCP tool results.
 */

/**
 * @typedef {{ content: Array<{ type: "text", text: string }> }} TextResult
 */

/**
 * Wrap any JSON-serialisable value as a pretty-printed MCP text result.
 *
 * @param {unknown} data
 * @returns {TextResult}
 */
export function jsonResult(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
