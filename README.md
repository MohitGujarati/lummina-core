# Lummina — AI-Powered Learning Platform

Lummina is an AI-driven study companion for students and teachers. Upload lecture materials, chat with an AI tutor, generate quizzes, practice viva interviews, and manage your knowledge base — all in one place.

---

## Tech Stack

- **Frontend** — React 19, Vite, Framer Motion
- **Backend** — Node.js, Express, WebSockets
- **AI** — Google Gemini API
- **Database & Auth** — Supabase

---

## Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/app/apikey) account (for Gemini API key)
- A [Supabase](https://supabase.com) project

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Lummina
```

### 2. Set up the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
GEMINI_API_KEY=your-google-gemini-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
ALLOWED_ORIGIN=http://localhost:5173
```

Start the backend server:

```bash
npm run dev
```

The server will start at `http://localhost:3001`.

---

### 3. Set up the Frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:3001
```

Start the frontend:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

### 4. Set up the Database

Run the SQL schema against your Supabase project:

- Go to your Supabase dashboard → SQL Editor
- Paste and run the contents of `supabase/schema.sql`

---

## Features

### Authentication
Sign up and log in as a **Student** or **Teacher**. Role-based access controls what each user can see and do.

<img width="1866" height="1016" alt="image" src="https://github.com/user-attachments/assets/7e6b5fcc-2a7d-49db-91f2-efc1fba49c5d" />


---

### Student Enrollment
Students join subjects using a teacher-provided subject code. Once enrolled, they get access to all uploaded materials and AI features for that subject.

<img width="1855" height="990" alt="image" src="https://github.com/user-attachments/assets/ce522b6f-f1ba-4e9b-a075-20d391877080" />


---

### Knowledge Base / ### Teacher Dashboard
Teachers can create subjects, generate subject codes, and share them with students. Upload lecture materials (PDFs, documents) per subject and organize them into chapters.
Browse and manage all uploaded lecture files per subject. Upload new documents, organize them into chapters, and delete files — all synced to Supabase Storage.

<img width="1855" height="1011" alt="image" src="https://github.com/user-attachments/assets/b00309fd-da9d-4948-becb-e30971396eaf" />


---

### AI Chat
Ask questions about your lecture content and get answers powered by Gemini. The AI has context of your uploaded materials and responds in a conversational way.

<img width="1852" height="1016" alt="image" src="https://github.com/user-attachments/assets/ef889dd2-0141-492e-87c3-dcf392ef0350" />


---

### Quiz Mode
Generate AI-powered quizzes based on your enrolled subjects. Answer multiple-choice questions and get an instant review with explanations. Results are saved in `.toon` format.

<img width="1841" height="1012" alt="image" src="https://github.com/user-attachments/assets/90eb37b6-4392-4216-aa61-70810b4ca815" />
<img width="1096" height="635" alt="image" src="https://github.com/user-attachments/assets/151eddb9-ae20-421e-9fc0-b0a62fa1a0e4" />


---

### Viva Mode
Practice oral exams with an AI interviewer. The AI asks questions based on your lecture content, listens to your responses via microphone (live WebSocket), and gives follow-up questions — simulating a real viva.

<img width="1838" height="975" alt="image" src="https://github.com/user-attachments/assets/b28676ce-90b5-440d-9c59-5bda57575a88" />



---

### Neuro Mode
*(Coming soon — visual mind-map based learning)*

---

## Project Structure

```
Lummina/
├── backend/
│   ├── routes/         # Express route handlers (gemini, viva, vivaLive)
│   ├── services/       # AI agent logic and file loaders
│   └── index.js        # Server entry point
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/ # Reusable UI components
│       ├── context/    # React context (auth, subjects, theme, toast)
│       ├── screens/    # Page-level components per feature
│       ├── services/   # Supabase and Gemini API clients
│       └── styles/     # Theme and color utilities
└── supabase/
    └── schema.sql      # Database schema
```

---

## Environment Variables Reference

### `backend/.env`

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `PORT` | Port for the Express server (default: 3001) |
| `ALLOWED_ORIGIN` | Frontend URL for CORS (default: localhost:5173) |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_BASE_URL` | Backend server URL (default: http://localhost:3001) |
