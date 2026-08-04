export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8001';

export type Neighborhood = { id: string; name: string; district_id: string | null };
export type SupportContact = { phone: string | null; telegram_url: string | null };
export type ComplaintResult = { ticket_number: string; status_simple: string; track_url: string };
export type MediaAttachment = { uri: string; name: string; type: string };
export type TrackResult = {
  ticket_number: string;
  status_simple: string;
  category: { code: string; name: string };
  department: { code: string; name: string } | null;
  deadline_at: string | null;
  reply_text: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    let message = 'So‘rovni bajarib bo‘lmadi';
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch { /* non-json response */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

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
