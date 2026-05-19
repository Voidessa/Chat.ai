# Velora - AI Companion MVP

Velora is a minimal, premium MVP for an AI companion chat. It features a realistic, warm, and observant AI persona named "Mira", wrapped in a dark, high-end UI.

## Features Currently Implemented
- **Premium UI:** Dark mode aesthetic with custom gradients and micro-animations.
- **AI Integration:** Server-side route calling OpenAI-compatible APIs (e.g., `gpt-4o-mini`).
- **Resilient Fallback:** If the API fails or the key is missing, the app seamlessly falls back to a realistic local mock response.
- **Context Protection:** Limits the API payload to the last 20 messages, excluding empty ones, to save tokens and prevent context bloat.
- **Client Constraints:** Max 1000 characters per message, avoiding accidental huge token consumption.
- **Local State:** Chat history is saved in `localStorage`.

## Character Engine (Mira Engine)
- **Profile & Rules:** Mira's behavior, tone, and constraints are strictly defined in `miraProfile.ts` and `miraRules.ts`.
- **State Analysis:** The engine evaluates the user's mood and relationship stage based on the conversation history (`miraState.ts`), adapting Mira's tone dynamically.
- **Local Memory:** The system extracts facts and emotional notes from the conversation and stores them in `localStorage` (`miraMemory.ts`). Memory is used to build a dynamic context for the AI.
- **Proactive In-App Messages:** If the user stays on the page but goes silent, Mira can proactively send a message.
- **Seen & Typing Effects:** Realistic typing delays based on message length and "seen" indicators.

## Not Implemented (Out of Scope for MVP)
- Database (Supabase / Postgres)
- User Authentication & Profiles
- Payments
- Voice Output
- Image Generation
- Multiple Characters
- Admin Panel
- Analytics

## How to Run Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory based on `.env.example`:
   ```bash
   OPENAI_API_KEY=your_real_api_key_here
   AI_MODEL=gpt-4o-mini
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Open Application:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The application will fall back to local mock responses if `OPENAI_API_KEY` is not provided.
