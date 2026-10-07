/**
 * Test: Bowimi error envelope handling
 *
 * Validates that Bowimi API errors with structure:
 *   { ErrorType, Message, Details }
 * are surfaced as structured MCP tool errors (not raw stack traces).
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { BowimiAuth } from "../src/auth.js";
import { BowimiClient } from "../src/client.js";
import { MockFetch } from "./mock-fetch.js";
import { fixtures } from "./fixtures.js";

describe("Error envelope handling", () => {
  let mockFetch;
  let client;

  beforeEach(() => {
    mockFetch = new MockFetch();
    global.fetch = mockFetch.createFetch();

    const auth = new BowimiAuth({
      subdomain: "test",
      apiKey: "test:apikey123"
    });

    client = new BowimiClient(auth, "v4.6.1");
  });

  it("should surface {ErrorType, Message, Details} as structured error", async () => {
    const errorFixture = fixtures.error.validation;

    mockFetch.addResponse("entity", "QUERY", {
      status: 400,
      body: errorFixture
    });

    try {
      await client.getEntities([]);
      assert.fail("Should have thrown an error");
    } catch (err) {
      assert.ok(err instanceof Error, "Should throw Error instance");
      assert.ok(
        err.message.includes(errorFixture.Message),
        `Error message should include "${errorFixture.Message}"`
      );
      assert.ok(
        err.message.includes("400"),
        "Error message should include status code"
      );
      // Ensure it's not a raw stack trace
      assert.ok(
        !err.message.includes("at "),
        "Should not leak internal stack traces"
      );
    }
  });

  it("should handle 401 Unauthorized error", async () => {
    const errorFixture = fixtures.error.unauthorized;

    // Mock both the initial request and potential retry
    mockFetch.addResponse("users", "QUERY", {
      status: 401,
      body: errorFixture
    });
    mockFetch.addResponse("login-with-password", "POST", {
      status: 401,
      body: errorFixture
    });

    try {
      await client.queryUsers({ limit: 10, offset: 0 });
      assert.fail("Should have thrown an error");
    } catch (err) {
      // Should include the error message from the API response
      assert.ok(
        err.message.includes(errorFixture.Message) || err.message.includes(errorFixture.ErrorType),
        `Should include error details from API. Got: ${err.message}`
      );
      // Should not leak stack traces
      assert.ok(
        !err.message.includes(" at "),
        "Should not leak internal stack traces"
      );
    }
  });

  it("should handle 500 InternalServerError envelope", async () => {
    const errorFixture = fixtures.error.serverError;

    mockFetch.addResponse("activity", "QUERY", {
      status: 500,
      body: errorFixture
    });

    try {
      await client.getActivity({ _type: "all" });
      assert.fail("Should have thrown an error");
    } catch (err) {
      assert.ok(err.message.includes("500"), "Should include 500 status");
      assert.ok(
        err.message.includes(errorFixture.Message),
        "Should include server error message"
      );
      assert.ok(
        err.message.includes(errorFixture.ErrorType),
        "Should include ErrorType"
      );
    }
  });

  it("should handle error responses without ErrorType gracefully", async () => {
    // Some endpoints might return plain text or non-standard JSON
    mockFetch.addResponse("debug", "GET", {
      status: 404,
      body: "Not Found"
    });

    try {
      await client._get("debug/invalid-endpoint");
      assert.fail("Should have thrown an error");
    } catch (err) {
      assert.ok(err.message.includes("404"), "Should include status code");
      assert.ok(err.message.includes("Not Found"), "Should include response text");
    }
  });

  it("should parse nested error details from JSON response", async () => {
    const complexError = {
      ErrorType: "ValidationError",
      Message: "Multiple validation failures",
      Details: {
        fields: ["name", "email"],
        count: 2
      }
    };

    mockFetch.addResponse("locations", "POST", {
      status: 422,
      body: complexError
    });

    try {
      await client.createLocation({ name: "" });
      assert.fail("Should have thrown an error");
    } catch (err) {
      // Should contain the structured message, not the raw Details object
      assert.ok(err.message.includes(complexError.Message));
      assert.ok(err.message.includes("422"));
    }
  });
});
