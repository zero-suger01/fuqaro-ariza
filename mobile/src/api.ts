import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CitizenStatusCode } from '@/design-system/status';

// Production API is served behind the same domain as the public web app.
// EXPO_PUBLIC_API_URL can still override this for an emulator/local stack.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ariza.xron.uz';
const TOKEN_KEY = 'emurojaat_token';

export type Neighborhood = { id: string; name: string; district_id: string | null };
export type SupportContact = { phone: string | null; telegram_url: string | null };
export type ComplaintResult = { ticket_number: string; status_simple: CitizenStatusCode; track_url: string };
export type MediaAttachment = { uri: string; name: string; type: string };
export type TrackResult = {
  ticket_number: string;
  status_simple: CitizenStatusCode;
  category: { code: string; name: string };
  department: { code: string; name: string } | null;
  deadline_at: string | null;
  reply_text: string | null;
  timeline: { step: string; at: string | null; done: boolean }[];
};
export type AuthUser = { kind: 'citizen'; id: string; first_name: string; last_name: string | null; fullname: string; phone: string };
export type CitizenComplaint = { id: string; ticket_number: string; status_simple: CitizenStatusCode; category: { code: string; name: string }; department: { code: string; name: string } | null; assigned_staff: { name: string; phone: string } | null; description: string; created_at: string; deadline_at: string | null };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = 'So‘rovni bajarib bo‘lmadi';
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch { /* non-json response */ }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export const loginCitizen = async (login: string, password: string) => {
  const response = await request<{ access_token: string; user: AuthUser }>('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, password }) });
  await AsyncStorage.setItem(TOKEN_KEY, response.access_token);
  return response.user;
};
export const registerCitizen = async (data: { first_name: string; last_name: string; phone: string; password: string }) => {
  const response = await request<{ access_token: string; user: AuthUser }>('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, language: 'uz' }) });
  await AsyncStorage.setItem(TOKEN_KEY, response.access_token);
  return response.user;
};
export const requestCitizenOtp = (phone: string) =>
  request<{ detail: string }>('/api/auth/citizen/request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
export const verifyCitizenOtp = (phone: string, code: string) =>
  request<{ verified: boolean }>('/api/auth/citizen/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code }) });
export const getMe = () => request<AuthUser>('/api/auth/me');
export const getMyComplaints = () => request<CitizenComplaint[]>('/api/citizen/complaints');
export const logoutCitizen = () => AsyncStorage.removeItem(TOKEN_KEY);

export const getNeighborhoods = () => request<Neighborhood[]>('/api/public/neighborhoods');
export const getSupport = () => request<SupportContact>('/api/public/support');
export const trackComplaint = (ticket: string) =>
  request<TrackResult>(`/api/public/complaints/track?ticket=${encodeURIComponent(ticket)}`);

export async function submitComplaint(data: {
  description: string;
  firstName: string;
  lastName: string;
  phone: string;
  neighborhoodId: string;
  latitude?: number;
  longitude?: number;
  images?: MediaAttachment[];
  video?: MediaAttachment | null;
  audio?: MediaAttachment | null;
}): Promise<ComplaintResult> {
  const form = new FormData();
  form.append('description', data.description);
  form.append('first_name', data.firstName);
  form.append('last_name', data.lastName);
  form.append('phone', data.phone);
  form.append('language', 'uz');
  form.append('source', 'mobile');
  form.append('neighborhood_id', data.neighborhoodId);
  if (data.latitude != null) form.append('latitude', String(data.latitude));
  if (data.longitude != null) form.append('longitude', String(data.longitude));
  data.images?.forEach((file) => form.append('images', file as unknown as Blob));
  if (data.video) form.append('video', data.video as unknown as Blob);
  if (data.audio) form.append('audio', data.audio as unknown as Blob);
  return request<ComplaintResult>('/api/public/complaints', { method: 'POST', body: form });
}
