import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
  BlobServiceClient,
  ContainerClient,
} from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';

export async function generateBlobSasUrl(
  fileName: string,
  configService: ConfigService,
): Promise<string> {
  try {
    const connectionString = configService.get<string>(
      'AZURE_STORAGE_CONNECTION_STRING',
    );
    const containerName = configService.get<string>(
      'AUDIO_UPLOAD_BLOB_CONTAINER',
    );
    const account = configService.get<string>('BLOB_CONTAINER_ACCOUNT');
    const accountKey = configService.get<string>('BLOB_CONTAINER_ACCOUNT_KEY');

    if (!connectionString || !containerName || !account || !accountKey) {
      throw new Error('Azure Blob Storage credentials are missing');
    }

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient: ContainerClient =
      blobServiceClient.getContainerClient(containerName);

    const sharedKeyCredential = new StorageSharedKeyCredential(
      account,
      accountKey,
    );

    const permissions = new BlobSASPermissions();
    permissions.read = true; // Read permission only

    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 10); // Expires in 10 hours

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: containerClient.containerName,
        blobName: fileName,
        permissions,
        expiresOn: expiryDate,
      },
      sharedKeyCredential,
    ).toString();

    return `${containerClient.url}/${fileName}?${sasToken}`;
  } catch (error) {
    console.error('Error generating SAS URL:', error);
    throw new Error('Failed to generate SAS URL');
  }
}
