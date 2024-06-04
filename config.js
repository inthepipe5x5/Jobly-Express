"use strict";

/** Shared config for application; can be required many places. */

require("dotenv").config();
require("colors");

const SECRET_KEY = process.env.SECRET_KEY || "secret-dev";

const PORT = +process.env.PORT || 3001;
const HOST = +process.env.HOST || "127.0.0.1";
const DB_PORT = process.env.DB_PORT || 5432
const DB_USERNAME = process.env.DATABASE_USERNAME
const DB_PW = process.env.DATABASE_PW
console.log(DB_USERNAME, DB_PW)
// Use dev database, testing database, or via env var, production database
function getDatabaseUri() {
  return (process.env.NODE_ENV === "test")
      ? process.env.TEST_DATABASE_URI || `postgresql://${DB_USERNAME}:${DB_PW}@${HOST}:${DB_PORT}/jobly_test`
      : process.env.DATABASE_URI || `postgresql://${DB_USERNAME}:${DB_PW}@${HOST}:${DB_PORT}/jobly`;
}

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
