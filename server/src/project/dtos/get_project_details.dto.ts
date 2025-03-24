import { Type } from 'class-transformer';
import { IsNotEmpty, IsArray, IsString, ValidateNested } from 'class-validator';

export class AudioDataDTO {
  @IsNotEmpty()
  audioId: string;
  @IsNotEmpty()
  audioName: string;
  @IsNotEmpty()
  userId: string;
  @IsArray()
  tags: string[];
  @IsNotEmpty()
  audioUrl: string;
  @IsArray()
  audiodata: string[];
  @IsNotEmpty()
  summary: string;
  @IsNotEmpty()
  sentiment_analysis: string;
  @IsNotEmpty()
  combinedTranslation: string;
  @IsArray()
  vectorId: string[];
}

export class GetProjectDetailsDto {
  @IsString()
  projectId: string;

  @IsString()
  projectName: string;

  @IsString()
  userId: string;

  @IsString()
  summary: string;

  @IsString()
  sentiment_analysis: string;

  @IsArray()
  vectorId: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AudioDataDTO)
  AudioData: AudioDataDTO[];
}
