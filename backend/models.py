import enum
from sqlalchemy import Column, String, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class RegionEnum(str, enum.Enum):
    North = "North"
    South = "South"
    East = "East"
    West = "West"

class Institution(Base):
    """
    institutions: id (PK, String), name (String), region (Enum: North, South, East, West)
    """
    __tablename__ = "institutions"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    region = Column(SQLEnum(RegionEnum, name="region_enum", native_enum=False), nullable=False)

    # Relationships with cascade deletion
    applications = relationship("Application", back_populates="institution", cascade="all, delete-orphan")
    undertakings = relationship("Undertaking", back_populates="institution", cascade="all, delete-orphan")
    leases_and_documents = relationship("LeaseAndDocument", back_populates="institution", cascade="all, delete-orphan")


class Application(Base):
    """
    applications: id (PK, String), institution_id (FK to institutions),
    route_type (String: S, SE, ES, E, SES), current_stage_index (Integer, default 0),
    age_in_days (Integer), evc_timeline_status (Integer)
    """
    __tablename__ = "applications"

    id = Column(String, primary_key=True, index=True)
    institution_id = Column(String, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    route_type = Column(String, nullable=False)  # S, SE, ES, E, SES
    current_stage_index = Column(Integer, default=0, nullable=False)
    age_in_days = Column(Integer, default=0, nullable=False)
    evc_timeline_status = Column(Integer, default=0, nullable=False)

    # Relationship
    institution = relationship("Institution", back_populates="applications")


class Undertaking(Base):
    """
    undertakings: id (PK, Integer, auto-increment), institution_id (FK),
    condition_text (String), due_days (Integer), status (Integer: 0=Pending, 1=Submitted, 2=Verified)
    """
    __tablename__ = "undertakings"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    institution_id = Column(String, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    condition_text = Column(String, nullable=False)
    due_days = Column(Integer, nullable=False)
    status = Column(Integer, default=0, nullable=False)  # 0=Pending, 1=Submitted, 2=Verified

    # Relationship
    institution = relationship("Institution", back_populates="undertakings")


class LeaseAndDocument(Base):
    """
    leases_and_documents: id (PK, Integer, auto-increment), institution_id (FK),
    document_type (String), expiry_days (Integer), status (Integer: 0=Pending/Expired, 1=Submitted, 2=Renewed)
    """
    __tablename__ = "leases_and_documents"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    institution_id = Column(String, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String, nullable=False)
    expiry_days = Column(Integer, nullable=False)
    status = Column(Integer, default=0, nullable=False)  # 0=Pending/Expired, 1=Submitted, 2=Renewed

    # Relationship
    institution = relationship("Institution", back_populates="leases_and_documents")


class AuditLog(Base):
    """
    audit_logs: id (PK, Integer, auto-increment), timestamp (String),
    actor (String), event_description (String)
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    timestamp = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    event_description = Column(String, nullable=False)


class SystemConfig(Base):
    """
    system_configs: key (PK, String), value (String), description (String)
    Used for storing Approval Process Handbook (APH) dynamic rules and SLAs.
    """
    __tablename__ = "system_configs"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)
    description = Column(String, nullable=True)

