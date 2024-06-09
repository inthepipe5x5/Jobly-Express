"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      let payload = jwt.verify(token, SECRET_KEY);

      if (payload) {
        res.locals.user = {
          username: payload.username,
          isAdmin: payload.isAdmin,
        };
      }
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Authorization Middleware: Requires user is Admin.
 *
 * This is to be used on routes where only an Admin is permitted
 *
 */

function requireAdmin(req, res, next) {
  try {
    if (res.locals.user && res.locals.user.isAdmin) {
      return next();
    } else {
      throw new UnauthorizedError("Unauthorized", 401);
    }
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (res.locals.user) {
      return next();
    } else {
      throw new UnauthorizedError("Unauthorized", 401);
    }
  } catch (err) {
    return next(err);
  }
}

/** Middleware to check if request is being made by a user who matches the user profile they ar attempting to manipulate
 *
 * If not, raises Unauthorized.
 */

function ensureRightUser(req, res, next) {
  try {
    const { username, isAdmin } = res.locals.user || {};

    // If no user is authenticated, return an unauthorized error
    if (!username) {
      throw new UnauthorizedError("Unauthorized", 401);
    }

    // If the user is an admin, allow access
    if (isAdmin) {
      return next();
    }

    // If the user is not an admin, check if the requested username matches the authenticated user's username
    if (username === req.params.username) {
      return next();
    }

    // If the user is not an admin and the requested username doesn't match, return an unauthorized error
    throw new UnauthorizedError("Unauthorized", 401);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  requireAdmin,
  ensureRightUser,
};
