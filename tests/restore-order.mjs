// Restore order: a D1 export lists tables alphabetically (guests before plans). Loaded as-is into an empty database
// with foreign keys on, it fails. parentsFirst() reorders it so every table loads after the tables it points to.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {parentsFirst} from '../scripts/restore-order.mjs';
const dump=`PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE \`guests\` (
	\`plan_id\` text NOT NULL,
	\`name\` text NOT NULL,
	FOREIGN KEY (\`plan_id\`) REFERENCES \`plans\`(\`id\`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "guests" ("plan_id","name") VALUES('p1','Ama');
INSERT INTO "guests" ("plan_id","name") VALUES('p1','Line one
CREATE TABLE trick (
not a real table');
CREATE TABLE \`plans\` (
	\`id\` text PRIMARY KEY NOT NULL
);
INSERT INTO "plans" ("id") VALUES('p1');
CREATE TABLE \`votes\` (
	\`guest\` text REFERENCES \`plans\`(\`id\`)
);
CREATE INDEX \`guests_plan_idx\` ON \`guests\` (\`plan_id\`);`;
const load=sql=>{const db=new DatabaseSync(':memory:');db.exec(sql);return db};
assert.throws(()=>load(dump),/no such table/,'the alphabetical export fails to load');
const db=load(parentsFirst(dump));
assert.equal(db.prepare('SELECT count(*) AS n FROM guests').get().n,2);assert.equal(db.prepare('SELECT count(*) AS n FROM plans').get().n,1);
assert.ok(db.prepare("SELECT name FROM guests WHERE name LIKE 'Line one%'").get().name.includes('not a real table'),'text that looks like a table stays in its row');
assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='index' AND name='guests_plan_idx'").get().n,1,'indexes kept');
console.log('PASS: restore order: a D1 backup is reordered so plans load before their guests; rows, text and indexes kept.');
