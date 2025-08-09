"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError, NotFoundError } = require("../expressError");
const { ensureLoggedIn, requireAdmin } = require("../middleware/auth");
const { validateQStrReq } = require("../middleware/filter");
const Job = require("../models/job");
const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const { AdzunaApi } = require("../helpers/adzunaApi");
const router = new express.Router();

/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: login, admin
 */
router.post("/", ensureLoggedIn, requireAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    console.error("Caught error in POST/ new jobs route:", err);
    return next(err);
  }
});

/** GET /search =>
 *   { jobs: [ { id, title, salary, equity, companyHandle }, ...] }
 *
 * Authorization required: none
 */

router.get("/search", async function (req, res, next) {
  try {
    const jobs = await Job.find(req.query);
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /[id]  =>  { job }
 *
 *  job is { id, title, salary, equity, companyHandle }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    if (!job) throw new NotFoundError();
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: login, admin
 */

router.patch(
  "/:id",
  ensureLoggedIn,
  requireAdmin,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, jobUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const job = await Job.update(req.params.id, req.body);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: login, admin
 */

router.delete(
  "/:id",
  ensureLoggedIn,
  requireAdmin,
  async function (req, res, next) {
    try {
      await Job.remove(req.params.id);
      return res.json({ deleted: req.params.id });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET / =>
 *   { jobs: [ { id, title, salary, equity, companyHandle }, ...] }
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    const jobs = await Job.findAll();
    if (!jobs) throw new NotFoundError();
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

router.get("/search", validateQStrReq, async function (req, res, next) {
  try {
    const location0 = req?.query?.country ?? "ca";
    const location1 = req?.query?.region ?? "on";
    const location2 = req?.query?.city ?? "toronto";
    const adzunaApi = new AdzunaApi();

    const adzunaJobs = await adzunaApi.searchJobs({
      searchTerm: req?.query?.title ?? req?.query?.searchTerms,
      category: req.query?.category ?? null,
      salaryMinInt: req?.query?.minSalary ?? null,
      salaryMaxInt: req?.query?.maxSalary ?? null,
      location0,
      location1,
      location2,
      page: req?.query?.page ?? 1,
      resultsPerPage: req?.query?.resultsPerPage ?? 20,
      fullTime: req?.query?.fullTime === 'true' ? true : null,
      partTime: req?.query?.partTime === 'true' ? true : null,
      contractJobsOnly: req?.query?.contractJobsOnly === 'true' ? true : null,
      permanentJobsOnly: req?.query?.permanentJobsOnly === 'true' ? true : null,
      sortDirection: req?.query?.sortDirection ?? null,
      sortBy: req?.query?.sortBy ?? null,
    });

    if (!adzunaJobs || adzunaJobs.length === 0) {
      throw new NotFoundError(`No jobs found matching the search criteria.`);
    }

    return res.json({ ...adzunaJobs });

  } catch (err) {
    return next(err);
  }
});


module.exports = router;
