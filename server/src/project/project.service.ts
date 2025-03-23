import { InjectModel, Repository } from '@nestjs/azure-database';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ProjectEntity, AudioEntity } from './entity';
import { Container } from '@azure/cosmos';
import { CreateProjectDto } from './dtos';
import { v4 as uuid } from 'uuid';
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull';
import { BullQueues, QueueProcess } from 'src/utils/enums';
import { ITranscriptionProcessor } from 'src/utils/interfaces';
import { BlobSASPermissions, BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
;

@Injectable()
export class ProjectService {
    private blobServiceClient: BlobServiceClient;
    private containerClient: any;
    private readonly config = new ConfigService();
    constructor(
        @InjectModel(ProjectEntity) private readonly projectContainer: Container,
        @InjectModel(AudioEntity) private readonly audioContainer: Container,
        @InjectQueue(BullQueues.TRANSCRIPTION) private readonly transcriptionQueue: Queue,
    ) {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING'));
        this.containerClient = this.blobServiceClient.getContainerClient(this.config.get<string>('AUDIO_UPLOAD_BLOB_CONTAINER'));
    }

    async createProject(project: CreateProjectDto): Promise<{ status: string; message: string; data: ProjectEntity; }> {
        try {
            const projectObj = new ProjectEntity();
            projectObj.projectId = uuid();
            projectObj.projectName = project.projectName;
            projectObj.userId = project.userId;
            projectObj.audioIds = project?.audioIds?.map(audio => audio?.audioId);

            const result = await this.projectContainer.items.create(projectObj);

            if (!result?.resource) {
                return {
                    status: 'failed',
                    message: 'Failed to create project',
                    data: null
                }
            }

            if (project?.audioIds?.length > 0) {
                for (const audio of project?.audioIds) {
                    const audioEntity = new AudioEntity();
                    audioEntity.audioId = audio.audioId;
                    const audioResult = await this.audioContainer.items.query({
                        query: 'SELECT * FROM c WHERE c.audioId = @audioId',
                        parameters: [{ name: '@audioId', value: audio.audioId }],
                    }).fetchAll();

                    const sasToken = await this.generateBlobSasUrl(audioResult?.resources[0]?.audioName);

                    console.log('sasToken:', sasToken);

                    const audioData: Partial<ITranscriptionProcessor> = {
                        audioId: audioResult.resources[0]?.audioId,
                        primaryLang: audioResult.resources[0]?.primaryLang,
                        secondaryLang: audioResult.resources[0]?.secondaryLang,
                        noOfSpek: audioResult.resources[0]?.noOfSpek,
                        fileName: audioResult?.resources[0]?.audioName,
                        sasToken: sasToken,
                    };
                    this.transcriptionQueue.add(QueueProcess.TRANSCRIPTION_AUDIO, audioData);

                    Logger.log(`Transcription job for ${audio.audioId} enqueued successfully`);

                    console.log('audioEntity:', audioResult?.resources, audio.audioId);
                }

            }

            Logger.log(`Project created successfully`);
            return {
                status: 'success',
                message: 'Project created successfully',
                data: result?.resource
            }
        } catch (err) {
            console.log('err:', err);
            throw new InternalServerErrorException('Failed to create project');
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
        Logger.log(`Generated SAS URL for blob: ${blobUrl}`);
        return Promise.resolve(blobUrl);
    }
}
