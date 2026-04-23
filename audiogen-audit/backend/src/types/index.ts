export interface User {
  id: string;
  email: string;
  passwordHash: string;
  internalScore: number;
  subscriptionId: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'pro' | 'enterprise';
  monthlyQuota: number;
  renewsAt: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  userId: string;
  text: string;
  status: JobStatus;
  characterCount: number;
  idempotencyKey?: string;
  audioUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface UsageRecord {
  id: string;
  userId: string;
  jobId: string;
  characters: number;
  recordedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
