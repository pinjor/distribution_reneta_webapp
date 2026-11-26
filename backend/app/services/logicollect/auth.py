from __future__ import annotations

from datetime import timedelta
from typing import Optional
from uuid import uuid4

from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.auth import verify_password, get_password_hash, SECRET_KEY, ALGORITHM
from app.core.config import get_settings
from app.models import Employee
from app.models_logicollect import LcEmployeeProfile, LcMedia, LcSession
from app.services.logicollect.errors import LcError
from app.services.logicollect.util import iso_dt, now_dhaka, sha256_hex

ACCESS_SECONDS = 86400
REFRESH_DAYS = 14
MAX_PHOTO = 2 * 1024 * 1024


def _find_employee(db: Session, employee_id: str) -> Optional[Employee]:
    ident = (employee_id or "").strip()
    if not ident:
        return None
    user = db.query(Employee).filter(Employee.employee_id == ident).first()
    if user:
        return user
    return db.query(Employee).filter(Employee.phone == ident).first()


def display_name(user: Employee, profile: Optional[LcEmployeeProfile] = None) -> str:
    if profile and profile.display_name:
        return profile.display_name
    return f"{user.first_name} {user.last_name or ''}".strip()


def photo_url(profile: Optional[LcEmployeeProfile]) -> Optional[str]:
    if profile and profile.photo_id:
        return f"/api/logicollect/v1/media/{profile.photo_id}"
    return None


def user_payload(db: Session, user: Employee) -> dict:
    profile = db.query(LcEmployeeProfile).filter_by(employee_id=user.id).first()
    return {
        "id": user.employee_id,
        "name": display_name(user, profile),
        "phone": user.phone,
        "profilePictureUrl": photo_url(profile),
    }


def _encode(payload: dict, expires: timedelta) -> str:
    to_encode = payload.copy()
    to_encode["exp"] = now_dhaka() + expires
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def issue_session(db: Session, user: Employee) -> dict:
    sid = str(uuid4())
    access_jti = str(uuid4())
    refresh_jti = str(uuid4())
    now = now_dhaka()
    access_exp = timedelta(seconds=ACCESS_SECONDS)
    refresh_exp = timedelta(days=REFRESH_DAYS)
    access = _encode(
        {"sub": user.email or user.employee_id, "id": user.id, "eid": user.employee_id, "sid": sid, "jti": access_jti, "use": "lc_access"},
        access_exp,
    )
    refresh = _encode(
        {"sub": user.email or user.employee_id, "id": user.id, "eid": user.employee_id, "sid": sid, "jti": refresh_jti, "use": "lc_refresh"},
        refresh_exp,
    )
    db.add(
        LcSession(
            id=sid,
            employee_id=user.id,
            refresh_token_hash=sha256_hex(refresh),
            access_jti=access_jti,
            refresh_jti=refresh_jti,
            expires_at=now + access_exp,
            refresh_expires_at=now + refresh_exp,
            revoked_at=None,
        )
    )
    db.flush()
    return {
        "accessToken": access,
        "refreshToken": refresh,
        "expiresIn": ACCESS_SECONDS,
        "user": user_payload(db, user),
    }


def login(db: Session, employee_id: str, password: str) -> dict:
    user = _find_employee(db, employee_id)
    if not user or not user.hashed_password or not verify_password(password, user.hashed_password):
        raise LcError(401, "INVALID_CREDENTIALS", "ID or password not recognised")
    if not user.is_active:
        raise LcError(403, "ACCOUNT_INACTIVE", "Account is inactive")
    if getattr(user, "is_blocked", False):
        raise LcError(403, "ACCOUNT_BLOCKED", "Account is blocked")
    return issue_session(db, user)


def decode_lc(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise LcError(401, "INVALID_TOKEN", "Authentication required")


def load_session(db: Session, payload: dict, expected_use: str) -> tuple[Employee, LcSession]:
    if payload.get("use") != expected_use:
        raise LcError(401, "INVALID_TOKEN", "Authentication required")
    sid = payload.get("sid")
    session = db.query(LcSession).filter(LcSession.id == sid).first()
    if not session or session.revoked_at is not None:
        raise LcError(401, "SESSION_REVOKED", "Session is no longer valid")
    if expected_use == "lc_access" and session.access_jti != payload.get("jti"):
        raise LcError(401, "SESSION_REVOKED", "Session is no longer valid")
    if expected_use == "lc_refresh" and session.refresh_jti != payload.get("jti"):
        raise LcError(401, "SESSION_REVOKED", "Session is no longer valid")
    user = db.query(Employee).filter(Employee.id == session.employee_id).first()
    if not user:
        raise LcError(401, "INVALID_TOKEN", "Authentication required")
    if not user.is_active:
        raise LcError(403, "ACCOUNT_INACTIVE", "Account is inactive")
    if getattr(user, "is_blocked", False):
        raise LcError(403, "ACCOUNT_BLOCKED", "Account is blocked")
    return user, session


def require_user(db: Session, token: Optional[str]) -> Employee:
    if not token:
        raise LcError(401, "INVALID_TOKEN", "Authentication required")
    payload = decode_lc(token)
    user, _ = load_session(db, payload, "lc_access")
    return user


def logout(db: Session, user: Employee, token: str) -> dict:
    payload = decode_lc(token)
    user2, session = load_session(db, payload, "lc_access")
    if user2.id != user.id:
        raise LcError(401, "INVALID_TOKEN", "Authentication required")
    session.revoked_at = now_dhaka()
    return {"ok": True}


def refresh_session(db: Session, refresh_token: str) -> dict:
    payload = decode_lc(refresh_token)
    user, session = load_session(db, payload, "lc_refresh")
    if session.refresh_token_hash != sha256_hex(refresh_token):
        session.revoked_at = now_dhaka()
        raise LcError(401, "SESSION_REVOKED", "Session is no longer valid")
    session.revoked_at = now_dhaka()
    db.flush()
    return issue_session(db, user)


def patch_me(db: Session, user: Employee, name: Optional[str], phone: Optional[str]) -> dict:
    profile = db.query(LcEmployeeProfile).filter_by(employee_id=user.id).first()
    if not profile:
        profile = LcEmployeeProfile(employee_id=user.id)
        db.add(profile)
        db.flush()
    if name is not None:
        name = name.strip()
        if not name:
            raise LcError(400, "VALIDATION_ERROR", "name is required")
        profile.display_name = name
        parts = name.split(None, 1)
        user.first_name = parts[0]
        user.last_name = parts[1] if len(parts) > 1 else None
    if phone is not None:
        phone = phone.strip()
        if phone:
            taken = db.query(Employee).filter(Employee.phone == phone, Employee.id != user.id).first()
            if taken:
                raise LcError(400, "PHONE_TAKEN", "Phone already in use")
        user.phone = phone or None
    db.flush()
    return user_payload(db, user)


def save_photo(db: Session, user: Employee, data: bytes, content_type: str, filename: str) -> dict:
    if content_type not in ("image/jpeg", "image/jpg") and not (filename or "").lower().endswith((".jpg", ".jpeg")):
        raise LcError(400, "INVALID_FILE", "Profile photo must be a JPEG")
    if len(data) > MAX_PHOTO:
        raise LcError(400, "FILE_TOO_LARGE", "Photo must be 2 MB or smaller")
    if data[:3] != b"\xff\xd8\xff":
        raise LcError(400, "INVALID_FILE", "Profile photo must be a JPEG")
    media = LcMedia(
        id=str(uuid4()),
        owner_employee_id=user.id,
        kind="profile",
        content_type="image/jpeg",
        original_name=filename,
        data=data,
        created_at=now_dhaka(),
    )
    db.add(media)
    profile = db.query(LcEmployeeProfile).filter_by(employee_id=user.id).first()
    if not profile:
        profile = LcEmployeeProfile(employee_id=user.id)
        db.add(profile)
    profile.photo_id = media.id
    db.flush()
    return {"profilePictureUrl": photo_url(profile)}


def delete_photo(db: Session, user: Employee) -> dict:
    profile = db.query(LcEmployeeProfile).filter_by(employee_id=user.id).first()
    if profile:
        profile.photo_id = None
    return {"profilePictureUrl": None}


def change_password(db: Session, user: Employee, current_password: str, new_password: str) -> dict:
    if not new_password or len(new_password) < 6:
        raise LcError(400, "PASSWORD_TOO_SHORT", "New password must be at least 6 characters")
    if not user.hashed_password or not verify_password(current_password, user.hashed_password):
        raise LcError(400, "PASSWORD_MISMATCH", "Current password does not match")
    user.hashed_password = get_password_hash(new_password)
    return {"ok": True}


def get_media(db: Session, user: Employee, media_id: str) -> LcMedia:
    media = db.query(LcMedia).filter(LcMedia.id == media_id).first()
    if not media:
        raise LcError(404, "NOT_FOUND", "Not found")
    if media.owner_employee_id != user.id and (user.role or "").lower() != "admin":
        raise LcError(404, "NOT_FOUND", "Not found")
    return media
