import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import api from './api';
import { ToastContainer, type ToastData } from './components/Toast';
import { AphRulesModal } from './components/AphRulesModal';
import type { AphRulesConfig } from './types';
import {
  StageDistributionDonut,
  RegionalComplianceBarChart,
  SLAComplianceGauge,
  RouteWorkflowChart,
  UrgencyBreakdownChart,
} from './components/Charts';
import {
  FileText,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  Clock,
  Download,
  Sparkles,
} from 'lucide-react';

// Route stage definitions & SLAs from original frontend
const R: Record<string, string[]> = {
  S: ['Scrutiny'],
  SE: ['Scrutiny', 'EVC'],
  ES: ['EVC', 'SAC/SHC'],
  E: ['EVC'],
  SES: ['Scrutiny', 'EVC', 'SAC/SHC'],
};

const SLA: Record<string, number> = {
  Scrutiny: 15,
  EVC: 30,
  'SAC/SHC': 20,
};

const US = ['Pending', 'Submitted', 'Verified'];

const TABS: Array<[string, string]> = [
  ['ov', 'Overview'],
  ['ap', 'Applications'],
  ['evc', 'EVC queue'],
  ['un', 'Undertakings'],
  ['dc', 'Lease & documents'],
  ['es', 'Escalations'],
  ['lg', 'Audit trail'],
];

// Fallback initial data (matching original HTML mock data)
const INITIAL_A = [
  ['A-2611', 'Nandi Institute of Technology', 'South', 'SE', 1, 24, 6],
  ['A-2612', 'Rajmata College of Engineering', 'West', 'S', 0, 17, 0],
  ['A-2613', 'Himalaya Polytechnic', 'North', 'ES', 0, 9, 12],
  ['A-2614', 'Kaveri School of Management', 'South', 'SES', 2, 22, 0],
  ['A-2615', 'Gangetic Institute of Pharmacy', 'East', 'SE', 0, 6, 0],
  ['A-2616', 'Thar Technical Campus', 'North', 'E', 0, 34, -4],
  ['A-2617', 'Konkan Architecture Institute', 'West', 'SE', 1, 12, 18],
  ['A-2618', 'Brahmaputra Engineering College', 'East', 'ES', 1, 5, 0],
  ['A-2619', 'Deccan Institute of Computing', 'South', 'S', 0, 14, 0],
  ['A-2620', 'Malwa Polytechnic', 'West', 'E', 0, 18, 26],
  ['A-2621', 'Sundarban Tech University', 'East', 'SES', 1, 27, -9],
  ['A-2622', 'Punjab Institute of Design', 'North', 'SE', 0, 3, 0],
].map((a) => ({
  id: String(a[0]),
  inst: String(a[1]),
  reg: String(a[2]),
  rt: String(a[3]),
  i: Number(a[4]),
  age: Number(a[5]),
  evc: Number(a[6]),
}));

const INITIAL_U = [
  ['Nandi Institute of Technology', 'South', 'Complete fire-safety NOC', -12, 0, 1],
  ['Himalaya Polytechnic', 'North', 'Appoint 4 faculty members', 9, 0, 2],
  ['Konkan Architecture Institute', 'West', 'Library accreditation proof', 22, 1, 3],
  ['Sundarban Tech University', 'East', 'Laboratory equipment evidence', -3, 1, 4],
  ['Malwa Polytechnic', 'West', 'Playground land mutation', 41, 0, 5],
  ['Deccan Institute of Computing', 'South', 'Deposit corpus fund', 14, 0, 6],
].map((u) => ({
  inst: String(u[0]),
  reg: String(u[1]),
  t: String(u[2]),
  d: Number(u[3]),
  s: Number(u[4]),
  id: Number(u[5]),
}));

const INITIAL_D = [
  ['Rajmata College of Engineering', 'West', 'Campus lease deed', -5, 0, 1],
  ['Thar Technical Campus', 'North', 'Campus lease deed', 12, 0, 2],
  ['Gangetic Institute of Pharmacy', 'East', 'Hostel lease', 58, 0, 3],
  ['Kaveri School of Management', 'South', 'Campus lease deed', 6, 1, 4],
  ['Punjab Institute of Design', 'North', 'Lease registration', -22, 0, 5],
  ['Brahmaputra Engineering College', 'East', 'Campus lease deed', 140, 0, 6],
].map((u) => ({
  inst: String(u[0]),
  reg: String(u[1]),
  t: String(u[2]),
  d: Number(u[3]),
  s: Number(u[4]),
  id: Number(u[5]),
}));

const INITIAL_LOG = [
  { t: '25 Oct · 09:00', who: 'System', x: 'Nightly deadline scan completed for all regions' },
];

export function App() {
  // Theme and role state
  const [theme, setTheme] = useState<'abyss' | 'daylight'>('abyss');
  const [role, setRole] = useState<string>('Bureau');
  const [tab, setTab] = useState<string>('ov');
  const [isLive, setIsLive] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback(
    (title: string, message: string, type: 'success' | 'warn' | 'info' | 'error' = 'success') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Return reasons state keyed by application ID
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});

  // Dynamic APH Rules State
  const [aphRules, setAphRules] = useState<AphRulesConfig>({
    Scrutiny: 15,
    EVC: 30,
    'SAC/SHC': 20,
  });
  const [isAphModalOpen, setIsAphModalOpen] = useState<boolean>(false);

  // Live state replacing static arrays
  const [A, setA] = useState(INITIAL_A);
  const [U, setU] = useState(INITIAL_U);
  const [D, setD] = useState(INITIAL_D);
  const [LOG, setLOG] = useState(INITIAL_LOG);

  // Three.js canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper functions from original HTML with dynamic APH SLAs
  const stage = (a: any): string | null => R[a.rt]?.[a.i] || null;
  const left = useCallback(
    (a: any) => {
      const s = stage(a);
      if (!s) return 0;
      const slaLimit = aphRules[s as keyof AphRulesConfig] ?? SLA[s] ?? 15;
      return slaLimit - a.age;
    },
    [aphRules]
  );
  const sev = (d: number) => (d < 0 ? 'bad' : d <= 15 ? 'warn' : 'ok');
  const pill = (d: number) => (
    <span className={`p ${sev(d)}`}>{d < 0 ? `${-d}d overdue` : `${d}d left`}</span>
  );
  const lvl = (d: number) =>
    d < -7 ? 'L3 · Bureau' : d < 0 ? 'L2 · Regional' : d <= 15 ? 'L1 · Institution' : '—';


  // Role display label
  const roleName = useMemo(() => {
    switch (role) {
      case 'Bureau':
        return 'Bureau officer';
      case 'South':
        return 'Regional · South';
      case 'North':
        return 'Regional · North';
      case 'West':
        return 'Regional · West';
      case 'East':
        return 'Regional · East';
      case 'Committee':
        return 'Committee (EVC / SAC)';
      default:
        return role;
    }
  }, [role]);

  // -------------------------------------------------------------
  // RBAC Filtering for Applications, Undertakings, and Documents
  // -------------------------------------------------------------

  // 1. Applications RBAC filter:
  // - Bureau: Views all regions and all data
  // - Regional Officers: View only data in their assigned region
  // - Committee: Views items exclusively in the EVC / SAC processing queues
  const apps = useMemo(() => {
    return A.filter((a) => {
      const s = stage(a);
      if (s === null) return false;
      if (role === 'Bureau') return true;
      if (role === 'Committee') return s === 'EVC' || s === 'SAC/SHC';
      return a.reg === role;
    });
  }, [A, role]);

  const evcs = useMemo(
    () => apps.filter((a) => stage(a) === 'EVC'),
    [apps]
  );

  // 2. Undertakings RBAC filter:
  // - Bureau: Views all
  // - Regional Officers: View only their assigned region
  // - Committee: Active undertakings requiring review (status < 2)
  const ul = useMemo(() => {
    return U.filter((u) => {
      if (role === 'Bureau') return true;
      if (role === 'Committee') return u.s < 2;
      return u.reg === role;
    });
  }, [U, role]);

  // 3. Documents RBAC filter:
  // - Bureau: Views all
  // - Regional Officers: View only their assigned region
  // - Committee: Active documents requiring review (status < 2)
  const dl = useMemo(() => {
    return D.filter((u) => {
      if (role === 'Bureau') return true;
      if (role === 'Committee') return u.s < 2;
      return u.reg === role;
    });
  }, [D, role]);

  // Sorted items by urgency
  const items = useMemo(() => {
    const o: Array<{ k: string; i: string; d: number; r: string }> = [];
    apps.forEach((a) => {
      const d = left(a);
      o.push({ k: 'Stage: ' + stage(a), i: a.inst, d: d, r: a.reg });
    });
    evcs.forEach((a) => {
      o.push({ k: 'EVC visit', i: a.inst, d: a.evc, r: a.reg });
    });
    ul.forEach((u) => {
      if (u.s < 2) o.push({ k: 'Undertaking', i: u.inst, d: u.d, r: u.reg });
    });
    dl.forEach((u) => {
      if (u.s < 2) o.push({ k: 'Document', i: u.inst, d: u.d, r: u.reg });
    });
    return o.sort((a, b) => a.d - b.d);
  }, [apps, evcs, ul, dl, left]);

  // Set window.__od for Three.js ring scaling
  const overdueCount = useMemo(() => {
    const od = apps.filter((a) => left(a) < 0).length;
    const un = ul.filter((u) => u.s < 2 && u.d <= 15).length;
    const dc = dl.filter((u) => u.s < 2 && u.d <= 15).length;
    return od + un + dc;
  }, [apps, ul, dl, left]);

  useEffect(() => {
    (window as any).__od = overdueCount;
  }, [overdueCount]);

  // -------------------------------------------------------------
  // Data Fetching Hook: Load live data from Backend API
  // -------------------------------------------------------------
  const loadLiveData = useCallback(async () => {
    try {
      const healthy = await api.checkHealth();
      setIsLive(healthy);

      if (healthy) {
        const [backendApps, backendUndertakings, backendDocs, backendLogs, backendRules] =
          await Promise.all([
            api.getApplications({ role }),
            api.getUndertakings({ role }),
            api.getLeasesAndDocuments({ role }),
            api.getAuditLogs(),
            api.getAphRules().catch(() => null),
          ]);

        // Transform backend applications to UI format
        setA(
          backendApps.map((a: any) => ({
            id: a.id,
            inst: a.institution?.name || a.institution_id,
            reg: a.institution?.region || '',
            rt: a.route_type,
            i: a.current_stage_index,
            age: a.age_in_days,
            evc: a.evc_timeline_status,
          }))
        );

        // Transform backend undertakings to UI format
        setU(
          backendUndertakings.map((u: any) => ({
            id: u.id,
            inst: u.institution?.name || u.institution_id,
            reg: u.institution?.region || '',
            t: u.condition_text,
            d: u.due_days,
            s: u.status,
          }))
        );

        // Transform backend documents to UI format
        setD(
          backendDocs.map((d: any) => ({
            id: d.id,
            inst: d.institution?.name || d.institution_id,
            reg: d.institution?.region || '',
            t: d.document_type,
            d: d.expiry_days,
            s: d.status,
          }))
        );

        // Transform backend audit logs to UI format
        setLOG(
          backendLogs.map((l: any) => ({
            t: l.timestamp,
            who: l.actor,
            x: l.event_description,
          }))
        );

        // Sync dynamic APH SLA rules
        if (backendRules) {
          setAphRules(backendRules);
        }
      }
    } catch (err) {
      console.warn('Could not connect to live backend API, using local mock data:', err);
      setIsLive(false);
    }
  }, [role]);


  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  // -------------------------------------------------------------
  // Action Handlers wired to Backend API with Toast Alerts
  // -------------------------------------------------------------

  // 1. Advance stage
  const handleAdvance = async (appId: string) => {
    setActionLoading(`adv-${appId}`);
    const targetApp = A.find((x) => x.id === appId);
    const prevStage = targetApp ? stage(targetApp) : 'Stage';

    try {
      if (isLive) {
        await api.advanceApplication(appId, roleName);
        await loadLiveData();
      } else {
        // Fallback local update
        if (targetApp) {
          const from = stage(targetApp);
          targetApp.i++;
          targetApp.age = 0;
          const next = stage(targetApp);
          const eventDesc = `${targetApp.id}: ${from} completed → ${
            next ? `moved to ${next}` : 'forwarded to competent authority for decision'
          }`;
          setLOG((prev) => [
            {
              t: '25 Oct · ' + new Date().toTimeString().slice(0, 5),
              who: roleName,
              x: eventDesc,
            },
            ...prev,
          ]);
          setA([...A]);
        }
      }
      showToast(
        'Stage Completed',
        `Application ${appId} successfully advanced from ${prevStage}`,
        'success'
      );
    } catch (err: any) {
      console.error('Advance error:', err);
      showToast('Error Advancing Stage', err?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Return / Revert stage
  const handleReturn = async (appId: string) => {
    const reason = returnReasons[appId] || 'Deficiency';
    setActionLoading(`ret-${appId}`);
    try {
      if (isLive) {
        await api.revertApplication(appId, reason, roleName);
        await loadLiveData();
      } else {
        const o = A.find((x) => x.id === appId);
        if (o) {
          o.i = Math.max(0, o.i - 1);
          o.age = 0;
          const eventDesc = `${o.id}: returned to ${stage(o)} · reason: ${reason}`;
          setLOG((prev) => [
            {
              t: '25 Oct · ' + new Date().toTimeString().slice(0, 5),
              who: roleName,
              x: eventDesc,
            },
            ...prev,
          ]);
          setA([...A]);
        }
      }
      showToast(
        'Application Reverted',
        `Application ${appId} returned due to ${reason}`,
        'warn'
      );
    } catch (err: any) {
      console.error('Return error:', err);
      showToast('Error Returning Application', err?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Undertakings action (Upload / Verify)
  const handleUndertakingAction = async (idx: number, uItem: any) => {
    setActionLoading(`un-${idx}`);
    const isUpload = uItem.s === 0;
    try {
      if (isLive && uItem.id) {
        if (isUpload) {
          await api.uploadUndertaking(uItem.id, roleName);
        } else {
          await api.verifyUndertaking(uItem.id, roleName);
        }
        await loadLiveData();
      } else {
        const o = U[idx];
        if (o) {
          o.s++;
          const eventDesc = `${o.inst}: ${o.t} ${
            o.s === 1 ? 'submitted by institution' : 'verified by officer'
          }`;
          setLOG((prev) => [
            {
              t: '25 Oct · ' + new Date().toTimeString().slice(0, 5),
              who: roleName,
              x: eventDesc,
            },
            ...prev,
          ]);
          setU([...U]);
        }
      }
      showToast(
        isUpload ? 'Evidence Uploaded' : 'Undertaking Verified',
        `${uItem.inst}: ${uItem.t}`,
        'success'
      );
    } catch (err: any) {
      console.error('Undertaking action error:', err);
      showToast('Action Failed', err?.message || 'Could not process undertaking', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Documents action (Upload / Verify)
  const handleDocumentAction = async (idx: number, dItem: any) => {
    setActionLoading(`dc-${idx}`);
    const isUpload = dItem.s === 0;
    try {
      if (isLive && dItem.id) {
        if (isUpload) {
          await api.uploadDocument(dItem.id, roleName);
        } else {
          await api.verifyDocument(dItem.id, roleName);
        }
        await loadLiveData();
      } else {
        const o = D[idx];
        if (o) {
          o.s++;
          if (o.s === 2) o.d = 365;
          const eventDesc = `${o.inst}: ${o.t} ${
            o.s === 1 ? 'submitted by institution' : 'verified by officer'
          }`;
          setLOG((prev) => [
            {
              t: '25 Oct · ' + new Date().toTimeString().slice(0, 5),
              who: roleName,
              x: eventDesc,
            },
            ...prev,
          ]);
          setD([...D]);
        }
      }
      showToast(
        isUpload ? 'Document Uploaded' : 'Document Verified & Renewed',
        `${dItem.inst}: ${dItem.t} ${!isUpload ? '(+365 days)' : ''}`,
        'success'
      );
    } catch (err: any) {
      console.error('Document action error:', err);
      showToast('Action Failed', err?.message || 'Could not process document', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // 5. Run Alert Sweep
  const handleSweep = async () => {
    setActionLoading('sweep');
    try {
      if (isLive) {
        const sweepRes = await api.runAlertSweep(roleName);
        await loadLiveData();
        showToast(
          'Alert Sweep Completed',
          `${sweepRes.alerts_count || 0} escalation notifications dispatched`,
          'info'
        );
      } else {
        const n = items.filter((x) => x.d <= 15);
        if (n.length) {
          const newLogs = n.map((x) => ({
            t: '25 Oct · ' + new Date().toTimeString().slice(0, 5),
            who: roleName,
            x: `${lvl(x.d).split(' ')[0]} sent: ${x.k} · ${x.i}`,
          }));
          setLOG((prev) => [...newLogs, ...prev]);
        } else {
          setLOG((prev) => [
            {
              t: '25 Oct · ' + new Date().toTimeString().slice(0, 5),
              who: roleName,
              x: 'Sweep: no pending alerts',
            },
            ...prev,
          ]);
        }
        showToast(
          'Alert Sweep Completed',
          `${n.length} escalation notifications processed`,
          'info'
        );
      }
    } catch (err: any) {
      console.error('Alert sweep error:', err);
      showToast('Sweep Failed', err?.message || 'Error executing alert sweep', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // 6. Save Configurable APH Rules
  const handleSaveAphRules = async (newRules: AphRulesConfig) => {
    try {
      if (isLive) {
        const updated = await api.updateAphRules(newRules, roleName);
        setAphRules(updated);
        await loadLiveData();
      } else {
        setAphRules(newRules);
      }
      showToast(
        'APH Rules Saved',
        `Statutory SLA updated: Scrutiny ${newRules.Scrutiny}d · EVC ${newRules.EVC}d · SAC/SHC ${newRules['SAC/SHC']}d`,
        'success'
      );
    } catch (err: any) {
      console.error('Error saving APH rules:', err);
      showToast('Error Saving Rules', err?.message || 'Could not update APH rules', 'error');
      throw err;
    }
  };

  // 7. Export Pendency Report (CSV)
  const handleExportCsv = async () => {
    setActionLoading('export-csv');
    try {
      const regionParam = role !== 'Bureau' && role !== 'Committee' ? role : undefined;
      await api.downloadPendencyReportCsv(role, regionParam);
      showToast(
        'Pendency Report Exported',
        'AICTE Regional Pendency & SLA Compliance summary CSV downloaded.',
        'success'
      );
    } catch (err: any) {
      console.error('CSV export error:', err);
      showToast('Export Failed', err?.message || 'Could not generate pendency CSV report', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Render chips helper

  const renderChips = (a: any) => {
    return (R[a.rt] || []).map((s, j) => {
      const cls = j < a.i ? 'done' : j === a.i ? 'on' : '';
      return (
        <span key={j} className={`st ${cls}`}>
          {s}
        </span>
      );
    });
  };

  // Toggle theme helper
  const toggleTheme = () => {
    const nextTheme = theme === 'abyss' ? 'daylight' : 'abyss';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

  // -------------------------------------------------------------
  // Three.js 3D Background Canvas Initialization
  // -------------------------------------------------------------
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const TH = {
      abyss: {
        bg: '#02080c',
        c1: '#04202c',
        c2: '#0b5a6b',
        c3: '#7ff3ff',
        dots: '#7fe9ef',
        add: true,
      },
      daylight: {
        bg: '#f4f8fb',
        c1: '#dbe9f6',
        c2: '#a9c8f2',
        c3: '#ffffff',
        dots: '#2f6fe0',
        add: false,
      },
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    } catch {
      renderer = null;
    }

    if (!renderer) return;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    cam.position.z = 7;

    const cur: Record<string, THREE.Color> = {};
    const tgt: Record<string, THREE.Color> = {};
    const ring: THREE.Mesh[] = [];

    const initialPal = TH[theme];
    (['bg', 'c1', 'c2', 'c3', 'dots'] as const).forEach((k) => {
      cur[k] = new THREE.Color(initialPal[k]);
      tgt[k] = new THREE.Color(initialPal[k]);
    });

    const NZ =
      'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);}float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.02+vec2(17.3,9.1);a*=0.5;}return s;}';

    const bgM = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uT: { value: 0 },
        uA: { value: 1.6 },
        uM: { value: new THREE.Vector2() },
        uBg: { value: cur.bg },
        uC1: { value: cur.c1 },
        uC2: { value: cur.c2 },
        uC3: { value: cur.c3 },
      },
      vertexShader:
        'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.9999,1.0);}',
      fragmentShader:
        'varying vec2 vUv;uniform float uT,uA;uniform vec2 uM;uniform vec3 uBg,uC1,uC2,uC3;' +
        NZ +
        'void main(){vec2 p=(vUv-0.5)*vec2(uA,1.0)*2.2+uM*0.15;float t=uT*0.04;vec2 q=vec2(fbm(p+vec2(0.0,t)),fbm(p+vec2(5.2,1.3)-t));float f=fbm(p+3.0*q);vec3 c=mix(uBg,uC1,smoothstep(0.1,0.6,f));c=mix(c,uC2,smoothstep(0.45,0.95,f)*0.7);c+=uC3*pow(smoothstep(0.55,1.0,length(q)),3.0)*0.18;c*=1.0-0.4*smoothstep(0.35,1.1,length(vUv-0.5)*1.4);c+=(h21(gl_FragCoord.xy+uT)-0.5)/255.0;gl_FragColor=vec4(c,1.0);}',
    });

    const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgM);
    bg.frustumCulled = false;
    bg.renderOrder = -10;
    scene.add(bg);

    const N = window.matchMedia('(pointer: coarse)').matches ? 300 : 700;
    const pos = new Float32Array(N * 3);
    const sd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 1;
      sd[i] = Math.random();
    }

    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));

    const pMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: initialPal.add ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uT: { value: 0 },
        uP: { value: 0 },
        uS: { value: 900 },
        uC: { value: cur.dots },
      },
      vertexShader:
        'attribute float aSeed;uniform float uT,uP,uS;varying float vA;void main(){float y=mod(position.y+5.0+(uT*0.03+uP)*(0.4+aSeed),10.0)-5.0;vec3 p=vec3(position.x+sin(uT*0.2+aSeed*40.0)*0.25,y,position.z);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;float d=max(-mv.z,0.1);gl_PointSize=clamp(0.08*(0.4+aSeed)*uS/d,1.0,14.0);float q=d*0.06;vA=(0.3+0.6*aSeed)*exp(-q*q)*(1.0-smoothstep(4.0,5.0,abs(y)));}',
      fragmentShader:
        'uniform vec3 uC;varying float vA;void main(){float r=length(gl_PointCoord-0.5)*2.0;float a=1.0-smoothstep(0.0,1.0,r);gl_FragColor=vec4(uC,a*a*vA*0.8);}',
    });

    const pts = new THREE.Points(pg, pMat);
    pts.frustumCulled = false;
    scene.add(pts);

    // Three gate rings: Scrutiny / EVC / SAC-SHC gates
    [1.2, 1.8, 2.4].forEach((r, j) => {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.012, 8, 96),
        new THREE.MeshBasicMaterial({ color: cur.dots, transparent: true, opacity: 0.55 })
      );
      m.position.set(3.4, 0, -2 - j * 0.6);
      m.rotation.x = 1.1;
      scene.add(m);
      ring.push(m);
    });

    const m = { p: 0, v: 0, mx: 0, my: 0 };
    let lastY = window.scrollY;
    let push = 0;
    let sc = 1;

    const onScroll = () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (!reduced) m.v = Math.min(3, Math.abs(dy) * 0.03);
    };

    const onMouseMove = (e: MouseEvent) => {
      m.mx = (e.clientX / window.innerWidth - 0.5) * 2;
      m.my = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer!.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      bgM.uniforms.uA.value = w / h;
      pMat.uniforms.uS.value =
        (h * renderer!.getPixelRatio() * 0.5) / Math.tan((25 * Math.PI) / 180);
      ring.forEach((r) => {
        r.visible = w > 760;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', resize);
    resize();

    const clock = new THREE.Clock();
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const k = 1 - Math.exp(-dt * 4);

      // Lerp colors towards current palette
      const curPal = TH[theme];
      (['bg', 'c1', 'c2', 'c3', 'dots'] as const).forEach((colorKey) => {
        tgt[colorKey].set(curPal[colorKey]);
        cur[colorKey].lerp(tgt[colorKey], k);
      });

      pMat.blending = curPal.add ? THREE.AdditiveBlending : THREE.NormalBlending;
      pMat.needsUpdate = true;

      m.v *= 0.9;
      if (m.v < 0.01) m.v = 0;
      push += reduced ? 0 : m.v * dt * 0.8;
      const T = reduced ? 0 : t;

      bgM.uniforms.uT.value = T;
      bgM.uniforms.uM.value.set(m.mx, -m.my);
      pMat.uniforms.uT.value = T;
      pMat.uniforms.uP.value = push;

      const od = (window as any).__od || 0;
      sc += (1 + Math.min(od, 12) * 0.03 - sc) * k;

      ring.forEach((r, j) => {
        r.rotation.z += reduced ? 0 : dt * (0.08 + j * 0.04 + m.v * 0.3);
        r.scale.setScalar(sc);
        (r.material as THREE.MeshBasicMaterial).opacity = 0.55;
      });

      cam.position.x +=
        (m.mx * 0.4 * (reduced ? 0 : 1) - cam.position.x) * (1 - Math.exp(-dt * 3));
      cam.lookAt(0, 0, 0);
      renderer!.render(scene, cam);
    };

    frame();

    const onVisibilityChange = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        clock.getDelta();
        frame();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      renderer!.dispose();
    };
  }, [theme]);

  // -------------------------------------------------------------
  // Views rendering matching the exact original HTML
  // -------------------------------------------------------------

  const renderOverview = () => {
    const ap = apps;
    const od = ap.filter((a) => left(a) < 0).length;
    const ev = evcs.filter((a) => a.evc <= 15).length;
    const un = ul.filter((u) => u.s < 2 && u.d <= 15).length;
    const dc = dl.filter((u) => u.s < 2 && u.d <= 15).length;

    const kpiCards = [
      {
        label: 'Open Applications',
        value: ap.length,
        icon: FileText,
        colorClass: 'cyan',
        trend: `${ap.length} active`,
        trendClass: 'ok',
      },
      {
        label: 'Stage Overdue',
        value: od,
        icon: AlertTriangle,
        colorClass: 'red',
        trend: od > 0 ? `${od} breaches` : 'All in SLA',
        trendClass: od > 0 ? 'bad' : 'ok',
      },
      {
        label: 'EVCs Due ≤ 15d',
        value: ev,
        icon: Calendar,
        colorClass: 'amber',
        trend: ev > 0 ? `${ev} urgent` : 'On track',
        trendClass: ev > 0 ? 'warn' : 'ok',
      },
      {
        label: 'Undertakings at Risk',
        value: un,
        icon: ShieldAlert,
        colorClass: 'purple',
        trend: un > 0 ? `${un} pending` : 'Compliant',
        trendClass: un > 0 ? 'warn' : 'ok',
      },
      {
        label: 'Docs Expiring/Expired',
        value: dc,
        icon: Clock,
        colorClass: 'red',
        trend: dc > 0 ? `${dc} critical` : 'All valid',
        trendClass: dc > 0 ? 'bad' : 'ok',
      },
    ];

    const topItems = items.slice(0, 5);

    return (
      <>
        {/* Glassmorphic KPI Metric Tiles */}
        <div className="grid">
          {kpiCards.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div key={idx} className="glass-stat">
                <div className="glass-stat-top">
                  <span className={`glass-stat-icon ${c.colorClass}`}>
                    <Icon size={18} />
                  </span>
                  <span className={`glass-stat-trend ${c.trendClass}`}>
                    {c.trend}
                  </span>
                </div>
                <div>
                  <div className="glass-stat-value">{c.value}</div>
                  <span className="glass-stat-label">{c.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary Interactive Charts */}
        <div className="charts-grid-main">
          <StageDistributionDonut
            apps={apps}
            ul={ul}
            dl={dl}
            stageFn={stage}
            leftFn={left}
            theme={theme}
          />
          <RegionalComplianceBarChart
            apps={apps}
            ul={ul}
            dl={dl}
            stageFn={stage}
            leftFn={left}
            theme={theme}
          />
        </div>

        {/* Secondary Workflow & SLA Metrics */}
        <div className="charts-grid-secondary">
          <SLAComplianceGauge
            apps={apps}
            ul={ul}
            dl={dl}
            stageFn={stage}
            leftFn={left}
            theme={theme}
          />
          <RouteWorkflowChart
            apps={apps}
            ul={ul}
            dl={dl}
            stageFn={stage}
            leftFn={left}
            theme={theme}
          />
          <UrgencyBreakdownChart items={items} />
        </div>

        {/* Action Priority Table */}
        <div className="glass" style={{ marginTop: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Critical Action Queue & Escalation Matrix</h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Prioritized institutions requiring immediate statutory intervention or follow-up
              </span>
            </div>
            <button
              className="btn-export"
              onClick={handleExportCsv}
              disabled={actionLoading === 'export-csv'}
              title="Generate and download CSV summary report of regional pendencies and overdue metrics"
            >
              <Download size={14} style={{ marginRight: '4px' }} />
              {actionLoading === 'export-csv' ? 'Generating...' : 'Export Pendency Report (CSV)'}
            </button>
          </div>

          <div className="w">
            <table>
              <thead>
                <tr>
                  <th>Compliance Item</th>
                  <th>Institution Name</th>
                  <th>Statutory Timeline</th>
                  <th>Escalation Level</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((x, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{x.k}</strong>
                      <span className="tag" style={{ marginLeft: '8px' }}>
                        {x.r}
                      </span>
                    </td>
                    <td>{x.i}</td>
                    <td>{pill(x.d)}</td>
                    <td>{lvl(x.d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderApplications = () => {
    const totalApps = apps.length;
    const scrutinyApps = apps.filter((a) => stage(a) === 'Scrutiny').length;
    const evcApps = apps.filter((a) => stage(a) === 'EVC').length;
    const sacApps = apps.filter((a) => stage(a) === 'SAC/SHC').length;
    const overdueApps = apps.filter((a) => left(a) < 0).length;

    return (
      <div className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Applications · Automatic Route Workflow</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Stage advancement, deficiency tracking, and escalation routing
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge-glass">Total: {totalApps}</span>
            <span className="badge-glass">Scrutiny: {scrutinyApps}</span>
            <span className="badge-glass">EVC: {evcApps}</span>
            <span className="badge-glass">SAC/SHC: {sacApps}</span>
            {overdueApps > 0 && <span className="badge-glass danger">{overdueApps} Overdue</span>}
          </div>
        </div>

        <div className="w">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Institution</th>
                <th>Route</th>
                <th>Days in stage</th>
                <th>Timeline</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => {
                const stages = R[a.rt] || [];
                const last = a.i === stages.length - 1;
                const isAdvancing = actionLoading === `adv-${a.id}`;
                const isReturning = actionLoading === `ret-${a.id}`;
                const currentReason = returnReasons[a.id] || 'Deficiency';

                return (
                  <tr key={a.id}>
                    <td><strong>{a.id}</strong></td>
                    <td>
                      {a.inst}
                      <br />
                      <span className="tag">{a.reg}</span>
                    </td>
                    <td>{renderChips(a)}</td>
                    <td>
                      {(() => {
                        const s = stage(a);
                        return `${a.age} / ${s && SLA[s] !== undefined ? SLA[s] : 0}`;
                      })()}
                    </td>
                    <td>{pill(left(a))}</td>
                    <td>
                      <button
                        onClick={() => handleAdvance(a.id)}
                        disabled={isAdvancing || isReturning}
                        className="pri"
                      >
                        {isAdvancing
                          ? 'Updating...'
                          : last
                          ? 'Forward for decision'
                          : 'Complete stage'}
                      </button>{' '}
                      <select
                        aria-label="Return reason"
                        value={currentReason}
                        onChange={(e) =>
                          setReturnReasons((prev) => ({
                            ...prev,
                            [a.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="Deficiency">Deficiency</option>
                        <option value="Clarification">Clarification</option>
                        <option value="Further verification">Further verification</option>
                      </select>{' '}
                      <button
                        onClick={() => handleReturn(a.id)}
                        disabled={isAdvancing || isReturning}
                      >
                        {isReturning ? 'Returning...' : 'Return'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">
          Completing a stage moves the file to the next prescribed stage. The final stage forwards
          it to the competent authority, which takes the decision. Returns record a reason in the
          audit trail.
        </p>
      </div>
    );
  };

  const renderEVCQueue = () => {
    const sortedEvcs = [...evcs].sort((a, b) => a.evc - b.evc);
    const urgentEvcs = sortedEvcs.filter((a) => a.evc <= 15).length;
    const overdueEvcs = sortedEvcs.filter((a) => a.evc < 0).length;

    return (
      <div className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0 }}>EVC Queue · Scheduling and Alerts</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              On-site & virtual inspection timetable monitoring and committee assignments
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge-glass">{sortedEvcs.length} Scheduled</span>
            <span className="badge-glass">Due ≤ 15d: {urgentEvcs}</span>
            {overdueEvcs > 0 && <span className="badge-glass danger">{overdueEvcs} Overdue</span>}
          </div>
        </div>

        <div className="w">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Institution</th>
                <th>Region</th>
                <th>Visit due</th>
                <th>Escalation</th>
              </tr>
            </thead>
            <tbody>
              {sortedEvcs.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.id}</strong></td>
                  <td>{a.inst}</td>
                  <td><span className="tag">{a.reg}</span></td>
                  <td>{pill(a.evc)}</td>
                  <td>{lvl(a.evc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">Applications enter this queue automatically after preliminary scrutiny.</p>
      </div>
    );
  };

  const renderUndertakings = () => {
    const pendingU = ul.filter((u) => u.s === 0).length;
    const submittedU = ul.filter((u) => u.s === 1).length;
    const verifiedU = ul.filter((u) => u.s === 2).length;

    return (
      <div className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Time-Bound Statutory Undertakings</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Conditional approval obligations, fire safety NOC, faculty recruitment, and evidence verification
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge-glass">Pending: {pendingU}</span>
            <span className="badge-glass">Submitted: {submittedU}</span>
            <span className="badge-glass" style={{ color: 'var(--ok)' }}>Verified: {verifiedU}</span>
          </div>
        </div>

        <div className="w">
          <table>
            <thead>
              <tr>
                <th>Institution</th>
                <th>Condition</th>
                <th>Due</th>
                <th>Status</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {ul.map((u, j) => {
                const originalIndex = U.indexOf(u);
                const isActing = actionLoading === `un-${originalIndex}`;
                return (
                  <tr key={j}>
                    <td>
                      {u.inst}
                      <br />
                      <span className="tag">{u.reg}</span>
                    </td>
                    <td><strong>{u.t}</strong></td>
                    <td>{u.s < 2 ? pill(u.d) : <span className="p ok">Closed</span>}</td>
                    <td>{US[u.s]}</td>
                    <td>
                      {u.s < 2 ? (
                        <button
                          onClick={() => handleUndertakingAction(originalIndex, u)}
                          disabled={isActing}
                        >
                          {isActing
                            ? 'Processing...'
                            : u.s === 0
                            ? 'Institution uploads'
                            : 'Officer verifies'}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDocuments = () => {
    const activeD = dl.filter((u) => u.s < 2);
    const expiredD = activeD.filter((u) => u.d < 0).length;
    const expiringSoon = activeD.filter((u) => u.d >= 0 && u.d <= 30).length;

    return (
      <div className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Campus Lease Deeds & Document Validity</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Statutory land registry, campus lease tenure, and renewal deadlines
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge-glass">Tracked: {dl.length}</span>
            <span className="badge-glass">Expiring ≤ 30d: {expiringSoon}</span>
            {expiredD > 0 && <span className="badge-glass danger">{expiredD} Expired</span>}
          </div>
        </div>

        <div className="w">
          <table>
            <thead>
              <tr>
                <th>Institution</th>
                <th>Document</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Renewal</th>
              </tr>
            </thead>
            <tbody>
              {dl.map((u, j) => {
                const originalIndex = D.indexOf(u);
                const isActing = actionLoading === `dc-${originalIndex}`;
                return (
                  <tr key={j}>
                    <td>
                      {u.inst}
                      <br />
                      <span className="tag">{u.reg}</span>
                    </td>
                    <td><strong>{u.t}</strong></td>
                    <td>{u.s < 2 ? pill(u.d) : <span className="p ok">Renewed</span>}</td>
                    <td>{u.d < 0 && u.s < 2 ? <span className="p bad">Expired</span> : US[u.s]}</td>
                    <td>
                      {u.s < 2 ? (
                        <button
                          onClick={() => handleDocumentAction(originalIndex, u)}
                          disabled={isActing}
                        >
                          {isActing
                            ? 'Processing...'
                            : u.s === 0
                            ? 'Institution uploads'
                            : 'Officer verifies'}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEscalations = () => {
    const it = items.filter((x) => x.d <= 15);
    const isSweeping = actionLoading === 'sweep';
    const l1Count = it.filter((x) => x.d > 0 && x.d <= 15).length;
    const l2Count = it.filter((x) => x.d <= 0 && x.d >= -7).length;
    const l3Count = it.filter((x) => x.d < -7).length;

    return (
      <div className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Multi-Tier Escalation Ladder & Automated Alerts</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              L1 Institution Notices · L2 Regional Intervention · L3 Bureau Escalations
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge-glass">L1 (≤15d): {l1Count}</span>
            <span className="badge-glass" style={{ color: 'var(--warn)' }}>L2 Overdue: {l2Count}</span>
            <span className="badge-glass danger">L3 (&lt;-7d): {l3Count}</span>
            <button onClick={handleSweep} disabled={isSweeping} className="pri">
              {isSweeping ? 'Running sweep...' : 'Run alert sweep'}
            </button>
          </div>
        </div>
        <div className="w">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Institution</th>
                <th>Region</th>
                <th>Timeline</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {it.map((x, idx) => (
                <tr key={idx}>
                  <td>{x.k}</td>
                  <td>{x.i}</td>
                  <td>{x.r}</td>
                  <td>{pill(x.d)}</td>
                  <td>{lvl(x.d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          L1: reminder to institution within 15 days · L2: Regional officer when overdue · L3:
          Bureau when overdue by more than 7 days. Thresholds are configurable.
        </p>
      </div>
    );
  };

  const renderAuditTrail = () => {
    return (
      <div className="glass">
        <h2>Audit trail</h2>
        <div className="w">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Event</th>
              </tr>
            </thead>
            <tbody>
              {LOG.map((l, idx) => (
                <tr key={idx}>
                  <td>{l.t}</td>
                  <td>{l.who}</td>
                  <td>{l.x}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Three.js 3D WebGL Canvas */}
      <canvas id="gl" ref={canvasRef} aria-hidden="true" />

      {/* Header */}
      <header>
        <b>
          AICTE<i>.</i> Approval Monitor
        </b>
        <div className="ctl">
          {/* Live Backend Indicator */}
          <span className="status-badge" title={isLive ? 'Connected to FastAPI' : 'Local Fallback'}>
            <span className={`status-dot ${isLive ? 'online' : 'offline'}`} />
            {isLive ? 'Live API' : 'Mock Mode'}
          </span>

          <label className="tag" htmlFor="role">
            Role
          </label>
          <select
            id="role"
            aria-label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="Bureau">Bureau</option>
            <option value="South">Regional · South</option>
            <option value="North">Regional · North</option>
            <option value="West">Regional · West</option>
            <option value="East">Regional · East</option>
            <option value="Committee">Committee (EVC / SAC)</option>
          </select>

          <button
            className="btn-settings"
            title="Configure statutory APH SLA processing days"
            onClick={() => setIsAphModalOpen(true)}
          >
            ⚙️ APH Rules
          </button>

          <button id="th" aria-label="Toggle light or dark theme" onClick={toggleTheme}>
            <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            {theme === 'abyss' ? 'Daylight' : 'Abyss'}
          </button>
        </div>
      </header>

      {/* Regulatory Safeguard Notice */}
      <div className="safeguard-banner" role="status" aria-label="Regulatory Notice">
        <span className="safeguard-tag">⚖️ Regulatory Safeguard:</span>
        System alerts and recommendations support processing but do not replace statutory verification or decisions reserved for competent authorities.
      </div>

      {/* Main View */}
      <main>
        <div className="tag">
          {isLive ? `Live Mode · Role: ${roleName}` : 'Demo data · as of 25 Oct 2026 · not live AICTE records'}
        </div>
        <h1>
          Every approval, every deadline,
          <br />
          <span>one live view.</span>
        </h1>
        <p className="sub">
          Routing, EVC scheduling, undertakings and lease validity with automatic alerts and
          escalation. Alerts support officers; decisions stay with the competent authority.
        </p>

        {/* Section Navigation Tabs with Dynamic Badge Counts */}
        <nav id="nav" aria-label="Sections">
          {TABS.map((t) => {
            let countBadge: number | null = null;
            if (t[0] === 'ap') countBadge = apps.length;
            else if (t[0] === 'evc') countBadge = evcs.length;
            else if (t[0] === 'un') countBadge = ul.filter((u) => u.s < 2).length;
            else if (t[0] === 'dc') countBadge = dl.filter((u) => u.s < 2).length;
            else if (t[0] === 'es') countBadge = items.filter((x) => x.d <= 15).length;

            return (
              <button
                key={t[0]}
                aria-pressed={tab === t[0]}
                onClick={() => setTab(t[0])}
                className="glass-tab-btn"
              >
                <span>{t[1]}</span>
                {countBadge !== null && (
                  <span className={`tab-count-badge ${t[0] === 'es' && countBadge > 0 ? 'alert' : ''}`}>
                    {countBadge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Dynamic View Panel */}
        <div id="view" aria-live="polite">
          {tab === 'ov' && renderOverview()}
          {tab === 'ap' && renderApplications()}
          {tab === 'evc' && renderEVCQueue()}
          {tab === 'un' && renderUndertakings()}
          {tab === 'dc' && renderDocuments()}
          {tab === 'es' && renderEscalations()}
          {tab === 'lg' && renderAuditTrail()}
        </div>
      </main>

      {/* Configurable APH Rules Modal */}
      <AphRulesModal
        isOpen={isAphModalOpen}
        onClose={() => setIsAphModalOpen(false)}
        currentRules={aphRules}
        onSave={handleSaveAphRules}
        role={role}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </>
  );
}

export default App;
