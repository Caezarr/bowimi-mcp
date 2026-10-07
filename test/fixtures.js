/**
 * Test fixtures: mock responses and expected request shapes.
 */

export const fixtures = {
  query: {
    locations: {
      requestBody: { entityUuids: ["abc-123", "def-456"] },
      responseData: {
        Data: {
          "abc-123": { name: "Location A", address: "123 Main St" },
          "def-456": { name: "Location B", address: "456 Oak Ave" }
        }
      }
    },
    users: {
      requestBody: { limit: 50, offset: 0 },
      responseData: {
        Data: [
          { userUuid: "u1", name: "Alice" },
          { userUuid: "u2", name: "Bob" }
        ]
      }
    }
  },

  list: {
    products: {
      requestBody: {},
      responseData: {
        Data: [
          { productUuid: "p1", name: "Product 1", sku: "SKU1" },
          { productUuid: "p2", name: "Product 2", sku: "SKU2" }
        ]
      }
    }
  },

  error: {
    unauthorized: {
      ErrorType: "Unauthorized",
      Message: "Invalid API key",
      Details: { code: 401 }
    },
    validation: {
      ErrorType: "ValidationError",
      Message: "entityUuids is required",
      Details: { field: "entityUuids" }
    },
    serverError: {
      ErrorType: "InternalServerError",
      Message: "Database connection failed",
      Details: {}
    }
  }
};
