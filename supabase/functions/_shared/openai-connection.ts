import { createClient } from 'npm:@supabase/supabase-js@2';

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function encodeBase64(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value));
}

function asArrayBuffer(value: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
}

async function encryptionKey(): Promise<CryptoKey> {
  const configuredKey = Deno.env.get('OPENAI_CREDENTIALS_ENCRYPTION_KEY');
  if (!configuredKey) throw new Error('OPENAI_CREDENTIALS_ENCRYPTION_KEY não configurada.');

  const rawKey = decodeBase64(configuredKey);
  if (rawKey.length !== 32) {
    throw new Error('OPENAI_CREDENTIALS_ENCRYPTION_KEY deve conter 32 bytes em Base64.');
  }

  return crypto.subtle.importKey('raw', asArrayBuffer(rawKey), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptOpenAIKey(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(),
    asArrayBuffer(new TextEncoder().encode(value)),
  );

  return {
    encryptedKey: encodeBase64(new Uint8Array(encrypted)),
    initializationVector: encodeBase64(iv),
  };
}

async function decryptOpenAIKey(encryptedKey: string, iv: string): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(decodeBase64(iv)) },
    await encryptionKey(),
    asArrayBuffer(decodeBase64(encryptedKey)),
  );
  return new TextDecoder().decode(decrypted);
}

async function getAuthenticatedContext(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Configuração do Supabase incompleta nas Edge Functions.');
  }
  if (!authorization) {
    throw new Error('Não autenticado.');
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) throw new Error('Não autenticado.');

  return {
    user: { id: data.user.id },
    admin: createClient(supabaseUrl, serviceRoleKey),
  };
}

export async function getOpenAIKeyForRequest(req: Request): Promise<{
  apiKey: string | null;
  error?: string;
  status?: number;
}> {
  try {
    const { user, admin } = await getAuthenticatedContext(req);
    const { data, error } = await admin
      .from('user_openai_connections')
      .select('encrypted_key, initialization_vector')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return { apiKey: null, error: 'Não foi possível carregar a conexão OpenAI.', status: 500 };
    if (!data) return { apiKey: null };

    return {
      apiKey: await decryptOpenAIKey(data.encrypted_key, data.initialization_vector),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao validar a conexão OpenAI.';
    return {
      apiKey: null,
      error: message,
      status: message === 'Não autenticado.' ? 401 : 500,
    };
  }
}

export async function getUserAdminContext(req: Request) {
  return getAuthenticatedContext(req);
}
