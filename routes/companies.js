"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const {
  BadRequestError,
  ExpressError,
  NotFoundError,
} = require("../expressError");

const { ensureLoggedIn, requireAdmin } = require("../middleware/auth");
const { validateQStrReq } = require("../middleware/filter");
const Company = require("../models/company");
const db = require("../db");
const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");

const router = new express.Router();

/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login
 */

router.post("/", ensureLoggedIn, requireAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.create(req.body);
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

/**
 *  Filter companies by one or all of the following query string parameters
 *  GET /[name, minEmployees, maxEmployees]  =>  [{ company }, { company }, { company }]
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/search", async function (req, res, next) {
  try {
    const companies = await Company.find(req.query);
    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    const companies = await Company.findAll();
    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  try {
    const { handle } = req.params;

    let company = await Company.get(handle);
    const jobsRes = await db.query(
      `SELECT 
            id, 
            title, 
            salary, 
            equity  
          FROM jobs
          WHERE company_handle=$1`,
      [handle]
    );

    if (!company) throw new NotFoundError(`No company: ${handle}`);
    if (jobsRes.rows) {
      //turn all equity values in jobs to a float number

      // Convert all equity values in jobs to a float number
      company.jobs = jobsRes.rows.map((job) => ({
        ...job,
        equity: job.equity !== null ? +job.equity : 0,
      }));
    }
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login
 */

router.patch(
  "/:handle",
  ensureLoggedIn,
  requireAdmin,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, companyUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const company = await Company.update(req.params.handle, req.body);
      return res.json({ company });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login
 */

router.delete(
  "/:handle",
  ensureLoggedIn,
  requireAdmin,
  async function (req, res, next) {
    try {
      await Company.remove(req.params.handle);
      return res.json({ deleted: req.params.handle });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
