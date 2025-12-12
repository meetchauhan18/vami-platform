/**
 * Pagination middleware
 * Parses and validates pagination query parameters
 */
export const paginationMiddleware = (req, res, next) => {
  // Parse page (default: 1, min: 1)
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  // Parse limit (default: 20, min: 1, max: 100)
  let limit = parseInt(req.query.limit, 10) || 20;
  limit = Math.min(100, Math.max(1, limit));

  // Calculate skip
  const skip = (page - 1) * limit;

  // Attach to request
  req.pagination = {
    page,
    limit,
    skip,
  };

  next();
};

export default paginationMiddleware;
