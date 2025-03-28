import { CosmosPartitionKey } from '@nestjs/azure-database';

@CosmosPartitionKey('audioId')
export class AudioEntity {
  audioId: string;
  audioName: string;
  userId: string;
  tags: string[];
  audioUrl: string;
  audioDate: string;
  primaryLang: string;
  secondaryLang: string[];
  noOfSpek: number;
  audiodata: Audiodata[];
  isTranscriptionFetched: boolean;
  summary: string;
  sentiment_analysis: string;
  combinedTranslation: string;
  vectorIds: string[];
  status: number;
  uploadStatus: number;
}

class Audiodata {
  speaker: string;
  timestamp: string;
  transcription: string;
  translation: string;
}
