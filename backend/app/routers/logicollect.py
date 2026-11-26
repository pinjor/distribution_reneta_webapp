from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, Query, Request, Response, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee
from app.services.logicollect import auth as lc_auth
from app.services.logicollect import ops as lc_ops
from app.services.logicollect.errors import LcError

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Session = Depends(get_db),
) -> Employee:
    token = creds.credentials if creds else None
    return lc_auth.require_user(db, token)


@router.post("/auth/login")
def login(body: dict, db: Session = Depends(get_db)):
    result = lc_auth.login(db, body.get("employeeId") or "", body.get("password") or "")
    db.commit()
    return result


@router.get("/auth/me")
def me(user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    return lc_auth.user_payload(db, user)


@router.post("/auth/logout")
def logout(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
):
    token = creds.credentials if creds else ""
    result = lc_auth.logout(db, user, token)
    db.commit()
    return result


@router.post("/auth/refresh")
def refresh(body: dict, db: Session = Depends(get_db)):
    result = lc_auth.refresh_session(db, body.get("refreshToken") or "")
    db.commit()
    return result


@router.patch("/auth/me")
def patch_me(body: dict, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    result = lc_auth.patch_me(db, user, body.get("name"), body.get("phone"))
    db.commit()
    return result


@router.post("/auth/me/photo")
def photo(
    file: UploadFile = File(...),
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
):
    data = file.file.read()
    result = lc_auth.save_photo(db, user, data, file.content_type or "", file.filename or "photo.jpg")
    db.commit()
    return result


@router.delete("/auth/me/photo")
def delete_photo(user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    result = lc_auth.delete_photo(db, user)
    db.commit()
    return result


@router.post("/auth/change-password")
def change_password(body: dict, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    result = lc_auth.change_password(db, user, body.get("currentPassword") or "", body.get("newPassword") or "")
    db.commit()
    return result


@router.get("/media/{media_id}")
def media(media_id: str, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    row = lc_auth.get_media(db, user, media_id)
    return Response(content=row.data, media_type=row.content_type)


@router.get("/memos")
def memos(
    status: Optional[List[str]] = Query(None),
    paymentStatus: Optional[str] = None,
    needsCollection: bool = False,
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
):
    from app.services.logicollect.util import parse_date

    return lc_ops.list_memos(
        db,
        user,
        statuses=status,
        payment_status=paymentStatus,
        needs=needsCollection,
        from_d=parse_date(from_),
        to_d=parse_date(to),
    )


@router.get("/memos/{memo_id}")
def memo_detail(memo_id: str, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    order = lc_ops.resolve_order(db, user, memo_id)
    return lc_ops.serialize_memo(db, order, user, detail=True)


@router.post("/memos/accept-batch")
def accept_batch(body: dict, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    result = lc_ops.accept_batch(db, user, body.get("ids") or [])
    db.commit()
    return result


@router.post("/memos/{memo_id}/accept")
def accept(memo_id: str, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    result = lc_ops.accept_one(db, user, memo_id)
    db.commit()
    return result


@router.post("/memos/{memo_id}/check-in")
def check_in(
    memo_id: str,
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    result = lc_ops.check_in(db, user, memo_id, idempotency_key)
    db.commit()
    return result


@router.post("/memos/{memo_id}/deliver")
def deliver(
    memo_id: str,
    body: dict,
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    result = lc_ops.deliver(db, user, memo_id, body, idempotency_key)
    db.commit()
    return result


@router.post("/memos/{memo_id}/postpone")
def postpone(
    memo_id: str,
    body: dict,
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    result = lc_ops.postpone_delivery(db, user, memo_id, body.get("reason") or "", idempotency_key)
    db.commit()
    return result


@router.post("/memos/{memo_id}/cancel")
def cancel(
    memo_id: str,
    body: dict,
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    result = lc_ops.cancel_delivery(db, user, memo_id, body.get("reason") or "", idempotency_key)
    db.commit()
    return result


@router.post("/memos/{memo_id}/collect")
def collect(
    memo_id: str,
    body: dict,
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    result = lc_ops.collect(db, user, memo_id, body, idempotency_key)
    db.commit()
    return result


@router.get("/routes/today")
def routes_today(user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    return lc_ops.today_route(db, user)


@router.get("/wallet")
def wallet(user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    return lc_ops.wallet_snapshot(db, user)


@router.get("/wallet/movements")
def movements(kind: str = "collect", user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    if kind not in ("collect", "deposit"):
        raise LcError(400, "VALIDATION_ERROR", "kind must be collect or deposit")
    return lc_ops.list_movements(db, user, kind)


@router.post("/wallet/deposits")
def deposits_create(
    method: str = Form(...),
    amount: int = Form(...),
    transactionId: str = Form(...),
    file: Optional[UploadFile] = File(None),
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    data = file.file.read() if file else None
    name = file.filename if file else None
    result = lc_ops.create_deposit(db, user, method, amount, transactionId, data, name, idempotency_key)
    db.commit()
    return result


@router.get("/wallet/deposits")
def deposits_list(user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    return lc_ops.list_deposits(db, user)


@router.get("/returns/pending")
def returns_pending(user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    return lc_ops.pending_returns(db, user, adjusted=False)


@router.get("/returns")
def returns_list(status: Optional[str] = None, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    adjusted = True if status == "adjusted" else False
    return lc_ops.pending_returns(db, user, adjusted=adjusted)


@router.post("/returns/{return_id}/adjust")
def returns_adjust(
    return_id: str,
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    result = lc_ops.adjust_return(db, user, return_id, idempotency_key)
    db.commit()
    return result


@router.get("/chemists")
def chemists(q: Optional[str] = None, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    return lc_ops.list_chemists(db, user, q)


@router.post("/chemists")
async def chemists_create(request: Request, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    form = await request.form()
    fields = {k: str(v) for k, v in form.items() if k != "file"}
    upload = form.get("file")
    photo = None
    name = None
    if upload is not None and hasattr(upload, "read"):
        photo = await upload.read()
        name = getattr(upload, "filename", None)
    result = lc_ops.create_chemist(db, user, fields, photo, name)
    db.commit()
    return result


@router.patch("/chemists/{chemist_id}")
def chemists_patch(chemist_id: str, body: dict, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    result = lc_ops.patch_chemist(db, user, chemist_id, body)
    db.commit()
    return result


@router.post("/chemists/{chemist_id}/photo")
def chemists_photo(
    chemist_id: str,
    file: UploadFile = File(...),
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
):
    result = lc_ops.chemist_photo(db, user, chemist_id, file.file.read(), file.filename or "photo.jpg")
    db.commit()
    return result


@router.delete("/chemists/{chemist_id}/photo")
def chemists_photo_del(chemist_id: str, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    result = lc_ops.chemist_photo_delete(db, user, chemist_id)
    db.commit()
    return result


@router.post("/chemists/{chemist_id}/active")
def chemists_active(chemist_id: str, body: dict, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    result = lc_ops.chemist_active(db, user, chemist_id, bool(body.get("active")))
    db.commit()
    return result


@router.get("/credit-chemists")
def credit_list(user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    return lc_ops.credit_chemists(db, user)


@router.post("/credit-chemists/{chemist_id}/clear")
def credit_clear(chemist_id: str, user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    return lc_ops.clear_credit(db, user, chemist_id)


@router.get("/exceptions")
def exceptions(user: Employee = Depends(current_user), db: Session = Depends(get_db)):
    return lc_ops.exceptions(db, user)


@router.get("/performance")
def performance(
    month: Optional[str] = None,
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
):
    return lc_ops.performance(db, user, month, from_, to)


@router.get("/activity")
def activity(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    user: Employee = Depends(current_user),
    db: Session = Depends(get_db),
):
    from app.services.logicollect.util import parse_date

    return lc_ops.list_memos(
        db,
        user,
        statuses=["fullDelivered", "partialDelivered"],
        from_d=parse_date(from_),
        to_d=parse_date(to),
    )
