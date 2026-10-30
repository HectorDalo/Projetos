import type { VisitorIdentity } from './conversation';
import type { Language } from '../content/profile';

export type Capabilities = { chat_available: boolean; voice_available: boolean; transcription_available?: boolean };
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type ChatReply = { reply: string; caption: string };
export class ChatError extends Error {
  constructor(public code: string, public status: number) { super(`Chat unavailable (${status}): ${code}`); }
}
const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export async function capabilities(signal?: AbortSignal): Promise<Capabilities> {
  const response = await fetch(`${baseUrl}/api/capabilities`, { signal });
  if (!response.ok) throw new Error('Capabilities unavailable');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('chat_available' in data) || !('voice_available' in data)
    || typeof data.chat_available !== 'boolean' || typeof data.voice_available !== 'boolean') throw new Error('Invalid capabilities');
  return { chat_available: data.chat_available, voice_available: data.voice_available, ...('transcription_available' in data && typeof data.transcription_available === 'boolean' ? {transcription_available:data.transcription_available} : {}) };
}

export async function sendMessage(messages: ChatMessage[], language: Language, signal?: AbortSignal, identity: VisitorIdentity = 'visitor'): Promise<ChatReply> {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ messages: messages.slice(-12), language, ...(identity === 'hector' ? { visitorIdentity: identity } : {}) }),
  });
  if (!response.ok) {
    let code = 'provider_unavailable';
    try { const data = await response.json(); if (typeof data?.error === 'string') code = data.error; } catch { /* non-JSON error */ }
    throw new ChatError(code, response.status);
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('reply' in data) || typeof data.reply !== 'string' || !data.reply.trim()
    || data.reply.length > 12000) throw new Error('Invalid reply');
  return { reply: data.reply, caption: 'caption' in data && typeof data.caption === 'string' ? data.caption : data.reply };
}

// Future voice adapter: a real STT/TTS provider must implement this contract.
// The current voice/dictation hooks run separately in the browser; no server voice adapter is connected.
export interface VoiceAdapter {
  transcribe(audio: Blob, language: Language, signal?: AbortSignal): Promise<{ text: string }>;
  synthesize(text: string, language: Language, signal?: AbortSignal): Promise<{ audio: Blob; caption: string }>;
}
