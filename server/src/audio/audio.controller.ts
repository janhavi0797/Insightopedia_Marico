import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  UploadedFiles,
  UseInterceptors,
  Get,
  Query,
  InternalServerErrorException,
  Res,
} from '@nestjs/common';
import { AudioService } from './audio.service';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EditAudioTagDTO } from './dto/get-audio.dto';

@ApiTags('Audio Management')
@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Get('all')
  @ApiOperation({ summary: 'Get All audio and unique tag' })
  @ApiQuery({ name: 'userId', required: false })
  async getAudio(@Query('userId') userId?: string) {
    return this.audioService.getAudio(userId);
  }

  @Post('upload')
  @ApiOperation({
    summary: 'Upload multiple audio files with tags and audio details.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        AudioDto: {
          type: 'string',
          example: JSON.stringify([
            {
              audioName: 'Audio1.mp3',
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
    try {
      return await this.audioService.processAudioFiles(parsedData, files);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw new BadRequestException(`${err.message}`);
      }
      throw new InternalServerErrorException(`${err.message}`);
    }
  }

  @Get('generate-pdf')
  @ApiQuery({
    name: 'id',
    required: true,
    description: 'ID of the audio or project',
  })
  @ApiQuery({
    name: 'type',
    required: true,
    description: 'Type of data to fetch (summary or sentiment_analysis)',
  })
  @ApiQuery({
    name: 'key',
    required: true,
    description: 'Specifies whether the data belongs to a project or audio',
  })
  @ApiOperation({ summary: 'To Generate the PDF' })
  async generateSummeryPDF(
    @Res() res: Response,
    @Query('id') id: string,
    @Query('type') type: string,
    @Query('key') key: string,
  ) {
    key = key.toLowerCase();
    type = type.toLowerCase();

    if (
      (key == 'audio' || key == 'project') &&
      (type == 'summary' || type == 'sentiment_analysis')
    ) {
      return await this.audioService.generateSummeryPDF(res, id, type, key);
    } else {
      throw new BadRequestException(`Invalid Key Value.`);
    }
  }

  @Post('edit-audio-tag')
  async editUser(@Body() payload: EditAudioTagDTO) {
    return await this.audioService.editAudioTag(payload);
  }
}
