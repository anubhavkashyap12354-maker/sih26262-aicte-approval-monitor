import type { Application, Undertaking, LeaseAndDocument, AuditLog, OverviewMetrics, Role, AphRulesConfig } from './types';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && !import.meta.env.DEV
    ? window.location.origin
    : 'http://localhost:8000');

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return true;
    const fallback = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return fallback.ok;
  } catch {
    return false;
  }
}
export const checkHealth = checkBackendHealth;

export async function fetchOverviewMetrics(role?: Role | string): Promise<OverviewMetrics> {
  const url = new URL(`${API_BASE}/api/overview-metrics`);
  if (role) url.searchParams.append('role', role);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch overview metrics');
  return res.json();
}
export const getOverviewMetrics = fetchOverviewMetrics;

type RoleOrParams = Role | string | { role?: string; region?: string };

export async function fetchApplications(roleOrParams?: RoleOrParams, regionParam?: string): Promise<Application[]> {
  const url = new URL(`${API_BASE}/api/applications`);
  if (typeof roleOrParams === 'object' && roleOrParams !== null) {
    if (roleOrParams.role) url.searchParams.append('role', roleOrParams.role);
    if (roleOrParams.region) url.searchParams.append('region', roleOrParams.region);
  } else {
    if (roleOrParams) url.searchParams.append('role', roleOrParams);
    if (regionParam) url.searchParams.append('region', regionParam);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
}
export const getApplications = fetchApplications;

export async function advanceApplication(appId: string, actor: string = 'Bureau officer'): Promise<Application> {
  const res = await fetch(`${API_BASE}/api/applications/${appId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to advance application');
  return res.json();
}

export async function revertApplication(appId: string, reason: string = 'Deficiency', actor: string = 'Bureau officer'): Promise<Application> {
  const res = await fetch(`${API_BASE}/api/applications/${appId}/revert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, actor }),
  });
  if (!res.ok) throw new Error('Failed to revert application');
  return res.json();
}
export const returnApplication = revertApplication;

export async function fetchUndertakings(roleOrParams?: RoleOrParams): Promise<Undertaking[]> {
  const url = new URL(`${API_BASE}/api/undertakings`);
  if (typeof roleOrParams === 'object' && roleOrParams !== null) {
    if (roleOrParams.role) url.searchParams.append('role', roleOrParams.role);
    if (roleOrParams.region) url.searchParams.append('region', roleOrParams.region);
  } else if (roleOrParams) {
    url.searchParams.append('role', roleOrParams);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch undertakings');
  return res.json();
}
export const getUndertakings = fetchUndertakings;

export async function uploadUndertaking(id: number, actor: string = 'Institution'): Promise<Undertaking> {
  const res = await fetch(`${API_BASE}/api/undertakings/${id}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to upload undertaking evidence');
  return res.json();
}

export async function verifyUndertaking(id: number, actor: string = 'Bureau officer'): Promise<Undertaking> {
  const res = await fetch(`${API_BASE}/api/undertakings/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to verify undertaking');
  return res.json();
}

export async function actionUndertaking(id: number, actor: string = 'Bureau officer'): Promise<Undertaking> {
  const res = await fetch(`${API_BASE}/api/undertakings/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to update undertaking');
  return res.json();
}

export async function fetchLeasesAndDocuments(roleOrParams?: RoleOrParams): Promise<LeaseAndDocument[]> {
  const url = new URL(`${API_BASE}/api/documents`);
  if (typeof roleOrParams === 'object' && roleOrParams !== null) {
    if (roleOrParams.role) url.searchParams.append('role', roleOrParams.role);
    if (roleOrParams.region) url.searchParams.append('region', roleOrParams.region);
  } else if (roleOrParams) {
    url.searchParams.append('role', roleOrParams);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}
export const getLeasesAndDocuments = fetchLeasesAndDocuments;

export async function uploadDocument(id: number, actor: string = 'Institution'): Promise<LeaseAndDocument> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to upload document');
  return res.json();
}

export async function verifyDocument(id: number, actor: string = 'Bureau officer'): Promise<LeaseAndDocument> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to verify and renew document');
  return res.json();
}

export async function actionLeaseAndDocument(id: number, actor: string = 'Bureau officer'): Promise<LeaseAndDocument> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to update document');
  return res.json();
}
export const actionDocument = actionLeaseAndDocument;

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/api/audit-logs`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}
export const getAuditLogs = fetchAuditLogs;

export async function runAlertSweep(actor: string = 'Bureau officer'): Promise<{ status: string; alerts_count: number; alerts: any[] }> {
  const res = await fetch(`${API_BASE}/api/triggers/alert-sweep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) throw new Error('Failed to execute alert sweep');
  return res.json();
}

export async function resetDatabase(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/seed?force=true`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset and seed database');
}

export async function getAphRules(): Promise<AphRulesConfig> {
  const res = await fetch(`${API_BASE}/api/config/aph-rules`);
  if (!res.ok) throw new Error('Failed to fetch APH rules');
  return res.json();
}

export async function updateAphRules(rules: AphRulesConfig, actor: string = 'Bureau officer'): Promise<AphRulesConfig> {
  const res = await fetch(`${API_BASE}/api/config/aph-rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Scrutiny: rules.Scrutiny,
      EVC: rules.EVC,
      'SAC/SHC': rules['SAC/SHC'],
      actor,
    }),
  });
  if (!res.ok) throw new Error('Failed to update APH rules');
  return res.json();
}

export async function downloadPendencyReportCsv(role?: string, region?: string): Promise<void> {
  const url = new URL(`${API_BASE}/api/reports/pendency-csv`);
  if (role && role !== 'Bureau') url.searchParams.append('role', role);
  if (region) url.searchParams.append('region', region);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to download pendency CSV');
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `AICTE_Pendency_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

export default {
  getApplications,
  fetchApplications,
  advanceApplication,
  revertApplication,
  returnApplication,
  getUndertakings,
  fetchUndertakings,
  uploadUndertaking,
  verifyUndertaking,
  actionUndertaking,
  getLeasesAndDocuments,
  fetchLeasesAndDocuments,
  uploadDocument,
  verifyDocument,
  actionDocument,
  actionLeaseAndDocument,
  getAuditLogs,
  fetchAuditLogs,
  runAlertSweep,
  getOverviewMetrics,
  fetchOverviewMetrics,
  checkHealth,
  checkBackendHealth,
  resetDatabase,
  getAphRules,
  updateAphRules,
  downloadPendencyReportCsv,
};

