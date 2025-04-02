import { IsArray, IsNotEmpty } from 'class-validator';

export class AudioGetAllDTO {
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

  @IsNotEmpty()
  uploadStatus: number;
}

export class EditAudioTagDTO {
  @IsNotEmpty()
  audioId: string;

  @IsArray()
  tags: string[];
}

export class GetAllFilesDTO {
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

  @IsNotEmpty()
  uploadStatus: number;

  @IsArray()
  projectDetails: string[];

  @IsNotEmpty()
  _ts: number;
}

export class GetAllUniqueTagDTO {
  @IsArray()
  tags: string[];
}
