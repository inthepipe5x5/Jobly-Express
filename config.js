"use strict";

/** Shared config for application; can be required many places. */

require("dotenv").config();
require("colors");

const SECRET_KEY = process.env.SECRET_KEY || "secret-dev";

const PORT = +process.env.PORT || 3001;
const HOST = +process.env.HOST || "127.0.0.1";
const DB_NAME = process.env.DB_NAME || "jobly";
// If DB_NAME is not set, it will default to "jobly" for production and "jobly_test" for testing

// Database connection details
const DB_HOST = process.env.DB_HOST || HOST;
const DB_PORT = process.env.DB_PORT || 5432
const DB_USERNAME = process.env.DATABASE_USERNAME
const DB_PW = process.env.DATABASE_PW
console.log(DB_USERNAME, DB_PW)
// Use dev database, testing database, or via env var, production database
const buildPostgresUri = ({ user, password, host, port, database }) => {
  const auth = user
    ? `${encodeURIComponent(user)}${password ? ':' + encodeURIComponent(password) : ''}@`
    : '';
  const hostPort = host ? `${encodeURIComponent(host)}${port ? ':' + encodeURIComponent(port) : ''}` : '';
  const db = database ? `/${encodeURIComponent(database)}` : '';
  return `postgresql://${auth}${hostPort}${db}`;
};

const getDatabaseUri = () => {
  switch (process.env.NODE_ENV) {
    case "prduction":
      return process.env.DATABASE_URI ||
        buildPostgresUri({
          user: DB_USERNAME,
          password: DB_PW,
          host: DB_HOST,
          port: DB_PORT,
          database: DB_NAME
        });
    case "test":
      // Use TEST_DATABASE_URI if set, otherwise use a default test database name
      return process.env.TEST_DATABASE_URI ||
        buildPostgresUri({
          user: DB_USERNAME,
          password: DB_PW,
          host: DB_HOST,
          port: DB_PORT,
          database: DB_NAME ?? "jobly_test"
        });
    default:
      return process.env.DATABASE_URI ||
        buildPostgresUri({
          user: DB_USERNAME ?? "postgres",
          password: DB_PW ?? "stringpassword",
          host: DB_HOST ?? "localhost",
          port: DB_PORT ?? 5432,
          database: DB_NAME ?? "jobly"
        });
  }
};

// Speed up bcrypt during tests, since the algorithm safety isn't being tested
//
// WJB: Evaluate in 2021 if this should be increased to 13 for non-test use
const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === "test" ? 1 : 12;

console.log("Jobly Config:".green);
console.log("NODE_ENV:".green, process.env.NODE_ENV)
console.log("SECRET_KEY:".yellow, SECRET_KEY);
console.log("PORT:".yellow, PORT.toString());
console.log("BCRYPT_WORK_FACTOR".yellow, BCRYPT_WORK_FACTOR);
console.log("Database:".yellow, getDatabaseUri());
console.log("---");

module.exports = {
  SECRET_KEY,
  PORT,
  BCRYPT_WORK_FACTOR,
  getDatabaseUri,
};
