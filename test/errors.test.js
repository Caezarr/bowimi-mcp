/**
 * Test: error mapping helpers in src/errors.js.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { BowimiApiError, parseSuccessBody, toApiError } from "../src/errors.js";

describe("toApiError", () => {
  it("formats the Bowimi {ErrorType, Message, Details} envelope", () => {
    const err = toApiError("entity", 400, JSON.stringify({ ErrorType: "ValidationError", Message: "bad uuid", Details: {} }));
    assert.ok(err instanceof BowimiApiError);
    assert.ok(err instanceof Error);
    assert.strictEqual(err.message, "Bowimi API entity → 400: ValidationError: bad uuid");
    assert.strictEqual(err.status, 400);
    assert.strictEqual(err.path, "entity");
    assert.strictEqual(err.errorType, "ValidationError");
  });

  it("falls back to `message`, then to the serialised JSON body", () => {
    assert.strictEqual(toApiError("x", 404, '{"message":"not found"}').message, "Bowimi API x → 404: not found");
    assert.strictEqual(toApiError("x", 409, '{"code":7}').message, 'Bowimi API x → 409: {"code":7}');
  });

  it("passes non-JSON bodies through verbatim", () => {
    const err = toApiError("x", 502, "<html>Bad gateway</html>");
    assert.strictEqual(err.message, "Bowimi API x → 502: <html>Bad gateway</html>");
    assert.strictEqual(err.errorType, undefined);
  });
});

describe("parseSuccessBody", () => {
  it("unwraps the {Data} envelope", () => {
    assert.deepStrictEqual(parseSuccessBody('{"Data":[1,2]}'), [1, 2]);
  });

  it("returns plain JSON, raw text, or null for an empty body", () => {
    assert.deepStrictEqual(parseSuccessBody('{"a":1}'), { a: 1 });
    assert.strictEqual(parseSuccessBody("ok"), "ok");
    assert.strictEqual(parseSuccessBody(""), null);
  });
});
