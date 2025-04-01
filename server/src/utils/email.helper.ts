import * as nodemailer from 'nodemailer';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ProjectEntity, User } from './containers';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';

@Injectable()
export class EmailHelper {
  private readonly logger = new Logger(EmailHelper.name);

  constructor(
    @InjectModel(ProjectEntity) private readonly ProjectContainer: Container,
    @InjectModel(User) private readonly UserContainer: Container,
  ) {}

  async sendEmail(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_SERVER,
      port: +process.env.EMAIL_PORT,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
    };

    try {
      await transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${recipientEmail}`);
    } catch (err) {
      this.logger.error(`Error in email sent: ${err.message}`);
      throw new InternalServerErrorException(
        `Failed to send email: ${err.message}`,
      );
    }
  }
  async sendProjectCreationEmail(projectId: string): Promise<void> {
    try {
      const query = {
        query: 'SELECT * FROM c WHERE c.projectId = @projectId',
        parameters: [{ name: '@projectId', value: projectId }],
      };
      const { resources: existingDocuments } = await this.ProjectContainer.items
        .query(query)
        .fetchAll();

      if (existingDocuments.length === 0) {
        this.logger.error(`No project found with ID: ${projectId}`);
        throw new InternalServerErrorException(
          `No project found with ID: ${projectId}`,
        );
      }

      const userId = existingDocuments[0].userId;
      const userQuery = {
        query: `SELECT * FROM c WHERE c.userid = @userId`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: userDocuments } = await this.UserContainer.items
        .query(userQuery)
        .fetchAll();

      console.log(userDocuments, 'userDocuments');
      if (userDocuments.length === 0) {
        this.logger.error(`No user found with ID: ${userId}`);
        throw new InternalServerErrorException(
          `No user found with ID: ${userId}`,
        );
      }
      const user = userDocuments[0] as User;
      const existingProject = existingDocuments[0] as ProjectEntity;
      const userName = user.userName;
      const projectName = existingProject.projectName;
      const recipientEmail = user.email;

      const subject = 'Project Creation Successful';
      const htmlContent = `
        <p>Hi ${userName},</p>
      <p>Your project has been successfully created on the portal.</p>
      <p>Project Name: ${projectName}</p>
      <p>You can view the details by clicking on the link below:</p>
      <a href="${process.env.APP_BASE_URL}/portal/project-details?projectId=${projectId}&userId=${userId}">View Project Details</a>
      <p>Best regards,<br>Marico Team</p>
        `;
      await this.sendEmail(recipientEmail, subject, htmlContent);
    } catch (error) {
      this.logger.error(
        `Error in sending project creation email: ${error.message}`,
      );
    }
  }

  async sendProjectCreationFailureEmail(projectId: string): Promise<void> {
    try {
      const query = {
        query: 'SELECT * FROM c WHERE c.projectId = @projectId',
        parameters: [{ name: '@projectId', value: projectId }],
      };
      const { resources: existingDocuments } = await this.ProjectContainer.items
        .query(query)
        .fetchAll();

      if (existingDocuments.length === 0) {
        this.logger.error(`No project found with ID: ${projectId}`);
        throw new InternalServerErrorException(
          `No project found with ID: ${projectId}`,
        );
      }

      const userId = existingDocuments[0].userId;
      const userQuery = {
        query: `SELECT * FROM c WHERE c.userid = @userId`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: userDocuments } = await this.UserContainer.items
        .query(userQuery)
        .fetchAll();
      if (userDocuments.length === 0) {
        this.logger.error(`No user found with ID: ${userId}`);
        throw new InternalServerErrorException(
          `No user found with ID: ${userId}`,
        );
      }
      const user = userDocuments[0] as User;
      const userName = user.userName;
      const recipientEmail = user.email;
      const existingProject = existingDocuments[0] as ProjectEntity;
      const projectName = existingProject.projectName;

      const subject = 'Project Creation Failed';
      const htmlContent = `
            <p>Hi ${userName},</p>
      <p>Unfortunately, your project creation has failed due to an error.</p>
      <p>Project Name: ${projectName}</p>
      <p>Please check the portal for more details.</p>
      <p>Best regards,<br>Marico Team</p>
        `;
      await this.sendEmail(recipientEmail, subject, htmlContent);
    } catch (error) {
      this.logger.error(
        `Error in sending project creation failure email: ${error.message}`,
      );
    }
  }
}
