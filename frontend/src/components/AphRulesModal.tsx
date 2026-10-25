import React, { useState, useEffect } from 'react';
import type { AphRulesConfig } from '../types';

interface AphRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRules: AphRulesConfig;
  onSave: (newRules: AphRulesConfig) => Promise<void>;
  role: string;
}

export const AphRulesModal: React.FC<AphRulesModalProps> = ({
  isOpen,
  onClose,
  currentRules,
  onSave,
  role,
}) => {
  const [scrutiny, setScrutiny] = useState<number>(currentRules.Scrutiny || 15);
  const [evc, setEvc] = useState<number>(currentRules.EVC || 30);
  const [sacShc, setSacShc] = useState<number>(currentRules['SAC/SHC'] || 20);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isBureau = role === 'Bureau';

  useEffect(() => {
    if (isOpen) {
      setScrutiny(currentRules.Scrutiny || 15);
      setEvc(currentRules.EVC || 30);
      setSacShc(currentRules['SAC/SHC'] || 20);
      setError(null);
    }
  }, [isOpen, currentRules]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBureau) {
      setError('Only Bureau administrators can modify statutory APH SLA rules.');
      return;
    }

    if (scrutiny <= 0 || evc <= 0 || sacShc <= 0) {
      setError('SLA days must be positive integers greater than zero.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        Scrutiny: Number(scrutiny),
        EVC: Number(evc),
        'SAC/SHC': Number(sacShc),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save APH rules.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setScrutiny(15);
    setEvc(30);
    setSacShc(20);
    setError(null);
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aph-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content glass">
        <div className="modal-header">
          <div>
            <div className="tag" style={{ marginBottom: '6px' }}>
              Approval Process Handbook · 2026-27
            </div>
            <h2 id="aph-modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
              Configurable APH SLA Rules
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <p className="modal-desc">
          Configure statutory processing SLA days. Overdue thresholds, urgency ranks, and escalation triggers (L1, L2, L3) update dynamically across the approval pipeline.
        </p>

        {!isBureau && (
          <div className="modal-alert-banner">
            ⚠️ <strong>Read-Only Mode:</strong> Your active role is <em>{role}</em>. Only Bureau administrators are authorized to update statutory APH SLA days. Switch role to Bureau to edit.
          </div>
        )}

        {error && (
          <div className="modal-alert-banner error">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="modal-fields">
            {/* Scrutiny Stage */}
            <div className="field-group">
              <label htmlFor="scrutiny-sla">
                <strong>Scrutiny SLA</strong>
                <span className="field-hint">Initial document verification & scrutiny committee</span>
              </label>
              <div className="input-with-addon">
                <input
                  id="scrutiny-sla"
                  type="number"
                  min="1"
                  max="180"
                  disabled={!isBureau || saving}
                  value={scrutiny}
                  onChange={(e) => setScrutiny(parseInt(e.target.value) || 0)}
                  required
                />
                <span className="addon">days</span>
              </div>
            </div>

            {/* EVC Stage */}
            <div className="field-group">
              <label htmlFor="evc-sla">
                <strong>EVC (Expert Visit Committee) SLA</strong>
                <span className="field-hint">Physical/hybrid inspection & verification report upload</span>
              </label>
              <div className="input-with-addon">
                <input
                  id="evc-sla"
                  type="number"
                  min="1"
                  max="180"
                  disabled={!isBureau || saving}
                  value={evc}
                  onChange={(e) => setEvc(parseInt(e.target.value) || 0)}
                  required
                />
                <span className="addon">days</span>
              </div>
            </div>

            {/* SAC / SHC Stage */}
            <div className="field-group">
              <label htmlFor="sac-sla">
                <strong>SAC / SHC SLA</strong>
                <span className="field-hint">Standing Appellate / Standing Hearing Committee review</span>
              </label>
              <div className="input-with-addon">
                <input
                  id="sac-sla"
                  type="number"
                  min="1"
                  max="180"
                  disabled={!isBureau || saving}
                  value={sacShc}
                  onChange={(e) => setSacShc(parseInt(e.target.value) || 0)}
                  required
                />
                <span className="addon">days</span>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            {isBureau && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResetDefaults}
                disabled={saving}
              >
                Reset to Defaults
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            {isBureau && (
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save SLA Rules'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
