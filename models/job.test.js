"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError.js");
const { Job } = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    handle: "newJob",
    title: "new_job",
    salary: 1000000,
    equity: 0,
    company: "job1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
      `SELECT id, handle, salary, equity, company
           FROM jobs
           WHERE handle = 'newJob'`
    );
    expect(result.rows).toEqual([newJob]);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        handle: "job1",
        title: "job_1",
        salary: 100000,
        equity: 10000,
        company: "job1",
      },
      {
        handle: "job2",
        title: "job_2",
        salary: 200000,
        equity: 20000,
        company: "c2",
      },
      {
        handle: "job2",
        title: "job_2",
        salary: 200000,
        equity: 20000,
        company: "c2",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get("job1");
    expect(job).toEqual({
      handle: "job1",
      title: "job_1",
      salary: 100000,
      equity: 10000,
      company: "job1",
    });
  });

  test("not found if no such company", async function () {
    try {
      await Job.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** find */
describe("Job.find static function test", () => {
  test("should return jobs matching the name search criteria", async () => {
    const jobs = await Job.find({ title: "job2" });
    expect(jobs).toHaveLength(1);
    expect(jobs).toEqual([
      {
        handle: "job2",
        title: "job_2",
        salary: 200000,
        equity: 20000,
        company: "c2",
      }
    ]);
  });

  test("should return jobs matching the minSalary search criteria", async () => {
    const jobs = await Job.find({ minSalary: 200000 });
    expect(jobs).toHaveLength(2);
    expect(jobs).toEqual([
      {
        handle: "job2",
        title: "job_2",
        salary: 200000,
        equity: 20000,
        company: "c2",
      },
      {
        handle: "job3",
        title: "job_3",
        salary: 300000,
        equity: 30000,
        company: "c3",
      },
    ]);
  });

  test("should return jobs matching the maxSalary search criteria", async () => {
    const jobs = await Job.find({ maxSalary: 20000 });
    expect(jobs).toHaveLength(2);
    expect(jobs).toEqual([
      {
        handle: "job1",
        title: "job_1",
        salary: 100000,
        equity: 10000,
        company: "job1",
      },
      {
        handle: "job2",
        title: "job_2",
        salary: 200000,
        equity: 20000,
        company: "c2",
      },
    ]);
  });

  test("should return jobs matching multiple search criteria", async () => {
    const jobs = await Job.find({
      title: "job_2",
      minSalary: 20000,
      maxSalary: 30000,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs).toEqual([
      {
        handle: "job2",
        title: "job_2",
        salary: 200000,
        equity: 20000,
        company: "c2",
      },
      {
        handle: "job3",
        title: "job_3",
        salary: 300000,
        equity: 30000,
        company: "c3",
      }
    ]);
  });

  test("should throw NotFoundError when no jobs match the search criteria", async () => {
    await expect(
      Job.find({ title: "Nonexistent", minSalary: 10 })
    ).rejects.toThrow("No jobs found matching the search criteria.");
  });
});
/************************************** update */

describe("update", function () {
  const updateData = {
    handle: "job2.1NEW",
    title: "job_2.1NEW",
    salary: 2000000,
    equity: 200000,
  };

  test("works", async function () {
    let job = await Job.update("/job2", updateData);
    expect(job).toEqual({
      ...updateData,
    });

    const result = await db.query(
      `SELECT handle, title, salary, equity, company
           FROM jobs
           WHERE handle = 'job2'`
    );
    expect(result.rows).toEqual([
      {...updateData}
    ]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      handle: "New",
      title: "New Description",
      salary: null,
      equity: null,
    };

    let job = await Job.update("job1", updateDataSetNulls);
    expect(job).toEqual({
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM jobs
           WHERE handle = 'job1'`
    );
    expect(result.rows).toEqual([
      {
        handle: "job1",
        title: "New",
        description: "New Description",
        num_employees: null,
        logo_url: null,
      },
    ]);
  });

  test("not found if no such company", async function () {
    try {
      await Job.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update("job1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove("job1");
    const res = await db.query("SELECT handle FROM jobs WHERE handle='job1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Job.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
