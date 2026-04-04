/**
 * Example 20: Traversal and Path Algorithms
 *
 * This example demonstrates CongraphDB's traversal and path algorithms:
 * - BFS (Breadth-First Search) - Level-by-level exploration
 * - DFS (Depth-First Search) - Deep exploration
 * - Dijkstra - Shortest path with weighted edges
 *
 * Use Case: Road network route planning
 */

import congraphdb from 'congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Traversal Algorithms');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('CongraphDB Traversal & Path Algorithms Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/traversal.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Define Schema
  // ============================================================
  logger.subheader('Defining Schema');

  await conn.query(`
    CREATE NODE TABLE City(
      id STRING,
      name STRING,
      x INT64,
      y INT64,
      PRIMARY KEY(id)
    )
  `);

  await conn.query(`
    CREATE REL TABLE Road(
      FROM City TO City,
      distance INT64,
      travelTime INT64
    )
  `);

  logger.success('✓ Schema created');

  // ============================================================
  // Create Road Network
  // ============================================================
  logger.subheader('Creating Road Network');

  // Create cities in a grid pattern
  const cities = [
    { id: 'seattle', name: 'Seattle', x: 0, y: 4 },
    { id: 'portland', name: 'Portland', x: 0, y: 3 },
    { id: 'san_francisco', name: 'San Francisco', x: 0, y: 1 },
    { id: 'los_angeles', name: 'Los Angeles', x: 0, y: 0 },

    { id: 'boise', name: 'Boise', x: 2, y: 4 },
    { id: 'salt_lake', name: 'Salt Lake City', x: 3, y: 3 },
    { id: 'las_vegas', name: 'Las Vegas', x: 2, y: 1 },
    { id: 'phoenix', name: 'Phoenix', x: 2, y: 0 },

    { id: 'denver', name: 'Denver', x: 4, y: 3 },
    { id: 'santa_fe', name: 'Santa Fe', x: 4, y: 2 },
    { id: 'albuquerque', name: 'Albuquerque', x: 4, y: 1 },

    { id: 'chicago', name: 'Chicago', x: 6, y: 4 },
    { id: 'kansas_city', name: 'Kansas City', x: 6, y: 3 },
    { id: 'oklahoma_city', name: 'Oklahoma City', x: 6, y: 2 },
  ];

  for (const city of cities) {
    await conn.query(`
      CREATE (:City {id: '${city.id}', name: '${city.name}', x: ${city.x}, y: ${city.y}})
    `);
  }

  // Create roads with distances (roughly based on grid)
  const roads = [
    // West coast I-5
    ['seattle', 'portland', 174],
    ['portland', 'san_francisco', 635],
    ['san_francisco', 'los_angeles', 382],

    // East-west connections
    ['seattle', 'boise', 504],
    ['portland', 'boise', 431],
    ['san_francisco', 'las_vegas', 568],
    ['los_angeles', 'las_vegas', 286],
    ['los_angeles', 'phoenix', 372],

    // Mountain region
    ['boise', 'salt_lake', 340],
    ['salt_lake', 'denver', 518],
    ['salt_lake', 'las_vegas', 421],
    ['las_vegas', 'phoenix', 297],
    ['las_vegas', 'albuquerque', 574],
    ['phoenix', 'albuquerque', 424],

    // Central region
    ['denver', 'kansas_city', 599],
    ['denver', 'santa_fe', 392],
    ['santa_fe', 'albuquerque', 64],
    ['santa_fe', 'oklahoma_city', 545],
    ['albuquerque', 'oklahoma_city', 543],

    // Midwest
    ['chicago', 'kansas_city', 525],
    ['kansas_city', 'oklahoma_city', 353],
  ];

  for (const [from, to, distance] of roads) {
    const dist = distance as number;
    await conn.query(`
      MATCH (f:City {id: '${from}'}), (t:City {id: '${to}'})
      CREATE (f)-[:Road {distance: ${dist}, travelTime: ${Math.ceil(dist / 60)}}]->(t)
    `);
  }

  logger.success(`✓ Created ${cities.length} cities with ${roads.length} roads`);

  // ============================================================
  // Demo 1: BFS Traversal
  // ============================================================
  logger.subheader('Demo 1: BFS (Breadth-First Search)');

  logger.info('Finding cities within 2 hops of Seattle...');
  logger.code('CALL algo.bfs({maxDepth: 2, direction: "Out"})');

  const bfsResult = conn.runAlgorithmSync('bfs', JSON.stringify({
    maxDepth: 2,
    direction: 'Out'
  }));

  const bfsNodes = JSON.parse(bfsResult);

  logger.info('\nBFS Results from Seattle (by depth):');
  const byDepth: Record<number, string[]> = {};
  for (const { nodeId, depth } of bfsNodes) {
    if (!byDepth[depth]) byDepth[depth] = [];
    byDepth[depth].push(nodeId);
  }

  for (const [depth, nodes] of Object.entries(byDepth).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
    const cityNames = await Promise.all(nodes.map(async id => {
      const result = await executeQuery(conn, `MATCH (c:City {id: '${id}'}) RETURN c.name`);
      return result[0]?.['c.name'] || id;
    }));
    logger.dim(`  Depth ${depth}: ${cityNames.join(', ')}`);
  }

  // ============================================================
  // Demo 2: DFS Traversal
  // ============================================================
  logger.subheader('Demo 2: DFS (Depth-First Search)');

  logger.info('Finding cities using DFS exploration...');
  logger.code('CALL algo.dfs({maxDepth: 3, direction: "Out"})');

  const dfsResult = conn.runAlgorithmSync('dfs', JSON.stringify({
    maxDepth: 3,
    direction: 'Out'
  }));

  const dfsNodes = JSON.parse(dfsResult);

  logger.info('\nDFS Results (first 10 cities in traversal order):');
  for (let i = 0; i < Math.min(10, dfsNodes.length); i++) {
    const { nodeId, depth } = dfsNodes[i];
    const result = await executeQuery(conn, `MATCH (c:City {id: '${nodeId}'}) RETURN c.name`);
    const name = result[0]?.['c.name'] || nodeId;
    console.log(`  ${i + 1}. ${name} (depth: ${depth})`);
  }

  // ============================================================
  // Demo 3: Dijkstra Shortest Path
  // ============================================================
  logger.subheader('Demo 3: Dijkstra Shortest Path');

  logger.info('Finding shortest paths from Seattle...');
  logger.code('CALL algo.dijkstra({weightProperty: "distance", direction: "Out"})');

  const dijkstraResult = conn.runAlgorithmSync('dijkstra', JSON.stringify({
    weightProperty: 'distance',
    direction: 'Out'
  }));

  const paths = JSON.parse(dijkstraResult);

  logger.info('\nShortest Paths from Seattle:');
  logger.info('  Destination | Distance (mi) | Path');
  logger.info('  ' + '-'.repeat(70));

  // Sort by distance and show top 10
  const sortedPaths = paths
    .sort((a: any, b: any) => a.cost - b.cost)
    .slice(0, 10);

  for (const path of sortedPaths) {
    const targetId = path.target;
    const cost = path.cost;
    const pathIds = path.path || [];

    // Get target name
    const targetResult = await executeQuery(conn, `MATCH (c:City {id: '${targetId}'}) RETURN c.name`);
    const targetName = targetResult[0]?.['c.name'] || targetId;

    // Get path names
    const pathNames = await Promise.all(pathIds.map(async (id: string) => {
      const result = await executeQuery(conn, `MATCH (c:City {id: '${id}'}) RETURN c.name`);
      return result[0]?.['c.name'] || id;
    }));

    console.log(`  ${targetName.padEnd(11)} | ${String(cost).padStart(12)} | ${pathNames.join(' → ')}`);
  }

  // ============================================================
  // Demo 4: Bidirectional Comparison
  // ============================================================
  logger.subheader('Demo 4: Direction Comparison');

  logger.info('Comparing outbound vs inbound connections...');

  const bfsOut = conn.runAlgorithmSync('bfs', JSON.stringify({
    maxDepth: 2,
    direction: 'Out'
  }));
  const outNodes = JSON.parse(bfsOut);

  const bfsIn = conn.runAlgorithmSync('bfs', JSON.stringify({
    maxDepth: 2,
    direction: 'In'
  }));
  const inNodes = JSON.parse(bfsIn);

  console.log(`\n  Outbound from Seattle: ${outNodes.length} cities reachable within 2 hops`);
  console.log(`  Inbound to Seattle: ${inNodes.length} cities can reach Seattle within 2 hops`);

  // ============================================================
  // Demo 5: Route Planning
  // ============================================================
  logger.subheader('Demo 5: Route Planning Example');

  logger.info('Planning a route from Seattle to Phoenix...');

  const routePath = paths.find((p: any) => p.target === 'phoenix');
  if (routePath) {
    const pathNames = await Promise.all(routePath.path.map(async (id: string) => {
      const result = await executeQuery(conn, `MATCH (c:City {id: '${id}'}) RETURN c.name`);
      return result[0]?.['c.name'] || id;
    }));

    logger.info(`\n  Shortest Route (${routePath.cost} miles):`);
    logger.dim(`    ${pathNames.join(' → ')}`);
  }

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Summary');

  logger.info('Traversal & Path Algorithm Use Cases:');
  logger.dim('  • BFS         - Find nearby nodes, level-based exploration');
  logger.dim('  • DFS         - Deep exploration, path finding');
  logger.dim('  • Dijkstra    - Shortest path with weighted edges');

  logger.info('\nDirection Options:');
  logger.dim('  • Out         - Follow outgoing relationships');
  logger.dim('  • In          - Follow incoming relationships');
  logger.dim('  • Both        - Follow relationships in both directions');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Traversal & Path Algorithms Demo Completed!');
}
