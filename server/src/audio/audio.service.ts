import { Container } from '@azure/cosmos';
import { Injectable } from '@nestjs/common';
import { Audio } from './entity/audio.enitity';
import { InjectModel } from '@nestjs/azure-database';
import { AudioGetAllDTO } from './dto/get-audio.dto';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AudioService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;
  constructor(
    @InjectModel(Audio) private readonly audioContainer: Container,
    private readonly config: ConfigService,
  ) {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING'),
    );
    this.containerClient = this.blobServiceClient.getContainerClient(
      this.config.get<string>('AUDIO_UPLOAD_BLOB_CONTAINER'),
    );
  }

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

      const audioData: AudioGetAllDTO[] = await Promise.all(
        resources.map(async (item) => {
          const fileUrl = await this.generateBlobSasUrl(
            item.audioName.substring(item.audioName.lastIndexOf('/') + 1),
          );

          return {
            audioId: item.audioId,
            audioName: item.audioName,
            userId: item.userId,
            tags: item.tags || [],
            audioUrl: fileUrl, // Now it's a resolved string, not a Promise<string>
          };
        }),
      );

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

  generateBlobSasUrl(fileName: string): Promise<string> {
    // const account = this.config.get<string>('BLOB_CONTAINER_ACCOUNT');
    // const key = this.config.get<string>('BLOB_CONTAINER_ACCOUNT_KEY');

    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.config.get<string>('BLOB_CONTAINER_ACCOUNT'),
      this.config.get<string>('BLOB_CONTAINER_ACCOUNT_KEY'),
    );

    //this.logger.error(`Fetching SasUrl for: ${fileName}`);
    // Permissions for the SAS URL (read, write, etc.)
    const permissions = new BlobSASPermissions();
    permissions.read = true; // You can adjust permissions here

    // Set expiry time for SAS URL
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 10); // Expires in 10 hour

    // Generate SAS Token
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerClient.containerName,
        blobName: fileName,
        permissions: permissions,
        expiresOn: expiryDate,
      },
      sharedKeyCredential,
    ).toString();

    // Build the full URL with the SAS token
    const blobUrl = `${this.containerClient.url}/${fileName}?${sasToken}`;
    return Promise.resolve(blobUrl);
  }
}
