# FloraGuard AI 🌿

Plant Disease & Health Identifier — upload a photo of a leaf, stem, or whole plant and get
an instant AI-generated diagnostic report (identification, health status, disease &
severity, symptoms, treatment plan, and prevention tips), powered by Gemini Vision.

## Stack

- Next.js 14 (App Router, TypeScript, Node.js runtime)
- Tailwind CSS (custom botanical "field journal" theme)
- `@google/genai` — official Google GenAI SDK
- `gemini-2.5-flash` multimodal vision model

## Local setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and paste your key from https://aistudio.google.com/app/apikey
npm run dev
```

Open http://localhost:3000.

## Environment variables

| Variable         | Required | Description                                             |
|-------------------|----------|-----------------------------------------------------------|
| `GEMINI_API_KEY`  | Yes      | Server-side only. Never exposed to the client.            |
| `GEMINI_MODEL`    | No       | Overrides the model. Defaults to `gemini-2.5-flash`.      |

If `GEMINI_API_KEY` is missing, the app still runs — the UI shows a friendly
"server not configured" message the moment you try to analyze a photo, instead of crashing.

## Docker

```bash
docker build -t floraguard-ai .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key_here floraguard-ai
```

The image uses Next.js's `standalone` output and runs as a non-root user. It works as-is on
AWS App Runner or Render — just set `GEMINI_API_KEY` as a secret/environment variable in the
platform's dashboard and point it at this Dockerfile (port `3000`).

## API

`POST /api/analyze` — `multipart/form-data` with an `image` field (JPEG/PNG/WEBP, ≤10 MB).

Success:
```json
{ "report": "## 🌿 Plant Identification\n...", "model": "gemini-2.5-flash", "analyzedAt": "..." }
```

Error (e.g. not a plant, blurry photo, missing key, rate limit):
```json
{ "error": "NOT_ANALYZABLE", "message": "..." }
```
