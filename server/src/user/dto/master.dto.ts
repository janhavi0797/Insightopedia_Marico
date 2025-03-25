import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RoleDataDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsArray()
  access: string[];
}

class LanguagesDataDto {
  @IsString()
  name: string;

  @IsString()
  code: string;
}

export class CreateMasterDto {
  @IsString()
  id: string; // Unique identifier

  @IsString()
  master_id: string; // Partition Key

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleDataDto)
  Role: RoleDataDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguagesDataDto)
  Languages: LanguagesDataDto[];
}
