import {
  Body,
  Controller,
  Post,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Query,
  Get,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Chat Managment')
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatservice: ChatService) {}

  @Get('chatVectorId')
  @ApiQuery({ name: 'question', type: String, required: true })
  @ApiQuery({ name: 'vectorId', type: [String], required: true, isArray: true })
  async askQuestionWithVectorIds(
    @Query('question') question: string,
    @Query('vectorId') vectorIds: string[],
  ): Promise<{ question: string; answer: string }> {
    console.log(question);
    console.log(vectorIds);
    // Validate input
    if (
      !question ||
      !vectorIds ||
      !Array.isArray(vectorIds) ||
      vectorIds.length === 0
    ) {
      this.logger.warn(
        'Invalid input: question or vectorIds are missing or invalid',
      );
      throw new BadRequestException(
        'Both question and an array of vectorIds are required',
      );
    }

    try {
      // Step 1: Fetch documents based on vector IDs
      this.logger.log(`Fetching documents for vector IDs: ${vectorIds}`);
      const documents = await this.chatservice.getTextsByVectorIds(vectorIds);

      // Step 2: Check if any documents exist
      if (!documents || documents.length === 0) {
        this.logger.warn(`No documents found for vector IDs: ${vectorIds}`);
        return { question, answer: "I can't assist with that." }; // No documents found
      }

      // Step 3: Generate answer based on the documents and question
      this.logger.log(
        `Generating answer for question: "${question}" with vector IDs: ${vectorIds}`,
      );
      const answer =
        await this.chatservice.generateAnswerFromDocumentsWithChunks(
          question,
          documents,
        );

      // Step 4: Return the question and answer
      return { question, answer };
    } catch (error) {
      // Log the error and throw an internal server exception
      this.logger.error('Error processing chat request', error.stack);
      throw new InternalServerErrorException(
        'An error occurred while processing your request',
      );
    }
  }

  @Get('compare')
  @UsePipes(new ValidationPipe({ transform: true }))
  async compareProjects(
    @Query('project_1') project1: string,
    @Query('project_2') project2: string,
    @Query('compare') compare: string,
  ): Promise<any> {
    try {
      if (!project1 || !project2) {
        throw new HttpException(
          'Both project_1 and project_2 query parameters are required.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.chatservice.compareProjects(
        project1,
        project2,
        compare,
      );
      return result;
    } catch (error) {
      console.error('Error comparing projects:', error);
      throw new HttpException(
        'An error occurred while comparing projects.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
