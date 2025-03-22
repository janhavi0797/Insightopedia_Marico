import { Logger } from "@nestjs/common";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { AzureOpenAI } from "openai";
import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import { InjectModel } from "@nestjs/azure-database";
import { ProjectEntity } from 'src/project/entity';
import { ConfigService } from "@nestjs/config";
import { Container } from "@azure/cosmos";
import axios from "axios";
import { ChatCompletionMessageParam } from "openai/resources";
import { MODERATOR_RECOGNITION, SENTIMENT_ANALYSIS, SENTIMENT_ANALYSIS_PROMPT, SUMMARIZATION_PROMPT_TEMPLATE, SUMMARY } from "./constants";
import { response } from "express";
import { ChatService } from "src/chat/chat.service";


export interface Document {
  id: string;             // Document ID
  metadata: string;         // The text content of the document
  embeding_vector: number[];     // The embedding vector (array of numbers)
}

export class AudioUtils {

  private readonly translateClient: Translate;
  private readonly azureOpenAIClient: AzureOpenAI;
  private readonly azureSearchClient: SearchClient<any>;

  constructor(
    @InjectModel(ProjectEntity) private readonly transcriptionContainer: Container,
    private readonly chatService: ChatService,
    private readonly configService: ConfigService
  ) {
    this.translateClient = new Translate({ key: this.configService.get<string>('TRANSALATION_APIKEY') });
    this.azureSearchClient = new SearchClient(
      this.configService.get<string>('VECTOR_STORE_ADDRESS'),
      this.configService.get<string>('AZURE_INDEX_NAME'),
      new AzureKeyCredential(this.configService.get<string>('VECTOR_STORE_PASSWORD'))
    );
    const azureOptions = {
      endpoint: this.configService.get<string>('AZURE_OPENAI_ENDPOINT'),
      apiKey: this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      apiVersion: this.configService.get<string>('AZURE_OPEN_AI_VERSION'),
      deployment: this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT'),
    };
    this.azureOpenAIClient = new AzureOpenAI(azureOptions);
  }

  private readonly AZURE_OPENAI_ENDPOINT = this.configService.get<string>('AZURE_OPENAI_ENDPOINT');
  private readonly AZURE_OPENAI_API_KEY = this.configService.get<string>('AZURE_OPENAI_API_KEY');
  private readonly AZURE_OPENAI_DEPLOYMENT = this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT');
  private readonly AZURE_OPEN_AI_VERSION = "2024-07-01-preview";
  private readonly AZURE_OPENAI_EMBEDDING_MODEL = this.configService.get<string>('AZURE_OPENAI_EMBEDDING_DEPLOY');

  async transcribeAudio(audioId, sasToken, mainLang, SecondaryLang, noOfSpek) {
    try {
      //const transcriptionPromises = audioProcessDtoArray.map(async (audioData) => {
      //const { TGId, TGName, sasToken, mainLang, SecondaryLang, noOfSpek } = audioData;
      // Call the transcribe function for each audio file

      Logger.log(`Transcribing audio ${audioId}`);
      const transcriptionResult = await this.transcribe(
        audioId, sasToken, mainLang, SecondaryLang, noOfSpek
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
  async transcribe(audioId, sas_url, main_language, other_languages, number_of_speakers) {
    try {
      const SUBSCRIPTION_KEY = this.configService.get<string>('SUBSCRIPTION_KEY'); // Replace with your Azure subscription key
      const SERVICE_REGION = this.configService.get<string>('SERVICE_REGION'); // Adjust region based on your Azure region

      const language_dict = {
        English: 'en-IN',
        Hindi: 'hi-IN',
        Tamil: 'ta-IN',
        Telugu: 'te-IN',
        Marathi: 'mr-IN',
        Kannada: 'kn-IN',
        Malayalam: 'ml-IN',
        Gujarati: 'gu-IN'
      };

      // Determine the main language locale for Azure
      const LOCALE = language_dict[main_language];
      const all_languages = [LOCALE, ...other_languages?.map((lang) => language_dict[lang])];

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
      const response = await axios.post(apiUrl, transcriptionRequest, { headers });
      const transcriptionUrl = response.headers['location']; // Get the URL to check transcription status
      console.log(transcriptionUrl, 'transcriptionUrl');
      const transcriptionId = transcriptionUrl.split('/').pop(); // Extract transcription ID 

      // Poll the status of the transcription until it is complete
      return await this.getTranscriptionResult(transcriptionUrl, headers, audioId);
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
      console.log(statusResponse)

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
    const transcriptionContentUrl = resultResponse.data.values.find(file => file.kind === 'Transcription').links.contentUrl;

    const transcriptionResult = await axios.get(transcriptionContentUrl);
    return transcriptionResult.data.recognizedPhrases;
  }

  async translateText(transcriptionData) {
    const translatedTextArray =
      await Promise.all(
        transcriptionData.map(async (item) => {
          const displayText = item.nBest?.[0]?.display || '';
          const translatedText = await this.translateClient.translate(displayText, 'en');
          const convTime = item.offset.replace('PT', '').toLowerCase().split('.')[0] + 's';
          return {
            speaker: item.speaker,
            timestamp: this.convertToTimeFormat(convTime),
            transcription: displayText,
            translation: translatedText[0],
          };
        })
      );
    const audioTranscript = translatedTextArray
      .map((entry: any) => ` Speaker ${entry.speaker}: ${entry.translation}`)
      .join('\n\n');
    const response = this.chatService.getPrompResponse(MODERATOR_RECOGNITION, audioTranscript);
    const match = (await response).match(/Speaker\s*\d+/i).toString();
    const updatedTextArray = translatedTextArray.map(item => {
      // If this item's speaker matches the identified moderator, mark them as 'Moderator'
      if (`Speaker ${item.speaker}` === match) {
        return { ...item, speaker: 'Moderator' };
      }
      return item;
    });
    const combinedTranslation = updatedTextArray.map(data => `${data.speaker} : ${data.translation}`).join('\n\n');
    return { updatedTextArray, combinedTranslation };
  }
  generateSummarizationPrompt(text: string) {
    const summaryLength = 500;
    return SUMMARIZATION_PROMPT_TEMPLATE(summaryLength, text);
  }

  generateSentimenAnalysisPrompt(text: string) {
    return SENTIMENT_ANALYSIS_PROMPT(text);
  }


  async getSummaryAndSentiments(purpose: string, text: string) {
    const deployment = this.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = this.AZURE_OPEN_AI_VERSION;
    const apiKey = this.AZURE_OPENAI_API_KEY;
    const endpoint = this.AZURE_OPENAI_ENDPOINT; // Your Azure OpenAI endpoint here
    // const options = { azureADTokenProvider, deployment, apiVersion, endpoint };
    const options = {
      endpoint,
      apiKey,
      apiVersion,
      deployment: deployment,
    };
    const client2 = new AzureOpenAI(options);
    let prompt;
    if (purpose === "Summary") {
      prompt = this.generateSummarizationPrompt(text);
    }
    else {
      prompt = this.generateSentimenAnalysisPrompt(text);
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: 'user', content: prompt }
    ];
    try {
      const stream = await client2.chat.completions.create({ messages, model: deployment, max_tokens: 500 });
      const finalSummary = stream.choices[0].message.content;
      return finalSummary;
    } catch (error) {
      console.error('Error during API call:', error);
      throw new Error('Failed to get summary from Azure OpenAI');
    }
  }

  async saveTranscriptionDocument(transcriptionDocument) {
    try {
      // Attempt to insert the document
      const response = await this.transcriptionContainer.items.create(transcriptionDocument);
      // Check if the document was successfully inserted
      if (response.resource) {
        // console.log('Document successfully created in Cosmos DB');
      } else {
        //console.error('Document was not inserted successfully');
      }
      return transcriptionDocument;
    } catch (error) {
      // Log any errors that occurred during the insertion
      console.error('Error inserting document into Cosmos DB:', error.message);
      throw new Error('Failed to insert transcription document.');
    }
  }

  async updateTranscriptionDocument(TGId: string, updateData: Partial<any>, audioName: any) {
    try {
      console.log(TGId, audioName);
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.TGId = @TGId AND c.audioName= @audioName',
        parameters: [{ name: '@TGId', value: TGId }, { name: '@audioName', value: audioName }
        ],
      };
      const { resources: existingDocuments } = await this.transcriptionContainer.items.query(querySpec).fetchAll();
      console.log(existingDocuments);
      // const { resource: existingDocument } = await this.transcriptionContainer.item(TGId).read();

      if (existingDocuments.length > 0) {
        const existingDocument = existingDocuments[0]; // Assuming only one document is returned         
        // Update the vectorId field (append, replace, etc., depending on your use case)
        existingDocument.vectorId = updateData; // Assuming `updatedVectorIdArray` is the new value         
        // Upsert (insert or update) the modified document back into Cosmos DB
        const response = await this.transcriptionContainer.items.upsert(existingDocument);
        // console.log('Document updated successfully:');
      } else {
        // console.log('Document not found');
        return response;
      }
    } catch (error) {
      throw new Error(`Error updating document: ${error.message}`);
    }
  }

  convertToTimeFormat(timeStr) {
    let hours = 0, minutes = 0, seconds = 0;

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
        embeddingModel: this.AZURE_OPENAI_EMBEDDING_MODEL
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
          model  // Azure OpenAI Embedding Model
        });

        // Extract the embeddings array from the API response
        const embeddingArray = embeddings.data[0].embedding;
        // Prepare document object to upload to VectorStore
        const document: Document = {
          id: `doc-${Date.now()}`,  // Unique ID for this document
          metadata: translation,  // Metadata related to the text chunk
          embeding_vector: embeddingArray  // The generated embeddings array
        };

        // Upload the document with embedding vector to your VectorStore (e.g., Azure Search)
        const uploadResult = await this.azureSearchClient.uploadDocuments([document]);

        // Return vector ID from the result
        const vectorId = uploadResult.results[0]?.key;
        vectorIds.push(vectorId);
        // Optionally, log progress
      }
      // Return all generated vector IDs for the document chunks
      return vectorIds;
    }
    catch (error) {
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

}