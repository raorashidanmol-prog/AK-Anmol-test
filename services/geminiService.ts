import { QuestionType, Question, Language } from "../types";

export interface UploadedFilePayload {
  name: string;
  mimeType: string;
  data: string; // base64 string without data URL prefix
}

/**
 * Generate primary-level questions from uploaded images or PDF documents via the backend API.
 */
export async function generateQuestionsFromFiles(
  files: UploadedFilePayload[],
  language: Language = 'en',
  types: QuestionType[] = [QuestionType.MCQ],
  count: number = 5,
  grade: string = 'Class 5'
): Promise<Partial<Question>[]> {
  const response = await fetch('/api/generate-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files,
      language,
      types,
      count,
      grade,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate questions (Status ${response.status})`);
  }

  const data = await response.json();
  return data.questions || [];
}

/**
 * Backward compatibility wrapper for base64 images
 */
export async function generateQuestionsFromImage(
  base64Images: string[],
  language: Language = 'en',
  types: QuestionType[] = [QuestionType.MCQ],
  count: number = 5,
  grade: string = 'Class 5'
): Promise<Partial<Question>[]> {
  const files: UploadedFilePayload[] = base64Images.map((b64, idx) => ({
    name: `page-${idx + 1}.jpg`,
    mimeType: 'image/jpeg',
    data: b64,
  }));

  return generateQuestionsFromFiles(files, language, types, count, grade);
}

/**
 * Generate primary-level questions from text via backend API
 */
export async function generateQuestionsFromText(
  text: string,
  language: Language = 'en',
  count: number = 5,
  grade: string = 'Class 5'
): Promise<Partial<Question>[]> {
  const response = await fetch('/api/generate-from-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language,
      count,
      grade,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate questions (Status ${response.status})`);
  }

  const data = await response.json();
  return data.questions || [];
}
