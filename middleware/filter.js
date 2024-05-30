//middle ware to validate and parse requests to filter companies, users, jobs
const { BadRequestError } = require("../expressError");
/**
 * Middleware function to validate and parse query string parameters for
 * filtering companies and jobs.
 *
 * For the `/companies` route, it expects the following query parameters:
 * - name (string, optional): The name of the company to search for.
 * - minEmployees (number, optional): The minimum number of employees.
 * - maxEmployees (number, optional): The maximum number of employees.
 *
 * For the `/jobs` route, it expects the following query parameters:
 * - title (string, optional): The title of the job to search for.
 * - minSalary (number, optional): The minimum salary for the job.
 * - maxSalary (number, optional): The maximum salary for the job.
 *
 * The middleware performs the following validations:
 * 1. Checks if the provided query parameters are valid for the respective route.
 * 2. Ensures that the `minEmployees` or `minSalary` value is not greater than
 *    the `maxEmployees` or `maxSalary` value, respectively.
 * 3. Verifies that the `minEmployees`, `maxEmployees`, `minSalary`, and
 *    `maxSalary` values are valid numbers.
 * 4. Checks that the `name` and `title` values are strings.
 *
 * If any validation fails, the middleware throws a `BadRequestError` with an
 * appropriate error message.
 *
 * If the query parameters are valid, the middleware creates an `outputQuery`
 * object containing the parsed and validated query parameters and attaches it
 * to the `req.searchQuery` property.
 
 */

const validateQStrReq = (req, res, next) => {
  const urlPath = req.path;
  const queryKeys = urlPath.startsWith("/companies")
    ? ["name", "minEmployees", "maxEmployees"]
    : urlPath.startsWith("/jobs")
    ? ["title", "minSalary", "maxSalary"]
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

  const { name, minEmployees, maxEmployees, title, minSalary, maxSalary } =
    outputQuery;

  if (
    (minEmployees !== undefined && maxEmployees !== undefined && +minEmployees > +maxEmployees) ||
    (minSalary !== undefined && maxSalary !== undefined && +minSalary > +maxSalary)
  ) {
    return next(new BadRequestError("Invalid min/max values"));
  }

  if (
    (minEmployees !== undefined && isNaN(+minEmployees)) ||
    (maxEmployees !== undefined && isNaN(+maxEmployees)) ||
    (minSalary !== undefined && isNaN(+minSalary)) ||
    (maxSalary !== undefined && isNaN(+maxSalary))
  ) {
    return next(new BadRequestError("Invalid numeric value"));
  }

  if (
    (name !== undefined && typeof name !== "string") ||
    (title !== undefined && typeof title !== "string")
  ) {
    return next(new BadRequestError("Invalid string value"));
  }

  req.searchQuery = outputQuery;
  return next();
};

module.exports = {
  validateQStrReq,
};