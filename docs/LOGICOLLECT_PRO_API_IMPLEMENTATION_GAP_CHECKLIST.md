# LogiCollect Pro — API implementation gap checklist

**Updated:** 26 November 2026 after isolated backend implementation.  
**Mount:** `logicollect_app` `/api/logicollect/v1` only. **Not** on `main:app`.

Legend: **[x] complete (isolated)** · **[!] policy-blocked** · **[~] deferred**

## Authentication and profile

- [x] POST `/auth/login`
- [x] GET `/auth/me`
- [x] POST `/auth/logout` (revokes session)
- [x] PATCH `/auth/me`
- [x] POST `/auth/me/photo`
- [x] DELETE `/auth/me/photo`
- [x] POST `/auth/change-password`
- [x] POST `/auth/refresh` (documented extra)

## Memos

- [x] GET `/memos` (assignee + loaded commercial orders; filters including `needsCollection`)
- [x] GET `/memos/{id}`
- [x] POST `/memos/{id}/accept` (JWT employee, not client user_id)
- [x] POST `/memos/accept-batch`

## Delivery and route

- [x] POST `/memos/{id}/check-in`
- [x] POST `/memos/{id}/deliver` (does not use web `approve_delivery`)
- [x] POST `/memos/{id}/postpone`
- [x] POST `/memos/{id}/cancel` (no inventory reversal)
- [x] GET `/routes/today` (`lc_route_visits`, Asia/Dhaka)
- [~] POST `/telemetry/location` — **deferred**

## Collections and wallet

- [x] GET `/memos?needsCollection=true`
- [x] POST `/memos/{id}/collect` (full/partial cash, credit, postpone→next day, cancel without write-off)
- [x] GET `/wallet`
- [x] GET `/wallet/movements`
- [x] POST `/wallet/deposits` (`brac|bkash|rocket`, cap, idempotency)
- [x] GET `/wallet/deposits`

## Returns

- [x] GET `/returns/pending`
- [x] POST `/returns/{id}/adjust` (DSR report only; no PISD restock)
- [x] GET `/returns?status=adjusted`

## Chemists and credit

- [x] GET/POST `/chemists` (field `lc_chemists`; not commercial Customer)
- [x] PATCH `/chemists/{id}`
- [x] POST/DELETE `/chemists/{id}/photo`
- [x] POST `/chemists/{id}/active`
- [x] GET `/credit-chemists`
- [!] POST `/credit-chemists/{id}/clear` — DSR 403; finance/admin 409 `CREDIT_CLEAR_POLICY_PENDING`; **no settlement**

## Exceptions / performance / activity

- [x] GET `/exceptions`
- [x] GET `/performance` (actuals; targets 0 unless seeded)
- [x] GET `/activity`

## Cross-cutting

- [x] camelCase, integer BDT, Dhaka timestamps, `{code,message}`
- [x] Idempotency-Key on check-in/deliver/collect/deposit/returns
- [x] Not using F.4 isolated fulfillment
- [x] Production routes unchanged

## Remaining before production

- [ ] Authorize `main:app` mount and live Alembic
- [ ] Finance policy: credit clear + collection cancel write-off
- [ ] Warehouse physical return receipt
- [ ] Optional chemist↔customer identity
- [ ] PostgreSQL concurrency suite on disposable `logicollect_dev`
- [ ] DSR target plan data
