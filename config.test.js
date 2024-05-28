"use strict";
const dotenv = require('dotenv').config()

describe("config can come from env", function () {
  test("works", function() {
    process.env.SECRET_KEY = process.env.SECRET_KEY || "secret-dev";
    process.env.NODE_ENV = "other";

    const config = require("./config");
    expect(config.SECRET_KEY).toEqual("secret-dev");
    expect(config.PORT).toEqual(+process.env.PORT || 3001);
    expect(config.getDatabaseUri()).toEqual(process.env.DATABASE_URI);
    expect(config.BCRYPT_WORK_FACTOR).toEqual(12);

    delete process.env.SECRET_KEY;
    delete process.env.PORT;
    delete process.env.BCRYPT_WORK_FACTOR;
    delete process.env.DATABASE_URL;

    expect(config.getDatabaseUri()).toEqual(process.env.DATABASE_URI);
    process.env.NODE_ENV = "test";

    expect(config.getDatabaseUri()).toEqual(process.env.TEST_DATABASE_URI);
  });
})

