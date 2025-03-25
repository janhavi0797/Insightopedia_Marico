import { ApiProperty } from '@nestjs/swagger';

class AudioIds {
  @ApiProperty()
  audioId: string;
}

export class CreateProjectDto {
  @ApiProperty()
  userId: string;
  @ApiProperty()
  projectName: string;
  @ApiProperty({ type: [AudioIds] })
  audioIds: AudioIds[];
}

export class CreateProjectResponseDto {
  message: string;
  project: CreateProjectDto;
}
