const https = require("https");

/**
 * Call the MAI-Transcribe-1 LLM Speech API.
 * Sends audio as multipart/form-data.
 * Returns { text, language, confidence }.
 */
function transcribeAudio({
  region,
  apiVersion,
  model,
  apiKey,
  audioBuffer,
  mimeType,
  fileName,
}) {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${Date.now()}${Math.random().toString(36).slice(2)}`;

    const definition = JSON.stringify({
      enhancedMode: { enabled: true, model },
    });

    // Build multipart body
    const defPart =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="definition"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      definition +
      `\r\n`;

    const audioHeader =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="audio"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`;

    const audioFooter = `\r\n--${boundary}--\r\n`;

    const headerBuf = Buffer.from(defPart + audioHeader, "utf-8");
    const footerBuf = Buffer.from(audioFooter, "utf-8");
    const body = Buffer.concat([headerBuf, audioBuffer, footerBuf]);

    const path = `/speechtotext/transcriptions:transcribe?api-version=${apiVersion}`;

    const req = https.request(
      {
        hostname: `${region}.api.cognitive.microsoft.com`,
        path,
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Length": body.length,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          let json;
          try {
            json = JSON.parse(raw);
          } catch {
            return reject(
              new Error(
                `MAI-Transcribe-1: invalid JSON response (HTTP ${res.statusCode})`,
              ),
            );
          }
          if (res.statusCode !== 200) {
            const msg = json?.error?.message || JSON.stringify(json);
            return reject(
              new Error(`MAI-Transcribe-1 HTTP ${res.statusCode}: ${msg}`),
            );
          }

          const combined = json.combinedPhrases?.[0]?.text || "";
          const phrases = json.phrases || [];
          const text = combined || phrases.map((p) => p.text).join(" ");
          const confidence =
            phrases.length > 0
              ? phrases.reduce((s, p) => s + (p.confidence || 0), 0) /
                phrases.length
              : 0;

          resolve({
            text: text.trim(),
            language: json.language || "unknown",
            confidence,
          });
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = { transcribeAudio };
