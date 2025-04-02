import { Inject, Logger } from '@nestjs/common';
import { Translate } from '@google-cloud/translate/build/src/v2';
import { AzureOpenAI } from 'openai';
import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import { InjectModel } from '@nestjs/azure-database';
import { AudioEntity, ProjectEntity } from 'src/utils/containers';
import { ConfigService } from '@nestjs/config';
import { Container } from '@azure/cosmos';
import axios from 'axios';
import { ChatCompletionMessageParam } from 'openai/resources';
import {
  MODERATOR_RECOGNITION,
  PROJECT_SENTIMENT_ANALYSIS,
  PROJECT_SENTIMENT_ANALYSIS_PROMPT,
  PROJECT_SUMMARIZATION_PROMPT_TEMPLATE,
  PROJECT_SUMMARY,
  SENTIMENT_ANALYSIS_PROMPT,
  SUMMARIZATION_PROMPT_TEMPLATE,
} from './constants';
import { response } from 'express';
import { ChatService } from 'src/chat/chat.service';
import { BullQueues, QueueProcess } from './enums';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface Document {
  id: string; // Document ID
  metadata: string; // The text content of the document
  embeding_vector: number[]; // The embedding vector (array of numbers)
}

export class AudioUtils {
  private readonly translateClient: Translate;
  private readonly azureOpenAIClient: AzureOpenAI;
  private readonly azureSearchClient: SearchClient<any>;
  private readonly logger = new Logger(AudioUtils.name);

  constructor(
    @InjectModel(AudioEntity) private readonly AudioContainer: Container,
    @InjectModel(ProjectEntity) private readonly ProjectContainer: Container,
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
    @Inject('RedisService') private readonly redisService,
    @InjectQueue(BullQueues.PROJECT_SUMMARY)
    private readonly projectSummaryQueue: Queue,
  ) {
    this.translateClient = new Translate({
      key: this.configService.get<string>('TRANSALATION_APIKEY'),
    });
    this.azureSearchClient = new SearchClient(
      this.configService.get<string>('VECTOR_STORE_ADDRESS'),
      this.configService.get<string>('AZURE_INDEX_NAME'),
      new AzureKeyCredential(
        this.configService.get<string>('VECTOR_STORE_PASSWORD'),
      ),
    );
    const azureOptions = {
      endpoint: this.configService.get<string>('AZURE_OPENAI_ENDPOINT'),
      apiKey: this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      apiVersion: this.configService.get<string>('AZURE_OPEN_AI_VERSION'),
      deployment: this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT'),
    };
    this.azureOpenAIClient = new AzureOpenAI(azureOptions);
  }

  private readonly AZURE_OPENAI_ENDPOINT = this.configService.get<string>(
    'AZURE_OPENAI_ENDPOINT',
  );
  private readonly AZURE_OPENAI_API_KEY = this.configService.get<string>(
    'AZURE_OPENAI_API_KEY',
  );
  private readonly AZURE_OPENAI_DEPLOYMENT = this.configService.get<string>(
    'AZURE_OPENAI_DEPLOYMENT',
  );
  private readonly AZURE_OPEN_AI_VERSION = '2024-07-01-preview';
  private readonly AZURE_OPENAI_EMBEDDING_MODEL =
    this.configService.get<string>('AZURE_OPENAI_EMBEDDING_DEPLOY');

  async transcribeAudio(audioId, sasToken, mainLang, SecondaryLang, noOfSpek) {
    try {
      Logger.log(`Transcribing audio ${audioId}`);
      const transcriptionResult = await this.transcribe(
        audioId,
        sasToken,
        mainLang,
        SecondaryLang,
        noOfSpek,
      );
      await Promise.all(transcriptionResult);
      return { audioId, transcriptionResult };
      //});

      // Wait for all transcriptions to complete
      //return await Promise.all(transcriptionResult);
    } catch (error) {
      console.error('Error in transcribing audio array:', error.message);
      throw new Error('Audio transcription failed.');
    }
  }

  async transcribe(
    audioId,
    sas_url,
    main_language,
    other_languages,
    number_of_speakers,
  ) {
    try {
      const SUBSCRIPTION_KEY =
        this.configService.get<string>('SUBSCRIPTION_KEY'); // Replace with your Azure subscription key
      const SERVICE_REGION = this.configService.get<string>('SERVICE_REGION'); // Adjust region based on your Azure region

      const language_dict = {
        English: 'en-IN',
        Hindi: 'hi-IN',
        Tamil: 'ta-IN',
        Telugu: 'te-IN',
        Marathi: 'mr-IN',
        Kannada: 'kn-IN',
        Malayalam: 'ml-IN',
        Gujarati: 'gu-IN',
      };

      // Determine the main language locale for Azure
      const LOCALE = language_dict[main_language];
      const all_languages = [
        LOCALE,
        ...other_languages?.map((lang) => language_dict[lang]),
      ];

      const apiUrl = `https://${SERVICE_REGION}.api.cognitive.microsoft.com/speechtotext/v3.1/transcriptions`;
      const headers = {
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        'Content-Type': 'application/json',
      };

      const transcriptionRequest = {
        contentUrls: [sas_url],
        properties: {
          diarizationEnabled: true,
          speakers: number_of_speakers,
          candidateLocales: all_languages,
          punctuationMode: 'DictatedAndAutomatic',
          profanityFilterMode: 'Removed',
        },
        locale: LOCALE,
        displayName: audioId,
        description: `Transcription for ${audioId}`,
      };

      // Start the transcription process
      const response = await axios.post(apiUrl, transcriptionRequest, {
        headers,
      });
      const transcriptionUrl = response.headers['location'];

      // Poll the status of the transcription until it is complete
      return await this.getTranscriptionResult(
        transcriptionUrl,
        headers,
        audioId,
      );
    } catch (error) {
      console.error(`Error starting transcription for ${audioId}:`, error);
      throw new Error('Transcription failed.');
    }
  }

  async getTranscriptionResult(transcriptionUrl, headers, audioId) {
    let isCompleted = false;
    let transcriptionData;
    while (!isCompleted) {
      const statusResponse = await axios.get(transcriptionUrl, { headers });
      transcriptionData = statusResponse.data;

      if (transcriptionData.status === 'Succeeded') {
        isCompleted = true;
      } else if (transcriptionData.status === 'Failed') {
        throw new Error('Transcription failed.');
      } else {
        await this.sleep(30000); // Polling every 30 seconds
      }
    }
    const filesUrl = transcriptionData.links.files;
    const resultResponse = await axios.get(filesUrl, { headers });
    const transcriptionContentUrl = resultResponse.data.values.find(
      (file) => file.kind === 'Transcription',
    ).links.contentUrl;

    const transcriptionResult = await axios.get(transcriptionContentUrl);
    return transcriptionResult.data.recognizedPhrases;
  }

  async translateText(transcriptionData) {
    const translatedTextArray = await Promise.all(
      transcriptionData.map(async (item) => {
        const displayText = item.nBest?.[0]?.display || '';
        const translatedText = await this.translateClient.translate(
          displayText,
          'en',
        );
        const convTime =
          item.offset.replace('PT', '').toLowerCase().split('.')[0] + 's';
        return {
          speaker: item.speaker,
          timestamp: this.convertToTimeFormat(convTime),
          transcription: displayText,
          translation: translatedText[0],
        };
      }),
    );
    const audioTranscript = translatedTextArray
      .map((entry: any) => ` Speaker ${entry.speaker}: ${entry.translation}`)
      .join('\n\n');
    const response = this.chatService.getPrompResponse(
      MODERATOR_RECOGNITION,
      audioTranscript,
    );
    const match = (await response).match(/Speaker\s*\d+/i).toString();
    const updatedTextArray = translatedTextArray.map((item) => {
      // If this item's speaker matches the identified moderator, mark them as 'Moderator'
      if (`Speaker ${item.speaker}` === match) {
        return { ...item, speaker: 'Moderator' };
      }
      return item;
    });
    const combinedTranslation = updatedTextArray
      .map((data) => `${data.speaker} : ${data.translation}`)
      .join('\n\n');
    return { updatedTextArray, combinedTranslation };
  }

  generateSummarizationPrompt(text: string) {
    const summaryLength = 500;
    return SUMMARIZATION_PROMPT_TEMPLATE(summaryLength, text);
  }

  generateProjectSummarizationPrompt(text: string) {
    const summaryLength = 500;
    return PROJECT_SUMMARIZATION_PROMPT_TEMPLATE(summaryLength, text);
  }

  generateSentimenAnalysisPrompt(text: string) {
    return SENTIMENT_ANALYSIS_PROMPT(text);
  }

  generateProjectSentimenAnalysisPrompt(text: string) {
    return PROJECT_SENTIMENT_ANALYSIS_PROMPT(text);
  }

  async getSummaryAndSentiments(purpose: string, text: string) {
    const deployment = this.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = this.AZURE_OPEN_AI_VERSION;
    const apiKey = this.AZURE_OPENAI_API_KEY;
    const endpoint = this.AZURE_OPENAI_ENDPOINT;

    const options = { endpoint, apiKey, apiVersion, deployment };
    const client = new AzureOpenAI(options);

    // 1️⃣ **Split text into chunks using existing method**
    const chunkSize = 10897; // Adjust based on model token limits
    const chunks = this.getChunks(text, chunkSize);

    const chunkSummaries: string[] = [];

    // 2️⃣ **Summarize Each Chunk**
    for (const chunk of chunks) {
      const prompt = (() => {
        switch (purpose) {
          case 'Summary':
            return this.generateSummarizationPrompt(chunk);
          case 'SA':
            return this.generateSentimenAnalysisPrompt(chunk);
          case 'project_summary':
            return this.generateProjectSummarizationPrompt(chunk); // Assuming multiple texts
          case 'project_sentiment':
            return this.generateProjectSentimenAnalysisPrompt(chunk); // Assuming multiple texts
          default:
            throw new Error(`Invalid purpose: ${purpose}`);
        }
      })();

      const messages: ChatCompletionMessageParam[] = [
        { role: 'user', content: prompt },
      ];

      try {
        const response = await client.chat.completions.create({
          messages,
          model: deployment,
          max_tokens: 500,
        });

        chunkSummaries.push(response.choices[0].message.content);
      } catch (error) {
        console.error('Error summarizing chunk:', error);
      }
    }

    // 3️⃣ **Generate Final Summary from Chunk Summaries**
    const finalSummary = await this.refineFinalSummary(
      chunkSummaries.join(' '),
      client,
    );
    return finalSummary;
  }

  private async refineFinalSummary(mergedSummary: string, client: AzureOpenAI) {
    const refinementPrompt = `Refine the following summary to be more concise while preserving key details:\n\n${mergedSummary}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: 'user', content: refinementPrompt },
    ];

    try {
      const response = await client.chat.completions.create({
        messages,
        model: this.AZURE_OPENAI_DEPLOYMENT,
        max_tokens: 500,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error refining summary:', error);
      return mergedSummary; // Fallback to raw merged summary
    }
  }

  async saveTranscriptionDocument(transcriptionDocument: Partial<AudioEntity>) {
    try {
      // Update the  Audio Container with the audioId
      const query = {
        query: 'SELECT * FROM c WHERE c.audioId = @audioId',
        parameters: [
          { name: '@audioId', value: transcriptionDocument.audioId },
        ],
      };
      const { resources: existingDocuments } = await this.AudioContainer.items
        .query(query)
        .fetchAll();

      if (existingDocuments.length > 0) {
        const existingDocument = existingDocuments[0];
        existingDocument.audioId = transcriptionDocument.audioId;
        existingDocument.audiodata = transcriptionDocument.audiodata;
        existingDocument.summary = transcriptionDocument.summary;
        existingDocument.sentiment_analysis =
        transcriptionDocument.sentiment_analysis;
        existingDocument.combinedTranslation =
          transcriptionDocument.combinedTranslation;
        existingDocument.vectorIds = transcriptionDocument.vectorIds;
        const response =
           await this.AudioContainer.items.upsert(existingDocument);
      } else {
        const response = await this.AudioContainer.items.create(
          transcriptionDocument,
        );
        return response;
      }

      return response;
    } catch (error) {
      // Log any errors that occurred during the insertion
      console.error('Error inserting document into Cosmos DB:', error.message);
      throw new Error('Failed to insert transcription document.');
    }
  }

  async updateTranscriptionDocument(
    audioId: string,
    vectorIds: string[],
    audioName: any,
  ) {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE  c.audioId= @audioId',
        parameters: [{ name: '@audioId', value: audioId }],
      };
      const { resources: existingDocuments } = await this.AudioContainer.items
        .query(querySpec)
        .fetchAll();
      if (existingDocuments.length > 0) {
        const existingDocument = existingDocuments[0] as Partial<AudioEntity>;
        existingDocument.vectorIds = vectorIds;
        existingDocument.isTranscriptionFetched = true;
        const response =
          await this.AudioContainer.items.upsert(existingDocument);

        return response;
      } else {
        return response;
      }
    } catch (error) {
      throw new Error(`Error updating document: ${error.message}`);
    }
  }

  convertToTimeFormat(timeStr) {
    let hours = 0,
      minutes = 0,
      seconds = 0;

    // Removing 'PT' and splitting based on 'h', 'm', 's'
    if (timeStr.includes('h')) {
      hours = parseInt(timeStr.split('h')[0].replace('PT', ''));
      timeStr = timeStr.split('h')[1];
    }
    if (timeStr.includes('m')) {
      minutes = parseInt(timeStr.split('m')[0]);
      timeStr = timeStr.split('m')[1];
    }
    if (timeStr.includes('s')) {
      seconds = parseInt(timeStr.split('s')[0]);
    }

    // Formatting hours, minutes, seconds to 2 digits
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async generateEmbeddings(translation: string) {
    try {
      const options = {
        endpoint: this.AZURE_OPENAI_ENDPOINT,
        apiKey: this.AZURE_OPENAI_API_KEY,
        apiVersion: this.AZURE_OPEN_AI_VERSION,
        embeddingModel: this.AZURE_OPENAI_EMBEDDING_MODEL,
      };
      const azureOpenAi = new AzureOpenAI(options);
      // this.azureSearchClient = new SearchClient(
      //   this.configService.get<string>('VECTOR_STORE_ADDRESS'),
      //   this.configService.get<string>('AZURE_INDEX_NAME'),
      //     new AzureKeyCredential(this.configService.get<string>('VECTOR_STORE_PASSWORD'))
      //   );
      const model = this.AZURE_OPENAI_EMBEDDING_MODEL;
      // Chunk the text into manageable sizes
      const chunkSize = 10897;
      const textChunks = this.getChunks(translation, chunkSize);

      const vectorIds: string[] = [];
      // Map over textChunks and process embeddings in parallel with the limit
      for (const chunk of textChunks) {
        // Generate embeddings for each chunk of text
        const embeddings = await azureOpenAi.embeddings.create({
          input: chunk,
          model, // Azure OpenAI Embedding Model
        });

        // Extract the embeddings array from the API response
        const embeddingArray = embeddings.data[0].embedding;
        // Prepare document object to upload to VectorStore
        const document: Document = {
          id: `doc-${Date.now()}`, // Unique ID for this document
          metadata: translation, // Metadata related to the text chunk
          embeding_vector: embeddingArray, // The generated embeddings array
        };

        // Upload the document with embedding vector to your VectorStore (e.g., Azure Search)
        const uploadResult = await this.azureSearchClient.uploadDocuments([
          document,
        ]);

        // Return vector ID from the result
        const vectorId = uploadResult.results[0]?.key;
        vectorIds.push(vectorId);
        // Optionally, log progress
      }
      // Return all generated vector IDs for the document chunks
      return vectorIds;
    } catch (error) {
      throw new Error(`Embedding generation failed ${error}`);
    }
  }

  getChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    let currentPosition = 0;

    while (currentPosition < text.length) {
      const chunk = text.slice(currentPosition, currentPosition + chunkSize);
      chunks.push(chunk);
      currentPosition += chunkSize;
    }
    return chunks;
  }

  getChunksWithOverlap(
    text: string,
    chunkSize: number,
    overlapSize: number,
  ): string[] {
    const chunks: string[] = [];
    let currentPosition = 0;

    while (currentPosition < text.length) {
      let endPosition = currentPosition + chunkSize;

      // Ensure we don't go beyond the text length
      if (endPosition > text.length) {
        endPosition = text.length;
      }

      const chunk = text.slice(currentPosition, endPosition);
      chunks.push(chunk);

      // Move the pointer but keep an overlap for context
      currentPosition += chunkSize - overlapSize;
    }

    return chunks;
  }

  async markStageCompleted(
    audioId: string,
    stage: QueueProcess,
    projectId: string,
  ): Promise<void> {
    const lastAudioId = await this.redisService.get(`lastAudio`);
    this.logger.log(
      `Last audio id: ${lastAudioId}, and current Audio Id ${audioId}`,
    );

    const key = `audio:${audioId}project:${projectId}:stages`;
    const stages = JSON.parse((await this.redisService.get(key)) || '{}');
    stages[stage] = true;
    await this.redisService.set(key, JSON.stringify(stages));
    this.logger.log(`Stage ${stage} completed for audio ${audioId}`);

    // Check if all stages are completed for this audio
    if (
      stages[QueueProcess.TRANSCRIPTION_AUDIO] &&
      stages[QueueProcess.TRANSLATION_AUDIO] &&
      stages[QueueProcess.SUMMARY_AUDIO] &&
      stages[QueueProcess.EMBEDDING_AUDIO]
    ) {
      this.logger.log(`All stages completed for audio ${audioId}`);
      const lastAudioId = await this.redisService.get(`lastAudio`);
      if (audioId === lastAudioId) {
        this.logger.log(`All stages completed for the last audio ${audioId}`);
        // Trigger the project audio process
        await this.projectSummaryQueue.add(QueueProcess.PROJECT_SUMMARY_AUDIO, {
          ...stages,
          projectId,
        });
        this.logger.log(`Combined Audio Project job enqueued`);
      }
    }
  }

  async makeCombineSummaryOfAllAudios(projectId: string) {
    try {
      const query = {
        query: 'SELECT * FROM c WHERE c.projectId = @projectId',
        parameters: [{ name: '@projectId', value: projectId }],
      };

      const { resources: projectDocument } = await this.ProjectContainer.items
        .query(query)
        .fetchAll();
      if (projectDocument.length === 0) {
        throw new Error('Project not found');
      }

      const audioIds = (projectDocument[0] as ProjectEntity).audioIds;

      const audioQueue = {
        query: 'SELECT * FROM c WHERE ARRAY_CONTAINS(@audioIds, c.audioId)',
        parameters: [{ name: '@audioIds', value: audioIds }],
      };

      const { resources: audioDocuments } = await this.AudioContainer.items
        .query(audioQueue)
        .fetchAll();

      const combinedTranscription = audioDocuments
        .map((audio) => audio.combinedTranslation)
        .join('\n\n');

      const combinedSummary = await this.getSummaryAndSentiments(
        PROJECT_SUMMARY,
        combinedTranscription,
      );
      const combinedSentiment = await this.getSummaryAndSentiments(
        PROJECT_SENTIMENT_ANALYSIS,
        combinedTranscription,
      );
      const projectVecIds = audioDocuments
        .map((audio) => {
          return audio.vectorIds;
        })
        ?.flat();

      const existingProjectDocument: ProjectEntity = projectDocument[0];
      existingProjectDocument.summary = combinedSummary;
      existingProjectDocument.sentiment_analysis = combinedSentiment;
      existingProjectDocument.isSummaryAndSentimentDone = true;
      existingProjectDocument.vectorIds = projectVecIds;

      return await this.saveProjectSummary(existingProjectDocument);
    } catch (error) {
      console.error(error);
      throw new Error('Failed to make combined summary');
    }
  }
  async saveProjectSummary(projectDocument: ProjectEntity) {
    try {
      const response =
        await this.ProjectContainer.items.upsert(projectDocument);
      return response;
    } catch (error) {
      console.error('Error saving project summary:', error.message);
      throw new Error('Failed to save project summary');
    }
  }
}
