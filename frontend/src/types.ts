export type Region = 'North' | 'South' | 'East' | 'West';

export type Role = 'Bureau' | 'South' | 'North' | 'West' | 'East' | 'Committee';

export type TabType = 'ov' | 'ap' | 'evc' | 'un' | 'dc' | 'es' | 'lg';

export interface Institution {
  id: string;
  name: string;
  region: Region;
}

export interface Application {
  id: string;
  institution_id: string;
  route_type: string; // S, SE, ES, E, SES
  current_stage_index: number;
  age_in_days: number;
  evc_timeline_status: number;
  institution?: Institution;
}

export interface Undertaking {
  id: number;
  institution_id: string;
  condition_text: string;
  due_days: number;
  status: number; // 0=Pending, 1=Submitted, 2=Verified
  institution?: Institution;
}

export interface LeaseAndDocument {
  id: number;
  institution_id: string;
  document_type: string;
  expiry_days: number;
  status: number; // 0=Pending/Expired, 1=Submitted, 2=Renewed
  institution?: Institution;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  event_description: string;
}

export interface OverviewMetrics {
  open_applications: number;
  stage_overdue: number;
  evcs_due_soon: number;
  undertakings_at_risk: number;
  documents_expiring: number;
}

export interface AphRulesConfig {
  Scrutiny: number;
  EVC: number;
  'SAC/SHC': number;
}

