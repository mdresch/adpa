import * as neo4j from 'neo4j-driver';
import { logger } from '../utils/logger';

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

export class Neo4jService {
  private driver: neo4j.Driver;
  private config: Neo4jConfig;

  constructor(environment: 'development' | 'staging' | 'production') {
    this.config = this.getConfig(environment);
    this.driver = neo4j.driver(
      this.config.uri,
      neo4j.auth.basic(this.config.username, this.config.password)
    );
  }

  private getConfig(environment: string): Neo4jConfig {
    const configs = {
      development: {
        uri: process.env.NEO4J_URI_DEV || 'neo4j://localhost:7687',
        username: process.env.NEO4J_USERNAME_DEV || 'neo4j',
        password: process.env.NEO4J_PASSWORD_DEV || 'password',
        database: process.env.NEO4J_DATABASE_DEV || 'neo4j'
      },
      staging: {
        uri: process.env.NEO4J_URI_STAGING || 'bolt://staging-neo4j:7687',
        username: process.env.NEO4J_USERNAME_STAGING || 'neo4j',
        password: process.env.NEO4J_PASSWORD_STAGING || 'staging-password',
        database: 'staging'
      },
      production: {
        uri: process.env.NEO4J_URI_PROD || 'bolt://prod-neo4j:7687',
        username: process.env.NEO4J_USERNAME_PROD || 'neo4j',
        password: process.env.NEO4J_PASSWORD_PROD || 'prod-password',
        database: 'production'
      }
    };

    return configs[environment as keyof typeof configs];
  }

  async runQuery(query: string, parameters: any = {}): Promise<any> {
    const session = this.driver.session({
      database: this.config.database,
      defaultAccessMode: neo4j.session.WRITE
    });

    try {
      logger.debug(`Executing Neo4j query: ${query.substring(0, 100)}...`);
      const result = await session.run(query, parameters);
      return result.records;
    } catch (error) {
      logger.error('Neo4j query error:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async runQueryWithTransaction(queries: Array<{query: string, parameters?: any}>): Promise<any[]> {
    const session = this.driver.session({
      database: this.config.database,
      defaultAccessMode: neo4j.session.WRITE
    });

    try {
      const tx = session.beginTransaction();
      const results = [];

      try {
        for (const { query, parameters = {} } of queries) {
          logger.debug(`Executing transaction query: ${query.substring(0, 100)}...`);
          const result = await tx.run(query, parameters);
          results.push(result.records);
        }

        await tx.commit();
        return results;
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('Neo4j transaction error:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const result = await this.runQuery('RETURN 1 as test');
      return result.length > 0;
    } catch (error) {
      logger.error('Neo4j connection failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  // Graph traversal helpers
  async getProjectGraph(projectId: string): Promise<any> {
    const query = `
      MATCH (p:Project {id: $projectId})
      OPTIONAL MATCH (p)-[:CONTAINS]->(d:Document)
      OPTIONAL MATCH (p)-[:CONTAINS]->(su:SemanticUnit)
      OPTIONAL MATCH (p)-[:HAS_MATURITY]->(ml:MaturityLevel)
      OPTIONAL MATCH (p)-[:FALLS_UNDER]->(gd:GovernanceDomain)
      OPTIONAL MATCH (su)-[:CONTAINS_ENTITY]->(e:Entity)
      OPTIONAL MATCH (e)-[:IS_TYPE]->(et:EntityType)
      
      RETURN p, d, su, ml, gd, e, et
    `;

    return await this.runQuery(query, { projectId });
  }

  async getEntityRelationships(entityId: string): Promise<any> {
    const query = `
      MATCH (e:Entity {id: $entityId})
      MATCH (e)-[r]->(related)
      RETURN e, r, related, type(r) as relationshipType
    `;

    return await this.runQuery(query, { entityId });
  }

  async getGovernanceInsights(): Promise<any> {
    const query = `
      MATCH (gd:GovernanceDomain)<-[:FALLS_UNDER]-(p:Project)
      OPTIONAL MATCH (p)-[:HAS_MATURITY]->(ml:MaturityLevel)
      RETURN gd.name as domain, 
             count(p) as projectCount,
             avg(ml.level) as avgMaturityLevel,
             collect(p.name) as projects
      ORDER BY projectCount DESC
    `;

    return await this.runQuery(query);
  }

  async getMaturityDistribution(): Promise<any> {
    const query = `
      MATCH (p:Project)-[:HAS_MATURITY]->(ml:MaturityLevel)
      RETURN ml.name as maturityLevel, 
             ml.level as level,
             count(p) as projectCount
      ORDER BY level
    `;

    return await this.runQuery(query);
  }

  async getEntityTypeDistribution(): Promise<any> {
    const query = `
      MATCH (e:Entity)-[:IS_TYPE]->(et:EntityType)
      RETURN et.name as entityType, 
             count(e) as entityCount
      ORDER BY entityCount DESC
      LIMIT 20
    `;

    return await this.runQuery(query);
  }
}
