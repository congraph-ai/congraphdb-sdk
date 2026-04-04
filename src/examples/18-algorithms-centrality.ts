/**
 * Example 18: Centrality Algorithms
 *
 * This example demonstrates CongraphDB's centrality algorithms:
 * - PageRank - Importance ranking based on link structure
 * - Betweenness Centrality - Bridge nodes in communication paths
 * - Closeness Centrality - Nodes close to all other nodes
 * - Degree Centrality - Highly connected nodes
 *
 * Use Case: Social network influence analysis
 */

import congraphdb from 'congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Centrality Algorithms');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('CongraphDB Centrality Algorithms Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/centrality.cgraph',
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
    CREATE REL TABLE Knows(FROM Person TO Person)
  `);

  logger.success('✓ Schema created');

  // ============================================================
  // Create Social Network
  // ============================================================
  logger.subheader('Creating Social Network');

  // Create people
  const people = [
    { id: 'alice', name: 'Alice' },
    { id: 'bob', name: 'Bob' },
    { id: 'charlie', name: 'Charlie' },
    { id: 'david', name: 'David' },
    { id: 'eve', name: 'Eve' },
    { id: 'frank', name: 'Frank' },
    { id: 'grace', name: 'Grace' },
    { id: 'henry', name: 'Henry' },
  ];

  for (const person of people) {
    await conn.query(`
      CREATE (:Person {id: '${person.id}', name: '${person.name}'})
    `);
  }

  // Create connections (knows relationships)
  const connections = [
    ['alice', 'bob'],
    ['alice', 'charlie'],
    ['alice', 'david'],
    ['bob', 'charlie'],
    ['bob', 'eve'],
    ['charlie', 'david'],
    ['charlie', 'frank'],
    ['david', 'frank'],
    ['david', 'grace'],
    ['eve', 'frank'],
    ['eve', 'henry'],
    ['frank', 'grace'],
    ['frank', 'henry'],
    ['grace', 'henry'],
  ];

  for (const [from, to] of connections) {
    await conn.query(`
      MATCH (f:Person {id: '${from}'}), (t:Person {id: '${to}'})
      CREATE (f)-[:Knows]->(t)
    `);
  }

  logger.success(`✓ Created ${people.length} people with ${connections.length} connections`);

  // ============================================================
  // Demo 1: PageRank Algorithm
  // ============================================================
  logger.subheader('Demo 1: PageRank Algorithm');

  logger.info('Running PageRank to find influential people...');
  logger.code('CALL algo.pagerank({dampingFactor: 0.85, maxIterations: 20})');

  const pageRankResult = conn.runAlgorithmSync('pagerank', JSON.stringify({
    dampingFactor: 0.85,
    maxIterations: 20
  }));

  const pageRankScores = JSON.parse(pageRankResult);

  logger.info('\nPageRank Scores (Top 5):');
  const sortedByPageRank = pageRankScores
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);

  for (const { nodeId, score } of sortedByPageRank) {
    const person = await executeQuery(conn, `
      MATCH (p:Person {id: '${nodeId}'})
      RETURN p.name
    `);
    const name = person[0]?.['p.name'] || nodeId;
    console.log(`  ${name}: ${score.toFixed(4)}`);
  }

  // ============================================================
  // Demo 2: Degree Centrality
  // ============================================================
  logger.subheader('Demo 2: Degree Centrality');

  logger.info('Running Degree Centrality to find highly connected people...');
  logger.code('CALL algo.degree({direction: "Both", normalized: false})');

  const degreeResult = conn.runAlgorithmSync('degree', JSON.stringify({
    direction: 'Both',
    normalized: false
  }));

  const degreeScores = JSON.parse(degreeResult);

  logger.info('\nDegree Centrality (Most connections):');
  const sortedByDegree = degreeScores
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);

  for (const { nodeId, score } of sortedByDegree) {
    const person = await executeQuery(conn, `
      MATCH (p:Person {id: '${nodeId}'})
      RETURN p.name
    `);
    const name = person[0]?.['p.name'] || nodeId;
    console.log(`  ${name}: ${Math.round(score)} connections`);
  }

  // ============================================================
  // Demo 3: Betweenness Centrality
  // ============================================================
  logger.subheader('Demo 3: Betweenness Centrality');

  logger.info('Running Betweenness Centrality to find bridge nodes...');
  logger.code('CALL algo.betweenness({direction: "Out"})');

  const betweennessResult = conn.runAlgorithmSync('betweenness', JSON.stringify({
    direction: 'Out'
  }));

  const betweennessScores = JSON.parse(betweennessResult);

  logger.info('\nBetweenness Centrality (Bridge nodes):');
  const sortedByBetweenness = betweennessScores
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);

  for (const { nodeId, score } of sortedByBetweenness) {
    const person = await executeQuery(conn, `
      MATCH (p:Person {id: '${nodeId}'})
      RETURN p.name
    `);
    const name = person[0]?.['p.name'] || nodeId;
    console.log(`  ${name}: ${score.toFixed(4)}`);
  }

  // ============================================================
  // Demo 4: Closeness Centrality
  // ============================================================
  logger.subheader('Demo 4: Closeness Centrality');

  logger.info('Running Closeness Centrality to find central nodes...');
  logger.code('CALL algo.closeness({direction: "Out"})');

  const closenessResult = conn.runAlgorithmSync('closeness', JSON.stringify({
    direction: 'Out'
  }));

  const closenessScores = JSON.parse(closenessResult);

  logger.info('\nCloseness Centrality (Closest to all others):');
  const sortedByCloseness = closenessScores
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);

  for (const { nodeId, score } of sortedByCloseness) {
    const person = await executeQuery(conn, `
      MATCH (p:Person {id: '${nodeId}'})
      RETURN p.name
    `);
    const name = person[0]?.['p.name'] || nodeId;
    console.log(`  ${name}: ${score.toFixed(4)}`);
  }

  // ============================================================
  // Demo 5: Combined Analysis
  // ============================================================
  logger.subheader('Demo 5: Combined Centrality Analysis');

  logger.info('Creating a combined ranking of all centrality measures...');

  // Create a map of scores by person
  const personScores: Record<string, { pageRank: number; degree: number; betweenness: number; closeness: number }> = {};

  for (const { nodeId, score } of pageRankScores) {
    if (!personScores[nodeId]) personScores[nodeId] = { pageRank: 0, degree: 0, betweenness: 0, closeness: 0 };
    personScores[nodeId].pageRank = score;
  }

  for (const { nodeId, score } of degreeScores) {
    if (!personScores[nodeId]) personScores[nodeId] = { pageRank: 0, degree: 0, betweenness: 0, closeness: 0 };
    personScores[nodeId].degree = score;
  }

  for (const { nodeId, score } of betweennessScores) {
    if (!personScores[nodeId]) personScores[nodeId] = { pageRank: 0, degree: 0, betweenness: 0, closeness: 0 };
    personScores[nodeId].betweenness = score;
  }

  for (const { nodeId, score } of closenessScores) {
    if (!personScores[nodeId]) personScores[nodeId] = { pageRank: 0, degree: 0, betweenness: 0, closeness: 0 };
    personScores[nodeId].closeness = score;
  }

  // Calculate combined score (normalized)
  const combined: Array<{ id: string; name: string; combinedScore: number }> = [];

  for (const [id, scores] of Object.entries(personScores)) {
    const person = await executeQuery(conn, `
      MATCH (p:Person {id: '${id}'})
      RETURN p.name
    `);
    const name = person[0]?.['p.name'] || id;

    // Normalize and combine (simple average of normalized values)
    const combinedScore = (
      scores.pageRank +
      scores.degree / 10 +
      scores.betweenness * 10 +
      scores.closeness
    ) / 4;

    combined.push({ id, name, combinedScore });
  }

  combined.sort((a, b) => b.combinedScore - a.combinedScore);

  logger.info('\nCombined Centrality Ranking:');
  console.log('  Rank | Name        | PageRank | Degree | Betweenness | Closeness | Combined');
  console.log('  ' + '-'.repeat(85));

  for (let i = 0; i < Math.min(5, combined.length); i++) {
    const { id, name, combinedScore } = combined[i];
    const scores = personScores[id];
    console.log(
      `  ${String(i + 1).padStart(4)} | ${name.padEnd(10)} | ` +
      `${scores.pageRank.toFixed(4).padStart(8)} | ` +
      `${String(Math.round(scores.degree)).padStart(6)} | ` +
      `${scores.betweenness.toFixed(4).padStart(11)} | ` +
      `${scores.closeness.toFixed(4).padStart(9)} | ` +
      `${combinedScore.toFixed(4).padStart(8)}`
    );
  }

  // ============================================================
  // Demo 6: JavaScript API Helper
  // ============================================================
  logger.subheader('Demo 6: JavaScript API Helper');

  logger.info('You can also run algorithms using the JavaScript API:');
  logger.code(`
const result = conn.runAlgorithmSync(
  'pagerank',
  JSON.stringify({ dampingFactor: 0.85, maxIterations: 20 })
);
const scores = JSON.parse(result);
  `);

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Summary');

  logger.info('Centrality Algorithm Use Cases:');
  logger.dim('  • PageRank     - Find influential nodes (search, social networks)');
  logger.dim('  • Degree       - Find hubs (network analysis, recommendation)');
  logger.dim('  • Betweenness  - Find bridges (communication bottlenecks)');
  logger.dim('  • Closeness    - Find central nodes (information spread)');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Centrality Algorithms Demo Completed!');
}
