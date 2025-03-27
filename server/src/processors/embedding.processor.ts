import { Job, Queue } from 'bull';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { AudioUtils } from 'src/utils';
import { BullQueues, QueueProcess } from 'src/utils/enums';
import nodemailer from 'nodemailer';

@Processor(BullQueues.EMBEDDING)
export class EmbeddingProcessor {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(private readonly audioUtils: AudioUtils) {} // Service containing translation logic

  @Process({ name: QueueProcess.EMBEDDING_AUDIO, concurrency: 5 }) // Handle jobs in the 'translate-audio' queue
  async handleTranslationJob(job: Job) {
    const {
      transcriptionDocument,
      combinedTranslation,
      audioId,
      fileName,
      projectId,
    } = job.data;
    await job.log(`Processing translation job for ${audioId}`);
    try {
      const vectorIds =
        await this.audioUtils.generateEmbeddings(combinedTranslation);
      await job.log('Translation job completed');
      await this.audioUtils.updateTranscriptionDocument(
        audioId,
        vectorIds,
        fileName,
      );
      await this.audioUtils.markStageCompleted(
        audioId,
        QueueProcess.EMBEDDING_AUDIO,
        projectId,
      );
    } catch (error) {
      this.logger.error(`Translation job failed: ${error.message}`);
      throw error;
    }
  }

  @Process('send-email')
  async sendEmail(
    change: any,
    recipientEmail: string,
    userName: string,
    projectDetails: any,
  ) {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4200';

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_SERVER,
      port: process.env.EMAIL_PORT,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_USER, // Office 365 email
        pass: process.env.EMAIL_PASS, // Office 365 app password
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: 'Project Successfully Created',
      html: `
        <p>Hi ${userName},</p>
      <p>The project is successfully created on the portal.</p>
    
      <p>You can view the details by clicking on the link below:</p>
      <a href="${baseUrl}/portal/allFiles/audioDetails/${test}">View Audio Details</a>
      <p>Best regards,<br>Marico Team</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      Logger.error(`Error in email sent ${err.message}`);
      throw new InternalServerErrorException(`${err.message}`);
    }
  }
}
