import { Container } from '@azure/cosmos';
import { Injectable } from '@nestjs/common';
import { Audio } from './entity/audio.enitity';
import { InjectModel } from '@nestjs/azure-database';
import { AudioGetAllDTO } from './dto/get-audio.dto';

@Injectable()
export class AudioService {
  constructor(@InjectModel(Audio) private readonly audioContainer: Container) {}

  // Get Audio ALL and User with unique tag
  async getAudio(userId?: string) {
    try {
      let sqlQuery = 'SELECT * FROM c';

      if (userId) {
        sqlQuery = `SELECT * FROM c WHERE c.userId = @userId`;
      }

      const querySpec = {
        query: sqlQuery,
        parameters: userId ? [{ name: '@userId', value: userId }] : [],
      };

      const { resources } = await this.audioContainer.items
        .query(querySpec)
        .fetchAll();

      if (!resources || resources.length === 0) {
        return {
          statusCode: 404,
          message: 'No audio records found',
          data: { audioData: [], allUniqueTags: [] },
        };
      }

      const audioData: AudioGetAllDTO[] = resources.map((item) => ({
        audioId: item.audioId,
        audioName: item.audioName,
        userId: item.userId,
        tags: item.tags || [],
        audioUrl: item.audioUrl,
      }));

      const allUniqueTags = [
        ...new Set(audioData.flatMap((audio) => audio.tags)),
      ];

      return {
        statusCode: 200,
        message: 'Audio records fetched successfully',
        data: { audioData, allUniqueTags },
      };
    } catch (error) {
      console.error('Error fetching audio records:', error);

      return {
        statusCode: 500,
        message: 'Failed to fetch audio records',
        data: null,
        error: error.message,
      };
    }
  }
}
