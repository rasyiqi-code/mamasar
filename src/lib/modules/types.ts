export interface Zone {
  id: number;
  name: string;
  slug: string;
}

export type UserRole = 'pcnu' | 'mwcnu' | 'ranting' | 'warga';
export type AgentStatus = 'none' | 'pending' | 'pending_mwcnu' | 'active' | 'rejected';

export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  agent_status: AgentStatus;
  assigned_zone_id?: number;
  assigned_zone_name?: string;
  agent_ranting?: string;
  agent_org?: string;
  agent_phone?: string;
  created_at: string;
}

export interface PendingPetugasRow {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  agent_phone?: string | null;
  agent_ranting?: string | null;
  agent_org?: string | null;
  agent_status: AgentStatus;
  requested_role: 'ranting' | 'mwcnu';
  assigned_zone_id?: number | null;
  zone_name?: string | null;
  created_at: string;
}

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  agent_status: AgentStatus;
  assigned_zone_id?: number | null;
  zone_name?: string | null;
  agent_ranting?: string | null;
  agent_org?: string | null;
  agent_phone?: string | null;
  umkm_id?: number | null;
  umkm_name?: string | null;
  is_env_superadmin: boolean;
  is_pending_login: boolean;
  created_at: string;
}

export interface UMKM {
  id: number;
  user_id?: number;
  name: string;
  phone: string;
  zone_id: number;
  zone_name?: string;
  zone_slug?: string;
  ranting?: string;
  is_verified: number;
  address?: string;
  nib?: string;
  halal_cert?: string;
  pirt?: string;
  bpom?: string;
  other_legalities?: string;
  bump_credits?: number;
  claimed_at?: string;
  created_at?: string;
}

export interface Product {
  id: number;
  umkm_id: number;
  umkm_name: string;
  umkm_phone: string;
  umkm_address: string;
  umkm_ranting?: string;
  umkm_nib?: string;
  umkm_halal_cert?: string;
  umkm_pirt?: string;
  umkm_bpom?: string;
  is_verified: number;
  zone_id: number;
  zone_name: string;
  zone_slug: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  category: string;
  image_url: string;
  gallery_images?: string[];
  description: string;
  views?: number;
  is_sold_out?: number;
  stock_status?: string;
  production_capacity?: string;
  is_featured?: number;
  featured_until?: string;
  bumped_at?: string;
  shopee_url?: string;
  created_at: string;
}

export interface AdPromotion {
  id: number;
  umkm_id: number;
  product_id?: number | null;
  product_name?: string;
  product_slug?: string;
  umkm_name?: string;
  user_id: number;
  user_email?: string;
  type: string;
  amount: number;
  payment_method: string;
  proof_image_url?: string | null;
  status: 'pending' | 'active' | 'rejected' | 'expired';
  notes?: string | null;
  starts_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface CashbookEntry {
  id: number;
  user_id: number;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  notes?: string;
  transaction_date: string;
  created_at: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  category: string;
  image_url: string;
  summary: string;
  content?: string;
  created_at: string;
}

export interface EventItem {
  id: number;
  zone_id: number;
  zone_name: string;
  zone_slug: string;
  title: string;
  slug: string;
  organizer: string;
  event_date: string;
  time_description: string;
  location_name: string;
  location_address?: string;
  estimated_attendance: number;
  consumption_needed?: string;
  allow_stalls: number;
  coordinator_name?: string;
  coordinator_phone: string;
  created_at: string;
}

export interface ClaimCandidate {
  id: number;
  name: string;
  zone_name: string;
}

export type SetupUMKMResult =
  | { outcome: 'linked'; storeId: number; claimed: boolean }
  | { outcome: 'claim_available'; candidate: ClaimCandidate }
  | { outcome: 'claim_failed' };

export interface UMKMVerificationRow {
  id: number;
  name: string;
  phone: string;
  address?: string;
  ranting?: string;
  is_verified: number;
  zone_id: number;
  zone_name: string;
  zone_slug: string;
  owner_email?: string;
  product_count: number;
  created_at: string;
}
