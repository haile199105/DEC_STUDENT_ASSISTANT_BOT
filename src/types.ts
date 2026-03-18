export interface Note {
  id?: string;
  title: string;
  content: string;
  date: string;
  createdAt: string;
}

export interface Question {
  id?: string;
  text: string;
  answer: string;
  subject: string;
  createdAt: string;
}

export interface Book {
  id?: string;
  title: string;
  content: string;
  subject: string;
  createdAt: string;
}
