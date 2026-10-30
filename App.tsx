
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, UserRole, Test, QuizAttempt, Question } from './types';
import Layout from './components/Layout';
import LoginView from './views/LoginView';
import TeacherPortal from './views/TeacherPortal';
import StudentPortal from './views/StudentPortal';
import QuizSession from './views/QuizSession';
import ResultReview from './views/ResultReview';

const INITIAL_STATE: AppState = {
  user: null,
  tests: [
    {
      id: 'initial-1',
      title: 'Amazing Science Trivia 🌍',
      authorName: 'System',
      description: 'Test your knowledge about the solar system and our earth!',
      createdAt: Date.now(),
      timeLimitMinutes: 10,
      language: 'en',
      category: 'quiz',
      questions: [
        {
          id: 'q1',
          type: 'MCQ' as any,
          question: 'Which planet is known as the Red Planet?',
          options: ['Earth', 'Mars', 'Jupiter', 'Venus'],
          correctAnswer: 'Mars',
          marks: 5
        },
        {
          id: 'q2',
          type: 'MCQ' as any,
          question: 'What do bees collect from flowers to make honey?',
          options: ['Water', 'Nectar', 'Sugar', 'Seeds'],
          correctAnswer: 'Nectar',
          marks: 5
        }
      ]
    }
  ],
  attempts: [],
  questionBank: []
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('eduquest_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.questionBank) parsed.questionBank = [];
      parsed.tests = (parsed.tests || []).map((t: any) => ({
        ...t,
        category: t.category || 'quiz',
        authorName: t.authorName || 'System' // Fallback for old tests
      }));
      return parsed;
    }
    return INITIAL_STATE;
  });

  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    localStorage.setItem('eduquest_state', JSON.stringify(state));
  }, [state]);

  const handleLogin = (name: string, role: UserRole) => {
    setState(prev => ({ ...prev, user: { name, role } }));
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, user: null }));
    setActiveTest(null);
    setReviewAttempt(null);
  };

  const addTest = (test: Test) => {
    // Force current user as author
    const testWithAuthor = { ...test, authorName: state.user?.name || 'Unknown' };
    setState(prev => ({ ...prev, tests: [testWithAuthor, ...prev.tests] }));
  };

  const updateTest = (updatedTest: Test) => {
    setState(prev => ({
      ...prev,
      tests: prev.tests.map(t => t.id === updatedTest.id ? updatedTest : t)
    }));
  };

  const deleteTest = (id: string) => {
    setState(prev => ({ ...prev, tests: prev.tests.filter(t => t.id !== id) }));
  };

  const addToQuestionBank = (question: Question) => {
    setState(prev => {
      if (prev.questionBank.find(q => q.question === question.question)) {
        return prev;
      }
      return { ...prev, questionBank: [question, ...prev.questionBank] };
    });
  };

  const removeFromQuestionBank = (id: string) => {
    setState(prev => ({ ...prev, questionBank: prev.questionBank.filter(q => q.id !== id) }));
  };

  const finishQuiz = (attempt: QuizAttempt) => {
    setState(prev => ({ ...prev, attempts: [attempt, ...prev.attempts] }));
    setActiveTest(null);
    setReviewAttempt(attempt);
  };

  // Filter tests based on user role
  const teacherTests = useMemo(() => {
    if (state.user?.role === 'teacher') {
      return state.tests.filter(t => t.authorName === state.user?.name);
    }
    return [];
  }, [state.tests, state.user]);

  const renderContent = () => {
    if (!state.user) {
      return <LoginView onLogin={handleLogin} />;
    }

    if (activeTest) {
      return (
        <QuizSession 
          test={activeTest} 
          studentName={state.user.name} 
          onFinish={finishQuiz} 
        />
      );
    }

    if (reviewAttempt) {
      const test = state.tests.find(t => t.id === reviewAttempt.testId);
      return (
        <ResultReview 
          attempt={reviewAttempt} 
          test={test} 
          onClose={() => setReviewAttempt(null)} 
        />
      );
    }

    if (state.user.role === 'teacher') {
      return (
        <TeacherPortal 
          tests={teacherTests} // Only pass teacher's own tests
          questionBank={state.questionBank}
          onCreateTest={addTest} 
          onUpdateTest={updateTest}
          onDeleteTest={deleteTest} 
          onAddToBank={addToQuestionBank}
          onRemoveFromBank={removeFromQuestionBank}
        />
      );
    }

    return (
      <StudentPortal 
        tests={state.tests} 
        attempts={state.attempts} 
        studentName={state.user.name}
        onStartTest={setActiveTest}
        onReviewAttempt={setReviewAttempt}
      />
    );
  };

  return (
    <Layout user={state.user} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;
