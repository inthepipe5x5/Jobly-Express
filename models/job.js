"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, handle, company, equity }
   *
   * Returns { title, salary, handle, company, equity }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, handle, company, equity }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM jobs
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${handle}`);

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, handle, company, equity)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING title, salary, handle AS "jobHandle", company, equity`,
      [title, salary, handle, company, equity]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ handle, title, handle, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
      `SELECT title, salary, handle, company, equity
           FROM jobs
           ORDER BY title`
    );
    return jobsRes.rows;
  }

  /** Given a job handle, return data about job.
   *
   * Returns { title, salary, handle, company, equity }
   *   where jobs is [{ id, title, salary, equity, jobHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const jobRes = await db.query(
      `SELECT handle AS "jobHandle",
                  title,
                  equity,
                  salary, 
                  company                  
           FROM jobs
           WHERE handle = $1`,
      [handle]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${handle}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {handle, title, salary, equity, company}
   *
   * Returns {handle, handle, title, salary, equity, company}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    if (
      data["id"] ||
      data["company"] ||
      data["job_company"] ||
      data["jobCompany"]
    ) {
      return new BadRequestError(`Invalid update parameters: ${data}`, 400);
    }
    const { setCols, values } = sqlForPartialUpdate(data, {
      jobHandle: "handle",
      title: "title",
      salary: "salary",
      equity: "equity",
    });
    //dynamically set handleVarIdx depending where it is passed in the values array

    const handleVarIdx =
      "$" +
        setCols.split(", ").find((sqlStr) => sqlStr.startsWith("handle"))[-1] ||
      "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                title,
                                salary,
                                equity,
                                company
                                            `;
    const result = await db.query(querySql, [...values, handle]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${handle}`);

    return job;
  }
  /** Find a list of jobs given a list of search parameters: title, minEmployees, maxEmployees
   *
   */

  static async find(searchQuery) {
    const { title, minSalary, maxSalary, hasEquity } =
      searchQuery || {};

    // Build the WHERE clause dynamically
    const whereClauses = [];
    const values = [];

    if (title) {
      whereClauses.push("title ILIKE $1");
      values.push(`%${title}%`);
    }

    if (minSalary) {
      whereClauses.push("salary >= $" + (values.length + 1));
      values.push(minSalary);
    }

    if (maxSalary) {
      whereClauses.push("salary <= $" + (values.length + 1));
      values.push(maxSalary);
    }

    if (hasEquity) {
      whereClauses.push("equity > $" + (values.length + 1));
      values.push("0");
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
    SELECT id, 
           title,
           handle,
           salary,
           equity,
           company
    FROM jobs
    ${whereClause}
  `;

    try {
      const result = await db.query(query, values);
      const jobs = result.rows;

      if (jobs.length === 0) {
        throw new NotFoundError(`No jobs found matching the search criteria.`);
      }

      return jobs;
    } catch (error) {
      throw new Error(`Error executing database query: ${error.message}`);
    }
  }
  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/
  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${handle}`);
  }
}

module.exports = Job;
