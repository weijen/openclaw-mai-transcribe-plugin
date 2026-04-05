const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const { transcribeAudio } = require("../lib/api");

describe("transcribeAudio", () => {
  let server;
  let serverPort;
  let origRequest;

  beforeEach(async () => {
    server = http.createServer((req, res) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks).toString();

        if (req.headers["ocp-apim-subscription-key"] !== "test-key") {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Unauthorized" } }));
          return;
        }

        if (!body.includes("mai-transcribe-1")) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Missing model" } }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            combinedPhrases: [{ text: "你好世界" }],
            phrases: [
              {
                offset: 0,
                duration: 1500,
                text: "你好世界",
                confidence: 0.95,
              },
            ],
          }),
        );
      });
    });

    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        resolve();
      });
    });

    // Redirect https.request to local http server
    origRequest = require("https").request;
    require("https").request = (opts, cb) => {
      opts.hostname = "127.0.0.1";
      opts.port = serverPort;
      return http.request(opts, cb);
    };
  });

  afterEach(() => {
    require("https").request = origRequest;
    server.close();
  });

  it("transcribes audio successfully", async () => {
    const result = await transcribeAudio({
      region: "eastus",
      apiVersion: "2025-10-15",
      model: "mai-transcribe-1",
      apiKey: "test-key",
      audioBuffer: Buffer.from("fake-audio-data"),
      mimeType: "audio/wav",
      fileName: "test.wav",
    });
    assert.equal(result.text, "你好世界");
    assert.equal(result.confidence, 0.95);
    assert.equal(result.language, "unknown");
  });

  it("falls back to joined phrases when combinedPhrases is empty", async () => {
    // Override server to return phrases only
    server.removeAllListeners("request");
    server.on("request", (req, res) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            combinedPhrases: [],
            phrases: [
              { text: "Hello", confidence: 0.9 },
              { text: "world", confidence: 0.8 },
            ],
            language: "en-US",
          }),
        );
      });
    });

    const result = await transcribeAudio({
      region: "eastus",
      apiVersion: "2025-10-15",
      model: "mai-transcribe-1",
      apiKey: "test-key",
      audioBuffer: Buffer.from("fake"),
      mimeType: "audio/wav",
      fileName: "test.wav",
    });
    assert.equal(result.text, "Hello world");
    assert.ok(Math.abs(result.confidence - 0.85) < 0.001);
    assert.equal(result.language, "en-US");
  });

  it("rejects on HTTP 401 error", async () => {
    await assert.rejects(
      () =>
        transcribeAudio({
          region: "eastus",
          apiVersion: "2025-10-15",
          model: "mai-transcribe-1",
          apiKey: "wrong-key",
          audioBuffer: Buffer.from("fake"),
          mimeType: "audio/wav",
          fileName: "test.wav",
        }),
      /401/,
    );
  });

  it("rejects on invalid JSON response", async () => {
    server.removeAllListeners("request");
    server.on("request", (_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("not json");
    });

    await assert.rejects(
      () =>
        transcribeAudio({
          region: "eastus",
          apiVersion: "2025-10-15",
          model: "mai-transcribe-1",
          apiKey: "test-key",
          audioBuffer: Buffer.from("fake"),
          mimeType: "audio/wav",
          fileName: "test.wav",
        }),
      /invalid JSON/,
    );
  });
});
