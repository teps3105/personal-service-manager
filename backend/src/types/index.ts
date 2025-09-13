export interface Profile {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  ntfy_topic: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: 'general' | 'http' | 'tcp' | 'script' | 'process' | 'api';
  status: 'active' | 'inactive' | 'completed' | 'error';
  priority: 'low' | 'medium' | 'high';
  config: Record<string, any>;
  metadata: Record<string, any>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'system' | 'ntfy' | 'email' | 'webhook';
  status: 'sent' | 'failed' | 'pending';
  priority: number;
  topic?: string;
  error_message?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface MonitoringLog {
  id: string;
  service_id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'timeout' | 'error';
  response_time?: number;
  error_message?: string;
  metadata: Record<string, any>;
}

export interface ServiceStats {
  total: number;
  active: number;
  inactive: number;
  completed: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  by_type: Record<string, number>;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  by_priority: {
    low: number;
    medium: number;
    high: number;
  };
  by_topic: Record<string, number>;
}

export interface UserActivity {
  type: 'service' | 'notification';
  action: string;
  title: string;
  timestamp: string;
  details: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  type?: Service['type'];
  status?: Service['status'];
  priority?: Service['priority'];
  config?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  type?: Service['type'];
  status?: Service['status'];
  priority?: Service['priority'];
  config?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface SendNotificationRequest {
  title: string;
  message: string;
  priority?: number;
  topic?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface UpdateUserSettingsRequest {
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  theme?: UserSettings['theme'];
  language?: string;
  timezone?: string;
  ntfy_topic?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}