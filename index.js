const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { transcribeAudio } = require("./lib/api");

const MIME_MAP = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
};

function register(api) {
  const cfg = Object.assign(
    {
      region: "eastus",
      apiVersion: "2025-10-15",
      model: "mai-transcribe-1",
      maxFileSize: 26214400,
    },
    api.pluginConfig || {},
  );

  function resolveApiKey() {
    if (cfg.apiKey) return cfg.apiKey;
    if (api.resolveSecret) {
      const secret = api.resolveSecret("speech-api-key");
      if (secret) return secret;
    }
    return process.env.SPEECH_API_KEY || "";
  }

  api.registerTool({
    name: "mai_transcribe",
    label: "mai_transcribe",
    description:
      "Transcribe an audio file to text using MAI-Transcribe-1. " +
      "Supports 25 languages including Chinese and English. " +
      "Provide the path to an audio file (WAV, MP3, FLAC, OGG).",
    parameters: {
      type: "object",
      required: ["filePath"],
      properties: {
        filePath: {
          type: "string",
          description: "Path to the audio file to transcribe.",
        },
      },
    },
    execute: async (_toolCallId, params) => {
      const apiKey = resolveApiKey();
      if (!apiKey) {
        return {
          content: [
            { type: "text", text: "Error: Speech API key not found." },
          ],
          details: { status: "error" },
        };
      }

      let tmpPath = null;
      try {
        let audioBuffer = fs.readFileSync(params.filePath);
        let filePath = params.filePath;

        if (audioBuffer.length > cfg.maxFileSize) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Audio file too large (${audioBuffer.length} bytes, max ${cfg.maxFileSize}).`,
              },
            ],
            details: { status: "error" },
          };
        }

        const ext = path.extname(filePath).toLowerCase();
        const needsConversion = ![".wav", ".mp3", ".flac"].includes(ext);
        let tmpPath = null;

        // Convert non-WAV/MP3/FLAC formats via ffmpeg
        if (needsConversion) {
          try {
            tmpPath = `/tmp/mai-transcribe-${Date.now()}.wav`;
            execSync(
              `ffmpeg -y -i "${filePath}" -ar 16000 -ac 1 -f wav "${tmpPath}"`,
              { stdio: "pipe", timeout: 30000 },
            );
            audioBuffer = fs.readFileSync(tmpPath);
            filePath = tmpPath;
          } catch {
            // ffmpeg not available or failed — try sending original
            tmpPath = null;
          }
        }

        const mimeType = tmpPath ? "audio/wav" : (MIME_MAP[ext] || "audio/wav");
        const fileName = tmpPath ? path.basename(tmpPath) : path.basename(filePath);

        const result = await transcribeAudio({
          region: cfg.region,
          apiVersion: cfg.apiVersion,
          model: cfg.model,
          apiKey,
          audioBuffer,
          mimeType,
          fileName,
        });

        return {
          content: [{ type: "text", text: result.text }],
          details: {
            status: "ok",
            language: result.language,
            confidence: result.confidence,
          },
        };
      } catch (err) {
        return {
          content: [
            { type: "text", text: `Transcription failed: ${err.message}` },
          ],
          details: { status: "error", error: err.message },
        };
      } finally {
        if (tmpPath) try { fs.unlinkSync(tmpPath); } catch {}
      }
    },
  });

  // Instruct the agent to automatically transcribe audio attachments
  api.on(
    "before_prompt_build",
    () => ({
      appendSystemContext:
        "You have a mai_transcribe tool that transcribes audio files to text. " +
        "When you receive a voice message or audio file attachment (m4a, ogg, wav, mp3, etc.), " +
        "ALWAYS use the mai_transcribe tool with the file path to transcribe it first, " +
        "then respond to the transcribed content. " +
        "Never tell the user you cannot read audio files — use the tool instead.",
    }),
    { priority: 20 },
  );

  api.logger?.info?.(
    `mai-transcribe plugin ready: region=${cfg.region}, model=${cfg.model}`,
  );
}

module.exports = register;
