/**
 * Example 16: OCC Transactions
 *
 * This example demonstrates CongraphDB's Optimistic Concurrency Control (OCC):
 * - OCC-aware transactions with automatic retry
 * - Conflict detection and handling
 * - Statistics monitoring for concurrency patterns
 * - High-concurrency patterns
 *
 * Use Case: E-commerce inventory management with concurrent updates
 */

import congraphdb from 'congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OCC Transactions');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('CongraphDB OCC Transactions Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/occ.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Define Schema
  // ============================================================
  logger.subheader('Defining Schema');

  logger.info('Creating Product node table...');
  await conn.query(`
    CREATE NODE TABLE Product (
      id STRING,
      name STRING,
      stock INT64,
      version INT64,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Product table created');

  logger.info('Creating PURCHASE relationship table...');
  await conn.query(`
    CREATE REL TABLE PURCHASE (
      FROM Product TO Product,
      quantity INT64,
      timestamp INT64
    )
  `);
  logger.success('✓ PURCHASE relationship table created');

  // ============================================================
  // Create Initial Products
  // ============================================================
  logger.subheader('Creating Initial Products');

  const initialProducts = [
    { id: 'prod1', name: 'Widget A', stock: 100 },
    { id: 'prod2', name: 'Widget B', stock: 50 },
    { id: 'prod3', name: 'Widget C', stock: 75 },
  ];

  for (const product of initialProducts) {
    await conn.query(`
      CREATE (p:Product {id: '${product.id}', name: '${product.name}', stock: ${product.stock}, version: 0})
    `);
  }
  logger.success(`✓ Created ${initialProducts.length} products`);

  // ============================================================
  // Demo 1: Basic OCC Transaction
  // ============================================================
  logger.subheader('Demo 1: Basic OCC Transaction');

  logger.info('Initial stock:');
  let stock = await executeQuery(conn, `
    MATCH (p:Product {id: 'prod1'})
    RETURN p.id, p.name, p.stock
  `);
  printResults(stock);

  logger.newline();
  logger.info('Purchasing 10 units of Widget A...');
  logger.code('BEGIN TRANSACTION + OCC COMMIT');

  conn.beginTransaction();

  try {
    // Read current stock (records version in read set)
    await conn.query(`
      MATCH (p:Product {id: 'prod1'})
      SET p.stock = p.stock - 10
    `);

    // Commit with OCC - automatic retry on conflict
    await conn.commitWithOccSync(5); // max 5 retries
    logger.success('✓ Purchase completed with OCC!');

  } catch (error) {
    logger.error(`Transaction failed: ${(error as Error).message}`);
    conn.rollback();
  }

  logger.newline();
  logger.info('Stock after purchase:');
  stock = await executeQuery(conn, `
    MATCH (p:Product {id: 'prod1'})
    RETURN p.id, p.name, p.stock
  `);
  printResults(stock);

  // ============================================================
  // Demo 2: Execute with Retry Wrapper
  // ============================================================
  logger.subheader('Demo 2: Execute with Retry Wrapper');

  logger.info('Using executeWithRetrySync for automatic conflict handling...');

  const result = await conn.executeWithRetrySync(3, () => {
    return conn.query(`
      MATCH (p:Product {id: 'prod2'})
      SET p.stock = p.stock - 5
      RETURN p.stock
    `);
  });

  logger.success('✓ Operation completed with automatic retry wrapper');
  logger.info(`New stock: ${result.getAll()[0]['p.stock']}`);

  // ============================================================
  // Demo 3: Concurrent Updates Simulation
  // ============================================================
  logger.subheader('Demo 3: Concurrent Updates Simulation');

  logger.info('Simulating 10 concurrent purchases of Widget C...');

  // Reset stock
  await conn.query(`MATCH (p:Product {id: 'prod3'}) SET p.stock = 100`);

  // Reset OCC statistics
  await conn.resetOccStatistics();

  // Create multiple connections to simulate concurrent users
  const tasks = Array.from({ length: 10 }, (_, i) =>
    simulatePurchase(db, 'prod3', 1, `Customer_${i}`)
  );

  await Promise.all(tasks);

  // Get final statistics
  const stats = await conn.getOccStatistics();

  logger.newline();
  logger.info('Final stock:');
  const finalStock = await executeQuery(conn, `
    MATCH (p:Product {id: 'prod3'})
    RETURN p.stock
  `);
  printResults(finalStock);

  logger.newline();
  logger.info('OCC Statistics:');
  console.log(`  Successful transactions: ${stats.successful_transactions}`);
  console.log(`  Failed transactions: ${stats.failed_transactions}`);
  console.log(`  Conflicts detected: ${stats.conflicts_detected}`);
  console.log(`  Total retries: ${stats.total_retries}`);
  console.log(`  Max retry count: ${stats.max_retry_count}`);
  console.log(`  Conflict rate: ${stats.conflict_rate.toFixed(2)}%`);

  // ============================================================
  // Demo 4: Version Cache Management
  // ============================================================
  logger.subheader('Demo 4: Version Cache Management');

  const cacheSize = await conn.getVersionCacheSize();
  logger.info(`Version cache size: ${cacheSize} entries`);

  logger.info('Clearing version cache...');
  await conn.clearVersionCache();
  logger.success('✓ Version cache cleared');

  // ============================================================
  // Demo 5: OCC Best Practices
  // ============================================================
  logger.subheader('Demo 5: OCC Best Practices');

  logger.info('Best practices for OCC transactions:');
  logger.dim('  1. Keep transactions short');
  logger.dim('  2. Minimize read set size');
  logger.dim('  3. Handle conflicts gracefully');
  logger.dim('  4. Monitor conflict rates');
  logger.dim('  5. Use appropriate retry counts');

  logger.newline();
  logger.info('Example: Safe purchase function with retry');
  logger.code(`
async function safePurchase(productId, quantity, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      conn.beginTransaction();

      const result = await conn.query(\`
        MATCH (p:Product {id: '\${productId}'})
        WHERE p.stock >= \${quantity}
        SET p.stock = p.stock - \${quantity}
        RETURN p.stock
      \`);

      if (result.getAll().length === 0) {
        throw new Error('Insufficient stock');
      }

      await conn.commitWithOccSync(1);
      return { success: true };

    } catch (error) {
      conn.rollback();

      if (attempt === maxRetries - 1) {
        return { success: false, error: (error as Error).message };
      }

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 100)
      );
    }
  }
}
  `);

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await db.close();
  logger.success('✓ Database closed');

  logger.header('OCC Transactions Demo Completed!');
  logger.info('OCC provides high-concurrency support without locking.');
}

/**
 * Simulate a purchase operation
 */
async function simulatePurchase(
  db: any,
  productId: string,
  quantity: number,
  customerName: string
): Promise<void> {
  const conn = db.createConnection();

  try {
    conn.beginTransaction();

    await conn.query(`
      MATCH (p:Product {id: '${productId}'})
      WHERE p.stock >= ${quantity}
      SET p.stock = p.stock - ${quantity}
    `);

    await conn.commitWithOccSync(3);

  } catch (error) {
    conn.rollback();
    console.error(`  ${customerName}: Purchase failed - ${(error as Error).message}`);
  }
}
