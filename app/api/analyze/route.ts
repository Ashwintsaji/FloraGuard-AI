import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Ensure this route always runs on the Node.js runtime (needed for Buffer /
// larger request bodies) rather than the Edge runtime.
export const runtime = "nodejs";
// Never cache a diagnostic result.
export const dynamic = "force-dynamic";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const SYSTEM_PROMPT = `You are FloraGuard AI, an expert plant pathologist, botanist, and horticultural
diagnostician. You analyze a single photo of a leaf, stem, or whole plant and produce a
careful, practical diagnostic report.

STEP 1 — GATEKEEPING (do this silently before writing the report):
Check whether the image actually contains a plant, leaf, stem, or crop, and whether it is
clear enough (in focus, adequately lit, close enough) to make a diagnosis.
- If the image contains NO plant material at all, respond with ONLY this single line and
  nothing else:
  NOT_ANALYZABLE: The photo doesn't appear to show a plant, leaf, or stem. Please upload a clear photo of the plant you'd like analyzed.
- If a plant IS visible but the image is too blurry, too dark, too distant, or otherwise not
  usable for a confident diagnosis, respond with ONLY this single line and nothing else:
  NOT_ANALYZABLE: The photo is too blurry/unclear for a reliable diagnosis. Try retaking it in good, even light with the affected area filling the frame.

STEP 2 — IF THE IMAGE IS ANALYZABLE, respond with a full report in clean GitHub-flavored
Markdown, using exactly these six "##" sections, in this order, with these exact headings:

## 🌿 Plant Identification
State the most likely species and common name. If you are not fully certain, say so and
give your best estimate with a brief note on confidence.

## 🏥 Health Status
State clearly whether the plant looks **Healthy** or **Diseased / Pest-Affected**. One or
two sentences of overall assessment.

## 🔬 Disease Name & Severity
If diseased or pest-affected: name the specific disease, pathogen, or pest, and rate
severity as one of **Low**, **Moderate**, or **Severe**, with a one-line justification.
If healthy, state "No disease detected" and rate severity as **None**.

## 🔍 Detected Symptoms
A bullet list of the specific visual symptoms you observed (spots, discoloration,
wilting, lesions, webbing, holes, mold, etc.) and where on the plant they appear. If
healthy, briefly note the positive indicators you observed instead.

## 💊 Treatment Plan
Two clearly-labeled sub-lists:
- **Organic / Natural remedies**
- **Chemical options**
If the plant is healthy, say so and give general maintenance guidance instead.

## 🛡️ Prevention & Care Tips
A bullet list of forward-looking prevention and care practices (watering, spacing,
sunlight, soil, sanitation, monitoring, etc.).

RULES:
- Never invent a false diagnosis. If uncertain, say so plainly and hedge appropriately.
- Always include a short one-line disclaimer at the very end of the report, on its own line,
  in italics: "*This AI assessment is a helpful starting point, not a substitute for a
  licensed agronomist or plant pathologist for high-value or commercial crops.*"
- Do not include any text before "## 🌿 Plant Identification" or after the final disclaimer.
- Do not wrap the whole response in a code block.`;

function missingApiKeyResponse() {
  return NextResponse.json(
    {
      error: "CONFIG_ERROR",
      message:
        "The server is missing a GEMINI_API_KEY. Add one to your environment (see .env.local.example) and restart the app.",
    },
    { status: 503 }
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return missingApiKeyResponse();
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Expected multipart/form-data with an 'image' field." },
      { status: 400 }
    );
  }

  const file = formData.get("image");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "NO_IMAGE", message: "No image was uploaded. Please attach a photo and try again." },
      { status: 400 }
    );
  }

  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: "UNSUPPORTED_TYPE",
        message: `Unsupported file type "${file.type || "unknown"}". Please upload a JPEG, PNG, or WEBP image.`,
      },
      { status: 415 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: "FILE_TOO_LARGE",
        message: "That image is larger than 10 MB. Please upload a smaller photo.",
      },
      { status: 413 }
    );
  }

  let base64Data: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    base64Data = Buffer.from(arrayBuffer).toString("base64");
  } catch {
    return NextResponse.json(
      { error: "READ_ERROR", message: "Couldn't read the uploaded file. Please try a different image." },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data,
              },
            },
            {
              text: "Analyze this plant photo and produce the report following the exact format and rules above.",
            },
          ],
        },
      ],
      config: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    });

    const text = response.text?.trim();

    if (!text) {
      return NextResponse.json(
        {
          error: "EMPTY_RESPONSE",
          message: "The AI didn't return a diagnosis. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    if (text.startsWith("NOT_ANALYZABLE:")) {
      const reason = text.replace("NOT_ANALYZABLE:", "").trim();
      return NextResponse.json(
        { error: "NOT_ANALYZABLE", message: reason },
        { status: 422 }
      );
    }

    return NextResponse.json({
      report: text,
      model: MODEL_NAME,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("FloraGuard analyze error:", err);

    const message = err instanceof Error ? err.message : "Unknown error";

    if (/api key/i.test(message) || /permission/i.test(message) || /401|403/.test(message)) {
      return NextResponse.json(
        {
          error: "AUTH_ERROR",
          message: "The Gemini API rejected the request — check that GEMINI_API_KEY is valid.",
        },
        { status: 401 }
      );
    }

    if (/429/.test(message) || /quota/i.test(message) || /rate/i.test(message)) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "The AI service is busy or the free-tier quota was hit. Please wait a moment and try again.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "ANALYSIS_FAILED",
        message: "Something went wrong while analyzing the photo. Please try again.",
      },
      { status: 500 }
    );
  }
}
