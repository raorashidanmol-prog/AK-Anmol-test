import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
// In development, AI Studio requires listening on port 3000. In production (Cloud Run), use process.env.PORT.
const PORT = isProduction ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080) : 3000;

// Support large payloads for PDF documents and multiple high-res photos
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    model: 'gemini-3.8-flash',
  });
});

// Endpoint: Generate questions from uploaded files (PDFs, Images, Camera captures)
app.post('/api/generate-questions', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({
        error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is available.',
      });
    }

    const { files = [], base64Images = [], language = 'en', types = ['MCQ'], count = 5, grade = 'Class 5' } = req.body;

    const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

    // Process files (PDF documents, photos, camera scans)
    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        if (file.data) {
          parts.push({
            inlineData: {
              mimeType: file.mimeType || 'image/jpeg',
              data: file.data,
            },
          });
        }
      }
    } else if (Array.isArray(base64Images) && base64Images.length > 0) {
      for (const base64 of base64Images) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64,
          },
        });
      }
    }

    if (parts.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one image or PDF document to analyze.' });
    }

    const langMap: Record<string, string> = {
      ur: 'Urdu',
      sd: 'Sindhi',
      en: 'English',
    };
    const langName = langMap[language] || 'English';
    const typeList = Array.isArray(types) && types.length > 0 ? types.join(', ') : 'MCQ';
    const questionCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 20);

    const promptText = `You are an expert primary school teacher for primary students (${grade || 'Class 1 to 8'}, ages 6-12).
Analyze the provided textbook scan(s), worksheet(s), PDF document pages, or photos.
Extract concepts, stories, vocabulary, or lesson contents from these files.

Generate EXACTLY ${questionCount} questions in ${langName.toUpperCase()}.
All questions and answers MUST be written in ${langName}.

Allowed question types: ${typeList}.
Distribute the ${questionCount} questions fairly across the requested types.

Format Requirements per question:
- MCQ: Exactly 4 distinct options in 'options'. Exactly 1 'correctAnswer' that matches one of the options.
- SHORT_ANSWER: Clear primary-level question in 'question', and concise accurate answer in 'correctAnswer'.
- JUMBLED: 'question' is "Arrange words to make a sentence:" (translated to ${langName}), and 'correctAnswer' is the complete correct sentence.
- OPPOSITE: 'question' is the single target word (e.g., "Big"), and 'correctAnswer' is its opposite/antonym (e.g., "Small").

CRITICAL:
1. Every question must carry exactly 1 mark ('marks': 1).
2. Set 'grade' to "${grade || 'Class 5'}".
3. Provide valid JSON array matching the schema.`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                enum: ['MCQ', 'SHORT_ANSWER', 'JUMBLED', 'OPPOSITE'],
              },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Four options for MCQ',
              },
              correctAnswer: { type: Type.STRING },
              marks: { type: Type.NUMBER, description: 'Must be 1' },
              grade: { type: Type.STRING, description: 'Class level e.g. Class 5' },
            },
            required: ['type', 'question', 'correctAnswer', 'marks'],
          },
        },
      },
    });

    const textOutput = response.text || '[]';
    const questions = JSON.parse(textOutput);
    res.json({ questions });
  } catch (error: any) {
    console.error('Error generating questions from files:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate questions using Gemini API.',
    });
  }
});

// Endpoint: Generate questions from text prompt
app.post('/api/generate-from-text', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({
        error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is available.',
      });
    }

    const { text, language = 'en', count = 5, grade = 'Class 5' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required.' });
    }

    const langMap: Record<string, string> = {
      ur: 'Urdu',
      sd: 'Sindhi',
      en: 'English',
    };
    const langName = langMap[language] || 'English';
    const questionCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 20);

    const promptText = `Generate ${questionCount} primary-level questions based on this text for ${grade}: "${text}".
All questions and answers must be in ${langName.toUpperCase()}.
Provide a mix of MCQs, Short Answers, Jumbled Words, and Opposite word questions.
Each question must carry exactly 1 mark.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                enum: ['MCQ', 'SHORT_ANSWER', 'JUMBLED', 'OPPOSITE'],
              },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              marks: { type: Type.NUMBER, description: 'Must be 1' },
              grade: { type: Type.STRING },
            },
            required: ['type', 'question', 'correctAnswer', 'marks'],
          },
        },
      },
    });

    const textOutput = response.text || '[]';
    const questions = JSON.parse(textOutput);
    res.json({ questions });
  } catch (error: any) {
    console.error('Error generating questions from text:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate questions from text.',
    });
  }
});

// Static assets / Vite Dev Middleware integration
if (isProduction) {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.use((_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: false,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
