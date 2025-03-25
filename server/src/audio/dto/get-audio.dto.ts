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
}
