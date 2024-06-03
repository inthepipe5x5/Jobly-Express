"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("Part 3 - Not ok for users", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).not.toEqual({
      message: "Unauthorized",
    });
  });
  test("Part 3 - Posting new companies = ok for admins", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data (invalid logoUrl)", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        ...newCompany,
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
      .get("/companies")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {
    const resp = await request(app).get(`/companies/c2`);
    expect(resp.body).toEqual({
      company: {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});
/************************************** GET /companies/search */
describe("GET /companies/search", function () {
  test("anon => finds companies with valid query strings", async function () {
    const resp = await request(app)
      .get("/companies/search")
      .query({ name: "C", minEmployees: 0, maxEmployees: 10 });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.companies).toHaveLength(3);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("u1 user => (no auth errors) finds companies with valid query strings", async function () {
    const resp = await request(app)
      .get("/companies/search")
      .query({ name: "C", minEmployees: 0, maxEmployees: 10 })
      .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("anon => finds companies with only 2 valid total query strings", async function () {
    const resp = await request(app)
      .get("/companies/search")
      .query({ minEmployees: 0, maxEmployees: 10 });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("anon => finds companies with 2 valid query total strings", async function () {
    const resp = await request(app)
      .get("/companies/search")
      .query({ name: "C", maxEmployees: 2 });

      expect(resp.body).toEqual({
        companies: [
          {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          {
            handle: "c2",
            name: "C2",
            description: "Desc2",
            numEmployees: 2,
            logoUrl: "http://c2.img",
          },
        ],
      });
      expect(resp.statusCode).toEqual(200);
      expect(resp.body.companies).toHaveLength(2);
  });
});


/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: { message: "Unauthorized", status: 401 },
    });
  });

  test("Part 3 - Patch works for admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/companies/c1`).send({
      name: "C1-new",
    });
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: { message: "Unauthorized", status: 401 },
    });
  });

  test("Part 3 - users are unauthorized to patch non-existent company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        handle: "new handle for nope",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: { message: "Unauthorized", status: 401 },
    });
  });

  test("Part 3 - Admin gets `404 not found` on no such company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("Part 3- Admin => bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("Part 3- user => unauth; users attempts bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: { message: "Unauthorized", status: 401 },
    });
  });

  test("Part 3- user => unauth; bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: { message: "Unauthorized", status: 401 },
    });
  });
  test("Part 3- Admin => bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("Part 3 - unauth for users", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: { message: "Unauthorized", status: 401 },
    });
  });
  test("Part 3 - works for Admins", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: { message: "Unauthorized", status: 401 },
    });
  });

  test("Part 3 - user => unauth ; unauthorized instead of `not found` for no such company", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: { message: "Unauthorized", status: 401 },
    });
  });

  describe("DELETE /companies/:handle", function () {
    test("Part 3 - Admin => not found for no such company", async function () {
      const resp = await request(app)
        .delete(`/companies/nope`)
        .set("authorization", `Bearer ${u2Token}`);
      expect(resp.statusCode).toEqual(404);
    });
  });
});
