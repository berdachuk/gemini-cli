/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
  Content,
  Part,
  FinishReason,
} from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import type { LlmRole } from '../telemetry/llmRole.js';
import { debugLogger } from '../utils/debugLogger.js';

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

/** OpenAI-compatible streaming chunk from Ollama `/v1/chat/completions`. */
interface OpenAIChatCompletionStreamChunk {
  choices?: Array<{
    delta?: { content?: string | null; role?: string | null };
    finish_reason?: string | null;
  }>;
}

function extractTextFromParts(parts: Part[]): string {
  return parts
    .filter((p) => 'text' in p)
    .reduce((acc, p) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const textPart = p as unknown as { text: string };
      return acc + textPart.text;
    }, '');
}

function convertContentsToOllamaMessages(
  contents: Content[],
  systemInstruction?: { parts: Part[] },
): OllamaMessage[] {
  const messages: OllamaMessage[] = [];

  if (systemInstruction?.parts) {
    const text = extractTextFromParts(systemInstruction.parts);
    if (text) {
      messages.push({ role: 'system', content: text });
    }
  }

  if (!contents) {
    return messages;
  }

  for (const content of contents) {
    if (content.role === 'user' && content.parts) {
      const text = extractTextFromParts(content.parts);
      if (text) {
        messages.push({ role: 'user', content: text });
      }
    } else if (content.role === 'model' && content.parts) {
      const text = extractTextFromParts(content.parts);
      if (text) {
        messages.push({ role: 'assistant', content: text });
      }
    }
  }

  return messages;
}

function convertToGenerateContentResponse(
  model: string,
  message: OllamaMessage,
  done: boolean,
): GenerateContentResponse {
  return {
    candidates: [
      {
        index: 0,
        content: {
          role: 'model',
          parts: [{ text: message.content }],
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        finishReason: (done ? 'STOP' : undefined) as unknown as FinishReason,
        citationMetadata: undefined,
        tokenCount: undefined,
      },
    ],
    usageMetadata: undefined,
    modelVersion: model,
    text: undefined,
    functionCalls: undefined,
    executableCode: undefined,
    codeExecutionResult: undefined,
    data: undefined,
    promptFeedback: undefined,
  };
}

export class OllamaContentGenerator implements ContentGenerator {
  private baseUrl: string;
  private model: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, model: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey !== 'ollama') {
      this.headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
    _role: LlmRole,
  ): Promise<GenerateContentResponse> {
    const messages = convertContentsToOllamaMessages(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      request.contents as unknown as Content[],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      request.config?.systemInstruction as unknown as
        | { parts: Part[] }
        | undefined,
    );

    const ollamaRequest: OllamaChatRequest = {
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature: request.config?.temperature,
        top_p: request.config?.topP,
        top_k: request.config?.topK,
        num_predict: request.config?.maxOutputTokens,
      },
    };

    const url = `${this.baseUrl}/v1/chat/completions`;
    debugLogger.debug(
      `Ollama generateContent URL: ${url}, model: ${this.model}`,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(ollamaRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugLogger.error(`Ollama API error: ${response.status} ${errorText}`);
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const data = (await response.json()) as unknown as {
        choices?: Array<{ message: OllamaMessage }>;
      };
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Ollama');
      }

      const msg = data.choices[0].message;
      if (!msg?.content) {
        throw new Error('No message content from Ollama');
      }

      return convertToGenerateContentResponse(
        this.model,
        {
          role: msg.role === 'system' ? 'system' : 'assistant',
          content: msg.content,
        },
        true,
      );
    } catch (error) {
      debugLogger.error('Ollama generateContent failed:', error);
      throw error;
    }
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
    _role: LlmRole,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const messages = convertContentsToOllamaMessages(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      request.contents as unknown as Content[],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      request.config?.systemInstruction as unknown as
        | { parts: Part[] }
        | undefined,
    );

    const ollamaRequest: OllamaChatRequest = {
      model: this.model,
      messages,
      stream: true,
      options: {
        temperature: request.config?.temperature,
        top_p: request.config?.topP,
        top_k: request.config?.topK,
        num_predict: request.config?.maxOutputTokens,
      },
    };

    const url = `${this.baseUrl}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(ollamaRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLogger.error(`Ollama API error: ${response.status} ${errorText}`);
      throw new Error(`Ollama API error: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from Ollama');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const model = this.model;

    async function* generate(): AsyncGenerator<GenerateContentResponse> {
      let sentStop = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) {
            continue;
          }
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') {
            if (!sentStop) {
              sentStop = true;
              yield convertToGenerateContentResponse(
                model,
                { role: 'assistant', content: '' },
                true,
              );
            }
            return;
          }
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            const data = JSON.parse(
              dataStr,
            ) as unknown as OpenAIChatCompletionStreamChunk;
            const choice = data.choices?.[0];
            const piece = choice?.delta?.content;
            if (typeof piece === 'string' && piece.length > 0) {
              yield convertToGenerateContentResponse(
                model,
                { role: 'assistant', content: piece },
                false,
              );
            }
            const fr = choice?.finish_reason;
            if (fr && !sentStop) {
              sentStop = true;
              yield convertToGenerateContentResponse(
                model,
                { role: 'assistant', content: '' },
                true,
              );
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      if (!sentStop) {
        yield convertToGenerateContentResponse(
          model,
          { role: 'assistant', content: '' },
          true,
        );
      }
    }

    return generate();
  }

  async countTokens(
    _request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    return {
      totalTokens: 0,
    };
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    throw new Error('EmbedContent not supported for Ollama');
  }
}

export function createOllamaContentGenerator(
  baseUrl: string,
  model: string,
  apiKey?: string,
): ContentGenerator {
  return new OllamaContentGenerator(baseUrl, model, apiKey);
}
