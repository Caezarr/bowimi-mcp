/**
 * Mock fetch implementation for testing.
 * Captures request details and returns configured responses.
 */

export class MockFetch {
  constructor() {
    this.calls = [];
    this.responses = new Map();
  }

  /**
   * Configure a response for a specific endpoint + method.
   * @param {string} urlPattern - URL pattern to match
   * @param {string} method - HTTP method
   * @param {object} response - { status, body, headers }
   */
  addResponse(urlPattern, method, response) {
    const key = `${method}:${urlPattern}`;
    this.responses.set(key, response);
  }

  /**
   * Mock fetch function to use in tests.
   */
  createFetch() {
    return async (url, options = {}) => {
      const method = options.method || "GET";
      const body = options.body ? JSON.parse(options.body) : null;

      // Record the call
      this.calls.push({
        url,
        method,
        body,
        headers: options.headers || {}
      });

      // Find matching response
      for (const [key, response] of this.responses) {
        const [respMethod, pattern] = key.split(":", 2);
        if (method === respMethod && url.includes(pattern)) {
          return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            headers: new Map(Object.entries(response.headers || {})),
            text: async () => JSON.stringify(response.body),
            json: async () => response.body
          };
        }
      }

      // Default 404
      return {
        ok: false,
        status: 404,
        headers: new Map(),
        text: async () => "Not Found",
        json: async () => ({ error: "Not Found" })
      };
    };
  }

  /**
   * Get all calls for a specific method.
   */
  getCalls(method) {
    return this.calls.filter(c => c.method === method);
  }

  /**
   * Reset recorded calls.
   */
  reset() {
    this.calls = [];
  }
}
