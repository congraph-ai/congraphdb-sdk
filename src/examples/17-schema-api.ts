/**
 * Example 17: Schema API
 *
 * This example demonstrates CongraphDB's JavaScript Schema API:
 * - JavaScript-native schema creation
 * - PropertyTypes constant for type-safe definitions
 * - ensureSchema for idempotent schema migrations
 * - Index management
 * - Schema introspection
 *
 * Use Case: Application schema management with migrations
 */

import congraphdb from 'congraphdb';
import { PropertyTypes } from '../lib/common.js';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Schema API');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('CongraphDB Schema API Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/schema-api.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Demo 1: Creating Node Tables with PropertyTypes
  // ============================================================
  logger.subheader('Demo 1: Creating Node Tables with PropertyTypes');

  logger.info('Using PropertyTypes for type-safe schema definitions...');

  await conn.createNodeTable('User', [
    { name: 'id', type: PropertyTypes.String },
    { name: 'username', type: PropertyTypes.String },
    { name: 'email', type: PropertyTypes.String },
    { name: 'age', type: PropertyTypes.Int32 },
    { name: 'active', type: PropertyTypes.Bool },
    { name: 'createdAt', type: PropertyTypes.Timestamp },
  ], 'id');

  logger.success('✓ User table created');

  await conn.createNodeTable('Post', [
    { name: 'id', type: PropertyTypes.String },
    { name: 'title', type: PropertyTypes.String },
    { name: 'content', type: PropertyTypes.String },
    { name: 'published', type: PropertyTypes.Bool },
    { name: 'viewCount', type: PropertyTypes.Int64 },
    { name: 'tags', type: PropertyTypes.List },
  ], 'id');

  logger.success('✓ Post table created');

  await conn.createNodeTable('Comment', [
    { name: 'id', type: PropertyTypes.String },
    { name: 'text', type: PropertyTypes.String },
    { name: 'createdAt', type: PropertyTypes.Timestamp },
  ], 'id');

  logger.success('✓ Comment table created');

  // ============================================================
  // Demo 2: Creating Relationship Tables
  // ============================================================
  logger.subheader('Demo 2: Creating Relationship Tables');

  await conn.createRelTable('AUTHORED', 'User', 'Post', [
    { name: 'createdAt', type: PropertyTypes.Timestamp },
  ]);

  logger.success('✓ AUTHORED relationship table created');

  await conn.createRelTable('COMMENTED_ON', 'User', 'Comment', [
    { name: 'createdAt', type: PropertyTypes.Timestamp },
  ]);

  logger.success('✓ COMMENTED_ON relationship table created');

  await conn.createRelTable('ON_POST', 'Comment', 'Post', []);

  logger.success('✓ ON_POST relationship table created');

  // ============================================================
  // Demo 3: Creating Indexes
  // ============================================================
  logger.subheader('Demo 3: Creating Indexes');

  await conn.createIndex('User', ['username']);
  logger.success('✓ Index created on User.username');

  await conn.createIndex('User', ['email']);
  logger.success('✓ Index created on User.email');

  await conn.createIndex('Post', ['published', 'viewCount']);
  logger.success('✓ Composite index created on Post (published, viewCount)');

  // ============================================================
  // Demo 4: Schema Introspection
  // ============================================================
  logger.subheader('Demo 4: Schema Introspection');

  logger.info('Getting all tables...');
  const tables = await conn.getTables();

  console.log('\n  Tables in database:');
  for (const table of tables) {
    console.log(`    - ${table.name} (${table.table_type})`);
    console.log(`      Properties:`);
    for (const prop of table.properties) {
      console.log(`        • ${prop.name}: ${prop.type_}`);
    }
  }

  // ============================================================
  // Demo 5: Idempotent Schema with ensureSchema
  // ============================================================
  logger.subheader('Demo 5: Idempotent Schema (Migration Style)');

  logger.info('Defining complete schema for migration...');

  const schema = {
    nodeTables: [
      {
        name: 'Category',
        properties: {
          id: 'string',
          name: 'string',
          description: 'string',
          parent: 'string'
        },
        primaryKey: 'id'
      },
      {
        name: 'Tag',
        properties: {
          id: 'string',
          name: 'string',
          color: 'string'
        },
        primaryKey: 'id'
      }
    ],
    relTables: [
      {
        name: 'HAS_CATEGORY',
        from: 'Post',
        to: 'Category',
        properties: {
          assignedAt: 'timestamp'
        }
      },
      {
        name: 'HAS_TAG',
        from: 'Post',
        to: 'Tag',
        properties: {}
      }
    ]
  };

  logger.info('Running ensureSchema (safe to run multiple times)...');
  await conn.ensureSchema(schema);
  logger.success('✓ Schema ensured (idempotent)');

  logger.info('Running ensureSchema again (should be no-op)...');
  await conn.ensureSchema(schema);
  logger.success('✓ Schema ensured again (no changes needed)');

  // ============================================================
  // Demo 6: Working with the Schema
  // ============================================================
  logger.subheader('Demo 6: Working with the Schema');

  logger.info('Inserting sample data...');

  await conn.query(`
    CREATE (u:User {id: 'u1', username: 'alice', email: 'alice@example.com', age: 30, active: true, createdAt: 1704067200000})
  `);

  await conn.query(`
    CREATE (p:Post {id: 'p1', title: 'Hello World', content: 'My first post!', published: true, viewCount: 0, tags: ['intro', 'hello']})
  `);

  await conn.query(`
    CREATE (c:Category {id: 'c1', name: 'Technology', description: 'Tech posts', parent: null})
  `);

  await conn.query(`
    CREATE (t:Tag {id: 't1', name: 'programming', color: '#3B82F6'})
  `);

  await conn.query(`
    MATCH (u:User {id: 'u1'}), (p:Post {id: 'p1'})
    CREATE (u)-[:AUTHORED {createdAt: 1704067200000}]->(p)
  `);

  await conn.query(`
    MATCH (p:Post {id: 'p1'}), (c:Category {id: 'c1'})
    CREATE (p)-[:HAS_CATEGORY {assignedAt: 1704067200000}]->(c)
  `);

  await conn.query(`
    MATCH (p:Post {id: 'p1'}), (t:Tag {id: 't1'})
    CREATE (p)-[:HAS_TAG]->(t)
  `);

  logger.success('✓ Sample data inserted');

  // ============================================================
  // Demo 7: Querying with the Schema
  // ============================================================
  logger.subheader('Demo 7: Querying with the Schema');

  logger.info('Finding all posts with their authors:');
  const posts = await executeQuery(conn, `
    MATCH (u:User)-[a:AUTHORED]->(p:Post)
    RETURN u.username AS author, p.title, p.published
  `);
  printResults(posts);

  logger.newline();
  logger.info('Finding all categories for posts:');
  const categories = await executeQuery(conn, `
    MATCH (p:Post)-[h:HAS_CATEGORY]->(c:Category)
    RETURN p.title AS post, c.name AS category
  `);
  printResults(categories);

  // ============================================================
  // Demo 8: Drop Table
  // ============================================================
  logger.subheader('Demo 8: Drop Table');

  logger.info('Creating a temporary table...');
  await conn.createNodeTable('Temp', [
    { name: 'id', type: PropertyTypes.String },
    { name: 'data', type: PropertyTypes.String }
  ], 'id');

  logger.info('Tables before drop:');
  const tablesBefore = await conn.getTables();
  console.log(`  Count: ${tablesBefore.length}`);

  logger.info('Dropping Temp table...');
  await conn.dropTable('Temp');

  logger.info('Tables after drop:');
  const tablesAfter = await conn.getTables();
  console.log(`  Count: ${tablesAfter.length}`);

  // ============================================================
  // Demo 9: Schema Migration Example
  // ============================================================
  logger.subheader('Demo 9: Schema Migration Example');

  logger.info('Example migration pattern:');
  logger.code(`
async function migrateSchema(db, version) {
  const conn = db.createConnection();

  // Migration 1: Add User table
  if (version < 1) {
    await conn.createNodeTable('User', [
      { name: 'id', type: PropertyTypes.String },
      { name: 'name', type: PropertyTypes.String }
    ], 'id');
  }

  // Migration 2: Add email column
  if (version < 2) {
    await conn.query(\`
      ALTER TABLE User ADD COLUMN email STRING
    \`);
  }

  // Migration 3: Create index
  if (version < 3) {
    await conn.createIndex('User', ['email']);
  }

  return 3; // New version
}
  `);

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Summary');

  logger.info('Available PropertyTypes:');
  console.log('  • PropertyTypes.Bool       - Boolean values');
  console.log('  • PropertyTypes.Int8       - 8-bit signed integer');
  console.log('  • PropertyTypes.Int16      - 16-bit signed integer');
  console.log('  • PropertyTypes.Int32      - 32-bit signed integer');
  console.log('  • PropertyTypes.Int64      - 64-bit signed integer');
  console.log('  • PropertyTypes.UInt8      - 8-bit unsigned integer');
  console.log('  • PropertyTypes.UInt16     - 16-bit unsigned integer');
  console.log('  • PropertyTypes.UInt32     - 32-bit unsigned integer');
  console.log('  • PropertyTypes.UInt64     - 64-bit unsigned integer');
  console.log('  • PropertyTypes.Float      - 32-bit floating point');
  console.log('  • PropertyTypes.Double     - 64-bit floating point');
  console.log('  • PropertyTypes.String     - Variable-length string');
  console.log('  • PropertyTypes.Blob       - Binary data');
  console.log('  • PropertyTypes.Date       - Date (no time)');
  console.log('  • PropertyTypes.Timestamp  - Timestamp with timezone');
  console.log('  • PropertyTypes.Interval   - Time duration');
  console.log('  • PropertyTypes.List       - List/array type');
  console.log('  • PropertyTypes.Vector     - Fixed-size vector (for embeddings)');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Schema API Demo Completed!');
  logger.info('Use the Schema API for type-safe, programmatic schema management.');
}
