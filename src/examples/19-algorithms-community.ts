/**
 * Example 19: Community Detection Algorithms
 *
 * This example demonstrates CongraphDB's community detection algorithms:
 * - Louvain - Modularity-based hierarchical clustering
 * - Leiden - Improved Louvain with better guarantees
 * - Spectral Clustering - Parallel spectral clustering
 * - SLPA - Overlapping community detection
 * - Infomap - Information-theoretic clustering
 *
 * Use Case: Citation network community analysis
 */

import congraphdb from 'congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Community Detection');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('CongraphDB Community Detection Algorithms Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/communities.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Define Schema
  // ============================================================
  logger.subheader('Defining Schema');

  await conn.query(`
    CREATE NODE TABLE Paper(
      id STRING,
      title STRING,
      field STRING,
      year INT64,
      PRIMARY KEY(id)
    )
  `);

  await conn.query(`
    CREATE REL TABLE Cites(FROM Paper TO Paper)
  `);

  logger.success('✓ Schema created');

  // ============================================================
  // Create Citation Network
  // ============================================================
  logger.subheader('Creating Citation Network');

  // Create papers with field information (3 research communities)
  const papers = [
    // Machine Learning papers
    { id: 'ml1', title: 'Deep Learning Basics', field: 'ML', year: 2020 },
    { id: 'ml2', title: 'Neural Networks', field: 'ML', year: 2021 },
    { id: 'ml3', title: 'CNN Architectures', field: 'ML', year: 2022 },
    { id: 'ml4', title: 'RNN for Sequences', field: 'ML', year: 2022 },
    { id: 'ml5', title: 'Transformer Models', field: 'ML', year: 2023 },

    // Database papers
    { id: 'db1', title: 'Query Optimization', field: 'DB', year: 2020 },
    { id: 'db2', title: 'Index Structures', field: 'DB', year: 2021 },
    { id: 'db3', title: 'Transaction Processing', field: 'DB', year: 2021 },
    { id: 'db4', title: 'Distributed Databases', field: 'DB', year: 2022 },
    { id: 'db5', title: 'NewSQL Systems', field: 'DB', year: 2023 },

    // Security papers
    { id: 'sec1', title: 'Encryption Basics', field: 'Security', year: 2020 },
    { id: 'sec2', title: 'Public Key Crypto', field: 'Security', year: 2021 },
    { id: 'sec3', title: 'Zero Knowledge Proofs', field: 'Security', year: 2022 },
    { id: 'sec4', title: 'Secure Protocols', field: 'Security', year: 2023 },
  ];

  for (const paper of papers) {
    await conn.query(`
      CREATE (:Paper {id: '${paper.id}', title: '${paper.title}', field: '${paper.field}', year: ${paper.year}})
    `);
  }

  // Create citations (mostly within fields, some cross-field)
  const citations = [
    // ML citations
    ['ml1', 'ml2'],
    ['ml2', 'ml3'],
    ['ml2', 'ml4'],
    ['ml3', 'ml5'],
    ['ml4', 'ml5'],

    // DB citations
    ['db1', 'db2'],
    ['db1', 'db3'],
    ['db2', 'db4'],
    ['db3', 'db5'],
    ['db4', 'db5'],

    // Security citations
    ['sec1', 'sec2'],
    ['sec2', 'sec3'],
    ['sec3', 'sec4'],

    // Cross-field citations (rare)
    ['ml5', 'db4'], // ML paper citing DB
    ['db5', 'sec3'], // DB paper citing Security
  ];

  for (const [from, to] of citations) {
    await conn.query(`
      MATCH (f:Paper {id: '${from}'}), (t:Paper {id: '${to}'})
      CREATE (f)-[:Cites]->(t)
    `);
  }

  logger.success(`✓ Created ${papers.length} papers with ${citations.length} citations`);

  // ============================================================
  // Demo 1: Louvain Algorithm
  // ============================================================
  logger.subheader('Demo 1: Louvain Community Detection');

  logger.info('Running Louvain algorithm...');
  logger.code('CALL algo.louvain({resolution: 1.0, maxIterations: 20})');

  const louvainResult = conn.runAlgorithmSync('louvain', JSON.stringify({
    resolution: 1.0,
    maxIterations: 20
  }));

  const louvainCommunities = JSON.parse(louvainResult);

  // Group by community
  const louvainGroups: Record<number, string[]> = {};
  for (const { nodeId, communityId } of louvainCommunities) {
    if (!louvainGroups[communityId]) louvainGroups[communityId] = [];
    louvainGroups[communityId].push(nodeId);
  }

  logger.info('\nLouvain Communities:');
  for (const [id, members] of Object.entries(louvainGroups).sort((a, b) => b[1].length - a[1].length)) {
    logger.dim(`  Community ${id}: ${members.length} papers`);
    for (const memberId of members) {
      const paper = await executeQuery(conn, `
        MATCH (p:Paper {id: '${memberId}'})
        RETURN p.title, p.field
      `);
      const title = paper[0]?.['p.title'] || memberId;
      const field = paper[0]?.['p.field'] || '';
      console.log(`    - ${title} (${field})`);
    }
  }

  // ============================================================
  // Demo 2: Leiden Algorithm
  // ============================================================
  logger.subheader('Demo 2: Leiden Community Detection');

  logger.info('Running Leiden algorithm (higher quality communities)...');
  logger.code('CALL algo.leiden({resolution: 1.0, maxIterations: 20})');

  const leidenResult = conn.runAlgorithmSync('leiden', JSON.stringify({
    resolution: 1.0,
    maxIterations: 20
  }));

  const leidenCommunities = JSON.parse(leidenResult);

  // Group by community
  const leidenGroups: Record<number, string[]> = {};
  for (const { nodeId, communityId } of leidenCommunities) {
    if (!leidenGroups[communityId]) leidenGroups[communityId] = [];
    leidenGroups[communityId].push(nodeId);
  }

  logger.info('\nLeiden Communities:');
  for (const [id, members] of Object.entries(leidenGroups).sort((a, b) => b[1].length - a[1].length)) {
    logger.dim(`  Community ${id}: ${members.length} papers`);
  }

  // ============================================================
  // Demo 3: SLPA (Overlapping Communities)
  // ============================================================
  logger.subheader('Demo 3: SLPA - Overlapping Communities');

  logger.info('Running SLPA for overlapping community detection...');
  logger.code('CALL algo.slpa({threshold: 0.1, maxIterations: 20})');

  const slpaResult = conn.runAlgorithmSync('slpa', JSON.stringify({
    threshold: 0.1,
    maxIterations: 20
  }));

  const slpaCommunities = JSON.parse(slpaResult);

  logger.info('\nOverlapping Community Memberships:');
  for (const { nodeId, communities } of slpaCommunities) {
    if (communities.length > 1) {
      const paper = await executeQuery(conn, `
        MATCH (p:Paper {id: '${nodeId}'})
        RETURN p.title
      `);
      const title = paper[0]?.['p.title'] || nodeId;
      console.log(`  ${title}: belongs to ${communities.length} communities`);
      console.log(`    Communities: ${communities.join(', ')}`);
    }
  }

  // ============================================================
  // Demo 4: Spectral Clustering
  // ============================================================
  logger.subheader('Demo 4: Spectral Clustering');

  logger.info('Running Spectral Clustering (parallel)...');
  logger.code('CALL algo.spectral({maxIterations: 20, numClusters: 3})');

  const spectralResult = conn.runAlgorithmSync('spectral', JSON.stringify({
    maxIterations: 20,
    numClusters: 3
  }));

  const spectralClusters = JSON.parse(spectralResult);

  // Group by cluster
  const spectralGroups: Record<number, string[]> = {};
  for (const { nodeId, clusterId } of spectralClusters) {
    if (!spectralGroups[clusterId]) spectralGroups[clusterId] = [];
    spectralGroups[clusterId].push(nodeId);
  }

  logger.info('\nSpectral Clusters:');
  for (const [id, members] of Object.entries(spectralGroups).sort((a, b) => b[1].length - a[1].length)) {
    logger.dim(`  Cluster ${id}: ${members.length} papers`);
    for (const memberId of members) {
      const paper = await executeQuery(conn, `
        MATCH (p:Paper {id: '${memberId}'})
        RETURN p.title, p.field
      `);
      const title = paper[0]?.['p.title'] || memberId;
      const field = paper[0]?.['p.field'] || '';
      console.log(`    - ${title} (${field})`);
    }
  }

  // ============================================================
  // Demo 5: Infomap
  // ============================================================
  logger.subheader('Demo 5: Infomap');

  logger.info('Running Infomap (information-theoretic clustering)...');
  logger.code('CALL algo.infomap({maxIterations: 20})');

  const infomapResult = conn.runAlgorithmSync('infomap', JSON.stringify({
    maxIterations: 20
  }));

  const infomapCommunities = JSON.parse(infomapResult);

  // Group by community
  const infomapGroups: Record<number, string[]> = {};
  for (const { nodeId, communityId } of infomapCommunities) {
    if (!infomapGroups[communityId]) infomapGroups[communityId] = [];
    infomapGroups[communityId].push(nodeId);
  }

  logger.info('\nInfomap Communities:');
  for (const [id, members] of Object.entries(infomapGroups).sort((a, b) => b[1].length - a[1].length)) {
    logger.dim(`  Community ${id}: ${members.length} papers`);
  }

  // ============================================================
  // Demo 6: Label Propagation
  // ============================================================
  logger.subheader('Demo 6: Label Propagation');

  logger.info('Running Label Propagation (fast community detection)...');
  logger.code('CALL algo.labelPropagation({maxIterations: 20})');

  const labelPropResult = conn.runAlgorithmSync('labelPropagation', JSON.stringify({
    maxIterations: 20
  }));

  const labelPropLabels = JSON.parse(labelPropResult);

  // Group by label
  const labelPropGroups: Record<number, string[]> = {};
  for (const { nodeId, label } of labelPropLabels) {
    if (!labelPropGroups[label]) labelPropGroups[label] = [];
    labelPropGroups[label].push(nodeId);
  }

  logger.info('\nLabel Propagation Communities:');
  for (const [id, members] of Object.entries(labelPropGroups).sort((a, b) => b[1].length - a[1].length)) {
    logger.dim(`  Community ${id}: ${members.length} papers`);
  }

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Summary');

  logger.info('Community Detection Algorithm Comparison:');
  logger.dim('  • Louvain     - Fast, hierarchical, good for large graphs');
  logger.dim('  • Leiden      - Better quality than Louvain, guaranteed connectivity');
  logger.dim('  • Spectral    - Parallel, good for medium graphs with known cluster count');
  logger.dim('  • SLPA        - Overlapping communities, good for social networks');
  logger.dim('  • Infomap     - Information-theoretic, good for flow networks');
  logger.dim('  • Label Prop  - Fastest, good for very large graphs');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Community Detection Algorithms Demo Completed!');
}
