export interface ITranscriptionProcessor {
  audioId: string;
  sasToken: string;
  primaryLang: string;
  secondaryLang: string[];
  noOfSpek: number;
  fileName: string;
  projectId: string;
}
