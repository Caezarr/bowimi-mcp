/**
 * Test: QUERY request contract
 *
 * Validates that QUERY operations send:
 * - method: "QUERY"
 * - URL: correct endpoint
 * - body: expected JSON payload
 * - unwrap {Data: ...} from response
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { BowimiAuth } from "../src/auth.js";
import { BowimiClient } from "../src/client.js";
import { MockFetch } from "./mock-fetch.js";
import { fixtures } from "./fixtures.js";

describe("QUERY request contract", () => {
  let mockFetch;
  let client;

  beforeEach(() => {
    mockFetch = new MockFetch();
    global.fetch = mockFetch.createFetch();

    // Configure mock auth (static API key)
    const auth = new BowimiAuth({
      subdomain: "test",
      apiKey: "test:apikey123"
    });

    client = new BowimiClient(auth, "v4.6.1");
  });

  it("should send QUERY method with correct body for entity lookup", async () => {
    const fixture = fixtures.query.locations;

    mockFetch.addResponse("entity", "QUERY", {
      status: 200,
      body: fixture.responseData
    });

    const result = await client.getEntities(fixture.requestBody.entityUuids);

    const calls = mockFetch.getCalls("QUERY");
    assert.strictEqual(calls.length, 1, "Should make exactly one QUERY call");

    const call = calls[0];
    assert.strictEqual(call.method, "QUERY");
    assert.ok(call.url.includes("/_api/v4.6.1/entity"), "Should call /entity endpoint");
    assert.deepStrictEqual(
      call.body,
      fixture.requestBody,
      "Should send entityUuids in body"
    );

    // Verify response unwrapping
    assert.deepStrictEqual(
      result,
      fixture.responseData.Data,
      "Should unwrap {Data: ...} envelope"
    );
  });

  it("should send QUERY method with pagination for user list", async () => {
    const fixture = fixtures.query.users;

    mockFetch.addResponse("users", "QUERY", {
      status: 200,
      body: fixture.responseData
    });

    const result = await client.queryUsers(fixture.requestBody);

    const calls = mockFetch.getCalls("QUERY");
    assert.strictEqual(calls.length, 1);

    const call = calls[0];
    assert.strictEqual(call.method, "QUERY");
    assert.ok(call.url.includes("/_api/v4.6.1/users"), "Should call /users endpoint");
    assert.ok(call.url.includes("fields="), "Should include fields query param");
    assert.deepStrictEqual(
      call.body,
      fixture.requestBody,
      "Should send pagination params in body"
    );

    // Verify response unwrapping
    assert.deepStrictEqual(
      result,
      fixture.responseData.Data,
      "Should unwrap {Data: ...} envelope"
    );
  });

  it("should include Authorization header in all requests", async () => {
    mockFetch.addResponse("entity", "QUERY", {
      status: 200,
      body: { Data: {} }
    });

    await client.getEntities(["test-uuid"]);

    const calls = mockFetch.getCalls("QUERY");
    const call = calls[0];

    assert.ok(call.headers.Authorization, "Should include Authorization header");
    assert.ok(
      call.headers.Authorization.startsWith("Bearer "),
      "Should use Bearer token"
    );
  });
});
