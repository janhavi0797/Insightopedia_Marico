import { CosmosPartitionKey } from "@nestjs/azure-database";

@CosmosPartitionKey('projectId')
export class Audio {
    /** Cosmos DB document id */
    //id: string;
  
    /** Partition key (must match the container's partition key path) */
    audioId: string;
  
    /** Name of the audio file */
    audioName: string;
  
    /** Reference to user who uploaded it */
    userId: string;
  
    /** Tags related to the audio */
    tags: string[];
  
    /** URL to access the audio */
    audioUrl: string;
  
    /** Transcribed and translated audio data */
    audiodata: {
      speaker: string;
      timestamp: string;
      transcription: string;
      translation: string;
    }[];
  
    /** Summary of the audio content */
    summary: string;
  
    /** Sentiment analysis result */
    sentiment_analysis: string;
  
    /** Combined translation of entire audio */
    CombinedTranslation: string;
  
    /** Vector embeddings reference (e.g., for semantic search) */
    vectorIds: string[];
  
    /** Status flag (e.g., 0 = processing, 1 = completed, etc.) */
    status: number;
  
  }
  