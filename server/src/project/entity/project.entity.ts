import { CosmosPartitionKey } from "@nestjs/azure-database";

@CosmosPartitionKey('projectId')
export class ProjectEntity {
    projectId: string;
    projectName: string;
    userId: string;
    audioIds: string[];
    summary: string;
    sentiment_analysis: string;
    id: string;
}