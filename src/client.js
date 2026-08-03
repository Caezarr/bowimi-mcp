/**
 * Bowimi API client.
 * Wraps all discovered endpoints with typed methods.
 *
 * API base: https://{subdomain}.bowimi.com/_api/v{version}/
 * Methods: GET, POST, QUERY (custom), LIST (custom)
 */

export class BowimiClient {
  constructor(auth, version = "v4.6.1") {
    this.auth = auth;
    this.version = version;
  }

  get base() {
    return `${this.auth.apiBase}/${this.version}`;
  }

  async _get(path, params) {
    const url = new URL(`${this.base}/${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const res = await this.auth.fetch(url.toString());
    return this._handle(res, path);
  }

  async _post(path, body) {
    const res = await this.auth.fetch(`${this.base}/${path}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return this._handle(res, path);
  }

  async _query(path, body, params) {
    const url = new URL(`${this.base}/${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const res = await this.auth.fetch(url.toString(), {
      method: "QUERY",
      body: JSON.stringify(body),
    });
    return this._handle(res, path);
  }

  async _list(path, body) {
    const res = await this.auth.fetch(`${this.base}/${path}`, {
      method: "LIST",
      body: JSON.stringify(body),
    });
    return this._handle(res, path);
  }

  async _patch(path, body) {
    const res = await this.auth.fetch(`${this.base}/${path}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return this._handle(res, path);
  }

  async _delete(path) {
    const res = await this.auth.fetch(`${this.base}/${path}`, {
      method: "DELETE",
    });
    return this._handle(res, path);
  }

  async _handle(res, path) {
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try {
        const j = JSON.parse(text);
        msg = j.message || JSON.stringify(j);
      } catch {}
      throw new Error(`Bowimi API ${path} → ${res.status}: ${msg}`);
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  // ── App ────────────────────────────────────────────────────────────────────

  getAppInfo() {
    return this._get("app-info");
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  queryUsers(body) {
    return this._query(
      "users?fields=userUuid,name,friendlyName,emailAddress,enabled,roleUuids,avatar,owner",
      body
    );
  }

  listUsers(fields) {
    return fields
      ? this._query("users", {}, { fields: fields.join(",") })
      : this._get("user");
  }

  getCurrentUser() {
    return this._get("users/current");
  }

  inviteUser({ email, roleUuid, name }) {
    return this._post("users", { email, roleUuid, name });
  }

  updateUser(userUuid, data) {
    return this._patch(`users/${userUuid}`, data);
  }

  deleteUser(userUuid) {
    return this._delete(`users/${userUuid}`);
  }

  // ── Tags ───────────────────────────────────────────────────────────────────

  queryTags(body) {
    return this._query("tags?fields=tagUuid,name,colour,groupName,tagGroupUuid,tagIndex", body);
  }

  /**
   * @param {string} [intent] - "location" | "company" | undefined (all)
   */
  listTags(intent) {
    return this._get("tag", intent ? { intent } : undefined);
  }

  createTag({ name, tagGroupUuid, description, colour }) {
    return this._post("tags", { name, tagGroupUuid, description, colour });
  }

  updateTag(tagUuid, data) {
    return this._patch(`tags/${tagUuid}`, data);
  }

  deleteTag(tagUuid) {
    return this._delete(`tags/${tagUuid}`);
  }

  // ── Tag groups ─────────────────────────────────────────────────────────────

  queryTagGroups(body) {
    return this._query("tag-groups?fields=tagGroupUuid,name,index,pipeline,scopes", body);
  }

  createTagGroup({ name, index, pipeline, scopes }) {
    return this._post("tag-groups", { name, index, pipeline, scopes });
  }

  updateTagGroup(tagGroupUuid, data) {
    return this._patch(`tag-groups/${tagGroupUuid}`, data);
  }

  deleteTagGroup(tagGroupUuid) {
    return this._delete(`tag-groups/${tagGroupUuid}`);
  }

  // ── Roles ─────────────────────────────────────────────────────────────────

  queryRoles(body) {
    return this._query("roles?fields=roleUuid,name,permissionKeys", body);
  }

  createRole({ name, permissionKeys }) {
    return this._post("roles", { name, permissionKeys });
  }

  updateRole(roleUuid, data) {
    return this._patch(`roles/${roleUuid}`, data);
  }

  deleteRole(roleUuid) {
    return this._delete(`roles/${roleUuid}`);
  }

  // ── Teams ─────────────────────────────────────────────────────────────────

  queryTeams(body) {
    return this._query("teams?fields=teamUuid,name,shortName,colour", body);
  }

  createTeam({ name, shortName, colour }) {
    return this._post("teams", { name, shortName, colour });
  }

  updateTeam(teamUuid, data) {
    return this._patch(`teams/${teamUuid}`, data);
  }

  deleteTeam(teamUuid) {
    return this._delete(`teams/${teamUuid}`);
  }

  getTeamMembers(teamUuid) {
    return this._get(`teams/${teamUuid}/members`);
  }

  addTeamMember(teamUuid, userUuid) {
    return this._post(`teams/${teamUuid}/members`, { userUuid });
  }

  removeTeamMember(teamUuid, userUuid) {
    return this._delete(`teams/${teamUuid}/members/${userUuid}`);
  }

  // ── Attributes ────────────────────────────────────────────────────────────

  queryAttributes(body) {
    return this._query("attributes?fields=attributeUuid,name,jsonName,description,schema,scopes,pinned,sequence", body);
  }

  getEntityAttributes(entityUuid) {
    return this._get(`entity/${entityUuid}/attributes`);
  }

  setEntityAttributes(entityUuid, attributes) {
    return this._patch(`entity/${entityUuid}/attributes`, { attributes });
  }

  queryEntityAttributes(body) {
    return this._query("entity/attributes?fields=attributeUuid,entityUuid,jsonName,data", body);
  }

  // ── Distribution profiles ─────────────────────────────────────────────────

  queryDistributionProfiles(body) {
    return this._query("distribution-profiles?fields=profileUuid,name,entityUuid", body);
  }

  // ── Surveys ────────────────────────────────────────────────────────────────

  listSurveys() {
    return this._get("survey");
  }

  querySurveys(body) {
    return this._query("surveys?fields=surveyUuid,name,active,createdAt,questionUuids", body);
  }

  // ── Locations (entities) ───────────────────────────────────────────────────

  /**
   * Get full details for specific entity UUIDs.
   * @param {string[]} entityUuids
   */
  getEntities(entityUuids) {
    return this._query("entity", { entityUuids });
  }

  getEntityTags(entityUuids) {
    return this._query("entity/tag", { entityUuids });
  }

  getEntityProducts(entityUuids) {
    return this._query("entity/product", { entityUuids });
  }

  getEntityTaskStatuses(entityUuids) {
    return this._query("entity/task-status", { entityUuids });
  }

  /**
   * Create a location.
   * @param {{ name: string, address: string, coordinates: {lat: number, lng: number}, ... }} data
   */
  createLocation(data) {
    return this._post("locations", data);
  }

  updateLocation(entityUuid, data) {
    return this._patch(`locations/${entityUuid}`, data);
  }

  deleteLocation(entityUuid) {
    return this._delete(`locations/${entityUuid}`);
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  getTaskSummary(userUuid) {
    return this._get("task-summary", userUuid ? { userUuid } : undefined);
  }

  /**
   * @param {{ title: string, entityUuid?: string, dueDate?: string, assignedUserUuid?: string }} data
   */
  createTask(data) {
    return this._post("tasks", data);
  }

  updateTask(taskUuid, data) {
    return this._patch(`tasks/${taskUuid}`, data);
  }

  deleteTask(taskUuid) {
    return this._delete(`tasks/${taskUuid}`);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  getOrderSummary(userUuid) {
    return this._get("order/summary", userUuid ? { userUuid } : undefined);
  }

  /**
   * @param {string[]} orderUuids
   */
  getOrders(orderUuids) {
    return this._query("order", { orderUuids });
  }

  /**
   * @param {{ entityUuid, profileUuid, origin, items: [{productUuid, quantity}] }} data
   */
  createOrder(data) {
    return this._post("orders", data);
  }

  queryOrders(body) {
    return this._query(
      "orders?fields=orderUuid,entityUuid,createdAt,orderedAt,items,brandStatus,distributorStatus,origin,distributorName,accountNumber,createdBy",
      body
    );
  }

  updateOrder(orderUuid, data) {
    return this._patch(`orders/${orderUuid}`, data);
  }

  deleteOrder(orderUuid) {
    return this._delete(`orders/${orderUuid}`);
  }

  // ── Products ───────────────────────────────────────────────────────────────

  listProducts() {
    return this._query("product", {});
  }

  getProductDetails(productUuids) {
    return this._query("product/details", { productUuids });
  }

  /**
   * @param {{ name: string, sku: string, description?: string, rangeId?: string }} data
   */
  createProduct(data) {
    return this._post("products", data);
  }

  queryProducts(body) {
    return this._query("products?fields=productUuid,name,sku,ean,description,rangeIds,tagUuids", body);
  }

  updateProduct(productUuid, data) {
    return this._patch(`products/${productUuid}`, data);
  }

  deleteProduct(productUuid) {
    return this._delete(`products/${productUuid}`);
  }

  queryProductCases(body) {
    return this._query("product-cases?fields=caseId,name,productUuid,profileUuid,caseSize,price,sku", body);
  }

  // ── Companies ──────────────────────────────────────────────────────────────

  listCompanyUuids() {
    return this._query("company", {});
  }

  /**
   * @param {{ name: string }} data
   */
  createCompany(data) {
    return this._post("companies", data);
  }

  queryCompanies(body) {
    return this._query("companies?fields=entityUuid,name,accountNumber,domain,isDistributor,isPrimaryCompany,tagUuids", body);
  }

  updateCompany(entityUuid, data) {
    return this._patch(`companies/${entityUuid}`, data);
  }

  deleteCompany(entityUuid) {
    return this._delete(`companies/${entityUuid}`);
  }

  // ── Contacts ───────────────────────────────────────────────────────────────

  getContacts(contactUuids) {
    return this._query("contact", { contactUuids });
  }

  /**
   * @param {{ entityUuid: string, name: string, email?: string, phone?: string, primary?: boolean }} data
   */
  createOrUpdateContact(data) {
    return this._post("contacts", data);
  }

  // ── Activity ───────────────────────────────────────────────────────────────

  getVisitSummary() {
    return this._get("entity-visit/summary");
  }

  /**
   * Get activity feed.
   * @param {{ _type: "all"|"survey"|"order"|"task", entityUuid?: string, userUuid?: string, from?: string, to?: string, snowDay?: string }} filter
   */
  getActivity(filter) {
    return this._query("activity", filter);
  }

  /**
   * Get survey question definitions for a survey.
   * @param {string} surveyUuid
   */
  getSurvey(surveyUuid) {
    return this._get(`survey/${surveyUuid}`);
  }

  /**
   * Get survey questions via official endpoint (preferred).
   * @param {string} surveyUuid
   */
  getSurveyQuestions(surveyUuid) {
    return this._get(`surveys/${surveyUuid}/questions`);
  }

  /**
   * Query survey responses (official paginated endpoint).
   * @param {{ createdAfter?: string, createdBefore?: string, entityUuids?: string[], surveyUuids?: string[], responseUuids?: string[], limit?: number, offset?: number }} body
   */
  querySurveyResponses(body) {
    return this._query(
      "survey-responses?fields=createdAt,entityUuid,responseUuid,surveyUuid,userUuid,verified",
      body
    );
  }

  /**
   * Get answers for a survey response (official endpoint).
   * Returns {responseUuid, items: [{questionUuid, value: string}], total}
   * @param {string} responseUuid
   */
  getSurveyResponseAnswers(responseUuid) {
    return this._get(`survey-responses/${responseUuid}/answers`);
  }

  /**
   * Get full visit details from a survey response UUID (legacy).
   * @param {string} responseUuid
   */
  getVisitFromResponse(responseUuid) {
    return this._get(`visit/from-response/${responseUuid}`);
  }

  /**
   * Query locations with pagination and optional search.
   * @param {{ searchTerm?: string, entityUuids?: string[], limit?: number, offset?: number }} body
   * @param {string} fields  comma-separated field list
   */
  queryLocations(body, fields = "entityUuid,name,address") {
    return this._query(`locations?fields=${fields}`, body);
  }

  /**
   * Query tasks with filters.
   * @param {{ entityUuids?: string[], taskUuids?: string[], resolved?: boolean, limit?: number, offset?: number }} body
   */
  queryTasks(body) {
    return this._query(
      "tasks?fields=taskUuid,title,status,dueDate,entityUuid,allocatedUserUuids,description,resolvedAt,createdAt,createdBy,source",
      body
    );
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  getLatestNotification() {
    return this._get("notification/latest");
  }

  // ── Routes ────────────────────────────────────────────────────────────────

  /**
   * Get current user's route (My Route).
   * Returns stops ordered by sequence with entityUuid, groupName, coordinates.
   */
  getRoute() {
    return this._post("route", {});
  }

  // ── Contacts ──────────────────────────────────────────────────────────────

  /**
   * Get contact UUIDs for a location/entity.
   * @param {string} entityUuid
   */
  getEntityContactUuids(entityUuid) {
    return this._get(`entity/${entityUuid}/contact`);
  }

  /**
   * Get contact details by UUIDs.
   * @param {string[]} contactUuids
   */
  getContactDetails(contactUuids) {
    return this._query("contact", { contactUuids });
  }

  // ── Shortcuts ─────────────────────────────────────────────────────────────

  listShortcuts() {
    return this._get("shortcut");
  }
}
