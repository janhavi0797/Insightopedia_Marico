import { ApiProperty } from '@nestjs/swagger';

// src/user/dto/user.dto.ts
export interface IUser {
  id?: string; // Optional because it will be generated on create
  userid: string;
  userName: string;
  email: string;
  rolecode: string;
}

export class IUserDto implements IUser {
  @ApiProperty({
    example: '1234',
    description: 'Unique user ID',
    required: false,
  })
  id?: string;

  @ApiProperty({
    example: '5635d8b8-c9b9-4d9a-8a4d-f7cad74dc82a',
    description: 'User unique identifier',
  })
  userid: string;

  @ApiProperty({
    example: 'Janhavi Parte',
    description: 'Full name of the user',
  })
  userName: string;

  @ApiProperty({
    example: 'janhavi.parte@atriina.com',
    description: 'Email address of the user',
  })
  email: string;

  @ApiProperty({ example: '1', description: 'User role code' })
  rolecode: string;
}

export class IUserEditDto {
  @ApiProperty({
    example: 'Janhavi Parte',
    description: 'Full name of the user',
  })
  name: string;

  @ApiProperty({
    example: 'Janhavi.Parte@marico.com',
    description: 'Email address of the user',
  })
  email: string;

  @ApiProperty({ example: '1', description: 'User role' })
  role: string;

  @ApiProperty({
    example: [
      '5635d8b8-c9b9-4d9a-8a4d-f7cad74dc85r',
      '5635d8b8-c9b9-4d9a-8a4d-f7cad74dc82i',
    ],
    description: 'List of mapped user IDs',
    type: [String],
  })
  mapUser: string[];
}
