/**
 * Mapping of Bowimi HTTP failures to JavaScript errors.
 *
 * Tools never catch these: the MCP SDK turns a thrown error into a tool
 * result with `isError: true` and the error message as text, so the message
 * format below is what the model sees.
 */

/** Error raised for any non-2xx Bowimi API response. */
export class BowimiApiError extends Error {
  /**
   * @param {string} path API path that failed (e.g. "entity").
   * @param {number} status HTTP status code.
   * @param {string} detail Human-readable detail extracted from the body.
   * @param {string} [errorType] Bowimi `ErrorType`, when the body is an error envelope.
   */
  constructor(path, status, detail, errorType) {
    super(`Bowimi API ${path} → ${status}: ${detail}`);
    this.name = "BowimiApiError";
    this.path = path;
    this.status = status;
    this.errorType = errorType;
  }
}

/**
 * Build the error for a failed response body.
 *
 * Bowimi errors usually come as `{ ErrorType, Message, Details }`; other JSON
 * bodies fall back to `message` or the serialised body, and non-JSON bodies
 * are passed through verbatim.
 *
 * @param {string} path
 * @param {number} status
 * @param {string} text Raw response body.
 * @returns {BowimiApiError}
 */
export function toApiError(path, status, text) {
  let detail = text;
  let errorType;
  try {
    const j = JSON.parse(text);
    if (j.ErrorType && j.Message) {
      detail = `${j.ErrorType}: ${j.Message}`;
      errorType = j.ErrorType;
    } else {
      detail = j.message || JSON.stringify(j);
    }
  } catch {}
  return new BowimiApiError(path, status, detail, errorType);
}

/**
 * Parse a successful response body, unwrapping Bowimi's `{ Data }` envelope.
 *
 * @param {string} text Raw response body.
 * @returns {unknown} Parsed payload, raw text if not JSON, or null if empty.
 */
export function parseSuccessBody(text) {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && "Data" in parsed) {
      return parsed.Data;
    }
    return parsed;
  } catch {
    return text;
  }
}
