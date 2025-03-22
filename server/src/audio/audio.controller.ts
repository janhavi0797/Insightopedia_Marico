import { Controller, Get, Query } from '@nestjs/common';
import { AudioService } from './audio.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Audio Management')
@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}
  @Get('all')
  @ApiOperation({ summary: 'Get All audio and unique tag' })
  async getAudio(@Query('userId') userId?: string) {
    return this.audioService.getAudio(userId);
  }
}
