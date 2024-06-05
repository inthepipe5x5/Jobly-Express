"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   * */
  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];
    {
      // convert equity property to float num if job is truthy
      if (job.equity === null || !job.equity) job.equity = null;
      else {
        // Parse equity string using `+` operator which is faster than parseFloat() given we will only work with 0 < equity < 1 or null values
        job.equity = +job.equity;
        // Check if NaN
        job.equity = isNaN(job.equity) ? null : job.equity;
      }
      return job;
    }
  }

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */
  static async findAll() {
    const jobsRes = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           ORDER BY title`
    );
    return jobsRes.rows.map((job) => {
      // Map function to loop through array of job objects and convert equity property to float num if truthy
      if (job.equity === null || !job.equity) job.equity = null;
      else {
        // Parse equity string using `+` operator which is faster than parseFloat() given we will only work with 0 < equity < 1 or null values
        job.equity = +job.equity;
        // Check if NaN
        job.equity = isNaN(job.equity) ? null : job.equity;
      }
      return job;
    });
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   **/
  static async get(id) {
    const jobRes = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
      [id]
    );
    const job = jobRes.rows[0];
    if (!job) throw new NotFoundError(`No job: ${id}`);
    else {
      // convert equity property to float num if job is truthy
      if (job.equity === null || !job.equity) job.equity = null;
      else {
        // Parse equity string using `+` operator which is faster than parseFloat() given we will only work with 0 < equity < 1 or null values
        job.equity = +job.equity;
        // Check if NaN
        job.equity = isNaN(job.equity) ? null : job.equity;
      }
      return job;
    }
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */
  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      companyHandle: "company_handle",
    });
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
    else {
        // convert equity property to float num if job is truthy
        if (job.equity === null || !job.equity) job.equity = null;
        else {
          // Parse equity string using `+` operator which is faster than parseFloat() given we will only work with 0 < equity < 1 or null values
          job.equity = +job.equity;
          // Check if NaN
          job.equity = isNaN(job.equity) ? null : job.equity;
        }
        return job;
      }
    }

  /** Find a list of jobs given a list of search parameters: title, minSalary, maxSalary, hasEquity
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   */
  static async find(searchQuery) {
    const { title, minSalary, maxSalary, hasEquity } = searchQuery || {};

    // Build the WHERE clause dynamically
    const whereClauses = [];
    const values = [];

    if (title) {
      whereClauses.push("title ILIKE $" + (values.length + 1));
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
      whereClauses.push("equity > 0");
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
    SELECT id, title, salary, equity, company_handle AS "companyHandle"
    FROM jobs
    ${whereClause}
  `;

    const result = await db.query(query, values);

    if (result.length === 0) {
      throw new NotFoundError(`No jobs found matching the search criteria.`);
    } else {
      return result.rows.map((job) => {
        // Map function to loop through array of job objects and convert equity property to float num if truthy
        if (job.equity === null || !job.equity) job.equity = null;
        else {
          // Parse equity string using `+` operator which is faster than parseFloat() given we will only work with 0 < equity < 1 or null values
          job.equity = +job.equity;
          // Check if NaN
          job.equity = isNaN(job.equity) ? null : job.equity;
        }
        return job;
      });
    }
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/
  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const job = result.rows[0];
    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;
