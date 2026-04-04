/**
 * Example 21: Graph Analytics Algorithms
 *
 * This example demonstrates CongraphDB's analytics algorithms:
 * - Triangle Count - Find friend triangles and clustering
 * - Connected Components - Find disconnected subgraphs
 * - Strongly Connected Components - Find cycles in directed graphs
 *
 * Use Case: Social network analysis
 */

import congraphdb from 'congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Analytics Algorithms');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('CongraphDB Analytics Algorithms Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/analytics.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Define Schema
  // ============================================================
  logger.subheader('Defining Schema');

  await conn.query(`
    CREATE NODE TABLE Person(
      id STRING,
      name STRING,
      PRIMARY KEY(id)
    )
  `);

  await conn.query(`
    CREATE REL TABLE Friends(FROM Person TO Person)
  `);

  logger.success('✓ Schema created');

  // ============================================================
  // Create Social Network with Clusters
  // ============================================================
  logger.subheader('Creating Social Network');

  // Create people (2 main friend groups)
  const people = [
    // Group 1: Work friends
    { id: 'alice', name: 'Alice' },
    { id: 'bob', name: 'Bob' },
    { id: 'charlie', name: 'Charlie' },
    { id: 'david', name: 'David' },
    { id: 'eve', name: 'Eve' },

    // Group 2: College friends
    { id: 'frank', name: 'Frank' },
    { id: 'grace', name: 'Grace' },
    { id: 'henry', name: 'Henry' },
    { id: 'iris', name: 'Iris' },
    { id: 'jack', name: 'Jack' },

    // Bridge person (knows both groups)
    { id: 'kate', name: 'Kate' },
  ];

  for (const person of people) {
    await conn.query(`
      CREATE (:Person {id: '${person.id}', name: '${person.name}'})
    `);
  }

  // Create friendships (within groups + some bridges)
  const friendships = [
    // Work group triangles
    ['alice', 'bob'],
    ['alice', 'charlie'],
    ['alice', 'eve'],
    ['bob', 'charlie'],
    ['bob', 'david'],
    ['charlie', 'david'],
    ['charlie', 'eve'],
    ['david', 'eve'],

    // College group triangles
    ['frank', 'grace'],
    ['frank', 'henry'],
    ['frank', 'jack'],
    ['grace', 'henry'],
    ['grace', 'iris'],
    ['henry', 'iris'],
    ['henry', 'jack'],
    ['iris', 'jack'],

    // Bridge connections (Kate connects both groups)
    ['kate', 'alice'],
    ['kate', 'frank'],
    ['kate', 'charlie'],
    ['kate', 'grace'],
  ];

  for (const [from, to] of friendships) {
    await conn.query(`
      MATCH (f:Person {id: '${from}'}), (t:Person {id: '${to}'})
      CREATE (f)-[:Friends]->(t)
    `);
  }

  logger.success(`✓ Created ${people.length} people with ${friendships.length} friendships`);

  // ============================================================
  // Demo 1: Triangle Count
  // ============================================================
  logger.subheader('Demo 1: Triangle Count');

  logger.info('Counting triangles in the social network...');
  logger.code('CALL algo.triangleCount()');

  const triangleResult = conn.runAlgorithmSync('triangleCount', '{}');
  const triangleData = JSON.parse(triangleResult);

  logger.info('\nTriangle Analysis:');
  logger.dim(`  Total triangles: ${triangleData.totalTriangles}`);
  logger.dim(`  Triangle density: ${(triangleData.totalTriangles / people.length).toFixed(2)} per person`);

  logger.info('\nTriangles per person:');
  const sortedByTriangles = triangleData.nodeTriangles
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 8);

  for (const { nodeId, count } of sortedByTriangles) {
    if (count > 0) {
      const person = await executeQuery(conn, `
        MATCH (p:Person {id: '${nodeId}'})
        RETURN p.name
      `);
      const name = person[0]?.['p.name'] || nodeId;
      console.log(`  ${name}: ${count} triangles`);
    }
  }

  // ============================================================
  // Demo 2: Connected Components
  // ============================================================
  logger.subheader('Demo 2: Connected Components');

  logger.info('Finding connected components...');
  logger.code('CALL algo.connectedComponents({direction: "Both"})');

  const ccResult = conn.runAlgorithmSync('connectedComponents', JSON.stringify({
    direction: 'Both'
  }));

  const components = JSON.parse(ccResult);

  // Group by component
  const componentGroups: Record<number, string[]> = {};
  for (const { nodeId, componentId } of components) {
    if (!componentGroups[componentId]) componentGroups[componentId] = [];
    componentGroups[componentId].push(nodeId);
  }

  logger.info('\nConnected Components:');
  for (const [id, members] of Object.entries(componentGroups).sort((a, b) => b[1].length - a[1].length)) {
    logger.dim(`  Component ${id}: ${members.length} people`);

    // Get names
    const names = await Promise.all(members.map(async memberId => {
      const result = await executeQuery(conn, `MATCH (p:Person {id: '${memberId}'}) RETURN p.name`);
      return result[0]?.['p.name'] || memberId;
    }));
    console.log(`    ${names.join(', ')}`);
  }

  // ============================================================
  // Demo 3: Strongly Connected Components
  // ============================================================
  logger.subheader('Demo 3: Strongly Connected Components (SCC)');

  logger.info('Finding strongly connected components...');
  logger.code('CALL algo.scc()');

  const sccResult = conn.runAlgorithmSync('scc', '{}');
  const sccComponents = JSON.parse(sccResult);

  // Group by component
  const sccGroups: Record<number, string[]> = {};
  for (const { nodeId, componentId } of sccComponents) {
    if (!sccGroups[componentId]) sccGroups[componentId] = [];
    sccGroups[componentId].push(nodeId);
  }

  logger.info('\nStrongly Connected Components:');
  for (const [id, members] of Object.entries(sccGroups).sort((a, b) => b[1].length - a[1].length)) {
    logger.dim(`  SCC ${id}: ${members.length} people`);
  }

  // ============================================================
  // Demo 4: Clustering Coefficient
  // ============================================================
  logger.subheader('Demo 4: Clustering Coefficient');

  logger.info('Calculating clustering coefficient...');

  const totalPossibleTriangles = people.length * (people.length - 1) * (people.length - 2) / 6;
  const clusteringCoefficient = triangleData.totalTriangles / totalPossibleTriangles;

  logger.info('\nNetwork Metrics:');
  logger.dim(`  Nodes: ${people.length}`);
  logger.dim(`  Edges: ${friendships.length}`);
  logger.dim(`  Triangles: ${triangleData.totalTriangles}`);
  logger.dim(`  Clustering Coefficient: ${clusteringCoefficient.toFixed(4)}`);

  // Interpretation
  logger.info('\nInterpretation:');
  if (clusteringCoefficient > 0.3) {
    logger.dim('  High clustering - This is a tight-knit community with many friend triangles');
  } else if (clusteringCoefficient > 0.1) {
    logger.dim('  Medium clustering - Moderate community structure');
  } else {
    logger.dim('  Low clustering - More random connections');
  }

  // ============================================================
  // Demo 5: Component Analysis
  // ============================================================
  logger.subheader('Demo 5: Component Analysis');

  logger.info('Analyzing component structure...');

  const componentSizes = Object.values(componentGroups).map(m => m.length);
  const largestComponentSize = Math.max(...componentSizes);
  const largestComponentRatio = largestComponentSize / people.length;

  logger.info('\nComponent Structure:');
  logger.dim(`  Number of components: ${Object.keys(componentGroups).length}`);
  logger.dim(`  Largest component size: ${largestComponentSize}`);
  logger.dim(`  Largest component ratio: ${(largestComponentRatio * 100).toFixed(1)}%`);

  if (largestComponentRatio > 0.8) {
    logger.dim('  This is a well-connected network with a dominant component');
  } else if (largestComponentRatio > 0.5) {
    logger.dim('  Network has a main component with some isolated groups');
  } else {
    logger.dim('  Network is fragmented into multiple groups');
  }

  // ============================================================
  // Demo 6: Bridge Detection
  // ============================================================
  logger.subheader('Demo 6: Bridge Detection');

  logger.info('Identifying bridge people (connect groups)...');

  // Find people who connect to multiple components
  const bridgeCandidates: Array<{ id: string; name: string; connections: number }> = [];

  for (const person of people) {
    const result = await executeQuery(conn, `
      MATCH (p:Person {id: '${person.id}'})-[:Friends]->(friend:Person)
      RETURN friend.id
    `);

    // Check if friends span different components
    const friendComponents = new Set(
      result
        .map(r => {
          const comp = components.find((c: any) => c.nodeId === r['friend.id']);
          return comp?.componentId;
        })
        .filter(c => c !== undefined)
    );

    if (friendComponents.size > 1) {
      const personResult = await executeQuery(conn, `
        MATCH (p:Person {id: '${person.id}'}) RETURN p.name
      `);
      bridgeCandidates.push({
        id: person.id,
        name: personResult[0]?.['p.name'] || person.id,
        connections: friendComponents.size
      });
    }
  }

  if (bridgeCandidates.length > 0) {
    logger.info('\nBridge People (connect multiple components):');
    for (const bridge of bridgeCandidates.sort((a, b) => b.connections - a.connections)) {
      console.log(`  ${bridge.name}: connects to ${bridge.connections} components`);
    }
  }

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Summary');

  logger.info('Analytics Algorithm Use Cases:');
  logger.dim('  • Triangle Count  - Measure clustering, find friend triangles');
  logger.dim('  • Components      - Find disconnected groups');
  logger.dim('  • SCC             - Find cycles, strongly connected regions');

  logger.info('\nNetwork Analysis Metrics:');
  logger.dim('  • Clustering Coefficient - How connected are neighbors?');
  logger.dim('  • Component Count       - How many separate groups?');
  logger.dim('  • Triangle Density      - How many friend triangles?');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Analytics Algorithms Demo Completed!');
}
