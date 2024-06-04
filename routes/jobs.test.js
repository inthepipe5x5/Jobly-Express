"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");
const dotenv = require("dotenv").config({ path: "../.env" });

process.env.NODE_ENV = "test";
console.log(process.env.DB_USERNAME, process.env.DB_PASSWORD);
jest.setTimeout(20000);
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
} = require("./_testCommon");

let job1, job2, job3, job4;

beforeAll(async () => {
  await commonBeforeAll();
  console.log(
    `Test Setup: Connected to database: ${db.database} via ${db.connectionString}`
  );
});
beforeEach(async () => {
  await commonBeforeEach();
  const result = await db.query(
    `SELECT id, title, salary, equity, company_handle AS "companyHandle" FROM jobs WHERE title IN ('job_1', 'job_2', 'job_3', 'job_4')`
  );
  [job1, job2, job3, job4] = result.rows;
  job1 = job1
    ? job1
    : {
        title: "job_1",
        salary: 100000,
        equity: 0.1,
        companyHandle: "c1",
      };
  job2 = job2
    ? job2
    : {
        title: "job_2",
        salary: 200000,
        equity: 0.2,
        companyHandle: "c2",
      };
  job3 = job3
    ? job3
    : {
        title: "job_3",
        salary: 300000,
        equity: 0.3,
        companyHandle: "c3",
      };
  job4 = job4
    ? job4
    : {
        title: "job_4",
        salary: 400000,
        equity: null,
        companyHandle: "c3",
      };
});
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new job",
    salary: 90000,
    companyHandle: "c3",
    equity: 0.1,
  };

  test("ok for admin users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({
      job: { ...newJob, id: expect.any(Number) },
    });
    expect(resp.statusCode).toEqual(201);
  });

  test("not ok for non-admin users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("POST /jobs bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "New Job Bad Request",
        salary: 8797968595,
      })
      .set("authorization", `Bearer ${u2Token}`);
    // expect(resp.body.error).toEqual({"error": {"message": "Bad Request", "status": 400}})
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
        salary: -100,
        equity: 2.0,
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({"error": {"message": "Bad Request", "status": 400}});
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("GET all /jobs ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body.jobs.length).toEqual(3)
    expect(resp.body).toEqual({
      jobs: [
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
          id: job4.id,
          title: "job_4",
          salary: 40000,
          equity: null,
          companyHandle: "c3",
        },
      ],
    });
  });

  test("test filter title", async function () {
    const resp = await request(app).get(`/jobs?title=2`);
    expect(resp.body).toEqual({
      jobs: [
        {
          id: job2.id,
          title: job2.title,
          salary: 200000,
          equity: 0.2,
          companyHandle: job2.companyHandle,
        },
      ],
    });
  });

  test("test filter minSalary", async function () {
    const resp = await request(app).get("/jobs?minSalary=100000");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: job1.id,
          title: "job_1",
          salary: 100000,
          equity: 0.1,
          companyHandle: "c1",
        },
        {
          id: job2.id,
          title: "job_2",
          salary: 200000,
          equity: 0.2,
          companyHandle: "c2",
        },
        {
          id: job3.id,
          title: "job_3",
          salary: 300000,
          equity: 0.3,
          companyHandle: "c3",
        },
      ],
    });
  });

  test("test filter hasEquity", async function () {
    const resp = await request(app).get("/jobs?hasEquity=true");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: job1.id,
          title: "job_1",
          salary: 100000,
          equity: 0.1,
          companyHandle: "c1",
        },
        {
          id: job2.id,
          title: "job_2",
          salary: 200000,
          equity: 0.2,
          companyHandle: "c2",
        },
        {
          id: job3.id,
          title: "job_3",
          salary: 300000,
          equity: 0.3,
          companyHandle: "c3",
        },
      ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/${job1.id}`);
    expect(resp.body).toEqual({
      job: {
        id: job1.id,
        title: "job_1",
        salary: 100000,
        equity: 0.1,
        companyHandle: "c1",
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admin users", async function () {
    const resp = await request(app)
      .patch(`/jobs/${job1.id}`)
      .send({
        title: "Job1-update",
        salary: 200000,
        equity: 0.1,
        companyHandle: "c2",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({
      job: {
        id: job1.id,
        title: "Job1-update",
        salary: 200000,
        equity: 0.1,
        companyHandle: "c2",
      },
    });
  });

  test("not ok for non-admin users", async function () {
    const resp = await request(app)
      .patch(`/jobs/${job1.id}`)
      .send({
        title: "Job1-update",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/jobs/${job1.id}`).send({
      title: "Job1-update",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/0`)
      .send({
        title: "new nope",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({"error": {"message": "No job: 0", "status": 404}});
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/${job1.id}`)
      .send({
        salary: -100,
        equity: 2.0,
      })
      .set("authorization", `Bearer ${u2Token}`);
      expect(resp.body.status).toEqual(400)
      expect(resp.body.error).toBeTruthy()
      expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin users", async function () {
    const resp = await request(app)
      .delete(`/jobs/${job1.id}`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({ deleted: `${job1.id}` });
  });

  test("not ok for non-admin users", async function () {
    const resp = await request(app)
      .delete(`/jobs/${job1.id}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/jobs/${job1.id}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/0`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
