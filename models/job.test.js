"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon.js");

//declare testJob 
let testJob;

beforeAll(commonBeforeAll);
beforeEach(async () => {
  commonBeforeEach();
  const result = await db.query(
    `SELECT id, title, salary, equity, company_handle AS "companyHandle" FROM jobs WHERE title = 'job_1'`
  );
  //assign value of found job to testJob
  testJob = result.rows[0];
});
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new job",
    salary: 50000,
    companyHandle: "c2",
    equity: 0.1,
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({ ...newJob, id: expect.any(Number) });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
       FROM jobs
       WHERE id = ${job.id}`
    );
    expect(result.rows).toEqual([{ id: job.id, ...newJob }]);
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works", async function () {
    const jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "job_1",
        salary: 100000,
        equity: 0.1,
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "job_2",
        salary: 200000,
        equity: 0.2,
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "job_3",
        salary: 300000,
        equity: 0.3,
        companyHandle: "c3",
      },
      {
        id: expect.any(Number),
        title: "job_4",
        salary: 40000,
        equity: null,
        companyHandle: "c3",
      },
    ]);
  });
});

/************************************** find */
describe("Job.find static function test", () => {
  test("works:  filter title", async function () {
    let jobs = await Job.find({ title: "1" });
    expect(jobs).toEqual([testJob]);
  });

  test("works: filter minSalary", async function () {
    let jobs = await Job.find({ minSalary: 100000 });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "job_1",
        salary: 100000,
        equity: 0.1,
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "job_2",
        salary: 200000,
        equity: 0.2,
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "job_3",
        salary: 300000,
        equity: 0.3,
        companyHandle: "c3",
      },
    ]);
  });

  test("finds with true hasEquity filter", async function () {
    let jobs = await Job.find({ hasEquity: true });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "job_1",
        salary: 100000,
        equity: 0.1,
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "job_2",
        salary: 200000,
        equity: 0.2,
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "job_3",
        salary: 300000,
        equity: 0.3,
        companyHandle: "c3",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(testJob.id);
    expect(job).toEqual({
      id: testJob.id,
      title: "job_1",
      salary: 100000,
      equity: 0.1,
      companyHandle: "c1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("Job model class UPDATE method", function () {
  const updateData = {
    title: "job_1-updated",
    salary: 20000000,
    equity: 0.9,
    companyHandle: "c2",
  };

  test("update feature works", async function () {
    let job = await Job.update(testJob.id, updateData);
    expect(job).toEqual({
      id: testJob.id,
      title: "job_1-updated",
      salary: 20000000,
      equity: "0.9",
      companyHandle: "c2",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = ${testJob.id}`
    );
    expect(result.rows).toEqual([
      {
        id: testJob.id,
        title: "job_1-updated",
        salary: 20000000,
        equity: "0.9",
        companyHandle: "c2",
      },
    ]);
  });

  test("works: null fields", async function () {
    const nullDataSet = {
      salary: null,
      equity: null,
    };

    let job = await Job.update(testJob.id, nullDataSet);
    expect(job).toEqual({
      id: testJob.id,
      title: testJob.title,
      companyHandle: testJob.companyHandle,
      ...nullDataSet,
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
       FROM jobs
       WHERE id = ${testJob.id}`
    );
    expect(result.rows).toEqual([
      {
        id: testJob.id,
        title: "job_1",
        salary: null,
        equity: null,
        companyHandle: "c1",
      },
    ]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(0, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(testJob.id, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(testJob.id);
    const res = await db.query(`SELECT id FROM jobs WHERE id=${testJob.id}`);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
