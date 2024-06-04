"use strict";

require('dotenv').config()
const db = require("../db.js");
const User = require("../models/user");
const Company = require("../models/company");
const Job = require("../models/job.js");
const { createToken } = require("../helpers/tokens");

async function commonBeforeAll() {
  // Clean up db tables
    // noinspection SqlWithoutWhere
  await db.query('DELETE FROM users');
  // noinspection SqlWithoutWhere
  await db.query('DELETE FROM companies');
  // noinspection SqlWithoutWhere
  await db.query('DELETE FROM jobs');

    // Create companies
    await Company.create({
      handle: "c1",
      name: "C1",
      numEmployees: 1,
      description: "Desc1",
      logoUrl: "http://c1.img",
    });
    await Company.create({
      handle: "c2",
      name: "C2",
      numEmployees: 2,
      description: "Desc2",
      logoUrl: "http://c2.img",
    });
    await Company.create({
      handle: "c3",
      name: "C3",
      numEmployees: 3,
      description: "Desc3",
      logoUrl: "http://c3.img",
    });

    // Create jobs
    await Job.create({
      title: "job_1",
      salary: 100000,
      equity: 0.1,
      companyHandle: "c1",
    });
    await Job.create({
      title: "job_2",
      salary: 200000,
      equity: 0.2,
      companyHandle: "c2",
    });
    await Job.create({
      title: "job_3",
      salary: 300000,
      equity: 0.3,
      companyHandle: "c3",
    });

    // Create users
    await User.register({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "user1@user.com",
      password: "password1",
      isAdmin: false,
    });
    await User.register({
      username: "u2",
      firstName: "U2F",
      lastName: "U2L",
      email: "user2@user.com",
      password: "password2",
      isAdmin: true,
    });
    await User.register({
      username: "u3",
      firstName: "U3F",
      lastName: "U3L",
      email: "user3@user.com",
      password: "password3",
      isAdmin: false,
    });

}

// Create tokens
const u1Token = createToken({
  username: "u1",
  firstName: "U1F",
  lastName: "U1L",
  email: "user1@user.com",
  password: "password1",
  isAdmin: false,
});
const u2Token = createToken({
  username: "u2",
  firstName: "U2F",
  lastName: "U2L",
  email: "user2@user.com",
  password: "password2",
  isAdmin: true,
});

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
};
