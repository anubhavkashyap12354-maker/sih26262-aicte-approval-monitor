from typing import Optional, List
from pydantic import BaseModel, Field
from models import RegionEnum

# ----------------- Institution Schemas -----------------
class InstitutionBase(BaseModel):
    id: str
    name: str
    region: RegionEnum

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionResponse(InstitutionBase):
    class Config:
        from_attributes = True

# ----------------- Application Schemas -----------------
class ApplicationBase(BaseModel):
    id: str
    institution_id: str
    route_type: str
    current_stage_index: int = 0
    age_in_days: int = 0
    evc_timeline_status: int = 0

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationResponse(ApplicationBase):
    institution: Optional[InstitutionResponse] = None

    class Config:
        from_attributes = True

class ApplicationAdvanceRequest(BaseModel):
    actor: str = "Bureau officer"

class ApplicationRevertRequest(BaseModel):
    reason: str = Field(..., description="Deficiency, Clarification, or Further verification")
    actor: str = "Bureau officer"

# Backward compatibility alias
ApplicationReturnRequest = ApplicationRevertRequest

# ----------------- Undertaking Schemas -----------------
class UndertakingBase(BaseModel):
    institution_id: str
    condition_text: str
    due_days: int
    status: int = 0

class UndertakingCreate(UndertakingBase):
    pass

class UndertakingResponse(UndertakingBase):
    id: int
    institution: Optional[InstitutionResponse] = None

    class Config:
        from_attributes = True

class UndertakingActionRequest(BaseModel):
    actor: str = "Bureau officer"

class UndertakingUploadRequest(BaseModel):
    actor: str = "Institution"

class UndertakingVerifyRequest(BaseModel):
    actor: str = "Bureau officer"

# ----------------- Lease & Document Schemas -----------------
class LeaseAndDocumentBase(BaseModel):
    institution_id: str
    document_type: str
    expiry_days: int
    status: int = 0

class LeaseAndDocumentCreate(LeaseAndDocumentBase):
    pass

class LeaseAndDocumentResponse(LeaseAndDocumentBase):
    id: int
    institution: Optional[InstitutionResponse] = None

    class Config:
        from_attributes = True

class LeaseAndDocumentActionRequest(BaseModel):
    actor: str = "Bureau officer"

class DocumentUploadRequest(BaseModel):
    actor: str = "Institution"

class DocumentVerifyRequest(BaseModel):
    actor: str = "Bureau officer"

# ----------------- Audit Log Schemas -----------------
class AuditLogBase(BaseModel):
    timestamp: str
    actor: str
    event_description: str

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogResponse(AuditLogBase):
    id: int

    class Config:
        from_attributes = True

# ----------------- Sweep / Alerts Schemas -----------------
class SweepRequest(BaseModel):
    actor: str = "Bureau officer"

class AlertItem(BaseModel):
    level: str  # L1, L2, L3
    category: str  # Application, Undertaking, Document
    item: str
    institution: str
    region: str
    days: int
    log: str

class AlertSweepResponse(BaseModel):
    status: str
    alerts_count: int
    alerts: List[AlertItem]

# ----------------- Overview Metrics Schemas -----------------
class OverviewMetricsResponse(BaseModel):
    open_applications: int
    stage_overdue: int
    evcs_due_soon: int
    undertakings_at_risk: int
    documents_expiring: int

# ----------------- APH Rules Config Schemas -----------------
class AphRulesConfig(BaseModel):
    Scrutiny: int = Field(15, description="Scrutiny stage SLA days")
    EVC: int = Field(30, description="EVC stage SLA days")
    SAC_SHC: int = Field(20, alias="SAC/SHC", description="SAC/SHC stage SLA days")

    class Config:
        populate_by_name = True

class AphRulesUpdateRequest(BaseModel):
    Scrutiny: int = 15
    EVC: int = 30
    SAC_SHC: int = Field(20, alias="SAC/SHC")
    actor: str = "Bureau officer"

    class Config:
        populate_by_name = True

