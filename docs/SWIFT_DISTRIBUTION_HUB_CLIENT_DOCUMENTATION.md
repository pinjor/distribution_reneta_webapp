
# SWIFT DISTRIBUTION HUB
## Distribution Management System (DMS)
### Client Technical & Operations Documentation

> **Microsoft Word version:** Open **`SWIFT_DISTRIBUTION_HUB_CLIENT_DOCUMENTATION.docx`** in this folder for properly aligned tables and professional formatting. Regenerate anytime with: `python docs/generate_client_docx.py`

---

| **Document Title** | Swift Distribution Hub — Technical, Deployment & Exception Handling Specification |
|---|---|
| **Product Name** | Swift Distribution Hub (Reneta Distribution Management System) |
| **API Version** | 2.0.0 |
| **Document Version** | 1.0 |
| **Date** | June 16, 2026 |
| **Classification** | Client Confidential |
| **Prepared For** | Reneta / Client IT & Operations Stakeholders |
| **Prepared By** | Development & Implementation Team |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Section 1 — Technical Specifications](#section-1--technical-specifications)
   - 1.1 System Overview
   - 1.2 Architecture
   - 1.3 Technology Stack
   - 1.4 Application Modules
   - 1.5 Data Model & Persistence
   - 1.6 API & Security Architecture
   - 1.7 Custom Business Logic
   - 1.8 Internal IT & Oracle Integration Boundaries
3. [Section 2 — Deployment Facts](#section-2--deployment-facts)
   - 2.1 Infrastructure Prerequisites
   - 2.2 Environment Configuration
   - 2.3 Deployment Topology
   - 2.4 Roll-Out Strategy
   - 2.5 Timeline Dependencies
   - 2.6 Post-Deployment Verification
4. [Section 3 — Exception Handling](#section-3--exception-handling)
   - 3.1 Exception Handling Philosophy
   - 3.2 Order Validation Exceptions
   - 3.3 Status & Workflow Discrepancies
   - 3.4 System Timeouts & Connectivity Failures
   - 3.5 Integration & Sync Failures
   - 3.6 Manual Override Workflows
   - 3.7 Mobile & Offline Edge Cases
   - 3.8 Audit, Escalation & Recovery
5. [Appendices](#appendices)

---

## Executive Summary

Swift Distribution Hub is an enterprise Distribution Management System (DMS) designed to manage the complete distribution lifecycle for FMCG and similar industries — from warehouse stock receipt through order entry, validation, route assignment, vehicle loading, field delivery, cash collection, billing, and management reporting.

The platform has been engineered as a modern, containerized web application comprising a React single-page frontend, a FastAPI backend, PostgreSQL database, Redis cache layer, and Nginx reverse proxy. It replaces a prior Supabase-based architecture with a fully self-hosted, Docker-orchestrated stack suitable for on-premises or private cloud deployment.

This document is structured in three parts as requested:

1. **Technical Specifications** — describes system architecture, proprietary business logic, and the defined boundaries between the DMS and client internal systems (including Oracle ERP).
2. **Deployment Facts** — covers infrastructure requirements, environment setup, phased roll-out approach, and project timeline dependencies.
3. **Exception Handling** — maps workflows for edge cases, data discrepancies, system timeouts, manual overrides, and operational recovery procedures.

The system is production-ready for core distribution workflows. External system integrations (Oracle ERP, Field Force, RMC, HR/Empress, Power BI) are implemented through a formal adapter framework with job queuing and retry capabilities; live credentials and endpoint configuration remain a client IT dependency prior to go-live.

---

# SECTION 1 — TECHNICAL SPECIFICATIONS

---

## 1.1 System Overview

Swift Distribution Hub serves as the operational nerve center for depot-level distribution activities. It supports:

- **Warehouse operations** — product receipt, stock issuance, maintenance, and adjustment
- **Order management** — draft creation, rules-based validation, route-wise memo generation, and tracking
- **Distribution & logistics** — vehicle and driver management, route planning, loading, dispatch, and delivery
- **Billing & finance** — collection approval, cash deposits, reconciliation, refunds, and invoicing
- **Transport management** — trip tracking and expense management
- **Platform services** — audit logging, report center, device binding, and offline sync for mobile field apps

The web application is the primary operator interface. A separate DEX mobile application connects to the same backend via dedicated mobile and sync APIs for field sales representatives and delivery personnel.

---

## 1.2 Architecture

### 1.2.1 High-Level System Architecture

The application follows a three-tier, containerized microservices pattern:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT ACCESS LAYER                          │
│   Web Browser (Desktop/Tablet)    │    DEX Mobile App (Field)      │
└──────────────────────────┬──────────────────────────┬─────────────────┘
                           │                          │
                           ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NGINX REVERSE PROXY (:80 / :8081)               │
│   Route: /          →  React Frontend (Vite)                        │
│   Route: /api/*     →  FastAPI Backend                              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌──────────────────────┐         ┌──────────────────────┐
│   FASTAPI BACKEND    │         │   REACT FRONTEND     │
│   (Python 3.11)      │         │   (React 18 + Vite)  │
│   Port: 8000         │         │   Port: 8080/8090    │
└──────────┬───────────┘         └──────────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌──────────┐ ┌──────────┐
│PostgreSQL│ │  Redis   │
│   16     │ │    7     │
│ Port:    │ │ Port:    │
│ 5432     │ │ 6379     │
└──────────┘ └──────────┘
```

### 1.2.2 Component Responsibilities

| Component | Responsibility |
|---|---|
| **Nginx** | TLS termination (when configured), reverse proxy, static asset serving, request routing, timeout management, upstream retry |
| **React Frontend** | User interface for all web modules; JWT token management; role-aware navigation |
| **FastAPI Backend** | REST API, business logic, validation engine, status state machine, integration orchestration, PDF generation |
| **PostgreSQL** | Primary transactional data store; master data, orders, stock, finance, audit logs |
| **Redis** | Session caching and performance optimization; graceful degradation if unavailable |

### 1.2.3 Docker Service Topology

Five containerized services are orchestrated via Docker Compose:

| Service | Container Name | Purpose |
|---|---|---|
| `postgres` | `swift_distro_postgres` | PostgreSQL 16 database |
| `redis` | `swift_distro_redis` | Redis 7 with AOF persistence |
| `backend` | `swift_distro_api` | FastAPI application server |
| `frontend` | `swift_distro_frontend` | React development/production server |
| `nginx` | `swift_distro_nginx` | Reverse proxy and entry point |

All services communicate over an internal Docker network (`swift_network`). Only Nginx and optionally database/cache ports are exposed to the host.

---

## 1.3 Technology Stack

### 1.3.1 Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | 0.109.x | REST API framework |
| Uvicorn | Latest | ASGI server |
| SQLAlchemy | 2.0.x | ORM and database access |
| Pydantic | 2.5.x | Request/response validation |
| Alembic | Latest | Database migrations |
| python-jose | Latest | JWT token handling |
| bcrypt | Latest | Password hashing |
| PostgreSQL driver | psycopg2 | Database connectivity |

### 1.3.2 Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.x | UI framework |
| TypeScript | Latest | Type-safe development |
| Vite | 5.4.x | Build tool and dev server |
| React Router | 6.30.x | Client-side routing |
| TanStack Query | Latest | Server state management |
| shadcn/ui + Tailwind CSS | Latest | Component library and styling |
| Zod | Latest | Form validation |
| Sonner | Latest | Toast notifications |

### 1.3.3 Infrastructure

| Technology | Version | Purpose |
|---|---|---|
| Docker | 20.10+ | Containerization |
| Docker Compose | 2.0+ | Multi-container orchestration |
| Nginx | Alpine | Reverse proxy |
| PostgreSQL | 16 Alpine | Database |
| Redis | 7 Alpine | Cache |

---

## 1.4 Application Modules

The web application is organized into functional modules accessible through role-based navigation:

### Warehouse Management
- Product Receipt (including challan verification workflow)
- Stock Issuance
- Stock Maintenance
- Stock Adjustment

### Order Management
- Order Entry (draft creation and editing)
- Order List
- Route-Wise Memo List and printing
- Order Assignment to vehicles/routes
- Picking and Loading
- Order Delivery tracking
- Order Lifecycle Tracking (8-stage pipeline)
- Management Information System (MIS) reports

### Distribution Management
- Vehicle and Driver master data
- Route configuration
- Distribution Cockpit
- Cash Reconciliation

### Billing & Finance
- Collection Deposit management
- Billing reports
- Invoice generation
- Refund liability tracking

### Transport Management
- Vehicle and driver registry
- Trip management
- Expense tracking

### Settings & Master Data
- Companies, Depots, Employees
- Products, Materials, UOMs, Primary Packagings
- Customers, Vendors, Price Setups
- Shipping Points, Route Shipping Points
- Role Masters

### Platform Services
- Audit Logs
- Report Center (65 registered reports)
- Integration job monitoring

---

## 1.5 Data Model & Persistence

### 1.5.1 Core Business Entities

| Entity Group | Tables / Concepts |
|---|---|
| **Organizational** | Companies, Depots, Employees |
| **Commercial** | Customers, Vendors, Price Setups, Promotions |
| **Product Catalog** | Products, Materials, UOMs, Primary Packagings |
| **Inventory** | Product Item Stock, Stock Details (batch-level), Stock Ledger, Receipts, Issuances, Adjustments |
| **Logistics** | Vehicles, Drivers, Routes, Shipping Points, Vehicle Loadings |
| **Orders** | Orders, Order Items, Order Batch Allocations, Order Status History |
| **Finance** | Invoices, Collection Deposits, Reconciliation Runs, Refund Liabilities |
| **Transport** | Trips, Transport Expenses |

### 1.5.2 Platform Extension Entities

Added in API v2.0 for production hardening:

| Entity | Purpose |
|---|---|
| `audit_logs` | Immutable write audit trail |
| `permissions` / `role_permissions` | RBAC permission matrix |
| `login_audits` | Authentication event logging |
| `validation_rule_configs` | Configurable order validation rules |
| `order_validation_runs` / `order_validation_messages` | Validation execution history |
| `order_status_history` | Delivery and collection status transitions |
| `reconciliation_runs` / `reconciliation_variances` | Cash reconciliation |
| `integration_systems` / `integration_jobs` / `integration_failures` | External system integration |
| `mobile_devices` / `device_login_attempts` | Mobile device binding |
| `sync_events` / `sync_queue` / `sync_conflicts` | Offline sync queue |
| `external_order_refs` | Cross-system order references |

### 1.5.3 Database Initialization

- Schema is created automatically on backend startup via SQLAlchemy `create_all()`.
- Platform hardening migration: `backend/db/migrations/001_platform_hardening.sql`
- Alembic baseline migration available for controlled schema evolution.
- Master data seeding scripts are provided for development, UAT, and initial production bootstrap.

---

## 1.6 API & Security Architecture

### 1.6.1 API Design

- **Protocol:** REST over HTTP/HTTPS
- **Base path:** `/api`
- **Documentation:** OpenAPI/Swagger available at `/api/docs`
- **Health check:** `GET /health` and `GET /api/health`
- **Version:** 2.0.0

All business endpoints require JWT Bearer authentication except authentication endpoints (`/api/auth/login`, `/api/auth/signup`, `/api/auth/refresh`).

### 1.6.2 Authentication

| Aspect | Specification |
|---|---|
| **Mechanism** | JSON Web Token (JWT), HS256 algorithm |
| **Token storage** | Browser `localStorage` or `sessionStorage` (remember-me option) |
| **Default expiry** | 60 minutes |
| **Extended expiry** | 30 days (when "Remember Me" selected at login) |
| **Password hashing** | bcrypt |
| **Login audit** | All login attempts recorded with IP address and user agent |
| **Account controls** | `is_active` and `is_blocked` flags enforced at login |

### 1.6.3 Role-Based Access Control (RBAC)

| Role | Typical Access |
|---|---|
| `admin` | Full system access, all permissions |
| `manager` | Depot operations, order approval, reconciliation |
| `billing` | Collection, deposits, billing reports |
| `finance` | Reconciliation approval, refunds, financial reports |
| `transport` | Vehicle, driver, trip management |
| `user` | Standard operational access within assigned depot |

Permissions are enforced at the API layer via `require_permission`, `require_role`, and `require_depot_access` dependencies. Non-admin users are automatically scoped to their assigned depot.

### 1.6.4 Audit Trail

All significant write operations are logged to the immutable `audit_logs` table, including:

- Order validation and approval
- Status transitions
- Login and logout events
- Reconciliation actions
- Promotion changes
- Integration job execution
- Device registration and blocking
- Sync events

Audit logs are queryable via `/api/audit-logs` for compliance and operational review.

---

## 1.7 Custom Business Logic

This section describes the proprietary logic that differentiates Swift Distribution Hub from a generic ERP or inventory system.

### 1.7.1 Order Lifecycle Pipeline

Orders progress through an eight-stage operational pipeline managed by the `OrderLifecycleService`:

| Stage | Description |
|---|---|
| 1. Order Creation | Draft order entry by depot staff or imported from external source |
| 2. Validation | Rules-engine validation with credit, stock, and pricing checks |
| 3. Route Wise | Grouping and memo generation by delivery route |
| 4. Assignment | Vehicle and driver assignment for dispatch |
| 5. Delivery | Field delivery execution and status updates |
| 6. Collection | Cash/cheque collection from customers |
| 7. Billing | Invoice generation and deposit processing |
| 8. MIS Report | Management reporting and analytics |

### 1.7.2 Order Validation Rules Engine

The `OrderValidationService` executes a configurable set of business rules before an order can proceed to distribution. Default rules include:

| Rule Code | Severity | Description |
|---|---|---|
| `CUSTOMER_ACTIVE` | ERROR | Customer account must be in active status |
| `PRODUCT_ACTIVE` | ERROR | All ordered products must be active |
| `CREDIT_LIMIT` | ERROR | Order total must not exceed customer credit limit |
| `CREDIT_PERIOD` | ERROR | Orders restricted to days 1–7 of month per credit policy |
| `STOCK_AVAILABLE` | ERROR | Sufficient sellable stock must exist at depot |
| `FEFO_ALLOCATION` | ERROR | Batch allocation follows First-Expiry-First-Out principle |
| `PRICE_AVAILABLE` | ERROR | Valid trade price must exist for each line item |
| `DISCOUNT_VALID` | WARNING | Discount percentage within authorized limits |
| `PROMOTION_APPLY` | WARNING | Applicable promotion schemes evaluated |
| `HIGH_VALUE` | WARNING | Orders exceeding BDT 500,000 flagged for review |
| `OVERDUE_CUSTOMER` | ERROR | Customer with overdue balance blocked |

**Validation outcomes:**

| Status | Meaning | Next Action |
|---|---|---|
| `VALIDATED` | All checks passed | Auto-transition to validated delivery status |
| `PENDING_APPROVAL` | Blocking or warning rules require manager review | Await manual exception approval |
| `REJECTED` | Hard failure on critical rules | Order cannot proceed without correction |
| `FAILED` | System error during validation | Technical investigation required |

Rules are configurable via `/api/orders/validation-rules` and can be enabled/disabled per environment.

### 1.7.3 FEFO Stock Reservation

Upon successful validation, the `StockReservationService` allocates inventory using First-Expiry-First-Out (FEFO) logic:

1. Queries `product_item_stock_details` for batches with status `Unrestricted` or `Sellable`
2. Sorts batches by expiry date (ascending)
3. Allocates quantities across batches until order demand is met
4. Moves quantity from `available_quantity` to `reserved_quantity`
5. Records allocations in `order_batch_allocations`

Reserved stock is released on re-validation and committed upon stock issuance.

### 1.7.4 Delivery & Collection Status State Machine

The `StatusTransitionService` enforces a formal state machine for order fulfillment:

**Delivery statuses:**
`ORDER_CREATED` → `VALIDATED` → `PICKING_IN_PROGRESS` → `PICKED` → `MEMO_PRINTED` → `LOADED` → `DISPATCHED` → `DELIVERED` / `POSTPONED` / `CANCELLED`

**Collection statuses (parallel track):**
`DELIVERED_NOT_COLLECTED` → `COLLECTION_IN_PROGRESS` → `COLLECTED` / `DUE_COLLECTION`

Each transition requires a specific event (e.g., `VALIDATE`, `START_PICKING`, `PRINT_MEMO`, `DISPATCH`, `DELIVER_FULL`, `COLLECT_FULL`) and is permission-gated. Invalid state/event combinations are rejected with HTTP 400.

### 1.7.5 Cash Reconciliation

The reconciliation module supports day-end financial closing:

1. Reconciliation run created from vehicle loading assignment
2. Line-by-line verification of expected vs. actual collections
3. Variance recording for discrepancies
4. Manager approval or rejection workflow
5. Day-end closing lock

### 1.7.6 Promotion Engine

Promotions support rule-based schemes with depot, product, and customer scoping. The engine simulates promotion impact during order validation and logs utilization upon order confirmation.

### 1.7.7 Order Sources

Orders may originate from multiple channels, tracked via the `order_source` field:

| Source | Description |
|---|---|
| `MANUAL_DMS` | Entered directly in the web application |
| `FIELD_FORCE` | Imported from Field Force / OOT system |
| `DEX_CRP` | Created or updated via DEX mobile app |
| `INTEGRATION` | Imported via integration adapter (e.g., Oracle) |

---

## 1.8 Internal IT & Oracle Integration Boundaries

This section defines the contractual boundary between Swift Distribution Hub and client internal systems. It is critical for IT planning and integration scoping.

### 1.8.1 Integration Architecture

External systems connect through a formal **Adapter Pattern** implemented in `IntegrationService`. Each external system has:

- A registered system code in `integration_systems`
- A dedicated adapter (production adapter or sandbox stub)
- A job queue (`integration_jobs`) with idempotency keys
- Failure tracking (`integration_failures`) with retry capability
- Full audit logging of all integration events

```
┌─────────────────────────────────────────────────────────────────┐
│                    SWIFT DISTRIBUTION HUB (DMS)                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Integration Service Layer                     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────┐ ┌──────────┐ ┌────────┐ │  │
│  │  │ Oracle  │ │  Field  │ │ RMC │ │    HR    │ │PowerBI │ │  │
│  │  │  ERP    │ │ Force   │ │     │ │ Empress  │ │ Export │ │  │
│  │  │ Adapter │ │ Adapter │ │Adpt │ │ Adapter  │ │ Adapter│ │  │
│  │  └────┬────┘ └────┬────┘ └──┬──┘ └────┬─────┘ └───┬────┘ │  │
│  └───────┼──────────┼─────────┼─────────┼───────────┼───────┘  │
│          │          │         │         │           │          │
│  ┌───────▼──────────▼─────────▼─────────▼───────────▼───────┐  │
│  │              Integration Job Queue & Retry Engine           │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┬──────────────┐
          ▼                ▼                ▼              ▼
   ┌─────────────┐  ┌─────────────┐  ┌───────────┐  ┌──────────┐
   │ Oracle ERP  │  │ Field Force │  │    RMC    │  │    HR    │
   │  (EBS/Fusion│  │  / OOT App  │  │  System   │  │ Empress  │
   └─────────────┘  └─────────────┘  └───────────┘  └──────────┘
```

### 1.8.2 Registered External Systems

| System Code | Display Name | Direction | DMS Responsibility | Client IT Responsibility |
|---|---|---|---|---|
| `ORACLE_ERP` | Oracle ERP | Bidirectional | Expose pull/push APIs; map data to DMS schema; queue and retry jobs | Provide Oracle API endpoints/credentials; define inventory and revenue data formats; schedule or trigger sync |
| `FIELD_FORCE` | Field Force / OOT | Inbound | Accept order import payloads; validate and create DMS orders | Export orders from Field Force in agreed format; trigger import API |
| `RMC` | RMC | Outbound | Push sales data on schedule or demand | Receive and process sales feed |
| `HR_EMPRESS` | HR / Empress | Inbound | Sync employee master to DMS | Provide employee export API or file feed |
| `POWERBI` | Power BI Export | Outbound | Export report datasets in agreed format | Configure Power BI to consume export |

### 1.8.3 Oracle ERP Integration — Detailed Boundary

#### What the DMS Provides (In Scope)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/integrations/oracle/inventory/pull` | POST | Initiate inventory/challan pull from Oracle |
| `/api/integrations/oracle/revenue/push` | POST | Push revenue/sales data to Oracle |
| `/api/integrations/jobs` | GET | Monitor integration job status |
| `/api/integrations/jobs/{id}/retry` | POST | Retry failed integration job |
| `/api/integrations/failures` | GET | List unresolved integration failures |

The DMS will:
- Accept Oracle inventory data and map to `product_item_stock` and batch detail tables
- Queue revenue push jobs with idempotency protection
- Log all Oracle integration events to audit trail
- Surface failures for operator review and retry

#### What Client IT Must Provide (Out of DMS Scope)

| Requirement | Description |
|---|---|
| Oracle API connectivity | REST/SOAP endpoints, VPN, or middleware access to Oracle EBS/Fusion |
| Authentication credentials | API keys, OAuth tokens, or database read credentials as applicable |
| Data mapping specification | Field-level mapping document between Oracle tables/views and DMS entities |
| Inventory sync schedule | Defined frequency (real-time, hourly, daily) and trigger mechanism |
| Revenue recognition rules | Business rules for when and what revenue data is pushed to Oracle |
| Network firewall rules | Allow DMS server IP to reach Oracle middleware |
| UAT test data | Representative Oracle extracts for integration testing |

#### Current Integration Status

> **Important:** As of document date, all integration adapters operate in **Sandbox Mode** (`INTEGRATION_SANDBOX=true`). Sandbox adapters return explicit `SANDBOX` status responses and do not simulate successful data transfer. Production adapters will be implemented once client IT provides connectivity specifications and credentials.

The Stock Receipt screen includes a UI workflow labeled "Oracle EBS Challan Verification." This is currently a **frontend simulation** (1.5-second delay with success toast) and does not call a live Oracle API. Live challan verification will be enabled when the Oracle adapter is configured.

### 1.8.4 Mobile Application (DEX) Boundary

The DEX mobile application is a **separate codebase** that communicates with the DMS backend via dedicated APIs:

| API Group | Endpoints | Purpose |
|---|---|---|
| Device Management | `/api/devices/register`, `/verify`, `/{id}/block` | Device binding and security |
| Sync | `/api/sync/push`, `/pull`, `/status`, `/failures/{id}/retry` | Offline event queue |
| Mobile Orders | `/api/mobile/*` | Memo assignment, acceptance, delivery |
| Status | `/api/orders/{id}/transition-status` | Field status updates |

The DMS backend owns device registration, sync queue management, and conflict resolution. The mobile app owns local storage, offline capture, and UI. Detailed mobile API documentation is provided separately.

### 1.8.5 Data Ownership Matrix

| Data Domain | System of Record | Sync Direction |
|---|---|---|
| Product master | DMS (seeded from Oracle initially) | Oracle → DMS (initial load); DMS authoritative thereafter |
| Customer master | DMS | Oracle → DMS (optional periodic sync) |
| Employee master | HR/Empress | HR → DMS |
| Inventory/stock | DMS (operational) | Oracle → DMS (receipts); DMS internal (issuance) |
| Orders | DMS | Field Force → DMS (import); DMS authoritative |
| Revenue/sales | DMS (operational) | DMS → Oracle (push) |
| Collections/deposits | DMS | DMS → Oracle/Finance (future) |

### 1.8.6 Integration Security Requirements

- All integration API calls require JWT authentication with `integrations.read` / `integrations.write` permissions
- Idempotency keys prevent duplicate job creation on retry
- Integration credentials must be stored in environment variables or secrets manager (not in source code)
- `INTEGRATION_SANDBOX=false` must be set in production; sandbox mode raises errors instead of silent failures
- All integration events are audit-logged with payload metadata

---

# SECTION 2 — DEPLOYMENT FACTS

---

## 2.1 Infrastructure Prerequisites

### 2.1.1 Server Requirements

| Requirement | Minimum (UAT) | Recommended (Production) |
|---|---|---|
| **CPU** | 4 vCPU | 8+ vCPU |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB SSD | 100+ GB SSD (with growth allowance) |
| **Operating System** | Linux (Ubuntu 22.04 LTS or RHEL 8+) or Windows Server 2019+ with WSL2/Docker Desktop | Linux preferred for production |
| **Network** | Static IP, ports 80/443 accessible to users | Static IP, SSL certificate, firewall rules documented |

### 2.1.2 Software Prerequisites

| Software | Version | Notes |
|---|---|---|
| Docker Engine | 20.10 or later | Required |
| Docker Compose | 2.0 or later | Required |
| Git | Latest | For repository deployment |
| PostgreSQL client (optional) | 16.x | For direct database administration |
| SSL certificate (production) | — | For HTTPS termination at Nginx or load balancer |

### 2.1.3 Network & Port Requirements

| Port | Service | Exposure | Notes |
|---|---|---|---|
| 80 / 443 | Nginx (HTTP/HTTPS) | Public (users) | Primary application access |
| 8081 | Nginx (server overlay) | Public | Alternative port for shared servers |
| 55432 / 55433 | PostgreSQL | Internal only | Database administration |
| 6379 / 6390 | Redis | Internal only | Cache layer |
| 8000 | FastAPI | Internal only | Backend API (via Nginx) |
| 8080 / 8090 | Frontend | Internal only | React app (via Nginx) |

> **Security note:** PostgreSQL and Redis ports should not be exposed to the public internet in production. Access should be restricted to the application server and authorized administrators via VPN or bastion host.

### 2.1.4 Client IT Dependencies (Pre-Deployment)

| Dependency | Owner | Required Before |
|---|---|---|
| Server provisioning | Client IT | Phase 1 — Infrastructure |
| DNS record and SSL certificate | Client IT | Phase 2 — UAT |
| Firewall rules (user access, Oracle connectivity) | Client IT | Phase 2 — UAT |
| Oracle API specifications and credentials | Client IT | Phase 3 — Integration |
| Master data extract (products, customers, depots) | Client IT / Business | Phase 2 — UAT |
| User account list with roles | Client IT / HR | Phase 2 — UAT |
| Field Force export format agreement | Client IT / Business | Phase 3 — Integration |
| DEX mobile app distribution (APK/IPA) | Mobile team | Phase 3 — Pilot |

---

## 2.2 Environment Configuration

### 2.2.1 Environment Variables

The following environment variables must be configured for each deployment environment. **No `.env` files are committed to source control** — they must be created per environment.

#### Backend Variables

| Variable | Development Default | Production Requirement |
|---|---|---|
| `DATABASE_URL` | `postgresql://swift_user:swift_password@postgres:5432/swift_distro_hub` | Production database URL with strong password |
| `REDIS_URL` | `redis://redis:6379/0` | Production Redis URL |
| `SECRET_KEY` | `your-secret-key-change-in-production` | **Must be changed** — application refuses startup with default key when `ENVIRONMENT=production` |
| `ENVIRONMENT` | `development` | `production` |
| `CORS_ORIGINS` | `http://localhost,...` | Comma-separated list of allowed frontend origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | As per security policy |
| `REQUIRE_AUTH` | `true` | `true` (never disable in production) |
| `INTEGRATION_SANDBOX` | `true` | `false` (once integrations configured) |

#### Frontend Variables

| Variable | Development Default | Production Requirement |
|---|---|---|
| `VITE_API_URL` | `/api` | `/api` (relative, via Nginx proxy) |
| `VITE_DEV_PORT` | `8080` | `8080` |
| `VITE_DISABLE_HMR` | `0` | `1` (disable hot module reload on server) |

#### Docker Compose Port Overrides

For shared servers, use `deploy.server.env`:

```
POSTGRES_HOST_PORT=55433
REDIS_HOST_PORT=6390
NGINX_HTTP_PORT=8081
FRONTEND_HOST_PORT=8090
```

### 2.2.2 Production Security Checklist

Before go-live, the following must be verified:

- [ ] `SECRET_KEY` set to a cryptographically strong random value (minimum 32 characters)
- [ ] `ENVIRONMENT=production` configured
- [ ] `REQUIRE_AUTH=true` confirmed
- [ ] `CORS_ORIGINS` restricted to production domain(s) only
- [ ] Default database password (`swift_password`) changed
- [ ] PostgreSQL port not exposed to public internet
- [ ] Redis port not exposed to public internet
- [ ] SSL/TLS configured (at Nginx or upstream load balancer)
- [ ] `INTEGRATION_SANDBOX=false` once Oracle credentials are configured
- [ ] Database backup schedule established
- [ ] Log retention policy defined

---

## 2.3 Deployment Topology

### 2.3.1 Local / Development Deployment

```bash
# Clone repository
git clone <repository-url>
cd distribution_reneta_webapp

# Start all services
docker-compose up -d --build

# Seed sample data (optional, for development/UAT)
docker exec swift_distro_api python -m db.seed_all_data
```

**Access URLs (development):**

| Resource | URL |
|---|---|
| Application | http://localhost |
| API Documentation | http://localhost/api/docs |
| Health Check | http://localhost/api/health |
| Frontend (direct) | http://localhost:9080 |

### 2.3.2 Server / Production Deployment

For production or shared server deployment, use the server overlay compose file:

```bash
docker compose --env-file deploy.server.env \
  -f docker-compose.yml \
  -f docker-compose.server.yml \
  up -d --build
```

**Access URLs (server deployment example):**

| Resource | URL |
|---|---|
| Application | http://<server-ip>:8081 |
| API Documentation | http://<server-ip>:8081/api/docs |

### 2.3.3 Database Bootstrap Sequence

Execute in order after first deployment:

| Step | Command | Purpose |
|---|---|---|
| 1 | `docker-compose up -d` | Start containers; schema auto-created on backend startup |
| 2 | `docker exec swift_distro_api python -m db.seed_master_data` | Load companies, depots, products, customers, employees |
| 3 | `docker exec swift_distro_api python -m db.seed_test_users` | Create admin and role-based test users (UAT only) |
| 4 | Apply `001_platform_hardening.sql` if needed | Platform extension tables |
| 5 | Import production master data | Replace seed data with client production values |

The `seed_master_data` script is **idempotent** — re-running updates existing records by code without creating duplicates.

### 2.3.4 Nginx Timeout Configuration

| Upstream | Connect Timeout | Read/Send Timeout | Retry |
|---|---|---|---|
| Frontend (Vite) | 10 seconds | 60 seconds | 3 attempts |
| Backend (FastAPI) | 60 seconds | 60 seconds | — |
| Max request body | — | 20 MB | — |

---

## 2.4 Roll-Out Strategy

A phased roll-out is recommended to minimize operational risk and allow iterative validation.

### Phase 1 — Infrastructure & Core Platform (Week 1–2)

**Objective:** Establish hosting environment and validate core platform functionality.

| Activity | Deliverable |
|---|---|
| Provision server per prerequisites | Server accessible with Docker installed |
| Deploy Docker stack | All five containers healthy |
| Configure production environment variables | Security checklist completed |
| Apply database schema and seed master data | Master data loaded |
| Verify health endpoints and API documentation | `/health` returns 200 OK |
| Create admin user accounts | Admin login functional |

**Exit criteria:** Application accessible via browser; admin can log in; master data visible in Settings screens.

### Phase 2 — UAT & Core Workflow Validation (Week 3–5)

**Objective:** Validate end-to-end distribution workflows with business users.

| Activity | Deliverable |
|---|---|
| Load production master data (products, customers, depots, routes) | Production-equivalent master data |
| Create user accounts for all roles | Role-based access verified |
| UAT: Order entry → validation → memo print | Workflow sign-off |
| UAT: Route assignment → loading → dispatch | Workflow sign-off |
| UAT: Delivery → collection → deposit | Workflow sign-off |
| UAT: Reconciliation and day-end closing | Finance sign-off |
| UAT: Stock receipt, issuance, adjustment | Warehouse sign-off |
| Address UAT defects | Defect log cleared or deferred with approval |

**Exit criteria:** Business sign-off on core workflows; no critical defects open.

### Phase 3 — Integration & Mobile Pilot (Week 6–8)

**Objective:** Connect external systems and pilot mobile field operations.

| Activity | Deliverable |
|---|---|
| Configure Oracle adapter with client IT credentials | Inventory pull tested |
| Configure revenue push to Oracle | Revenue push tested |
| Field Force order import testing | Import workflow validated |
| HR/Empress employee sync | Employee data synchronized |
| DEX mobile app pilot (1–2 routes) | Mobile delivery and collection tested |
| Offline sync and conflict resolution testing | Sync queue validated |

**Exit criteria:** Integration jobs completing successfully; mobile pilot users operational.

### Phase 4 — Production Go-Live (Week 9–10)

**Objective:** Cut over to production operations.

| Activity | Deliverable |
|---|---|
| Final production data migration | Live master data loaded |
| Production user training completed | Training attendance records |
| Go-live support plan activated | Support team on standby |
| Parallel run (optional, 1 week) | Dual-system validation |
| Production cutover | Legacy system decommissioned (per client plan) |
| Post-go-live hypercare (2 weeks) | Issue log and resolution |

**Exit criteria:** Production operations running on Swift Distribution Hub; hypercare period completed.

---

## 2.5 Timeline Dependencies

The following dependencies can block or delay deployment phases. Early engagement with responsible parties is essential.

| Dependency ID | Description | Owner | Impacts Phase | Lead Time |
|---|---|---|---|---|
| DEP-01 | Server provisioning and OS installation | Client IT | Phase 1 | 1–2 weeks |
| DEP-02 | SSL certificate issuance | Client IT | Phase 2 | 1 week |
| DEP-03 | Firewall rules for user access | Client IT | Phase 2 | 3–5 days |
| DEP-04 | Production master data extract (products, customers) | Client Business / IT | Phase 2 | 2–3 weeks |
| DEP-05 | User role matrix and account list | Client HR / IT | Phase 2 | 1 week |
| DEP-06 | Oracle API documentation and credentials | Client IT (Oracle team) | Phase 3 | 3–4 weeks |
| DEP-07 | Oracle UAT environment access | Client IT | Phase 3 | 2 weeks |
| DEP-08 | Field Force export format and sample data | Client IT / Business | Phase 3 | 2 weeks |
| DEP-09 | DEX mobile app build for pilot devices | Mobile team | Phase 3 | 1–2 weeks |
| DEP-10 | Business UAT resource allocation | Client Business | Phase 2 | Ongoing |
| DEP-11 | Finance sign-off on reconciliation rules | Client Finance | Phase 2 | 1 week |
| DEP-12 | Training schedule and venue | Client HR / Business | Phase 4 | 1 week |
| DEP-13 | Legacy system cutover plan | Client IT | Phase 4 | 2 weeks |

> **Critical path:** DEP-04 (master data) and DEP-06 (Oracle credentials) are typically the longest-lead items and should be initiated at project kickoff.

---

## 2.6 Post-Deployment Verification

After each deployment (UAT or production), execute the following verification checklist:

### Infrastructure Verification

```bash
# Container health
docker-compose ps

# API health
curl http://<host>/api/health

# Database connectivity
docker exec swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "SELECT 1;"
```

### Functional Smoke Test

| # | Test | Expected Result |
|---|---|---|
| 1 | Login as admin | Dashboard loads |
| 2 | Navigate to Settings → Products | Product list populated |
| 3 | Create draft order | Order saved with draft status |
| 4 | Validate order | Validation rules execute; status updated |
| 5 | View Route-Wise Memo List | Validated orders appear by route |
| 6 | Assign order to vehicle | Assignment recorded |
| 7 | View Audit Logs | Login and order events logged |
| 8 | Access API docs | Swagger UI loads at `/api/docs` |

### Automated Test Suite

Backend automated tests can be run to verify core logic:

```bash
cd backend
DATABASE_URL="sqlite:///:memory:" SECRET_KEY="test-secret" python -m pytest tests/ -v
```

**Current test coverage (14 tests):** Authentication/RBAC, order validation, status transitions, stock reservation, depot scoping, order lifecycle.

---

# SECTION 3 — EXCEPTION HANDLING

---

## 3.1 Exception Handling Philosophy

Swift Distribution Hub is designed for high-volume distribution operations where exceptions are expected, not exceptional. The system's exception handling strategy follows these principles:

1. **Fail visibly, not silently** — Errors return explicit messages; sandbox integrations do not fake success.
2. **Preserve data integrity** — Invalid state transitions are blocked; stock reservations prevent overselling.
3. **Enable manual recovery** — Managers can approve exceptions, retry failed jobs, and override where authorized.
4. **Audit everything** — All exceptions, overrides, and retries are logged for compliance.
5. **Graceful degradation** — Non-critical services (Redis) can fail without stopping core operations.

---

## 3.2 Order Validation Exceptions

### 3.2.1 Validation Failure Workflow

```
Order Submitted for Validation
         │
         ▼
┌─────────────────────────┐
│  Run Validation Rules   │
│  (11 default rules)     │
└────────────┬────────────┘
             │
    ┌────────┼────────┬──────────────┐
    ▼        ▼        ▼              ▼
VALIDATED  PENDING   REJECTED      FAILED
           APPROVAL
    │        │        │              │
    ▼        ▼        ▼              ▼
 Auto-     Await     User must     Technical
 proceed   Manager   correct       investigation
           Approval  order data    required
```

### 3.2.2 Exception Scenarios & Resolution

| Scenario | System Behavior | Resolution Path |
|---|---|---|
| Customer credit limit exceeded | Validation status: `PENDING_APPROVAL`; order blocked | Manager with `orders.approve_exception` permission approves via Order List or API |
| Customer has overdue balance | Validation status: `PENDING_APPROVAL` or `REJECTED` (rule config) | Finance reviews customer account; approves exception or customer pays outstanding balance |
| Insufficient stock | Validation status: `REJECTED`; FEFO allocation fails | Warehouse replenishes stock; user re-validates order |
| Product inactive | Validation status: `REJECTED` | Activate product in master data or remove from order |
| Price not found | Validation status: `REJECTED` | Configure price setup for product/customer combination |
| High-value order (> BDT 500,000) | Warning flagged; may require approval depending on config | Manager reviews and approves |
| Discount exceeds limit | Warning flagged | Manager reviews discount authorization |
| Credit period violation (order on days 8–31) | Validation status: `REJECTED` | Wait until credit period window (days 1–7) or request exception approval |
| Promotion conflict | Warning flagged | Review promotion rules; adjust order or approve |

### 3.2.3 Manual Exception Approval

**API:** `POST /api/orders/{id}/approve-exception`  
**Permission required:** `orders.approve_exception`  
**Typical roles:** `admin`, `manager`

**Process:**
1. Validator or system flags order as `PENDING_APPROVAL`
2. Manager reviews validation messages in Order Detail or Validation Result screen
3. Manager approves exception with optional comment
4. System transitions order to `VALIDATED` status
5. FEFO stock reservation executes
6. Approval logged to audit trail

---

## 3.3 Status & Workflow Discrepancies

### 3.3.1 Invalid Status Transitions

The status state machine rejects invalid transitions with HTTP 400 and a descriptive error message.

| Discrepancy | Example | System Response | Resolution |
|---|---|---|---|
| Skip workflow step | Attempt to dispatch before picking | HTTP 400: invalid event for current status | Complete preceding steps in order |
| Reverse completed status | Attempt to cancel delivered order | HTTP 400: transition not allowed | Create refund/credit note via Refunds module |
| Unauthorized transition | User without `mobile.access` attempts field delivery update | HTTP 403: permission denied | Assign appropriate role or have authorized user perform action |
| Concurrent updates | Two users transition same order simultaneously | Last write wins; status history records both attempts | Review status history; correct if needed |

### 3.3.2 Collection Status Discrepancies

The system maintains both a new `delivery_status` enum and a legacy `collection_status` string field for backward compatibility. A mapping layer (`LEGACY_COLLECTION_MAP`) synchronizes the two fields.

| Discrepancy | Resolution |
|---|---|
| Collection status mismatch between UI and database | Status service re-syncs on next transition; check `order_status_history` |
| Partial collection recorded | Order remains in `COLLECTION_IN_PROGRESS`; remaining amount tracked |
| Postponed delivery | Status set to `POSTPONED`; order returns to assignment queue |

### 3.3.3 Reconciliation Variances

| Variance Type | Detection | Resolution |
|---|---|---|
| Cash short | Reconciliation line shows negative variance | Driver/depositor explains; manager approves or rejects reconciliation |
| Cash over | Reconciliation line shows positive variance | Investigate duplicate collection; adjust or refund |
| Missing collection | Order in `DELIVERED_NOT_COLLECTED` at day-end | Escalate to collection team; mark as `DUE_COLLECTION` |
| Day-end not closed | Reconciliation runs remain open | Manager must approve or reject all pending reconciliations before day-end close |

---

## 3.4 System Timeouts & Connectivity Failures

### 3.4.1 Timeout Configuration

| Layer | Timeout | Behavior on Timeout |
|---|---|---|
| Nginx → Frontend | Connect: 10s; Read/Send: 60s | Retry up to 3 times; return 502 to user |
| Nginx → Backend API | Connect/Send/Read: 60s | Return 504 Gateway Timeout |
| PostgreSQL healthcheck | 5s | Container marked unhealthy; dependent services wait |
| Redis healthcheck | 5s | Container marked unhealthy |
| Frontend API client | Browser default | User sees error toast; can retry action |

### 3.4.2 Connectivity Failure Scenarios

| Scenario | System Behavior | User Impact | Recovery |
|---|---|---|---|
| Backend API unreachable | Nginx returns 502/504; frontend shows error toast | Operations blocked | Restart backend container; check logs |
| Database connection lost | API returns 500; SQLAlchemy `pool_pre_ping` attempts reconnect | Operations blocked | Verify PostgreSQL container; check `DATABASE_URL` |
| Redis unavailable | Backend logs warning; continues with `redis_client = None` | Caching disabled; core operations continue | Restart Redis container |
| Frontend dev server crash | Nginx returns 502 after retries | UI unavailable | Restart frontend container |
| Long-running report/query | May hit 60s Nginx timeout | Report fails with timeout error | Optimize query; run report during off-peak; increase timeout if justified |

### 3.4.3 Recommended Operational Response

```
Timeout/Connectivity Error Detected
         │
         ▼
┌─────────────────────────┐
│  Check container health │
│  docker-compose ps      │
└────────────┬────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
Container down    Container running
    │                 │
    ▼                 ▼
Restart service   Check logs
docker-compose    docker-compose logs <service>
restart <service>
    │                 │
    └────────┬────────┘
             ▼
    Retry operation
    If persistent → escalate to support
```

---

## 3.5 Integration & Sync Failures

### 3.5.1 Integration Job Failure Workflow

```
Integration API Called (e.g., Oracle inventory pull)
         │
         ▼
┌─────────────────────────┐
│  Create Integration Job │
│  (with idempotency key) │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Execute Adapter        │
└────────────┬────────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
SUCCESS   SANDBOX   FAILED
    │        │        │
    ▼        ▼        ▼
 Complete  Return    Record in
           explicit  integration_failures
           message   Job status: FAILED
                     │
                     ▼
              ┌──────────────────┐
              │ Manual Retry via │
              │ POST /jobs/{id}/ │
              │ retry            │
              └──────────────────┘
```

### 3.5.2 Integration Failure Scenarios

| Scenario | Detection | Resolution |
|---|---|---|
| Oracle API unreachable | Job status `FAILED`; error in `integration_failures` | Verify network/firewall; check Oracle middleware status; retry job |
| Invalid Oracle response format | Adapter parsing error; job `FAILED` | Review data mapping; coordinate with Oracle team |
| Sandbox mode in production | `RuntimeError` raised when `INTEGRATION_SANDBOX=false` | Configure production adapter with credentials |
| Duplicate job submission | Idempotency key match; existing job returned | No action needed; check existing job status |
| Field Force import with invalid customer | Validation fails on imported order | Correct customer master data; re-import |
| HR employee sync conflict | Duplicate employee code | Review employee master; resolve conflict manually |

### 3.5.3 Mobile Sync Failure Workflow

| Scenario | Detection | Resolution |
|---|---|---|
| Sync event failed | `sync_queue` status `FAILED` with `error_message` | Retry via `POST /api/sync/failures/{id}/retry` |
| Sync conflict (duplicate event) | Recorded in `sync_conflicts` | Review conflict; manual resolution |
| Device blocked | Login/sync returns 403 | Admin unblocks device via `/api/devices/{id}/block` |
| Offline data stale | Checkpoint timestamp older than threshold | Force full sync pull |

---

## 3.6 Manual Override Workflows

The following manual override capabilities are built into the system for authorized users:

| Override Type | Trigger | Authorized Role | API / UI Path | Audit |
|---|---|---|---|---|
| Validation exception approval | Credit/stock/warning rules block order | Manager, Admin | `POST /api/orders/{id}/approve-exception` | Yes |
| Forced status transition | Internal system auto-transition after validation | System (force=True) | Internal API call | Yes |
| Reconciliation rejection | Variance unacceptable | Manager, Finance | Reconciliation screen → Reject | Yes |
| Device block/unblock | Security concern or device loss | Admin | `/api/devices/{id}/block` | Yes |
| Integration job retry | Failed Oracle/sync job | Admin, Integration operator | `/api/integrations/jobs/{id}/retry` | Yes |
| Validation rule disable | Temporary rule suspension | Admin | `/api/orders/validation-rules` PUT | Yes |
| Manual stock adjustment | Physical count discrepancy | Warehouse manager | Stock Adjustment screen | Yes |
| Manual pricing entry | Price not in system | Order entry user | Order Delivery Detail fallback UI | Partial |

### 3.6.1 Override Authorization Matrix

| Action | admin | manager | billing | finance | transport | user |
|---|---|---|---|---|---|---|
| Approve validation exception | ✓ | ✓ | — | — | — | — |
| Reject reconciliation | ✓ | ✓ | — | ✓ | — | — |
| Retry integration job | ✓ | — | — | — | — | — |
| Block mobile device | ✓ | — | — | — | — | — |
| Disable validation rule | ✓ | — | — | — | — | — |
| Stock adjustment | ✓ | ✓ | — | — | — | ✓* |

*Within assigned depot scope.

---

## 3.7 Mobile & Offline Edge Cases

| Edge Case | System Behavior | Resolution |
|---|---|---|
| Memo accepted on device | Permanent acceptance; no API to unaccept | Contact admin for order status correction if accepted in error |
| Delivery recorded offline | Event queued in `sync_queue`; synced on reconnect | Automatic on connectivity restore; retry if failed |
| Duplicate delivery submission | Idempotency key prevents duplicate processing | Second submission ignored |
| Device not registered | API returns 403 | Register device via `/api/devices/register` |
| User logged in on multiple devices | Each device has separate sync checkpoint | Normal operation; no conflict |
| Partial delivery | Status reflects partial delivery; remaining qty tracked | Complete delivery on subsequent visit |

---

## 3.8 Audit, Escalation & Recovery

### 3.8.1 Audit Trail Access

All exception handling actions are recorded in the `audit_logs` table and accessible via:

- **UI:** Platform → Audit Logs (`/platform/audit-logs`)
- **API:** `GET /api/audit-logs` with filters for entity type, action, user, date range

### 3.8.2 Escalation Matrix

| Severity | Examples | First Responder | Escalation | SLA |
|---|---|---|---|---|
| **Critical** | System down, database unreachable, data corruption | IT Operations | Development team | 1 hour |
| **High** | Oracle integration failing, mass validation failures | Integration operator | Client IT (Oracle team) | 4 hours |
| **Medium** | Individual order stuck, reconciliation variance | Depot manager | Regional manager | 1 business day |
| **Low** | UI display issue, report timeout | End user | IT helpdesk | 2 business days |

### 3.8.3 Data Recovery Procedures

| Scenario | Recovery Procedure |
|---|---|
| Accidental order cancellation | Review `order_status_history`; create new order if needed |
| Failed database migration | Restore from backup; re-apply migration |
| Corrupted seed data | Run `docker-compose down -v` (destroys data); redeploy and re-seed |
| Lost integration job data | Review `integration_job_logs`; retry from last successful checkpoint |
| Audit log integrity concern | Audit logs are append-only; contact development team for forensic review |

### 3.8.4 Known Limitations & Planned Improvements

The following limitations are documented for transparency and client planning:

| Limitation | Impact | Mitigation / Roadmap |
|---|---|---|
| Integration adapters in sandbox mode | No live Oracle/Field Force data exchange | Configure production adapters when client IT provides credentials |
| 53 of 65 reports use placeholder handlers | Some reports return sample data | Prioritize reports by business need; implement live queries incrementally |
| Stock reservation edge cases at validation | Rare oversell risk in concurrent scenarios | Validation checks prevent most cases; stock issuance is authoritative |
| Audit middleware not on all legacy endpoints | Some older write endpoints may not be audit-logged | Extend middleware coverage in future sprint |
| Depot scoping not on all list endpoints | Non-admin may see data outside depot in some screens | Apply depot filter to remaining endpoints |
| No automated CI/CD pipeline | Manual deployment required | Establish CI/CD in infrastructure planning |
| No frontend automated tests | UI regressions caught manually | Vitest infrastructure exists; test coverage planned |

---

# APPENDICES

---

## Appendix A — API Endpoint Summary

| Module | Base Path | Auth Required |
|---|---|---|
| Authentication | `/api/auth` | Partial (login public) |
| Master Data | `/api/companies`, `/depots`, `/employees`, etc. | Yes |
| Orders | `/api/orders` | Yes |
| Validation | `/api/orders/{id}/validate`, `/approve-exception` | Yes |
| Status | `/api/orders/{id}/transition-status` | Yes |
| Stock | `/api/stock/*`, `/product-item-stock` | Yes |
| Distribution | `/api/vehicles`, `/drivers`, `/routes`, `/vehicle/loadings` | Yes |
| Billing | `/api/invoices`, `/billing`, `/collection-deposits` | Yes |
| Reconciliation | `/api/reconciliation` | Yes |
| Integrations | `/api/integrations` | Yes |
| Mobile/Sync | `/api/mobile`, `/api/sync`, `/api/devices` | Yes |
| Reports | `/api/reports` | Yes |
| Audit | `/api/audit-logs` | Yes |

Full API documentation available at `/api/docs` (Swagger UI) on any deployed instance.

---

## Appendix B — Default Test Credentials (UAT Only)

| Email | Password | Role |
|---|---|---|
| admin@swiftdistro.com | admin123 | admin |

> **Warning:** Change or disable test accounts before production go-live.

---

## Appendix C — Document Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | June 16, 2026 | Development Team | Initial release — Technical Specs, Deployment Facts, Exception Handling |

---

## Appendix D — Related Documentation

| Document | Location | Purpose |
|---|---|---|
| README | `README.md` | Project overview and quick start |
| Environment Setup | `ENV_SETUP.md` | Environment variable reference |
| Deployment Guide | `docs/DEPLOYMENT.md` | Backend deployment steps |
| Database Seeding | `DATABASE_SEEDING_GUIDE.md` | Data seeding procedures |
| Docker Quick Start | `QUICK_START_DOCKER.md` | Container setup guide |
| Mobile API Guide | `MOBILE_APP_API_INTEGRATION_GUIDE.md` | DEX mobile integration |
| Platform Hardening Report | `DMS_CRITICAL_GAP_FIXING_REPORT.md` | Security and QA completion report |
| Workflow Verification | `WORKFLOW_VERIFICATION.md` | End-to-end workflow validation |

---

*End of Document*

---

**Swift Distribution Hub — Client Technical & Operations Documentation v1.0**  
*Confidential — For authorized client personnel only*
