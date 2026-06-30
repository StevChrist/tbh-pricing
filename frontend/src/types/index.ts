// ============================================================
// TypeScript interfaces matching backend Pydantic v2 schemas
// ============================================================

// --------------- Auth ---------------

export interface UserResponse {
  id: number;
  username: string;
  email: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// --------------- Master Items ---------------

export type Rarity =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Legendary"
  | "Unique"
  | "Arcana"
  | "Immortal"
  | "Beyond";

export interface MasterItem {
  id: number;
  market_hash_name: string;
  display_name: string;
  item_type: string | null;
  rarity: Rarity | null;
  gear_type: string | null;
  class_type?: string | null;
  level?: number | null;
  stats?: string | null;
  icon_url: string | null;
  created_at: string;
}

export interface ItemSearchResult {
  id: number;
  market_hash_name: string;
  display_name: string;
  rarity: Rarity | null;
  gear_type: string | null;
  icon_url: string | null;
}

export interface ItemsPage {
  items: MasterItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface SeedResponse {
  items_found: number;
  items_inserted: number;
  items_skipped: number;
}

// --------------- Prices ---------------

export type FetchStatus = "ok" | "unavailable" | "error";

export interface PriceSnapshot {
  id: number;
  master_item_id: number;
  lowest_price_idr: number | null;
  median_price_idr: number | null;
  lowest_price_usd: number | null;
  median_price_usd: number | null;
  volume: number | null;
  fetch_status: FetchStatus;
  fetched_at: string;
}

export interface PriceHistoryPoint {
  fetched_at: string;
  lowest_price_idr: number | null;
  median_price_idr: number | null;
  lowest_price_usd: number | null;
  median_price_usd: number | null;
  volume: number | null;
  fetch_status: FetchStatus;
}

export interface PriceStatus {
  last_run_at: string | null;
  next_run_at: string | null;
  is_running: boolean;
  items_refreshed_last_run: number;
  items_unavailable_last_run: number;
}

export interface RefreshResponse {
  message: string;
  items_refreshed: number;
  items_unavailable: number;
  items_error: number;
}

// --------------- Inventory ---------------

export interface InventoryItem {
  id: number;
  master_item_id: number;
  quantity: number;
  notes: string | null;
  added_at: string;
  updated_at: string;
  master_item: ItemSearchResult;
  latest_price: PriceSnapshot | null;
}

export interface InventoryCreate {
  master_item_id: number;
  quantity: number;
  notes?: string;
}

export interface InventoryUpdate {
  quantity?: number;
  notes?: string;
}

export interface InventorySummary {
  total_unique_items: number;
  total_quantity: number;
  total_value_idr: number;
  total_value_usd: number;
  highest_value_item: {
    inventory_id: number;
    master_item_id: number;
    display_name: string;
    total_value_idr: number;
  } | null;
  last_refreshed_at: string | null;
}

export interface BulkDeleteRequest {
  ids: number[];
}

export interface BulkDeleteResponse {
  deleted: number;
}

export interface BulkAddResult {
  added: InventoryItem[];
  skipped_duplicates: number[];
  errors: string[];
}

export interface InventoryBulkCreate {
  items: { master_item_id: number; quantity: number }[];
}

// --------------- Price Alerts ---------------

export type AlertType = "price_below" | "price_above" | "percent_change";
export type AlertCurrency = "IDR" | "USD";
export type AlertDirection = "up" | "down";

export interface PriceAlert {
  id: number;
  master_item_id: number;
  alert_type: AlertType;
  currency: AlertCurrency;
  target_value: number;
  direction: AlertDirection | null;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
  expires_at: string;
  item_display_name: string | null;
  item_rarity: Rarity | null;
  item_icon_url: string | null;
}

export interface AlertCreate {
  master_item_id: number;
  alert_type: AlertType;
  currency: AlertCurrency;
  target_value: number;
  direction?: AlertDirection;
}

// --------------- Notifications ---------------

export interface Notification {
  id: number;
  alert_id: number;
  master_item_id: number;
  message: string;
  triggered_price_idr: number | null;
  triggered_price_usd: number | null;
  target_value: number;
  is_read: boolean;
  created_at: string;
  item_display_name: string | null;
  item_rarity: Rarity | null;
  item_icon_url: string | null;
  alert_type: AlertType | null;
  currency: AlertCurrency | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

// --------------- Settings ---------------

export interface AppSettings {
  refresh_interval_minutes: number;
  steam_currency_idr: number;
  steam_currency_usd: number;
  steam_app_id: number;
  steam_request_delay_seconds: number;
  last_run_at: string | null;
  next_run_at: string | null;
  is_running: boolean;
  items_refreshed_last_run: number;
  items_unavailable_last_run: number;
}

// --------------- API Error ---------------

export interface ApiError {
  detail: string;
  code: string;
  field: string | null;
}
