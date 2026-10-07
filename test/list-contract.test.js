/**
 * Test: LIST request contract
 *
 * Validates that LIST operations send:
 * - method: "LIST"
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

describe("LIST request contract", () => {
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

  it("should send LIST method with empty body for product catalog", async () => {
    const fixture = fixtures.list.products;

    mockFetch.addResponse("product", "LIST", {
      status: 200,
      body: fixture.responseData
    });

    const result = await client.listProducts();

    const calls = mockFetch.getCalls("LIST");
    assert.strictEqual(calls.length, 1, "Should make exactly one LIST call");

    const call = calls[0];
    assert.strictEqual(call.method, "LIST");
    assert.ok(call.url.includes("/_api/v4.6.1/product"), "Should call /product endpoint");
    assert.deepStrictEqual(
      call.body,
      fixture.requestBody,
      "Should send empty body for list-all"
    );

    // Verify response unwrapping
    assert.deepStrictEqual(
      result,
      fixture.responseData.Data,
      "Should unwrap {Data: ...} envelope"
    );
  });

  it("should include Authorization header in LIST requests", async () => {
    mockFetch.addResponse("product", "LIST", {
      status: 200,
      body: { Data: [] }
    });

    await client.listProducts();

    const calls = mockFetch.getCalls("LIST");
    const call = calls[0];

    assert.ok(call.headers.Authorization, "Should include Authorization header");
    assert.ok(
      call.headers.Authorization.startsWith("Bearer "),
      "Should use Bearer token"
    );
  });

  it("should handle LIST method with body parameters", async () => {
    // Note: _list is the internal method; testing the contract directly
    mockFetch.addResponse("companies", "LIST", {
      status: 200,
      body: { Data: [{ entityUuid: "c1", name: "Company A" }] }
    });

    const result = await client._list("companies", { searchTerm: "Company" });

    const calls = mockFetch.getCalls("LIST");
    assert.strictEqual(calls.length, 1);

    const call = calls[0];
    assert.strictEqual(call.method, "LIST");
    assert.deepStrictEqual(
      call.body,
      { searchTerm: "Company" },
      "Should send search parameters in body"
    );
  });
});
