// API Client configured for both local development and Vercel production
const BASE_URL =
  import.meta.env?.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : typeof window !== 'undefined' && !import.meta.env?.DEV
    ? `${window.location.origin}/api`
    : 'http://localhost:8000/api';

/**
 * Helper to perform fetch requests with error handling
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${url}]:`, err);
    throw err;
  }
}

// ------------------- Applications API -------------------
export async function getApplications(params = {}) {
  const query = new URLSearchParams();
  if (params.region) query.append('region', params.region);
  if (params.role) query.append('role', params.role);
  const qStr = query.toString();
  return request(`/applications${qStr ? `?${qStr}` : ''}`);
}

export async function advanceApplication(id, actor = 'Bureau officer') {
  return request(`/applications/${id}/advance`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

export async function revertApplication(id, reason = 'Deficiency', actor = 'Bureau officer') {
  return request(`/applications/${id}/revert`, {
    method: 'POST',
    body: JSON.stringify({ reason, actor }),
  });
}

// ------------------- Undertakings API -------------------
export async function getUndertakings(params = {}) {
  const query = new URLSearchParams();
  if (params.region) query.append('region', params.region);
  if (params.role) query.append('role', params.role);
  const qStr = query.toString();
  return request(`/undertakings${qStr ? `?${qStr}` : ''}`);
}

export async function uploadUndertaking(id, actor = 'Institution') {
  return request(`/undertakings/${id}/upload`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

export async function verifyUndertaking(id, actor = 'Bureau officer') {
  return request(`/undertakings/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

export async function actionUndertaking(id, actor = 'Bureau officer') {
  return request(`/undertakings/${id}/action`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

// ------------------- Leases & Documents API -------------------
export async function getLeasesAndDocuments(params = {}) {
  const query = new URLSearchParams();
  if (params.region) query.append('region', params.region);
  if (params.role) query.append('role', params.role);
  const qStr = query.toString();
  return request(`/leases-and-documents${qStr ? `?${qStr}` : ''}`);
}

export async function uploadDocument(id, actor = 'Institution') {
  return request(`/leases-and-documents/${id}/upload`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

export async function verifyDocument(id, actor = 'Bureau officer') {
  return request(`/leases-and-documents/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

export async function actionDocument(id, actor = 'Bureau officer') {
  return request(`/leases-and-documents/${id}/action`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

// ------------------- Audit Logs API -------------------
export async function getAuditLogs() {
  return request('/audit-logs');
}

// ------------------- Triggers & Alerts API -------------------
export async function runAlertSweep(actor = 'Bureau officer') {
  return request('/triggers/alert-sweep', {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

// ------------------- Overview Metrics API -------------------
export async function getOverviewMetrics(params = {}) {
  const query = new URLSearchParams();
  if (params.region) query.append('region', params.region);
  if (params.role) query.append('role', params.role);
  const qStr = query.toString();
  return request(`/overview-metrics${qStr ? `?${qStr}` : ''}`);
}

// ------------------- System Health -------------------
export async function checkHealth() {
  try {
    const healthUrl = `${BASE_URL.replace(/\/api$/, '')}/api/health`;
    const res = await fetch(healthUrl);
    if (res.ok) return true;
    const fallback = await fetch('http://localhost:8000/health');
    return fallback.ok;
  } catch {
    return false;
  }
}

// ------------------- APH Rules Config -------------------
export async function getAphRules() {
  return request('/config/aph-rules');
}

export async function updateAphRules(rules, actor = 'Bureau officer') {
  return request('/config/aph-rules', {
    method: 'PUT',
    body: JSON.stringify({
      Scrutiny: rules.Scrutiny,
      EVC: rules.EVC,
      'SAC/SHC': rules['SAC/SHC'],
      actor,
    }),
  });
}

// ------------------- Pendency Report CSV -------------------
export async function downloadPendencyReportCsv(role, region) {
  const query = new URLSearchParams();
  if (role && role !== 'Bureau') query.append('role', role);
  if (region) query.append('region', region);
  const qStr = query.toString();
  const url = `${BASE_URL}/reports/pendency-csv${qStr ? `?${qStr}` : ''}`;

  const res = await fetch(url);
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
  advanceApplication,
  revertApplication,
  getUndertakings,
  uploadUndertaking,
  verifyUndertaking,
  actionUndertaking,
  getLeasesAndDocuments,
  uploadDocument,
  verifyDocument,
  actionDocument,
  getAuditLogs,
  runAlertSweep,
  getOverviewMetrics,
  checkHealth,
  getAphRules,
  updateAphRules,
  downloadPendencyReportCsv,
};

