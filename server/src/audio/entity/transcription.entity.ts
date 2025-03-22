// src/audio/entities/target-group.entity.ts
import { CosmosPartitionKey } from '@nestjs/azure-database';

@CosmosPartitionKey('TGId')
export class TranscriptionEntity {
  TGId: string;    // Unique identifier for the target group
  TGName: string;
  audiodata: AudioData[];
  summary: string = '';   // Default empty string
  sentiment_analysis: string = '';   // Default empty string
  combinedTranslation: string = '';
  vectorId: string = '';
}

class AudioData {
  speaker: string;
  timestamp: string;
  transcription: string;
  translation: string;
}