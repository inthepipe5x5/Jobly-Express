"use strict";
/** Database setup for jobly. */
const { Pool } = require("pg");
const { getDatabaseUri } = require("./config");

// Force Node.js to prefer IPv4
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// Use connection pooling with Supabase pooler
const db = new Pool({
  // Use Supabase transaction pooler first, then session pooler, then direct connection
  connectionString: process.env.DB_TRANSACTION_POOLER_URI || process.env.DB_SESSION_POOLER_URI || process.env.DATABASE_URI || getDatabaseUri(),
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10, // maximum number of clients in the pool (reduced for pooled connection)
  min: 2, // minimum number of clients in the pool
  idleTimeoutMillis: 10000, // close idle clients after 10 seconds (shorter for pooled)
  connectionTimeoutMillis: 5000, // return an error after 5 seconds if connection could not be established
  acquireTimeoutMillis: 5000, // timeout for acquiring a connection from pool
});

// Pools manage their own connections - no need to call connect()
// Test the pool connection on startup
db.on('connect', (client) => {
  console.log('Connected to database pool');
});

db.on('error', (err) => {
  console.error('Database pool error:', err);
});

module.exports = db;