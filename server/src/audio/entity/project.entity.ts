import { CosmosPartitionKey } from '@nestjs/azure-database';

@CosmosPartitionKey('projectId')
export class Project {
  /** Cosmos DB id (document id) */
  projectId: string;

  /** Name of the project */
  projectName: string;

  /** Partition key (must match the partition key defined in Cosmos DB container) */
  userId: string;

  /** Foreign key to audio documents */
  audioIds: string[];

  /** Summary of the project */
  summary: string;

  /** Sentiment analysis result */
  sentiment_analysis: string;
}
