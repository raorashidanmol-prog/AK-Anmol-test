
export type UserRole = 'teacher' | 'student';
export type Language = 'en' | 'ur' | 'sd';

export enum QuestionType {
  MCQ = 'MCQ',
  SHORT_ANSWER = 'SHORT_ANSWER',
  JUMBLED = 'JUMBLED',
  OPPOSITE = 'OPPOSITE',
}

export type TestCategory = 'mcq_only' | 'short_answer_only' | 'quiz' | 'timed_challenge' | 'opposites_only';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // Only for MCQ
  correctAnswer: string;
  marks: number;
  grade?: string; // Added for class-wise storage (e.g., "Class 1", "Class 5")
}

export interface Test {
  id: string;
  title: string;
  authorName: string; // Added to track creator
  description: string;
  questions: Question[];
  createdAt: number;
  timeLimitMinutes: number;
  language: Language;
  category: TestCategory;
}

export interface QuizAttempt {
  id: string;
  testId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  completedAt: number;
  answers: Record<string, string>; // Store user answers for review
}

export interface AppState {
  user: { name: string; role: UserRole } | null;
  tests: Test[];
  attempts: QuizAttempt[];
  questionBank: Question[];
}
