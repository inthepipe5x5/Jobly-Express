const { BadRequestError } = require("../expressError");

/**
 * Middleware function to validate and parse query string parameters for
 * filtering companies and jobs.
 */
const validateQStrReq = (req, res, next) => {
  const urlPath = req.path;
  const queryKeys = urlPath.startsWith("/companies")
    ? ["name", "minEmployees", "maxEmployees"]
    : urlPath.startsWith("/jobs")
    ? ["title", "minSalary", "maxSalary", 'hasEquity']
    : [];

  if (!queryKeys.length) {
    return next();
  }

  const outputQuery = {};

  for (const key of queryKeys) {
    const value = req.query[key];
    if (value !== undefined) {
      outputQuery[key] = value;
    }
  }

  const { name, minEmployees, maxEmployees, title, minSalary, maxSalary, hasEquity } = outputQuery;

  // Validate min/max values
  if (
    (minEmployees !== undefined && maxEmployees !== undefined && +minEmployees > +maxEmployees) ||
    (minSalary !== undefined && maxSalary !== undefined && +minSalary > +maxSalary)
  ) {
    return next(new BadRequestError("Invalid min/max values"));
  }

  // Validate numeric values
  if (
    (minEmployees !== undefined && isNaN(+minEmployees)) ||
    (maxEmployees !== undefined && isNaN(+maxEmployees)) ||
    (minSalary !== undefined && isNaN(+minSalary)) ||
    (maxSalary !== undefined && isNaN(+maxSalary))
  ) {
    return next(new BadRequestError("Invalid numeric value"));
  }

  // Validate string values
  if (
    (name !== undefined && typeof name !== "string") ||
    (title !== undefined && typeof title !== "string")
  ) {
    return next(new BadRequestError("Invalid string value"));
  }

  // Validate boolean values
  if (
    hasEquity !== undefined && !(hasEquity === 'true' || hasEquity === 'false')
  ) {
    return next(new BadRequestError("Invalid boolean value"));
  }


  req.searchQuery = outputQuery;
  console.log("Validated Query Parameters:", req.searchQuery); // Logging for debugging
  return next();
};

module.exports = {
  validateQStrReq,
};
