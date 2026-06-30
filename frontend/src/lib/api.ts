import axios, { AxiosError } from "axios";
import type {
  AlertCreate,
  AppSettings,
  BulkAddResult,
  BulkDeleteRequest,
  BulkDeleteResponse,
  InventoryCreate,
  InventoryItem,
  InventorySummary,
  InventoryUpdate,
  ItemSearchResult,
  ItemsPage,
  LoginRequest,
  NotificationsResponse,
  PriceAlert,
  PriceHistoryPoint,
  PriceSnapshot,
  PriceStatus,
  RefreshResponse,
  RegisterRequest,
  SeedResponse,
  TokenResponse,
  UserResponse,
  InventoryBulkCreate,
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
        window.location.href = "/login";
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
    api.post<TokenResponse>("/auth/register", data),
  login: (data: LoginRequest) =>
    api.post<TokenResponse>("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<UserResponse>("/auth/me"),
  resetPassword: (data: any) => api.put("/auth/password", data),
  deleteAccount: () => api.delete("/auth/account"),
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

export default api;
