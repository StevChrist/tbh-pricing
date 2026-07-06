import axios, { AxiosError } from "axios";
import type {
  AlertCreate,
  AppSettings,
  BulkAddResult,
  BulkDeleteRequest,
  BulkDeleteResponse,
  ForgotPasswordRequest,
  InventoryCreate,
  InventoryItem,
  InventorySummary,
  InventoryUpdate,
  ItemSearchResult,
  ItemsPage,
  LoginRequest,
  MessageResponse,
  NotificationsResponse,
  PriceAlert,
  PriceHistoryPoint,
  PriceSnapshot,
  PriceStatus,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResendResetOtpRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  SeedResponse,
  TokenResponse,
  UserResponse,
  VerifyEmailRequest,
  VerifyResetOtpRequest,
  RequestAccountDeletionRequest,
  DeleteAccountRequest,
  InventoryBulkCreate,
  AdminUser,
  LogsResponse,
  AdminStats,
  UserDetail,
} from "@/types";

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  withCredentials: true, // send httpOnly cookie on every request
  headers: { "Content-Type": "application/json" },
});

// Response interceptor — extract backend error shape
api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthenticated (client-side only)
      if (typeof window !== "undefined") {
        const publicPaths = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password"];
        const currentPath = window.location.pathname;
        if (!publicPaths.some((path) => currentPath.startsWith(path))) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.detail) return data.detail;
    if (typeof data === "string") return data;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export function getErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.code ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<RegisterResponse>("/auth/register", data),
  login: (data: LoginRequest) =>
    api.post<TokenResponse>("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<UserResponse>("/auth/me"),
  resetPassword: (data: any) => api.put("/auth/password", data),
  deleteAccount: () => api.delete("/auth/account"),
  verifyEmail: (data: VerifyEmailRequest) =>
    api.post<MessageResponse>("/auth/verify-email", data),
  resendVerification: (data: ResendVerificationRequest) =>
    api.post<MessageResponse>("/auth/resend-verification", data),
  // Forgot password
  forgotPassword: (data: ForgotPasswordRequest) =>
    api.post<MessageResponse>("/auth/forgot-password", data),
  verifyResetOtp: (data: VerifyResetOtpRequest) =>
    api.post<MessageResponse>("/auth/verify-reset-otp", data),
  resetPasswordViaOtp: (data: ResetPasswordRequest) =>
    api.post<MessageResponse>("/auth/reset-password", data),
  resendResetOtp: (data: ResendResetOtpRequest) =>
    api.post<MessageResponse>("/auth/resend-reset-otp", data),
  // Delete account (secure with password + OTP)
  requestAccountDeletion: (data: RequestAccountDeletionRequest) =>
    api.post<MessageResponse>("/auth/request-account-deletion", data),
  deleteAccountViaOtp: (data: DeleteAccountRequest) =>
    api.post<MessageResponse>("/auth/delete-account", data),
  resendDeleteOtp: () =>
    api.post<MessageResponse>("/auth/resend-delete-otp"),
  // Edit profile (username & email)
  changeUsername: (data: { new_username: string }) =>
    api.put<MessageResponse>("/auth/username", data),
  requestEmailChange: (data: { new_email: string }) =>
    api.post<MessageResponse>("/auth/request-email-change", data),
  changeEmail: (data: { new_email: string; otp: string }) =>
    api.post<MessageResponse>("/auth/change-email", data),
  // Security & Sessions Extensions
  getSessions: () => api.get<any[]>("/auth/sessions"),
  terminateSession: (sessionId: string) => api.post<MessageResponse>(`/auth/sessions/${sessionId}/terminate`),
  terminateOtherSessions: () => api.post<MessageResponse>("/auth/sessions/terminate-others"),
  getLoginHistory: () => api.get<any[]>("/auth/login-history"),
  getSecurityEvents: () => api.get<any[]>("/auth/security-events"),
};

// ---------------------------------------------------------------------------
// Master Items
// ---------------------------------------------------------------------------

export const itemsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    rarity?: string;
    item_type?: string;
    gear_type?: string;
  }) => api.get<ItemsPage>("/items", { params }),

  browseList: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    rarity?: string;
    item_type?: string;
    gear_type?: string;
    class_type?: string;
    level?: number;
    sort_by?: string;
    sort_order?: string;
  }) => api.get<any>("/items/browse/list", { params }),

  get: (id: number) => api.get<ItemSearchResult>(`/items/${id}`),

  search: (q: string) =>
    api.get<ItemSearchResult[]>("/items/search", { params: { q } }),

  seed: () => api.post<SeedResponse>("/items/seed"),
};

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------


export const inventoryApi = {
  list: () => api.get<InventoryItem[]>("/inventory"),

  summary: () => api.get<InventorySummary>("/inventory/summary"),

  add: (data: InventoryCreate) =>
    api.post<InventoryItem>("/inventory", data),

  bulkAdd: (data: InventoryBulkCreate) =>
    api.post<BulkAddResult>("/inventory/bulk", data),

  update: (id: number, data: InventoryUpdate) =>
    api.put<InventoryItem>(`/inventory/${id}`, data),

  delete: (id: number) => api.delete(`/inventory/${id}`),

  bulkDelete: (data: BulkDeleteRequest) =>
    api.delete<BulkDeleteResponse>("/inventory", { data }),
};

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

export const pricesApi = {
  status: () => api.get<PriceStatus>("/prices/status"),

  latest: (masterItemId: number) =>
    api.get<PriceSnapshot>(`/prices/${masterItemId}`),

  history: (masterItemId: number, days = 30) =>
    api.get<PriceHistoryPoint[]>(`/prices/${masterItemId}/history`, {
      params: { days },
    }),

  refreshAll: () => api.post<RefreshResponse>("/prices/refresh"),

  refreshOne: (masterItemId: number) =>
    api.post<RefreshResponse>(`/prices/refresh/${masterItemId}`),
};

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export const alertsApi = {
  list: () => api.get<PriceAlert[]>("/alerts"),
  triggered: () => api.get<PriceAlert[]>("/alerts/triggered"),
  create: (data: AlertCreate) => api.post<PriceAlert>("/alerts", data),
  update: (id: number, data: Partial<AlertCreate>) =>
    api.put<PriceAlert>(`/alerts/${id}`, data),
  delete: (id: number) => api.delete(`/alerts/${id}`),
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationsApi = {
  list: (unreadOnly?: boolean) =>
    api.get<NotificationsResponse>("/notifications", {
      params: unreadOnly ? { unread_only: true } : undefined,
    }),
  unread: () => api.get<NotificationsResponse>("/notifications/unread"),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  delete: (id: number) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete("/notifications"),
};

// ---------------------------------------------------------------------------
// Settings + Export
// ---------------------------------------------------------------------------

export const settingsApi = {
  get: () => api.get<AppSettings>("/settings"),
  update: (data: Partial<{ refresh_interval_minutes: number; steam_request_delay_seconds: number }>) =>
    api.put<AppSettings>("/settings", data),
};

export const exportApi = {
  csv: () =>
    api.get("/export/csv", { responseType: "blob" }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "tbh_inventory.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    }),
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminApi = {
  listUsers: () => api.get<AdminUser[]>("/admin/users"),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  sendNotification: (id: number, data: { notify_type: "alert" | "message" | "notification"; message: string }) =>
    api.post(`/admin/users/${id}/notify`, data),
  listLogs: (params?: { username?: string; action?: string; limit?: number; offset?: number }) =>
    api.get<LogsResponse>("/admin/logs", { params }),
  // Enterprise User Management extensions
  getStats: () => api.get<AdminStats>("/admin/stats"),
  getUserDetail: (id: number) => api.get<UserDetail>(`/admin/users/${id}/detail`),
  suspendUser: (id: number) => api.post<MessageResponse>(`/admin/users/${id}/suspend`),
  unsuspendUser: (id: number) => api.post<MessageResponse>(`/admin/users/${id}/unsuspend`),
  banUser: (id: number) => api.post<MessageResponse>(`/admin/users/${id}/ban`),
  unbanUser: (id: number) => api.post<MessageResponse>(`/admin/users/${id}/unban`),
  forceLogout: (id: number) => api.post<MessageResponse>(`/admin/users/${id}/force-logout`),
  forcePasswordReset: (id: number) => api.post<MessageResponse>(`/admin/users/${id}/force-password-reset`),
  // Enterprise Security & Monitoring extensions
  getSecurityStats: () => api.get<any>("/admin/security/stats"),
  searchSessions: (params?: { username?: string; ip_address?: string; browser?: string; os?: string; limit?: number; offset?: number }) =>
    api.get<any>("/admin/security/sessions", { params }),
  terminateSessionAdmin: (sessionId: string) => api.post<any>(`/admin/security/sessions/${sessionId}/terminate`),
  terminateAllUserSessionsAdmin: (userId: number) => api.post<any>(`/admin/security/users/${userId}/terminate-all`),
  searchSecurityEvents: (params?: { username?: string; ip_address?: string; severity?: string; limit?: number; offset?: number }) =>
    api.get<any>("/admin/security/events", { params }),
};

export default api;
