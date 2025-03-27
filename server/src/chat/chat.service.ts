import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import { ConfigService } from '@nestjs/config';
import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AzureOpenAI } from 'openai';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import {
  PROJECT_COMPARE_STATIC_INSTRUCTION,
  STATIC_INSTRUCTION,
} from 'src/utils';
import { AudioEntity, ProjectEntity } from 'src/utils/containers';
import { Response } from 'express';
import * as PDFDocument from 'pdfkit';
import { ChatDto } from './dto/chat.dto';

export interface Document {
  id: string; // The text content of the document
  embeding_vector: number[]; // The embedding vector (array of numbers)
  metadata: string; // Metadata such as the document title
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private azureSearchClient: SearchClient<Document>;
  private openaiClientChat: AzureOpenAI;

  constructor(
    @InjectModel(ProjectEntity) private readonly projectContainer: Container,
    @InjectModel(AudioEntity) private readonly audioContainer: Container,
    private readonly config: ConfigService,
  ) {
    try {
      this.azureSearchClient = new SearchClient<Document>(
        this.config.get<string>('VECTOR_STORE_ADDRESS'),
        this.config.get<string>('AZURE_INDEX_NAME'),
        new AzureKeyCredential(
          this.config.get<string>('VECTOR_STORE_PASSWORD'),
        ),
      );

      const apiKey = this.config.get<string>('AZURE_OPENAI_API_KEY');
      const apiVersion = this.config.get<string>('AZURE_OPEN_AI_VERSION');
      const endpoint = this.config.get<string>('AZURE_OPENAI_ENDPOINT');
      const deploymentCh = this.config.get<string>('AZURE_OPENAI_DEPLOYMENT'); // Chat model deployment name

      const optionsCh = {
        endpoint,
        apiKey,
        apiVersion,
        deployment: deploymentCh,
      };
      this.openaiClientChat = new AzureOpenAI(optionsCh);

      this.logger.log(
        'Azure Search and OpenAI clients initialized successfully',
      );
    } catch (error) {
      this.logger.error(
        'Error initializing Azure Search or OpenAI clients',
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to initialize external services',
      );
    }
  }

  /**
   * Get a document by its vector ID from Azure Cognitive Search
   */
  // async getTextByVectorId(vectorId: string): Promise<Document | null> {
  //   try {
  //     this.logger.log(`Fetching document with vector ID: ${vectorId}`);
  //     const document = await this.azureSearchClient.getDocument(vectorId);
  //     return document;
  //   } catch (error) {
  //     this.logger.error(`Error fetching document for vector ID: ${vectorId}`, error.stack);
  //     if (error.statusCode === 404) {
  //       return null;  // Handle 404 case (document not found)
  //     }
  //     throw new InternalServerErrorException('Failed to retrieve document from Azure Search');
  //   }
  // }

  async getTextsByVectorIds(vectorIds: string[]): Promise<Document[]> {
    try {
      this.logger.log(`Fetching documents with vector IDs: ${vectorIds}`);
      const documents: Document[] = [];

      // Fetch documents for each vector ID
      for (const vectorId of vectorIds.filter((Item) => Item !== null)) {
        const document = await this.azureSearchClient.getDocument(vectorId);
        if (document) {
          documents.push(document); // Only push if document exists
        }
      }
      return documents;
    } catch (error) {
      this.logger.error(
        `Error fetching documents for vector IDs: ${vectorIds}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve documents from Azure Search',
      );
    }
  }

  /**
   * Generate an answer to a user's question using OpenAI based on related documents' context
   */
  async generateAnswerFromDocuments(
    question: string,
    relatedDocs: Document[],
  ): Promise<string> {
    if (!relatedDocs || relatedDocs.length === 0) {
      this.logger.warn('No related documents provided to generate the answer');
      return 'Sorry, I could not find enough information to answer your question.';
    }
    const context = relatedDocs.map((doc) => doc.metadata).join('\n');
    try {
      this.logger.log(
        'Generating answer from OpenAI based on related documents',
      );
      const completionResponse =
        await this.openaiClientChat.chat.completions.create({
          model: 'gpt-4o', // Chat model for generating responses
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant. Use the provided context to answer the question.',
            },
            {
              role: 'user',
              content: `Context: ${context}\n\nQuestion: ${question}`,
            },
          ],
        });

      const answer = completionResponse.choices[0].message.content;
      this.logger.log('Answer generated successfully');
      return answer;
    } catch (error) {
      this.logger.error('Error generating answer from OpenAI', error.stack);
      throw new InternalServerErrorException(
        'Failed to generate an answer from OpenAI',
      );
    }
  }

  async generateAnswerFromDocumentsWithChunks(
    question: string,
    relatedDocs: Document[],
  ): Promise<string> {
    if (!relatedDocs || relatedDocs.length === 0) {
      this.logger.warn('No related documents provided to generate the answer');
      return 'Sorry, I could not find enough information to answer your question.';
    }
    const context = relatedDocs.map((doc) => doc.metadata).join('\n');
    try {
      this.logger.log(
        'Generating answer from OpenAI based on related documents',
      );
      const chunks = this.splitIntoChunks(context, 3000, 250);
      const responses: string[] = [];
      for (const chunk of chunks) {
        const completionResponse =
          await this.openaiClientChat.chat.completions.create({
            model: 'gpt-4o', // Chat model for generating responses
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful assistant. Use the provided context to answer the question.',
              },
              {
                role: 'user',
                content: `Context: ${chunk}\n\nQuestion: ${question}`,
              },
            ],
          });
        const answer = completionResponse.choices[0].message.content;
        responses.push(answer);
        this.logger.log('Answer generated successfully');
        return responses.join('\n');
      }
    } catch (error) {
      this.logger.error('Error generating answer from OpenAI', error.stack);
      throw new InternalServerErrorException(
        'Failed to generate an answer from OpenAI',
      );
    }
  }

  async getPrompResponse(prompt: string, context: string) {
    try {
      this.logger.log(
        'Generating answer from OpenAI based on related documents',
      );
      const chunks = this.splitIntoChunks(context, 3000, 250);
      const responses: string[] = [];
      for (const chunk of chunks) {
        const completionResponse =
          await this.openaiClientChat.chat.completions.create({
            model: 'gpt-4o', // Chat model for generating responses
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful assistant. Use the provided context to answer the question.',
              },
              {
                role: 'user',
                content: `Context: ${chunk}\n\nQuestion: ${prompt}`,
              },
            ],
          });
        const answer = completionResponse.choices[0].message.content;
        responses.push(answer);
        this.logger.log('Answer generated successfully');
        return responses.join('\n');
      }
    } catch (error) {
      this.logger.error('Error generating answer from OpenAI', error.stack);
      throw new InternalServerErrorException(
        'Failed to generate an answer from OpenAI',
      );
    }
  }

  async compareProjects(
    project1: string,
    project2: string,
    compare: string,
  ): Promise<any> {
    try {
      if (compare == 'PROJ') {
        const vectorIdsProject1 = await this.getVectorIdsByProject(project1);
        const vectorIdsProject2 = await this.getVectorIdsByProject(project2);

        const project1Documents =
          await this.getTextsByVectorIds(vectorIdsProject1);

        const project2Documents =
          await this.getTextsByVectorIds(vectorIdsProject2);

        const targetCompareProject1 =
          await this.generateAnswerFromDocumentsWithChunks(
            STATIC_INSTRUCTION,
            project1Documents,
          );
        const targetCompareProject2 =
          await this.generateAnswerFromDocumentsWithChunks(
            STATIC_INSTRUCTION,
            project2Documents,
          );

        const summary = await this.getPrompResponse(
          PROJECT_COMPARE_STATIC_INSTRUCTION,
          `${targetCompareProject1}${targetCompareProject2}`,
        );

        return {
          project: [
            {
              targetCompareProject: targetCompareProject1,
              projectName: project1,
            },
            {
              targetCompareProject: targetCompareProject2,
              projectName: project2,
            },
          ],
          summary: summary,
        };
      } else compare == 'TARGET';
      {
        const vectorIdsTarget1 = await this.getVectorIdsByTarget(project1);
        const vectorIdsTarget2 = await this.getVectorIdsByTarget(project2);
        const Target1Documents =
          await this.getTextsByVectorIds(vectorIdsTarget1);
        const Target2Documents =
          await this.getTextsByVectorIds(vectorIdsTarget2);
        const targetCompareProject1 =
          await this.generateAnswerFromDocumentsWithChunks(
            STATIC_INSTRUCTION,
            Target1Documents,
          );
        const targetCompareProject2 =
          await this.generateAnswerFromDocumentsWithChunks(
            STATIC_INSTRUCTION,
            Target2Documents,
          );

        const summary = await this.getPrompResponse(
          PROJECT_COMPARE_STATIC_INSTRUCTION,
          `${targetCompareProject1}${targetCompareProject2}`,
        );
        //return false;
        return {
          project: [
            {
              targetCompareProject: targetCompareProject1,
              projectName: project1,
            },
            {
              targetCompareProject: targetCompareProject2,
              projectName: project2,
            },
          ],
          summary: summary,
        };
      }
    } catch (error) {
      console.error('Error comparing projects:', error);
      throw new Error('An error occurred while comparing projects.');
    }
  }

  async getVectorIdsByProject(projectId: string): Promise<string[]> {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.ProjName = @projectId',
        parameters: [{ name: '@projectId', value: projectId }],
      };

      const { resources: existingDocuments } = await this.projectContainer.items
        .query(querySpec)
        .fetchAll();

      if (existingDocuments.length === 0) {
        throw new Error(`No documents found for project: ${projectId}`);
      }

      const projectDocument = existingDocuments[0];
      const transcriptionIds = projectDocument.audioIds
        .map((id) => `'${id}'`)
        .join(', ');

      // TODO add transcription data to the project entity
      const transcriptionData = projectDocument.transcription;
      if (!transcriptionData) {
        throw new Error(
          `No transcription data found for project: ${projectId}`,
        );
      }
      return projectDocument
        .filter((item) => item !== null)
        .map((item) => item.vectorIds)
        .flat();
    } catch (error) {
      console.error('Error fetching data:', error);
      throw new Error('An error occurred while fetching data.');
    }
  }

  async getVectorIdsByTarget(projectId: string): Promise<string[]> {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.project=@projectId',
        parameters: [{ name: '@projectId', value: projectId }],
      };
      const { resources: existingDocuments } = await this.projectContainer.items
        .query(querySpec)
        .fetchAll();

      if (!existingDocuments.length) {
        throw new Error(`No documents found for project: ${projectId}`);
      }
      const projectDocument = existingDocuments[0];
      return projectDocument.vectorId;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw new Error('An error occurred while fetching data.');
    }
  }

  splitIntoChunks(
    text: string,
    maxTokenLength: number,
    overlapTokenLength: number,
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = start + maxTokenLength;
      const chunk = text.slice(start, end);

      chunks.push(chunk);
      start += maxTokenLength - overlapTokenLength;
    }

    return chunks;
  }

  async downloadChat(res: Response, chatDto: ChatDto) {
    const id = chatDto.id;
    const chat = chatDto.chat;
    const key = chatDto.key;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set PDF Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=chat_${id}.pdf`);

    doc.pipe(res);

    // PDF Heading
    doc
      .fillColor('black') // Set text color to black
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(`Report for: ${key.charAt(0).toUpperCase() + key.slice(1)}`, {
        align: 'center',
      });
    doc.moveDown(2);

    let rows: any;

    if (key == 'audio') {
      // Audio Information Section
      doc
        .fillColor('#333333')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Audio Information : ', { underline: true });
      doc.moveDown(0.5);

      //query to get audio details
      const userQuerySpec = {
        query: `SELECT * FROM c WHERE c.audioId = @audioId`,
        parameters: [{ name: '@audioId', value: id }],
      };

      const { resources: records } = await this.audioContainer.items
        .query(userQuerySpec)
        .fetchAll();

      if (!records.length) {
        throw new NotFoundException('No Audio Found.');
      }

      const record = records[0];

      rows = [
        [`Audio Name: `, `${record.audioName}`],
        [`No of Speakers: `, `${record.noOfSpek}`],
        [`Primary Language: `, `${record.primaryLang}`],
        [`Secondary Language: `, `${record.secondaryLang.join(', ')}`],
        [`Tags: `, `${record.tags.join(', ')}`],
      ];
    } else {
      // Project Information Section
      doc
        .fillColor('#333333')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Project Information : ', { underline: true });
      doc.moveDown(0.5);

      //query to get project details
      const projectQuerySpec = {
        query: `SELECT * FROM c WHERE c.projectId = @projectId`,
        parameters: [{ name: '@projectId', value: id }],
      };

      const { resources: records } = await this.projectContainer.items
        .query(projectQuerySpec)
        .fetchAll();

      if (!records.length) {
        throw new NotFoundException('No Project Found.');
      }

      const record = records[0];
      const mappedAudioIds = record.audioIds;

      // Query to get audionames
      const audioQuerySpec = {
        query: `
      SELECT c.audioName, c.tags FROM c 
      WHERE ARRAY_CONTAINS(@audioId, c.audioId)
    `,
        parameters: [{ name: '@audioId', value: mappedAudioIds }],
      };

      const { resources: projectAudios } = await this.audioContainer.items
        .query(audioQuerySpec)
        .fetchAll();

      const audioNames = projectAudios.map((audioObj) => audioObj.audioName);
      const allTags = projectAudios.flatMap((audioObj) => audioObj.tags);
      const uniqueTags = [...new Set(allTags)];

      rows = [
        [`Project: `, `${record.projectName}`],
        [`Audios: `, `${audioNames.join(', ')}`],
        [`Tags: `, `${uniqueTags.join(', ')}`],
      ];
    }

    rows.forEach(([title, content]) => {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#4B9CD3')
        .text(title, { continued: true });
      doc.font('Helvetica').fillColor('black').text(` ${content}`);
      doc.moveDown(0.3);
    });

    doc.moveDown(1);

    // Chat Section with Subtle Boxed Style
    if (chat && chat.length > 0) {
      doc.rect(50, doc.y, doc.page.width - 100, 25).fill('#F1C40F');
      doc.moveDown(0.5);
      doc
        .fillColor('black')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Chat Transcript', { align: 'center' });
      doc.moveDown(2);

      chat.forEach((message) => {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#4B9CD3')
          .text(`${message.from}:`, { continued: true });
        doc.font('Helvetica').fillColor('black').text(` ${message.message}`);
        doc.moveDown(0.3);
      });

      doc.moveDown(1);
    }

    // Finalize the PDF
    doc.end();

    return {
      status: 200,
      message: 'Success',
    };
  }
}
