import { logger } from "../logger";

// Manages bidirectional WebSocket connection for: Deepgram STT (real-time transcription), Backend processing (LLM + TTS), Audio chunk streaming

export interface VoiceWebSocketConfig {
  callId: string;
  agentId: string;
  userId: string;
  onTranscriptPartial?: (text: string) => void;
  onTranscriptFinal?: (text: string) => void;
  onLLMToken?: (token: string) => void;
  onAudioChunk?: (chunk: string) => void;
  onResponseComplete?: (text: string) => void;
  onError?: (error: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class RealTimeVoiceClient {
  private config: VoiceWebSocketConfig;
  private deepgramSocket: WebSocket | null = null;
  private processingEventSource: EventSource | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private processingTimeoutId: NodeJS.Timeout | null = null;
  private isActive = false;
  private isProcessing = false;

  constructor(config: VoiceWebSocketConfig) {
    this.config = config;
  }

  //Start real-time voice streaming

  async startStreaming(audioStream: MediaStream): Promise<void> {
    if (this.isActive) {
      logger.warn("Streaming already active");
      return;
    }

    this.isActive = true;
    this.config.onConnectionChange?.(true);

    // Connect to Deepgram for STT
    await this.connectDeepgram(audioStream);
  }

  // Abort/interrupt current processing
  // Called when user speaks while agent is responding

  abortProcessing(): void {
    logger.log("Aborting backend processing...");

    // Close active SSE stream to stop backend processing
    if (this.processingEventSource) {
      this.processingEventSource.close();
      this.processingEventSource = null;
      logger.log("SSE stream closed, backend will stop");
    }

    // Reset processing flag
    this.isProcessing = false;
  }

  // Stop all streaming

  stopStreaming(): void {
    this.isActive = false;

    // Close Deepgram connection
    if (this.deepgramSocket) {
      if (this.deepgramSocket.readyState === WebSocket.OPEN) {
        this.deepgramSocket.close();
      }
      this.deepgramSocket = null;
    }

    // Stop audio processing
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }

    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear keep-alive
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    // Close processing stream
    if (this.processingEventSource) {
      this.processingEventSource.close();
      this.processingEventSource = null;
    }

    this.config.onConnectionChange?.(false);
  }

  // Connect to Deepgram WebSocket for real-time STT using raw WebSocket API

  private async connectDeepgram(audioStream: MediaStream): Promise<void> {
    logger.log("Connecting to Deepgram WebSocket...");

    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_DEEPGRAM_API_KEY not configured");
    }

    // Use Deepgram's WebSocket endpoint with linear16 PCM encoding
    const params = new URLSearchParams({
      model: "nova-2",
      language: "en",
      smart_format: "true",
      interim_results: "true",
      punctuate: "true",
      endpointing: "100", // Reduced from 300ms for faster response (was too long)
      encoding: "linear16",
      sample_rate: "16000",
      channels: "1",
    });

    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    logger.log("Connecting with PCM audio...");

    this.deepgramSocket = new WebSocket(wsUrl, ["token", apiKey]);

    this.deepgramSocket.onopen = () => {
      logger.log("Deepgram WebSocket connected");
      this.config.onConnectionChange?.(true);

      // Start sending audio chunks using PCM
      this.startAudioRecording(audioStream);

      // Keep-alive ping
      this.keepAliveInterval = setInterval(() => {
        if (
          this.deepgramSocket &&
          this.deepgramSocket.readyState === WebSocket.OPEN
        ) {
          this.deepgramSocket.send(JSON.stringify({ type: "KeepAlive" }));
        }
      }, 5000);
    };

    this.deepgramSocket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        logger.log("Deepgram WebSocket message:", {
          type: data.type,
          speech_final: data.speech_final,
        });

        // Handle transcript results
        if (data.type === "Results") {
          const transcript =
            data.channel?.alternatives?.[0]?.transcript?.trim() || "";
          const isSpeechFinal = data.speech_final === true;

          logger.log("Transcript:", {
            text: transcript.substring(0, 50),
            isSpeechFinal,
            isProcessing: this.isProcessing,
          });

          if (!transcript) {
            return;
          }

          // Partial results (user still speaking)
          if (!isSpeechFinal) {
            const status = this.isProcessing
              ? "BLOCKED already processing"
              : "OK to process";
            logger.log("Partial transcript user still speaking: " + status);
            this.config.onTranscriptPartial?.(transcript);
          }
          // Final result (user finished speaking)
          else {
            logger.log("SPEECH_FINAL RECEIVED", {
              transcript: transcript.substring(0, 50),
              isProcessing: this.isProcessing,
            });

            if (this.isProcessing) {
              logger.log("Already processing previous request, skipping");
              return;
            }

            this.isProcessing = true;
            logger.log("Setting isProcessing true");
            this.config.onTranscriptFinal?.(transcript);

            try {
              // Send to backend for processing
              logger.log("Calling processTranscript");
              await this.processTranscript(transcript);
            } finally {
              logger.log("Setting isProcessing false");
              this.isProcessing = false;
            }
          }
        } else {
          logger.log("Non-Results message from Deepgram", { type: data.type });
        }
      } catch (error) {
        logger.error("Deepgram message error: ", error);
        this.isProcessing = false;
      }
    };

    this.deepgramSocket.onerror = (error) => {
      logger.error("Deepgram WebSocket error: ", error);
      this.config.onError?.("Deepgram connection error");
    };

    this.deepgramSocket.onclose = (event) => {
      logger.log("Deepgram WebSocket closed", {
        code: event.code,
        reason: event.reason || "No reason",
        wasClean: event.wasClean,
      });

      this.config.onConnectionChange?.(false);

      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
    };
  }

  /**
   * Start recording and sending audio to Deepgram using PCM format
   */
  private startAudioRecording(stream: MediaStream): void {
    try {
      // Create Audio Context with 16kHz sample rate (Deepgram compatible)
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({
        sampleRate: 16000,
      });

      // Create media stream source
      this.audioSource = this.audioContext.createMediaStreamSource(stream);

      // Create script processor for raw audio access
      // Buffer size 2048 provides good balance between latency and performance
      this.audioProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.audioProcessor.onaudioprocess = (e) => {
        if (
          !this.deepgramSocket ||
          this.deepgramSocket.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        // Get audio data (float32 -1.0 to 1.0)
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert float32 to int16 PCM (linear16 format)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp to -1.0 to 1.0 range
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          // Convert to 16-bit PCM
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Send PCM data to Deepgram
        this.deepgramSocket.send(pcmData.buffer);
      };

      // Connect audio pipeline
      this.audioSource.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);

      logger.log("Audio recording started PCM 16kHz");
    } catch (error) {
      logger.error("Failed to start audio recording: ", error);
      this.config.onError?.(`Audio recording failed: ${error}`);
    }
  }

  /**
   * Send transcript to backend for LLM + TTS processing
   */
  private async processTranscript(transcript: string): Promise<void> {
    try {
      logger.log("Sending transcript to backend", {
        text: transcript.substring(0, 50),
      });

      // Clear any previous timeout
      if (this.processingTimeoutId) {
        clearTimeout(this.processingTimeoutId);
      }

      // Set safety timeout - reset isProcessing after 30 seconds if request hangs
      this.processingTimeoutId = setTimeout(() => {
        logger.warn("Processing timeout! Resetting isProcessing flag");
        this.isProcessing = false;
      }, 30000);

      // Close previous processing stream if exists
      if (this.processingEventSource) {
        this.processingEventSource.close();
      }

      // Create SSE connection for backend processing
      const url = new URL("/api/voice/websocket", window.location.origin);
      url.searchParams.set("callId", this.config.callId);
      url.searchParams.set("agentId", this.config.agentId);

      logger.log("Fetching from", { url: url.toString() });

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId: this.config.callId,
          agentId: this.config.agentId,
          transcription: transcript,
        }),
      });

      logger.log("Backend response status", { status: response.status });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }

      // Read SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      logger.log("SSE stream opened, starting to read events");

      let buffer = ""; // Buffer for incomplete events across chunks
      let eventType = "message"; // Persist across chunks
      let eventData = ""; // Persist across chunks

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logger.log("SSE stream completed");
          break;
        }

        const chunk = decoder.decode(value);
        logger.log("Raw SSE chunk received", {
          chunk: chunk.substring(0, 200),
        });

        // Add to buffer
        buffer += chunk;

        // Process complete events from buffer
        const lines = buffer.split("\n");

        // Keep the last incomplete line in buffer (in case it continues in next chunk)
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];

          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
            logger.log("Event type detected", { eventType });
          } else if (line.startsWith("data:")) {
            eventData = line.slice(5).trim();
            logger.log("Event data", {
              eventData: eventData.substring(0, 100),
            });
          } else if (line === "") {
            // End of event - blank line marks end
            if (eventData) {
              logger.log("Handling event", { eventType });
              this.handleProcessingEvent(eventType, eventData);
            }
            eventType = "message";
            eventData = "";
          } else if (line.trim().length > 0) {
            // Continuation of previous data (for very long values that span chunks)
            logger.log("Appending to previous eventData", {
              line: line.substring(0, 80),
            });
            eventData += line;
          }
        }
      }
    } catch (error) {
      logger.error("Processing error: ", error);
      this.config.onError?.("Failed to process transcript");
    } finally {
      // Clear the safety timeout
      if (this.processingTimeoutId) {
        clearTimeout(this.processingTimeoutId);
        this.processingTimeoutId = null;
      }
    }
  }

  // Handle events from backend processing stream

  private handleProcessingEvent(eventType: string, data: string): void {
    try {
      const parsed = JSON.parse(data);
      logger.log("Handling event", {
        eventType,
        dataKeys: Object.keys(parsed),
      });

      switch (eventType) {
        case "transcript_final":
          logger.log("transcript_final", { text: parsed.text });
          // Already handled by Deepgram
          break;

        case "llm_token":
          logger.log("llm_token", { token: parsed.token });
          this.config.onLLMToken?.(parsed.token);
          break;

        case "audio_chunk":
          logger.log("audio_chunk received", {
            length: parsed.chunk?.length || "unknown",
          });
          this.config.onAudioChunk?.(parsed.chunk);
          break;

        case "response_complete":
          logger.log("response_complete", {
            text: parsed.text?.substring(0, 50),
          });
          this.config.onResponseComplete?.(parsed.text);
          break;

        case "error":
          logger.error("error event", { error: parsed.error });
          this.config.onError?.(parsed.error);
          break;

        default:
          logger.warn("Unknown event type", { eventType });
      }
    } catch (error) {
      logger.error("Event parsing error", {
        error,
        data: data?.substring(0, 100),
      });
    }
  }

  /**
   * Check if streaming is active
   */
  isStreaming(): boolean {
    return this.isActive;
  }
}
