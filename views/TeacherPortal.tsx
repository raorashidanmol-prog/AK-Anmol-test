import React, { useState, useMemo } from 'react';
import { Test, Question, QuestionType, Language, TestCategory } from '../types';
import { generateQuestionsFromFiles, UploadedFilePayload } from '../services/geminiService';

interface TeacherPortalProps {
  tests: Test[];
  questionBank: Question[];
  onCreateTest: (test: Test) => void;
  onUpdateTest: (test: Test) => void;
  onDeleteTest: (id: string) => void;
  onAddToBank: (question: Question) => void;
  onRemoveFromBank: (id: string) => void;
}

interface PendingFileItem {
  id: string;
  name: string;
  mimeType: string;
  data: string;
  previewUrl?: string;
  sizeFormatted: string;
}

const CATEGORIES: { value: TestCategory; label: string; icon: string; color: string }[] = [
  { value: 'mcq_only', label: 'MCQs Only', icon: '🔘', color: 'bg-orange-500' },
  { value: 'short_answer_only', label: 'Short Answer', icon: '✍️', color: 'bg-emerald-500' },
  { value: 'opposites_only', label: 'Opposites', icon: '🌓', color: 'bg-purple-500' },
  { value: 'quiz', label: 'Mixed Quiz', icon: '🎒', color: 'bg-sky-500' },
  { value: 'timed_challenge', label: 'Timer Test', icon: '⏱️', color: 'bg-red-500' },
];

const LANGUAGES: { value: Language; label: string; native: string }[] = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'ur', label: 'Urdu', native: 'اردو' },
  { value: 'sd', label: 'Sindhi', native: 'سنڌي' },
];

const CLASSES = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8'];

const TeacherPortal: React.FC<TeacherPortalProps> = ({ 
  tests, 
  questionBank, 
  onCreateTest, 
  onUpdateTest, 
  onDeleteTest, 
  onAddToBank,
  onRemoveFromBank,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TestCategory | 'all'>('all');
  
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);
  const [language, setLanguage] = useState<Language>('en');
  const [category, setCategory] = useState<TestCategory>('quiz');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Question Bank UI State
  const [bankSearch, setBankSearch] = useState('');
  const [bankSort, setBankSort] = useState<'name' | 'type'>('name');
  const [bankClassFilter, setBankClassFilter] = useState<string>('All');

  // AI Configuration State - Multiple Images & PDF Supported
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);
  const [aiConfigModal, setAiConfigModal] = useState(false);
  const [aiSelectedTypes, setAiSelectedTypes] = useState<QuestionType[]>([QuestionType.MCQ]);
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiTargetGrade, setAiTargetGrade] = useState<string>('Class 5');

  const isRTL = language === 'ur' || language === 'sd';

  // Filtered and Sorted Question Bank
  const processedBank = useMemo(() => {
    let result = [...questionBank];
    
    // Filter by class
    if (bankClassFilter !== 'All') {
      result = result.filter(q => q.grade === bankClassFilter);
    }

    // Filter by search
    if (bankSearch) {
      result = result.filter(q => q.question.toLowerCase().includes(bankSearch.toLowerCase()));
    }

    // Sort
    result.sort((a, b) => {
      if (bankSort === 'name') return a.question.localeCompare(b.question);
      if (bankSort === 'type') return a.type.localeCompare(b.type);
      return 0;
    });

    return result;
  }, [questionBank, bankSearch, bankSort, bankClassFilter]);

  const handleEditTest = (test: Test) => {
    setEditingTestId(test.id);
    setTitle(test.title);
    setTimeLimit(test.timeLimitMinutes);
    setLanguage(test.language || 'en');
    setCategory(test.category || 'quiz');
    setQuestions([...test.questions]);
    setIsCreating(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Handle uploading both PDF documents and photos (camera or gallery)
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setGenerationError(null);
    const fileArray: File[] = Array.from(files);

    const readers = fileArray.map((file: File) => {
      return new Promise<PendingFileItem>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1] || '';
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            const mimeType = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');

            resolve({
              id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              mimeType,
              data: base64,
              previewUrl: isPdf ? undefined : reader.result,
              sizeFormatted: formatFileSize(file.size),
            });
          } else {
            resolve({
              id: `file-${Date.now()}`,
              name: file.name,
              mimeType: 'application/octet-stream',
              data: '',
              sizeFormatted: '0 B',
            });
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(results => {
      const valid = results.filter(r => r.data !== '');
      if (valid.length > 0) {
        setPendingFiles(prev => [...prev, ...valid]);
        setAiConfigModal(true);
      }
    });
    
    e.target.value = ''; 
  };

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => {
      const remaining = prev.filter(f => f.id !== id);
      if (remaining.length === 0) {
        setAiConfigModal(false);
      }
      return remaining;
    });
  };

  const startAiGeneration = async () => {
    if (pendingFiles.length === 0) return;
    setLoading(true);
    setGenerationError(null);
    setAiConfigModal(false);

    try {
      const filePayloads: UploadedFilePayload[] = pendingFiles.map(f => ({
        name: f.name,
        mimeType: f.mimeType,
        data: f.data,
      }));

      const aiQuestions = await generateQuestionsFromFiles(
        filePayloads,
        language,
        aiSelectedTypes,
        aiQuestionCount,
        aiTargetGrade
      );

      if (!aiQuestions || aiQuestions.length === 0) {
        throw new Error("No questions were extracted. Please try another page or clear photo/document.");
      }

      const mappedQuestions: Question[] = aiQuestions.map((q, idx) => ({
        id: `q-${Date.now()}-${idx}`,
        type: (q.type as QuestionType) || QuestionType.MCQ,
        question: q.question || 'New Question',
        options: q.options || (q.type === QuestionType.MCQ ? ['', '', '', ''] : undefined),
        correctAnswer: q.correctAnswer || '',
        marks: 1, // Strictly 1 mark
        grade: q.grade || aiTargetGrade,
      }));

      setQuestions(prev => [...prev, ...mappedQuestions]);
      setPendingFiles([]);
    } catch (err: any) {
      console.error('Generation error:', err);
      const msg = err.message || 'Something went wrong during generation. Please try again!';
      setGenerationError(msg);
      // Reopen modal to let teacher retry or modify settings
      setAiConfigModal(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleAiType = (type: QuestionType) => {
    setAiSelectedTypes(prev => 
      prev.includes(type) ? (prev.length > 1 ? prev.filter(t => t !== type) : prev) : [...prev, type]
    );
  };

  const addManualQuestion = () => {
    const type = category === 'mcq_only' ? QuestionType.MCQ : 
                 category === 'short_answer_only' ? QuestionType.SHORT_ANSWER : 
                 category === 'opposites_only' ? QuestionType.OPPOSITE :
                 QuestionType.MCQ;
    const newQ: Question = {
      id: `q-${Date.now()}`,
      type,
      question: '',
      options: type === QuestionType.MCQ ? ['', '', '', ''] : undefined,
      correctAnswer: '',
      marks: 1, // Strictly 1 mark
      grade: 'Class 5',
    };
    setQuestions([...questions, newQ]);
  };

  const saveTest = () => {
    if (!title.trim() || questions.length === 0) {
      showToast("Please enter a title and add at least one question.");
      return;
    }
    const newTest: Test = {
      id: editingTestId || `test-${Date.now()}`,
      authorName: '', 
      title,
      description: `Test in ${language} - ${CATEGORIES.find(c => c.value === category)?.label}`,
      questions: questions.map(q => ({ ...q, marks: 1 })), // Ensure all questions carry 1 mark on save
      createdAt: editingTestId ? (tests.find(t => t.id === editingTestId)?.createdAt || Date.now()) : Date.now(),
      timeLimitMinutes: timeLimit,
      language,
      category,
    };
    if (editingTestId) onUpdateTest(newTest); else onCreateTest(newTest);
    showToast("Test published successfully! 🚀");
    resetForm();
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingTestId(null);
    setTitle('');
    setQuestions([]);
    setTimeLimit(15);
    setLanguage('en');
    setCategory('quiz');
    setShowBankModal(false);
    setPendingFiles([]);
    setAiConfigModal(false);
    setGenerationError(null);
  };

  const filteredTests = activeFilter === 'all' ? tests : tests.filter(t => t.category === activeFilter);

  const handleAddToBankWithGrade = (q: Question) => {
    const grade = q.grade || "Class 5";
    onAddToBank({ ...q, grade, marks: 1 });
    showToast("Added to Question Bank! 🏦");
  };

  if (isCreating) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-24 relative">
        {toastMessage && (
          <div className="fixed top-20 right-6 z-[99] bg-gray-900 text-white font-bold px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-200 text-xs flex items-center gap-2">
            <span>✨</span> {toastMessage}
          </div>
        )}
        {/* AI Configuration Modal */}
        {aiConfigModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 sm:p-10 space-y-6 border-8 border-white animate-in zoom-in duration-300 overflow-y-auto max-h-[95vh]">
              <div className="text-center">
                <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">✨</span>
                </div>
                <h3 className="text-2xl font-black text-gray-800">Scan Book & Generate Test</h3>
                <p className="text-gray-400 font-bold text-xs mt-1">
                  {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} ready (PDFs & Photos)
                </p>
              </div>

              {generationError && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-600 text-xs font-bold flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <div className="flex-1">
                    <p className="font-black">Generation Notice:</p>
                    <p>{generationError}</p>
                  </div>
                </div>
              )}

              {/* Uploaded Files Preview Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest ml-1">
                  Selected Textbook / Documents
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  {pendingFiles.map((f) => (
                    <div key={f.id} className="relative aspect-video sm:aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-sm group bg-white flex flex-col items-center justify-center p-2 text-center">
                      {f.mimeType === 'application/pdf' ? (
                        <div className="flex flex-col items-center justify-center p-2">
                          <span className="text-3xl mb-1">📄</span>
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded">PDF</span>
                          <p className="text-[10px] font-bold text-gray-600 line-clamp-1 mt-1 max-w-[100px]">{f.name}</p>
                          <span className="text-[8px] text-gray-400 font-bold">{f.sizeFormatted}</span>
                        </div>
                      ) : (
                        <img src={`data:${f.mimeType};base64,${f.data}`} className="w-full h-full object-cover" alt="" />
                      )}
                      <button 
                        type="button"
                        onClick={() => removePendingFile(f.id)}
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg opacity-90 hover:opacity-100 transition-opacity"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Add more files inside modal */}
                  <label className="aspect-video sm:aspect-square rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 flex flex-col items-center justify-center cursor-pointer hover:bg-sky-100 transition-colors p-2 text-center">
                    <span className="text-2xl text-sky-500 font-bold">+</span>
                    <span className="text-[10px] font-black text-sky-600">Add More</span>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      multiple 
                      className="hidden" 
                      onChange={handleFileUpload} 
                    />
                  </label>
                </div>
              </div>

              {/* Class / Grade Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest ml-1">
                  Target Class / Level
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {CLASSES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAiTargetGrade(c)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                        aiTargetGrade === c 
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-100' 
                          : 'bg-gray-50 text-gray-500 hover:bg-sky-50'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Types */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest ml-1">
                  Question Types to Include
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { type: QuestionType.MCQ, label: 'MCQs', icon: '🔘' },
                    { type: QuestionType.SHORT_ANSWER, label: 'Written', icon: '✍️' },
                    { type: QuestionType.JUMBLED, label: 'Jumbled', icon: '🔀' },
                    { type: QuestionType.OPPOSITE, label: 'Opposites', icon: '🌓' },
                  ].map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => toggleAiType(item.type)}
                      className={`flex flex-col items-center gap-1 p-3.5 rounded-2xl border-2 font-black transition-all transform active:scale-95 ${
                        aiSelectedTypes.includes(item.type) 
                          ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md shadow-sky-100' 
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-sky-200'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-[11px]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-widest">
                    Number of Questions
                  </label>
                  <span className="bg-sky-500 text-white font-black px-3.5 py-1 rounded-full text-sm shadow-md shadow-sky-100">
                    {aiQuestionCount}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="15" 
                  value={aiQuestionCount} 
                  onChange={(e) => setAiQuestionCount(Number(e.target.value))} 
                  className="w-full h-3 bg-sky-100 rounded-full appearance-none cursor-pointer accent-sky-600" 
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => { setAiConfigModal(false); setPendingFiles([]); setGenerationError(null); }} 
                  className="flex-1 py-4 rounded-2xl font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={startAiGeneration} 
                  disabled={loading}
                  className="flex-1 py-4 rounded-2xl font-black text-white bg-sky-500 hover:bg-sky-600 shadow-xl shadow-sky-200 transition-all transform active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  {loading ? 'Creating...' : 'Generate Questions ✨'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-sky-50">
          <h2 className="text-2xl font-black text-gray-800">{editingTestId ? 'Edit Test ✏️' : 'New Test 📝'}</h2>
          <div className="flex gap-3">
             <button onClick={() => setShowBankModal(true)} className="bg-sky-50 text-sky-600 font-black px-6 py-3 rounded-2xl hover:bg-sky-500 hover:text-white transition-all text-xs">🏦 Open Bank</button>
             <button onClick={resetForm} className="bg-red-50 text-red-400 p-3 rounded-2xl hover:bg-red-500 hover:text-white transition-all">✕ Cancel</button>
          </div>
        </div>

        {generationError && !aiConfigModal && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-3xl text-red-600 font-bold flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-black text-sm">AI Notice</p>
                <p className="text-xs">{generationError}</p>
              </div>
            </div>
            <button 
              onClick={() => setGenerationError(null)}
              className="text-red-400 hover:text-red-700 font-black text-sm px-3 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-sky-50 space-y-6">
              <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">Global Settings</h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Test Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} onClick={() => setCategory(cat.value)} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${category === cat.value ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md' : 'border-gray-50 text-gray-400 hover:border-sky-100'}`}>
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[10px] font-bold">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 ml-1 mb-2">Test Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} dir={isRTL ? 'rtl' : 'ltr'} className="w-full border-4 border-gray-50 rounded-2xl p-4 focus:border-sky-300 outline-none transition-all font-black text-lg" placeholder="E.g. Animal Kingdom" />
                </div>
                
                <div className="pt-2">
                  <label className="block text-[10px] font-black uppercase text-gray-400 ml-1 mb-2 tracking-widest">Test Language</label>
                  <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border-2 border-gray-100">
                    {LANGUAGES.map(lang => (
                      <button key={lang.value} onClick={() => setLanguage(lang.value)} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${language === lang.value ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 ml-1 mb-2">Timer (Mins)</label>
                  <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="w-full border-4 border-gray-50 rounded-2xl p-4 focus:border-sky-300 outline-none transition-all font-black" />
                </div>
              </div>
            </div>
            
            {/* AI Assistant Card with Camera, PDF Upload, and Gallery */}
            <div className={`p-8 rounded-[3rem] shadow-2xl transition-all duration-700 ${loading ? 'bg-gray-500 animate-pulse' : 'bg-gradient-to-br from-indigo-500 via-sky-600 to-indigo-700'} text-white space-y-6`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧙‍♂️</span>
                <div>
                  <h3 className="font-black text-2xl">AI Test Maker</h3>
                  <p className="text-white/80 text-xs font-medium">Scan book pages or upload PDFs!</p>
                </div>
              </div>

              {loading ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  <p className="font-black text-sm tracking-wide">Reading text & creating test questions...</p>
                  <p className="text-xs text-white/70">Using Gemini 3.8 Flash</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* CAMERA OPTION */}
                  <label className="block w-full text-center bg-white text-indigo-700 font-black py-3.5 rounded-2xl cursor-pointer hover:scale-102 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                    <span>📸</span> Use Camera
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      multiple 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      disabled={loading} 
                    />
                  </label>

                  {/* PDF UPLOAD OPTION */}
                  <label className="block w-full text-center bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 font-black py-3.5 rounded-2xl cursor-pointer hover:scale-102 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                    <span>📄</span> Upload PDF Document
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      multiple 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      disabled={loading} 
                    />
                  </label>
                  
                  {/* GALLERY / PHOTOS OPTION */}
                  <label className="block w-full text-center bg-white/10 hover:bg-white/20 text-white border-2 border-white/20 font-black py-3.5 rounded-2xl cursor-pointer hover:scale-102 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                    <span>🖼️</span> Pick from Gallery
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      multiple 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      disabled={loading} 
                    />
                  </label>
                </div>
              )}

              <p className="text-[10px] text-center text-white/60 font-black uppercase tracking-wider">
                Supports Textbook photos, Homework scans & PDF worksheets
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {questions.length === 0 ? (
              <div className="bg-white/50 border-4 border-dashed border-sky-100 rounded-[3rem] py-20 text-center flex flex-col items-center">
                <span className="text-6xl mb-4 opacity-20">📝</span>
                <p className="text-gray-400 font-black text-lg">No questions added yet.</p>
                <p className="text-gray-300 text-xs mt-1">Use AI Scanner on the left or click "Add Manual Question" below.</p>
              </div>
            ) : (
              questions.map((q, qIndex) => (
                <div key={q.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-sky-50 relative group animate-in slide-in-from-right duration-300 hover:shadow-xl transition-all">
                  <div className="absolute top-6 right-6 flex gap-3">
                    <button onClick={() => handleAddToBankWithGrade(q)} title="Add to Question Bank" className="bg-sky-50 text-sky-500 p-2.5 rounded-full hover:bg-sky-500 hover:text-white transition-all">🏦</button>
                    <button onClick={() => setQuestions(questions.filter(item => item.id !== q.id))} className="bg-red-50 text-red-300 p-2.5 rounded-full hover:bg-red-500 hover:text-white transition-all">✕</button>
                  </div>
                  <div className="flex items-center gap-4 mb-8">
                    <span className="bg-sky-500 text-white font-black px-4 py-1.5 rounded-2xl text-xs uppercase shadow-md shadow-sky-100">Question {qIndex + 1}</span>
                    <select value={q.type} onChange={(e) => {
                      const updated = [...questions];
                      updated[qIndex].type = e.target.value as QuestionType;
                      setQuestions(updated);
                    }} className="text-xs font-black text-indigo-500 bg-indigo-50 px-4 py-1.5 rounded-2xl outline-none border-none cursor-pointer">
                      <option value={QuestionType.MCQ}>MCQ</option>
                      <option value={QuestionType.SHORT_ANSWER}>Short Answer</option>
                      <option value={QuestionType.JUMBLED}>Jumbled Words</option>
                      <option value={QuestionType.OPPOSITE}>Opposite Word</option>
                    </select>
                    
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-1.5 rounded-2xl">
                      <label className="text-[10px] font-black uppercase text-gray-400">Class</label>
                      <select value={q.grade || 'Class 5'} onChange={(e) => {
                        const updated = [...questions];
                        updated[qIndex].grade = e.target.value;
                        setQuestions(updated);
                      }} className="bg-transparent text-xs font-black text-sky-600 outline-none">
                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="ml-auto bg-sky-50 text-sky-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                       1 Mark
                    </div>
                  </div>
                  <div className="space-y-6">
                    <input type="text" value={q.question} dir={isRTL ? 'rtl' : 'ltr'} onChange={(e) => {
                      const updated = [...questions];
                      updated[qIndex].question = e.target.value;
                      setQuestions(updated);
                    }} className="w-full text-xl font-black border-b-4 border-gray-50 focus:border-sky-400 outline-none py-3 transition-all placeholder:text-gray-200" placeholder={q.type === QuestionType.OPPOSITE ? (isRTL ? "لفظ..." : "Target Word (e.g. Happy)") : (isRTL ? "سوال لکھیں..." : "Type your question here...")} />
                    {q.type === QuestionType.MCQ && q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">{String.fromCharCode(65 + oIndex)}</span>
                            <input type="text" value={opt} dir={isRTL ? 'rtl' : 'ltr'} onChange={(e) => {
                              const updated = [...questions];
                              if (updated[qIndex].options) updated[qIndex].options![oIndex] = e.target.value;
                              setQuestions(updated);
                            }} className="w-full pl-10 pr-4 py-4 rounded-2xl border-2 border-gray-50 font-bold text-sm focus:border-sky-300 focus:bg-sky-50 outline-none transition-all" placeholder={`Option ${oIndex + 1}`} />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-gray-50/50 p-6 rounded-3xl space-y-3 border-2 border-gray-50">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-2">Final Correct Answer</label>
                      <textarea dir={isRTL ? 'rtl' : 'ltr'} value={q.correctAnswer} onChange={(e) => {
                        const updated = [...questions];
                        updated[qIndex].correctAnswer = e.target.value;
                        setQuestions(updated);
                      }} className="w-full p-4 rounded-2xl border-2 border-white bg-white font-bold text-gray-700 focus:border-sky-300 outline-none min-h-[80px] transition-all shadow-sm" placeholder={isRTL ? "صحیح جواب یہاں لکھیں..." : "Type the exact correct answer here..."} />
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button onClick={addManualQuestion} className="flex-1 border-4 border-dashed border-sky-200 text-sky-500 font-black py-6 rounded-[2.5rem] hover:bg-sky-50 hover:border-sky-500 transition-all shadow-lg shadow-sky-50">+ Add Manual Question</button>
              <button onClick={saveTest} className="bg-indigo-600 text-white font-black px-16 py-6 rounded-[2.5rem] hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all uppercase tracking-widest text-sm">Publish Test 🚀</button>
            </div>
          </div>
        </div>

        {/* Question Bank Modal */}
        {showBankModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-10 border-b border-gray-100 bg-sky-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="text-3xl font-black text-gray-800">Question Bank 🏦</h3>
                  <p className="text-gray-400 font-bold text-sm">Stored missions across all classes</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <input type="text" value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} placeholder="Search questions..." className="px-5 py-3 rounded-2xl border-2 border-gray-100 text-sm font-bold focus:border-sky-400 outline-none w-48" />
                  <select value={bankClassFilter} onChange={(e) => setBankClassFilter(e.target.value)} className="px-5 py-3 rounded-2xl border-2 border-gray-100 text-sm font-bold focus:border-sky-400 outline-none">
                    <option value="All">All Classes</option>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex bg-white rounded-2xl border-2 border-gray-100 p-1">
                    <button onClick={() => setBankSort('name')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${bankSort === 'name' ? 'bg-sky-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Name</button>
                    <button onClick={() => setBankSort('type')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${bankSort === 'type' ? 'bg-sky-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Type</button>
                  </div>
                  <button onClick={() => setShowBankModal(false)} className="bg-white p-3 rounded-full shadow-sm hover:bg-red-50 text-red-400 transition-all ml-4">✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-4">
                {processedBank.length === 0 ? (
                  <div className="text-center py-20 opacity-30 flex flex-col items-center">
                    <span className="text-7xl mb-4">📭</span>
                    <p className="text-xl font-black">Bank is empty</p>
                  </div>
                ) : (
                  processedBank.map((q) => (
                    <div key={q.id} className="p-6 border-2 border-gray-50 rounded-[2rem] hover:border-sky-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white hover:shadow-xl hover:-translate-y-1">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="bg-sky-50 text-sky-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">{q.type}</span>
                          <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">{q.grade || 'Unknown Class'}</span>
                          <span className="bg-gray-50 text-gray-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">1 Mark</span>
                        </div>
                        <p className="font-bold text-gray-700 text-lg leading-tight">{q.question}</p>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => { setQuestions([...questions, { ...q, id: `q-${Date.now()}`, marks: 1 }]); showToast("Question imported! ✨"); }} className="flex-1 bg-sky-500 text-white font-black px-6 py-3 rounded-2xl hover:bg-sky-600 transition-all text-xs">Import →</button>
                        <button onClick={() => onRemoveFromBank(q.id)} className="bg-red-50 text-red-400 p-3 rounded-2xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom duration-700 pb-20 relative">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[99] bg-gray-900 text-white font-bold px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-200 text-xs flex items-center gap-2">
          <span>✨</span> {toastMessage}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Teacher Dashboard 🏛️</h2>
          <p className="text-gray-400 font-bold mt-1">Manage tests & generate questions from books and PDFs.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => { setShowBankModal(true); setIsCreating(true); }} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-8 py-5 rounded-[2.5rem] font-black shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs">🏦 Question Bank</button>
          <button onClick={() => setIsCreating(true)} className="bg-sky-500 hover:bg-sky-600 text-white px-10 py-5 rounded-[2.5rem] font-black shadow-2xl shadow-sky-100 flex items-center gap-3 transform hover:-translate-y-2 transition-all active:scale-95 uppercase tracking-widest text-xs"><span className="text-2xl font-normal">+</span> New Mission</button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
        <button onClick={() => setActiveFilter('all')} className={`px-8 py-4 rounded-3xl font-black text-sm whitespace-nowrap transition-all ${activeFilter === 'all' ? 'bg-sky-500 text-white shadow-xl shadow-sky-100' : 'bg-white text-gray-400 border border-gray-100 hover:border-sky-200'}`}>My Classes 📋</button>
        {CATEGORIES.map(cat => (
          <button key={cat.value} onClick={() => setActiveFilter(cat.value)} className={`px-8 py-4 rounded-3xl font-black text-sm whitespace-nowrap transition-all flex items-center gap-3 ${activeFilter === cat.value ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-100' : 'bg-white text-gray-400 border border-gray-100 hover:border-indigo-200'}`}>{cat.icon} {cat.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredTests.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-sky-50 flex flex-col items-center">
             <div className="w-32 h-32 bg-sky-50 rounded-full flex items-center justify-center mb-8">
               <span className="text-7xl opacity-20">🏫</span>
             </div>
             <h3 className="text-3xl font-black text-gray-300">Quiet Classroom...</h3>
             <p className="text-gray-200 font-bold mt-2">You haven't created any missions here yet. Click "+ New Mission" to start!</p>
          </div>
        ) : (
          filteredTests.map((test) => (
            <div key={test.id} className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-sky-50 hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 ${CATEGORIES.find(c => c.value === test.category)?.color || 'bg-sky-500'} opacity-10 rounded-bl-[5rem] pointer-events-none transition-all group-hover:scale-125`} />
              <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col gap-2">
                  <span className="bg-sky-50 text-sky-600 text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest self-start border border-sky-100">{test.questions.length} Items</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{CATEGORIES.find(c => c.value === test.category)?.label} • {test.language.toUpperCase()}</span>
                  </div>
                </div>
                <button onClick={() => { if(confirm("Are you sure you want to remove this test?")) onDeleteTest(test.id); }} className="bg-gray-50 text-gray-200 hover:bg-red-50 hover:text-red-500 w-10 h-10 rounded-full flex items-center justify-center transition-all">🗑️</button>
              </div>
              <h3 className={`text-3xl font-black text-gray-800 mb-8 group-hover:text-sky-600 transition-colors leading-tight ${test.language === 'ur' || test.language === 'sd' ? 'text-right' : 'text-left'}`} dir={test.language === 'ur' || test.language === 'sd' ? 'rtl' : 'ltr'}>{test.title}</h3>
              <div className="mt-auto flex items-center justify-between pt-8 border-t border-gray-50">
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl">
                  <span className="text-lg">⏱️</span>
                  <span className="text-xs font-black text-gray-500">{test.timeLimitMinutes}m</span>
                </div>
                <button onClick={() => handleEditTest(test)} className="bg-sky-50 text-sky-600 font-black px-8 py-3.5 rounded-2xl hover:bg-sky-500 hover:text-white transition-all transform group-hover:scale-105 active:scale-95 shadow-sm">Manage →</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeacherPortal;
