import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

class ProjectsDto {
  @ApiProperty({ enum: ['0', '1'] })
  @IsString()
  @IsOptional()
  isAllFile: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  userId: string;
}

export { ProjectsDto };
