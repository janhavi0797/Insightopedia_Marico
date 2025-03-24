import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

class ProjectsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  isAllFile: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  userId: string;
}

export { ProjectsDto };
