/**
 * =============================================================================
 * utils/pagination.js — pagination helpers for list endpoints.
 * =============================================================================
 */

/**
 * Parse and clamp ?page & ?limit query params.
 * @param {number|string|undefined} page
 * @param {number|string|undefined} limit
 * @param {number} [defaultLimit]
 * @param {number} [maxLimit]
 */
function getPagination(page, limit, defaultLimit = 10, maxLimit = 100) {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const safePage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, maxLimit)
    : defaultLimit;

  return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
}

/**
 * Build a standard pagination meta object.
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 */
function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = { getPagination, buildPaginationMeta };
