/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  FileText, 
  Plus, 
  Trash2, 
  LayoutDashboard, 
  MessageSquare,
  Settings,
  LogOut,
  ChevronRight,
  Search,
  Calendar
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { db, auth } from './firebase';
import { Note, Question, Book } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'notes' | 'questions' | 'books'>('dashboard');
  const [notes, setNotes] = useState<Note[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const notesUnsubscribe = onSnapshot(query(collection(db, 'notes'), orderBy('createdAt', 'desc')), (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
    });

    const questionsUnsubscribe = onSnapshot(query(collection(db, 'questions'), orderBy('createdAt', 'desc')), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
    });

    const booksUnsubscribe = onSnapshot(query(collection(db, 'books'), orderBy('createdAt', 'desc')), (snapshot) => {
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book)));
    });

    return () => {
      notesUnsubscribe();
      questionsUnsubscribe();
      booksUnsubscribe();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login Error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Student Assist Bot</h1>
          <p className="text-slate-600 mb-8">Manage your study bot's content and help students learn better.</p>
          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">StudyAdmin</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<FileText className="w-5 h-5" />} 
            label="Daily Notes" 
            active={activeTab === 'notes'} 
            onClick={() => setActiveTab('notes')} 
          />
          <SidebarItem 
            icon={<HelpCircle className="w-5 h-5" />} 
            label="Questions" 
            active={activeTab === 'questions'} 
            onClick={() => setActiveTab('questions')} 
          />
          <SidebarItem 
            icon={<BookOpen className="w-5 h-5" />} 
            label="Books Library" 
            active={activeTab === 'books'} 
            onClick={() => setActiveTab('books')} 
          />
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" alt={user.displayName || ''} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-slate-900 capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-lg text-sm w-64 transition-all outline-none"
              />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView notesCount={notes.length} questionsCount={questions.length} booksCount={books.length} />
          )}
          {activeTab === 'notes' && (
            <NotesView notes={notes} />
          )}
          {activeTab === 'questions' && (
            <QuestionsView questions={questions} />
          )}
          {activeTab === 'books' && (
            <BooksView books={books} />
          )}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active 
          ? "bg-indigo-50 text-indigo-600" 
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DashboardView({ notesCount, questionsCount, booksCount }: { notesCount: number, questionsCount: number, booksCount: number }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<FileText className="text-blue-600" />} label="Total Notes" value={notesCount} color="blue" />
        <StatCard icon={<HelpCircle className="text-amber-600" />} label="Total Questions" value={questionsCount} color="amber" />
        <StatCard icon={<BookOpen className="text-emerald-600" />} label="Books in Library" value={booksCount} color="emerald" />
      </div>

      <div className="bg-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2">Bot Status: Active</h3>
          <p className="text-indigo-100 mb-6 max-w-md">Your study assistant bot is currently online and helping students. You can manage the content it uses right here.</p>
          <div className="flex gap-4">
            <button className="px-6 py-2 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors">
              View Bot Analytics
            </button>
            <button className="px-6 py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-400 transition-colors">
              Bot Settings
            </button>
          </div>
        </div>
        <MessageSquare className="w-48 h-48 text-indigo-500/30 absolute -right-8 -bottom-8 rotate-12" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50",
    amber: "bg-amber-50",
    emerald: "bg-emerald-50"
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", colors[color])}>
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function NotesView({ notes }: { notes: Note[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', date: new Date().toISOString().split('T')[0] });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'notes'), {
        ...newNote,
        createdAt: new Date().toISOString()
      });
      setNewNote({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteDoc(doc(db, 'notes', id));
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Manage Daily Notes</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Title</label>
              <input 
                required
                type="text" 
                value={newNote.title}
                onChange={e => setNewNote({...newNote, title: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
                placeholder="e.g. Introduction to Physics"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Date</label>
              <input 
                required
                type="date" 
                value={newNote.date}
                onChange={e => setNewNote({...newNote, date: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Content</label>
            <textarea 
              required
              rows={4}
              value={newNote.content}
              onChange={e => setNewNote({...newNote, content: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none resize-none"
              placeholder="Write the note content here..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Save Note</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {notes.map(note => (
          <div key={note.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start group">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-slate-900">{note.title}</h4>
                <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-md flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {note.date}
                </span>
              </div>
              <p className="text-slate-600 text-sm line-clamp-2">{note.content}</p>
            </div>
            <button 
              onClick={() => note.id && handleDelete(note.id)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
        {notes.length === 0 && !isAdding && (
          <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No notes added yet. Start by adding a daily note!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionsView({ questions }: { questions: Question[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', answer: '', subject: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'questions'), {
        ...newQuestion,
        createdAt: new Date().toISOString()
      });
      setNewQuestion({ text: '', answer: '', subject: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteDoc(doc(db, 'questions', id));
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Manage Study Questions</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-lg space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <input 
              required
              type="text" 
              value={newQuestion.subject}
              onChange={e => setNewQuestion({...newQuestion, subject: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
              placeholder="e.g. Biology, Math, History"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Question Text</label>
            <textarea 
              required
              rows={3}
              value={newQuestion.text}
              onChange={e => setNewQuestion({...newQuestion, text: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none resize-none"
              placeholder="What is the powerhouse of the cell?"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Correct Answer</label>
            <input 
              required
              type="text" 
              value={newQuestion.answer}
              onChange={e => setNewQuestion({...newQuestion, answer: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
              placeholder="Mitochondria"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Save Question</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {questions.map(q => (
          <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 group relative">
            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-md uppercase tracking-wider">
              {q.subject}
            </span>
            <p className="font-medium text-slate-900">{q.text}</p>
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Answer</p>
              <p className="text-emerald-600 font-semibold">{q.answer}</p>
            </div>
            <button 
              onClick={() => q.id && handleDelete(q.id)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BooksView({ books }: { books: Book[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', content: '', subject: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'books'), {
        ...newBook,
        createdAt: new Date().toISOString()
      });
      setNewBook({ title: '', content: '', subject: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this book? This will remove its context from the AI.')) {
      try {
        await deleteDoc(doc(db, 'books', id));
      } catch (error) {
        console.error('Error deleting book:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900">Manage Books Library</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Book
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Book Title</label>
              <input 
                required
                type="text" 
                value={newBook.title}
                onChange={e => setNewBook({...newBook, title: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
                placeholder="e.g. Modern Chemistry"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Subject</label>
              <input 
                required
                type="text" 
                value={newBook.subject}
                onChange={e => setNewBook({...newBook, subject: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none"
                placeholder="e.g. Science"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Book Content (Text)</label>
            <p className="text-xs text-slate-500 mb-2">Paste the text content of the book here. This will be used by the AI to answer student questions.</p>
            <textarea 
              required
              rows={8}
              value={newBook.content}
              onChange={e => setNewBook({...newBook, content: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none resize-none font-mono text-sm"
              placeholder="Paste book content here..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Save Book</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {books.map(book => (
          <div key={book.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group">
            <div className="h-32 bg-slate-100 flex items-center justify-center relative">
              <BookOpen className="w-12 h-12 text-slate-300" />
              <button 
                onClick={() => book.id && handleDelete(book.id)}
                className="absolute top-2 right-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <h4 className="font-bold text-slate-900 mb-1">{book.title}</h4>
              <p className="text-xs text-slate-500 mb-3">{book.subject}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{book.content.length} characters</span>
                <button className="text-indigo-600 text-xs font-bold hover:underline">View Content</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
