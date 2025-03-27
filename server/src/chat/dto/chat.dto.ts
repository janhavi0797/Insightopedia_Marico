import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

class ChatDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  chat: { from: string; message: string }[];

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  key: string;
}

export { ChatDto };
