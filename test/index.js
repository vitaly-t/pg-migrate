/* eslint-disable no-template-curly-in-string */

const path = require('path');
const test = require('tape');
const pgPromise = require('pg-promise');
const PgMigrate = require('../pg-migrate');

const pgPromiseOptions = { capSQL: true, pgNative: true, noWarnings: true };
const pgp = pgPromise(pgPromiseOptions);

const database = 'test';
const user = 'postgres';
const schemaName = 'public';
const tableName = 'migrations';
const migrationsDir = path.join(__dirname, './migrations');

const tableExistsQuery =
  'SELECT table_name FROM information_schema.tables WHERE table_schema = ${schemaName} AND table_name = ${tableName}';

test('migrate', async (t) => {
  t.plan(3);

  const pgMigrate = new PgMigrate({ database, user, migrationsDir });
  await pgMigrate.connect();
  await pgMigrate.migrate();
  await pgMigrate.end();

  const db = pgp({ database, user });

  await db
    .oneOrNone(tableExistsQuery, { schemaName, tableName })
    .then(tableExists => t.ok(tableExists, 'migrations table created'));

  await db
    .oneOrNone(tableExistsQuery, { schemaName: 'public', tableName: 'users' })
    .then(tableExists => t.ok(tableExists, 'first migration applied'));

  await db
    .oneOrNone(tableExistsQuery, { schemaName: 'public', tableName: 'posts' })
    .then(tableExists => t.ok(tableExists, 'second migration applied'));

  await pgp.end();
});

test('rollback', async (t) => {
  t.plan(3);

  const pgMigrate = new PgMigrate({ database, user, migrationsDir });
  await pgMigrate.connect();
  await pgMigrate.rollback();
  await pgMigrate.end();

  const db = pgp({ database, user });

  await db
    .oneOrNone(tableExistsQuery, { schemaName, tableName })
    .then(tableExists => t.ok(tableExists, 'migrations table exists'));

  await db
    .oneOrNone(tableExistsQuery, { schemaName: 'public', tableName: 'users' })
    .then(tableExists => t.ok(tableExists, 'first migration applied'));

  await db
    .oneOrNone(tableExistsQuery, { schemaName: 'public', tableName: 'posts' })
    .then(tableExists => t.ok(!tableExists, 'second migration rolled back'));

  await pgp.end();
});

test('reset', async (t) => {
  t.plan(3);

  const pgMigrate = new PgMigrate({ database, user, migrationsDir });
  await pgMigrate.connect();
  await pgMigrate.reset();
  await pgMigrate.end();

  const db = pgp({ database, user });

  await db
    .oneOrNone(tableExistsQuery, { schemaName, tableName })
    .then(tableExists => t.ok(tableExists, 'migrations table exists'));

  await db
    .oneOrNone(tableExistsQuery, { schemaName: 'public', tableName: 'users' })
    .then(tableExists => t.ok(!tableExists, 'first migration rolled back'));

  await db
    .oneOrNone(tableExistsQuery, { schemaName: 'public', tableName: 'posts' })
    .then(tableExists => t.ok(!tableExists, 'second migration rolled back'));

  await pgp.end();
});
