const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.1:8b';

export interface OllamaClientOptions {
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
}

export interface OllamaGenerateOptions {
  prompt: string;
  system?: string;
  temperature?: number;
  timeoutMs?: number;
}

interface OllamaGenerateResponse {
  response?: string;
}

export interface OllamaClient {
  readonly endpoint: string;
  readonly model: string;
  isAvailable: () => Promise<boolean>;
  generate: (options: OllamaGenerateOptions) => Promise<string>;
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

export function createOllamaClient(options: OllamaClientOptions = {}): OllamaClient {
  const endpoint = (options.endpoint ?? DEFAULT_OLLAMA_ENDPOINT).replace(/\/+$/, '');
  const model = options.model ?? DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? 1200;

  async function isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        signal: withTimeout(timeoutMs),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async function generate(generateOptions: OllamaGenerateOptions): Promise<string> {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: generateOptions.prompt,
        stream: false,
        system: generateOptions.system,
        options: {
          temperature: generateOptions.temperature ?? 0.2,
        },
      }),
      signal: withTimeout(generateOptions.timeoutMs ?? 2500),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}.`);
    }

    const payload = await safeJson<OllamaGenerateResponse>(response);
    const text = payload?.response?.trim();

    if (!text) {
      throw new Error('Ollama returned an empty response.');
    }

    return text;
  }

  return {
    endpoint,
    model,
    isAvailable,
    generate,
  };
}

export const defaultOllamaClient = createOllamaClient();
