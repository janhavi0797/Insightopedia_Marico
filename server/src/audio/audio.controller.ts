import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AudioService } from './audio.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('audio')
@ApiTags('Audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload multiple audio files with tags and audio details.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          example: JSON.stringify([
            {
              audioName: 'Audio 1',
              noOfSpek: 2,
              userId: '8e540e96-dfc0-4b4f-b80e-dc26e7291054',
              audioDate: '2024-03-21',
              primary_lang: 'English',
              secondary_lang: ['Hindi'],
              tags: ['Tag1'],
            },
          ]),
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files'))
  async uploadAudioFiles(
    @Body('AudioDto') AudioDto: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded.');
    }

    // Log the file details
    Logger.log(`Received request to upload ${files.length} files.`);

    const parsedData = JSON.parse(AudioDto);

    // Call the service to process the audio files
    await this.audioService.processAudioFiles(parsedData, files);

    return {
      statusCode: 200,
      message: 'File Uploaded successfully.',
    };
  }
}
