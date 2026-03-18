import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Firebase Admin
// In AI Studio Build, we can often initialize with just the project ID
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const db = getFirestore(firebaseConfig.firestoreDatabaseId);

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Initialize Telegram Bot
const token = process.env.TELEGRAM_BOT_TOKEN;
let bot: TelegramBot | null = null;

if (token) {
  bot = new TelegramBot(token, { polling: true });
  console.log('Telegram bot initialized');
} else {
  console.warn('TELEGRAM_BOT_TOKEN not found. Bot functionality will be disabled.');
}

if (bot) {
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot?.sendMessage(chatId, '📚 Welcome to the Student Assist Bot!\n\nI am here to help you with your studies. Use the commands below or just chat with me.\n\nCommands:\n📅 /note - Get today\'s study note\n❓ /question - Get a random study question\n📖 /books - List available books\n💬 Just send me a message to chat about your subjects!');
  });

  bot.onText(/\/note/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const today = new Date().toISOString().split('T')[0];
      const notesRef = db.collection('notes');
      const snapshot = await notesRef.where('date', '==', today).limit(1).get();
      
      if (snapshot.empty) {
        bot?.sendMessage(chatId, 'No study note for today. Check back later!');
      } else {
        const note = snapshot.docs[0].data();
        bot?.sendMessage(chatId, `📅 *Today's Note: ${note.title}*\n\n${note.content}`, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error('Error fetching note:', error);
      bot?.sendMessage(chatId, 'Sorry, I couldn\'t fetch today\'s note.');
    }
  });

  bot.onText(/\/question/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const questionsRef = db.collection('questions');
      const snapshot = await questionsRef.get();
      
      if (snapshot.empty) {
        bot?.sendMessage(chatId, 'No questions available yet.');
      } else {
        const randomIndex = Math.floor(Math.random() * snapshot.docs.length);
        const question = snapshot.docs[randomIndex].data();
        bot?.sendMessage(chatId, `❓ *Question:* ${question.text}\n\nSubject: ${question.subject}\n\nReply with /answer to see the correct answer.`, { parse_mode: 'Markdown' });
        
        // Store the last question for this user to handle /answer
        // (In a real app, you'd use a database for this, but for now, we'll just use a simple map)
        userLastQuestion.set(chatId, question.answer);
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      bot?.sendMessage(chatId, 'Sorry, I couldn\'t fetch a question.');
    }
  });

  const userLastQuestion = new Map<number, string>();

  bot.onText(/\/answer/, (msg) => {
    const chatId = msg.chat.id;
    const answer = userLastQuestion.get(chatId);
    if (answer) {
      bot?.sendMessage(chatId, `✅ *Correct Answer:* ${answer}`, { parse_mode: 'Markdown' });
      userLastQuestion.delete(chatId);
    } else {
      bot?.sendMessage(chatId, 'You haven\'t asked for a question yet! Use /question first.');
    }
  });

  bot.onText(/\/books/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const booksRef = db.collection('books');
      const snapshot = await booksRef.get();
      
      if (snapshot.empty) {
        bot?.sendMessage(chatId, 'No books available in the library.');
      } else {
        let response = '📖 *Available Books:*\n\n';
        snapshot.docs.forEach(doc => {
          const book = doc.data();
          response += `• ${book.title} (${book.subject})\n`;
        });
        bot?.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      bot?.sendMessage(chatId, 'Sorry, I couldn\'t fetch the book list.');
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    // Chat with Gemini using book context
    try {
      // Fetch all books to provide context
      const booksRef = db.collection('books');
      const snapshot = await booksRef.get();
      let context = 'You are a helpful study assistant. Use the following book content to answer student questions if relevant. If the information is not in the books, use your general knowledge but prioritize the books.\n\n';
      
      snapshot.docs.forEach(doc => {
        const book = doc.data();
        context += `Book: ${book.title}\nSubject: ${book.subject}\nContent: ${book.content}\n\n`;
      });

      const model = genAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: text,
        config: {
          systemInstruction: context,
        }
      });
      const response = await model;
      bot?.sendMessage(chatId, response.text || 'I am not sure how to respond to that.');
    } catch (error) {
      console.error('Gemini Error:', error);
      bot?.sendMessage(chatId, 'Sorry, I encountered an error while thinking.');
    }
  });
}

async function startServer() {
  app.use(express.json());

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', botActive: !!bot });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
