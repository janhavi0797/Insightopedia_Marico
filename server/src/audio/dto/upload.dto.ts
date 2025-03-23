// import { ApiProperty } from '@nestjs/swagger';
// import {
//   ArrayNotEmpty,
//   IsArray,
//   IsDate,
//   IsNotEmpty,
//   IsNumber,
//   IsString,
// } from 'class-validator';

// class UploadAudioDto {
//   @ApiProperty()
//   @IsString()
//   @IsNotEmpty()
//   audioName: string;

//   @ApiProperty()
//   @IsNumber()
//   @IsNotEmpty()
//   noOfSpek: number;

//   @ApiProperty()
//   @IsDate()
//   @IsNotEmpty()
//   audioDate: Date;

//   @ApiProperty()
//   @IsString()
//   @IsNotEmpty()
//   primary_lang: string;

//   @ApiProperty({
//     type: [String],
//     description: 'List of secondary language',
//   })
//   @IsArray()
//   @ArrayNotEmpty()
//   @IsString({ each: true })
//   secondary_lang: string[];

//   @ApiProperty({
//     type: [String],
//     description: 'List of tags',
//   })
//   @IsArray()
//   @ArrayNotEmpty()
//   @IsString({ each: true })
//   tags: string[];
// }

// export { UploadAudioDto };
