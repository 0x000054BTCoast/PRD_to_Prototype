const DEFAULT_DEEPSEEK_ENDPOINT = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

export interface DeepseekClientOptions {
  endpoint?: string;
  model?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface DeepseekChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepseekChatOptions {
  messages: DeepseekChatMessage[];
  temperature?: number;
  timeoutMs?: number;
}

interface DeepseekChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export interface DeepseekClient {
  readonly endpoint: string;
  readonly model: string;
  isAvailable: () => Promise<boolean>;
  chat: (options: DeepseekChatOptions) => Promise<string>;
}

function withTimeout(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  globalThis.setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function createDeepseekClient(options: DeepseekClientOptions = {}): DeepseekClient {
  const endpoint = (options.endpoint ?? DEFAULT_DEEPSEEK_ENDPOINT).replace(/\/+$/, '');
  const model = options.model ?? DEFAULT_DEEPSEEK_MODEL;
  const apiKey = options.apiKey ?? import.meta.env.VITE_DEEPSEEK_API_KEY ?? '';
  const timeoutMs = options.timeoutMs ?? 5000;

  async function isAvailable(): Promise<boolean> {
    if (!apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: withTimeout(timeoutMs),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async function chat(chatOptions: DeepseekChatOptions): Promise<string> {
    if (!apiKey) {
      throw new Error('DeepSeek API key is missing. Set VITE_DEEPSEEK_API_KEY.');
    }

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: chatOptions.temperature ?? 0,
        response_format: { type: 'json_object' },
        messages: chatOptions.messages,
      }),
      signal: withTimeout(chatOptions.timeoutMs ?? 15000),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed with status ${response.status}.`);
    }

    const payload = await safeJson<DeepseekChatResponse>(response);
    const text = payload?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error('DeepSeek returned an empty response.');
    }

    return text;
  }

  return {
    endpoint,
    model,
    isAvailable,
    chat,
  };
}

export const defaultDeepseekClient = createDeepseekClient();
