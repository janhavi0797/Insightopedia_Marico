import * as fs from 'fs';
import * as path from 'path';

export class FileLogger {
  private static logDirectory = path.resolve(process.cwd(), 'failure-logger');

  private static getFileName(type: 'error' | 'success'): string {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `Audio AI ${type}_log_${day}-${month}-${year}.txt`;
  }

  private static writeLog(fileName: string, projectId: string, logMessage: string): void {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }

    const fullPath = path.join(this.logDirectory, fileName);
    const sectionHeader = `===== Project ID: ${projectId} =====`;
    const logLine = logMessage.trim() + '\n';

    let updatedContent = '';
    if (fs.existsSync(fullPath)) {
      const existingContent = fs.readFileSync(fullPath, 'utf8');

      if (existingContent.includes(sectionHeader)) {
        // Append to existing project section
        const regex = new RegExp(`(${sectionHeader}\\n)([\\s\\S]*?)(?=(\\n=====|$))`, 'g');
        updatedContent = existingContent.replace(regex, (match, header, body) => {
          return `${header}${body}${logLine}`;
        });
      } else {
        // Add new project section at the end
        updatedContent = existingContent + `\n${sectionHeader}\n${logLine}`;
      }
    } else {
      // Create new file and section
      updatedContent = `${sectionHeader}\n${logLine}`;
    }

    fs.writeFileSync(fullPath, updatedContent, 'utf8');
  }

  static logErrorToFile(projectId: string, errorMessage: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ❌ ERROR: ${errorMessage}`;
    const fileName = this.getFileName('error');
    this.writeLog(fileName, projectId, logEntry);
  }

  static logSuccessToFile(projectId: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ✅ SUCCESS: ${message}`;
    const fileName = this.getFileName('success');
    this.writeLog(fileName, projectId, logEntry);
  }

  static cleanOldLogs(days: number = 30): void {
    if (!fs.existsSync(this.logDirectory)) return;

    const files = fs.readdirSync(this.logDirectory);
    const now = Date.now();

    files.forEach(file => {
      const filePath = path.join(this.logDirectory, file);
      const stats = fs.statSync(filePath);

      const fileAgeInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (fileAgeInDays > days && file.endsWith('.txt')) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old log file: ${file}`);
      }
    });
  }
}
