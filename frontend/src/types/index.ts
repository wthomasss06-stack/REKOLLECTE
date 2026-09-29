export type FieldType = "text" | "phone" | "email" | "number" | "date" | "select" | "checkbox" | "signature" | "photo" | "document_scan";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  identity_role?: "full_name" | "phone" | "email" | null;
  options?: string[];
  document_type?: "cni" | "passport" | "free";
  extract_fields?: ("last_name" | "first_names" | "document_number" | "birth_date" | "nationality" | "expiry_date")[];
  requires_agent_validation?: boolean;
  retain_document_image?: boolean;
}

export interface PublicFormData {
  organization_name: string;
  organization_logo_url: string;
  visit_reasons: string[];
  fields_schema: FormField[];
  form_id: string;
  form_title: string;
  access_point_id: string | null;
  access_point_name: string;
}

export interface CheckInRecord {
  id: string;
  responses: Record<string, unknown>;
  signature_blob: string | null;
  created_at_client: string;
  synced_at: string;
  client_id: string | null;
  client_name: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CheckInStats {
  total: number;
  today: number;
  peak_hour: string | null;
  hourly: { hour: number; count: number }[];
  frequent_reasons: { label: string; count: number }[];
}

export type AccountRole = "BOSS" | "GERANT" | "STAFF";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: AccountRole;
  manager_id: string | null;
  manager_name: string | null;
  organization_id: string;
  organization_name: string;
  is_active: boolean;
  access_revoked_at: string | null;
  access_revoked_reason: string;
}

export interface StaffInvitation { id: string; email: string; role: AccountRole; accepted_at: string | null; revoked_at: string | null; revoked_reason: string; created_at: string; }
export interface TeamAccess { members: UserProfile[]; invitations: StaffInvitation[]; }
export interface AuditEvent { id: string; action: string; actor_name: string | null; actor_email: string | null; target_name: string | null; target_email: string | null; metadata: Record<string, unknown>; created_at: string; }

/** Calculee cote serveur uniquement (Organization.capabilities) — le frontend ne fait
 * jamais ce calcul lui-meme, il ne fait que refleter ce que l'API renvoie. */
export interface OrganizationCapabilities {
  registration: boolean;
  karnet: boolean;
  reservations: boolean;
  payments: boolean;
  rappels: boolean;
}

export interface Organization {
  id: string;
  name: string;
  logo_url: string;
  visit_reasons: string[];
  qr_secure_token: string;
  karnet_enabled: boolean;
  capabilities: OrganizationCapabilities;
  created_at: string;
}

export type KarnetResourceUnit = "jour" | "heure" | "unite";
export type KarnetResourceBillingUnit = "hour" | "session" | "day" | "night" | "month" | "fixed";
export type KarnetResourceCategory = "accommodation" | "beauty" | "workspace" | "events" | "parking" | "leisure" | "other";

export interface KarnetClient {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  note: string;
  created_at: string;
}

/** Renvoyé uniquement par GET /karnet/clients/{id}/ — la fiche client complète
 * (phase 7) ajoute des compteurs calculés côté serveur à l'en-tête. */
export interface KarnetClientDetail extends KarnetClient {
  checkins_count: number;
  reservations_count: number;
  last_visit_at: string | null;
}

export interface KarnetResource {
  id: string;
  name: string;
  unit: KarnetResourceUnit;
  unit_display: string;
  price: string;
  is_active: boolean;
  created_at: string;
  /** Champs ResourceBuilder (catalogue par catégorie/type) — `unit` reste dérivé
   * de `billing_unit` côté serveur, jamais l'inverse (voir apps/karnet/models.py). */
  category: KarnetResourceCategory;
  category_display: string;
  resource_type: string;
  billing_unit: KarnetResourceBillingUnit | "";
  billing_unit_display: string;
  code: string;
  description: string;
  capacity: number | null;
  location: string;
  duration_label: string;
  equipment: string;
}

export type KarnetReservationStatus = "en_cours" | "terminee" | "annulee";

export interface KarnetReservation {
  id: string;
  /** Numéro lisible, séquentiel par établissement (1, 2, 3…) — celui que l'équipe
   * dicte au téléphone ou retrouve dans l'historique d'un client. */
  number: number;
  client: string;
  client_name: string;
  client_phone: string;
  resource: string;
  resource_name: string;
  resource_unit: KarnetResourceUnit;
  quantity: number;
  unit_price: string;
  total_amount: string;
  starts_at: string;
  ends_at: string | null;
  status: KarnetReservationStatus;
  is_paid: boolean;
  paid_at: string | null;
  reminder_acknowledged: boolean;
  reminder_due: boolean;
  created_at: string;
}

export interface FormTemplate { id: string; title: string; fields_schema: FormField[]; version: number; is_active: boolean; is_default: boolean; updated_at: string; }
export interface AccessPoint { id: string; name: string; device_label: string; secure_token: string; is_active: boolean; last_seen_at: string | null; created_at: string; form_template: string; form_title: string; public_url: string; }

export interface ApiErrorShape {
  error: { message: string; retryable: boolean };
}

export interface PlatformOverview { organizations: number; users: number; active_users: number; checkins_total: number; checkins_30_days: number; feedback_total: number; feedback_new: number; }
export interface PlatformFeedback { id: string; category: string; category_label: string; message: string; page_url: string; contact_email: string; user_email: string | null; organization_name: string | null; status: string; status_label: string; admin_note: string; created_at: string; updated_at: string; }
export interface PlatformMember { id: string; email: string; full_name: string; role: AccountRole; is_active: boolean; organization_id: string | null; organization_name: string | null; created_at: string; }
export interface PlatformOrganization { id: string; name: string; logo_url: string; visit_reasons: string[]; created_at: string; member_count: number; checkin_count: number; feedback_count: number; members: PlatformMember[]; }
export interface PlatformAuditEvent { id: string; organization_name: string; action: string; actor_name: string | null; actor_email: string | null; actor_role: AccountRole | null; target_name: string | null; target_email: string | null; target_role: AccountRole | null; metadata: Record<string, unknown>; created_at: string; }
