-- Reconciled public-schema baseline for Alembic revision d4_baseline.
-- Generated from the PostgreSQL 16 catalog of swift_distro_hub on 2026-11-25.
-- Schema only: no rows, no passwords, no sequence counters, no data updates.
-- Do not apply this script to the live database swift_distro_hub.

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: collectiontypeenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.collectiontypeenum AS ENUM (
    'FULLY_COLLECTED',
    'PARTIAL_COLLECTION',
    'POSTPONED'
);


--
-- Name: deliverystatusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.deliverystatusenum AS ENUM (
    'DRAFT',
    'PACKING',
    'LOADING',
    'SHIPPED',
    'DELIVERED'
);


--
-- Name: depositmethodenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.depositmethodenum AS ENUM (
    'BRAC',
    'BKASH',
    'NAGAD'
);


--
-- Name: depottransferstatusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.depottransferstatusenum AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'IN_TRANSIT',
    'RECEIVED',
    'CANCELLED'
);


--
-- Name: devicestatusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.devicestatusenum AS ENUM (
    'ACTIVE',
    'BLOCKED',
    'PENDING'
);


--
-- Name: integrationjobstatusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.integrationjobstatusenum AS ENUM (
    'PENDING',
    'RUNNING',
    'SUCCESS',
    'FAILED',
    'RETRY'
);


--
-- Name: orderstatusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.orderstatusenum AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'PARTIALLY_APPROVED'
);


--
-- Name: priorityenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.priorityenum AS ENUM (
    'HIGH',
    'MEDIUM',
    'LOW'
);


--
-- Name: productreceiptstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.productreceiptstatus AS ENUM (
    'DRAFT',
    'APPROVED'
);


--
-- Name: promotionstatusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promotionstatusenum AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'ACTIVE',
    'INACTIVE',
    'REJECTED'
);


--
-- Name: receiptsourceenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.receiptsourceenum AS ENUM (
    'FACTORY',
    'DEPOT',
    'RETURN'
);


--
-- Name: reconciliationstatusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reconciliationstatusenum AS ENUM (
    'DRAFT',
    'PENDING_VERIFICATION',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'CLOSED'
);


--
-- Name: risklevelenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.risklevelenum AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


--
-- Name: roletypeenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.roletypeenum AS ENUM (
    'NSH',
    'TSM',
    'RSM',
    'DSM',
    'SM',
    'SO'
);


--
-- Name: synceventstatusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.synceventstatusenum AS ENUM (
    'PENDING',
    'PROCESSED',
    'FAILED',
    'CONFLICT'
);


--
-- Name: validationstatusenum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.validationstatusenum AS ENUM (
    'PENDING',
    'VALIDATED',
    'PENDING_APPROVAL',
    'REJECTED',
    'FAILED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    transaction_id character varying(64) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(100) NOT NULL,
    action character varying(100) NOT NULL,
    old_value jsonb,
    new_value jsonb,
    user_id integer,
    user_name character varying(255),
    role_id character varying(50),
    role_name character varying(100),
    depot_id integer,
    depot_code character varying(50),
    device_id character varying(100),
    ip_address character varying(45),
    user_agent text,
    geo_latitude numeric(10,7),
    geo_longitude numeric(10,7),
    reason text,
    remarks text,
    attachment_url character varying(500),
    created_at timestamp without time zone NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: chemist_shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chemist_shops (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    owner_name character varying(255) NOT NULL,
    license_number character varying(100),
    email character varying(255),
    phone character varying(50),
    address text,
    city character varying(100),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: chemist_shops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chemist_shops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chemist_shops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chemist_shops_id_seq OWNED BY public.chemist_shops.id;


--
-- Name: collection_deposits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_deposits (
    id integer NOT NULL,
    deposit_number character varying(50) NOT NULL,
    deposit_date date NOT NULL,
    collection_person_id integer NOT NULL,
    deposit_method public.depositmethodenum NOT NULL,
    deposit_amount numeric(15,2) NOT NULL,
    transaction_number character varying(100) NOT NULL,
    attachment_url character varying(500),
    remaining_amount numeric(15,2) NOT NULL,
    total_collection_amount numeric(15,2) NOT NULL,
    notes text,
    approved boolean,
    approved_by integer,
    approved_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    rejected boolean DEFAULT false,
    rejected_at timestamp without time zone
);


--
-- Name: collection_deposits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collection_deposits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collection_deposits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collection_deposits_id_seq OWNED BY public.collection_deposits.id;


--
-- Name: collection_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_transactions (
    id integer NOT NULL,
    order_id integer NOT NULL,
    collection_person_id integer NOT NULL,
    collection_date date NOT NULL,
    collection_type public.collectiontypeenum NOT NULL,
    collected_amount numeric(15,2) NOT NULL,
    pending_amount numeric(15,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    deposit_id integer,
    remarks text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: collection_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collection_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collection_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collection_transactions_id_seq OWNED BY public.collection_transactions.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    pincode character varying(20),
    phone character varying(50),
    email character varying(255),
    gstin character varying(20),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: customer_credit_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_credit_balances (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    balance_amount numeric(15,2),
    last_updated_at timestamp without time zone
);


--
-- Name: customer_credit_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_credit_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_credit_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_credit_balances_id_seq OWNED BY public.customer_credit_balances.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    type character varying(50),
    address text,
    ship_to_party text,
    sold_to_party text,
    city character varying(100),
    state character varying(100),
    pincode character varying(20),
    phone character varying(50),
    email character varying(255),
    gstin character varying(20),
    credit_limit numeric(15,2),
    priority public.priorityenum,
    delivery_status_block boolean,
    delivery_status_open boolean,
    credit_status_cash boolean,
    credit_status_credit boolean,
    payment_days integer,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: day_end_closings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.day_end_closings (
    id integer NOT NULL,
    depot_id integer NOT NULL,
    closing_date date NOT NULL,
    total_assignments integer,
    total_delivered_value numeric(15,2),
    total_collection_value numeric(15,2),
    total_return_value numeric(15,2),
    total_deposit_value numeric(15,2),
    total_variance numeric(15,2),
    status character varying(50),
    closed_by integer,
    approved_by integer,
    created_at timestamp without time zone,
    approved_at timestamp without time zone
);


--
-- Name: day_end_closings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.day_end_closings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: day_end_closings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.day_end_closings_id_seq OWNED BY public.day_end_closings.id;


--
-- Name: delivery_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_order_items (
    id integer NOT NULL,
    delivery_id integer,
    order_item_id integer NOT NULL,
    product_id integer NOT NULL,
    product_name character varying(255) NOT NULL,
    legacy_code character varying(50),
    new_code character varying(50),
    pack_size character varying(50),
    uom character varying(20),
    batch_number character varying(100) NOT NULL,
    expiry_date date,
    ordered_quantity numeric(10,2) NOT NULL,
    delivery_quantity numeric(10,2) NOT NULL,
    picked_quantity numeric(10,2) NOT NULL,
    available_stock numeric(10,2),
    free_goods_threshold numeric(12,2),
    free_goods_quantity numeric(12,2),
    free_goods_awarded numeric(12,2),
    product_rate numeric(12,2),
    trade_amount numeric(14,2),
    vat_amount numeric(14,2),
    status character varying(50),
    created_at timestamp without time zone
);


--
-- Name: delivery_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_order_items_id_seq OWNED BY public.delivery_order_items.id;


--
-- Name: delivery_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_orders (
    id integer NOT NULL,
    order_id integer NOT NULL,
    delivery_number character varying(50) NOT NULL,
    ship_to_party character varying(255),
    sold_to_party character varying(255),
    delivery_date date NOT NULL,
    planned_dispatch_time character varying(10),
    vehicle_info character varying(100),
    driver_name character varying(100),
    warehouse_no character varying(50),
    vehicle_id integer,
    driver_id integer,
    status public.deliverystatusenum,
    remarks text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: delivery_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_orders_id_seq OWNED BY public.delivery_orders.id;


--
-- Name: depot_transfer_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depot_transfer_items (
    id integer NOT NULL,
    transfer_id integer NOT NULL,
    product_id integer NOT NULL,
    batch_number character varying(100),
    expiry_date date,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(12,2),
    created_at timestamp without time zone
);


--
-- Name: depot_transfer_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.depot_transfer_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: depot_transfer_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.depot_transfer_items_id_seq OWNED BY public.depot_transfer_items.id;


--
-- Name: depot_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depot_transfers (
    id integer NOT NULL,
    transfer_number character varying(50) NOT NULL,
    transfer_date date NOT NULL,
    from_depot_id integer NOT NULL,
    to_depot_id integer NOT NULL,
    vehicle_id integer,
    driver_name character varying(100),
    status public.depottransferstatusenum,
    transfer_note text,
    remarks text,
    approved_by integer,
    approved_at timestamp without time zone,
    received_by integer,
    received_at timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: depot_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.depot_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: depot_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.depot_transfers_id_seq OWNED BY public.depot_transfers.id;


--
-- Name: depots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depots (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    company_id integer,
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(20),
    phone character varying(50),
    email character varying(255),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: depots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.depots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: depots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.depots_id_seq OWNED BY public.depots.id;


--
-- Name: device_login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_login_attempts (
    id integer NOT NULL,
    user_id integer,
    device_id character varying(100),
    attempt_status character varying(50) NOT NULL,
    ip_address character varying(45),
    geo_latitude numeric(10,7),
    geo_longitude numeric(10,7),
    created_at timestamp without time zone
);


--
-- Name: device_login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.device_login_attempts_id_seq OWNED BY public.device_login_attempts.id;


--
-- Name: doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    specialization character varying(255) NOT NULL,
    registration_number character varying(100) NOT NULL,
    qualification character varying(255),
    email character varying(255),
    phone character varying(50),
    address text,
    city character varying(100),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: doctors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.doctors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: doctors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.doctors_id_seq OWNED BY public.doctors.id;


--
-- Name: drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drivers (
    id integer NOT NULL,
    driver_id character varying(50) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100),
    license_number character varying(50) NOT NULL,
    license_expiry date,
    contact character varying(20),
    vehicle_id character varying(50),
    route character varying(255),
    status character varying(50),
    is_active boolean,
    email character varying(255),
    address text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: drivers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.drivers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: drivers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.drivers_id_seq OWNED BY public.drivers.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    employee_id character varying(50) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100),
    email character varying(255),
    phone character varying(20),
    hashed_password character varying(255),
    department character varying(100),
    designation character varying(100),
    role character varying(50),
    depot_id integer,
    role_master_id integer,
    is_active boolean,
    is_blocked boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: external_order_refs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_order_refs (
    id integer NOT NULL,
    source_system character varying(50) NOT NULL,
    external_order_id character varying(100) NOT NULL,
    order_id integer NOT NULL,
    created_at timestamp without time zone
);


--
-- Name: external_order_refs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_order_refs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_order_refs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_order_refs_id_seq OWNED BY public.external_order_refs.id;


--
-- Name: integration_failures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_failures (
    id integer NOT NULL,
    job_id integer,
    system_code character varying(50) NOT NULL,
    error_code character varying(100),
    error_message text NOT NULL,
    payload_json jsonb,
    resolved boolean,
    created_at timestamp without time zone
);


--
-- Name: integration_failures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_failures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_failures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_failures_id_seq OWNED BY public.integration_failures.id;


--
-- Name: integration_job_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_job_logs (
    id integer NOT NULL,
    job_id integer NOT NULL,
    level character varying(20),
    message text NOT NULL,
    created_at timestamp without time zone
);


--
-- Name: integration_job_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_job_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_job_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_job_logs_id_seq OWNED BY public.integration_job_logs.id;


--
-- Name: integration_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_jobs (
    id integer NOT NULL,
    system_id integer NOT NULL,
    job_type character varying(100) NOT NULL,
    idempotency_key character varying(100),
    status public.integrationjobstatusenum,
    payload_json jsonb,
    result_json jsonb,
    retry_count integer,
    max_retries integer,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone
);


--
-- Name: integration_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_jobs_id_seq OWNED BY public.integration_jobs.id;


--
-- Name: integration_systems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_systems (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    adapter_class character varying(255),
    config_json jsonb,
    is_active boolean,
    created_at timestamp without time zone
);


--
-- Name: integration_systems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_systems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_systems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_systems_id_seq OWNED BY public.integration_systems.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    customer_id integer,
    depot_id integer,
    issuance_id integer,
    amount numeric(15,2) NOT NULL,
    mode character varying(50),
    status character varying(50),
    due_date date,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: login_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_audits (
    id integer NOT NULL,
    user_id integer,
    email character varying(255),
    success boolean,
    failure_reason character varying(255),
    ip_address character varying(45),
    user_agent text,
    device_id character varying(100),
    created_at timestamp without time zone
);


--
-- Name: login_audits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_audits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_audits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_audits_id_seq OWNED BY public.login_audits.id;


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    category character varying(100),
    unit_of_measure character varying(20),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materials_id_seq OWNED BY public.materials.id;


--
-- Name: mobile_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobile_devices (
    id integer NOT NULL,
    user_id integer NOT NULL,
    device_id character varying(100) NOT NULL,
    imei_or_hardware_id character varying(100),
    device_name character varying(255),
    platform character varying(50),
    app_version character varying(50),
    status public.devicestatusenum,
    registered_at timestamp without time zone,
    last_seen_at timestamp without time zone,
    blocked_at timestamp without time zone,
    blocked_by integer,
    block_reason text
);


--
-- Name: mobile_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mobile_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mobile_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mobile_devices_id_seq OWNED BY public.mobile_devices.id;


--
-- Name: order_batch_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_batch_allocations (
    id integer NOT NULL,
    validation_run_id integer,
    order_id integer NOT NULL,
    order_item_id integer NOT NULL,
    product_id integer NOT NULL,
    batch_no character varying(100) NOT NULL,
    expiry_date date,
    allocated_qty numeric(12,2) NOT NULL,
    stock_source_id integer,
    allocation_status character varying(50),
    created_at timestamp without time zone
);


--
-- Name: order_batch_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_batch_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_batch_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_batch_allocations_id_seq OWNED BY public.order_batch_allocations.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer,
    product_code character varying(50) NOT NULL,
    product_name character varying(255) NOT NULL,
    pack_size character varying(100),
    quantity numeric(12,2) NOT NULL,
    free_goods numeric(12,2),
    total_quantity numeric(12,2),
    trade_price numeric(12,2) NOT NULL,
    unit_price numeric(12,2),
    discount_percent numeric(5,2),
    batch_number character varying(100),
    current_stock numeric(12,2),
    delivery_date date NOT NULL,
    selected boolean,
    created_at timestamp without time zone
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id integer NOT NULL,
    order_id integer NOT NULL,
    from_delivery_status character varying(50),
    to_delivery_status character varying(50),
    from_collection_status character varying(50),
    to_collection_status character varying(50),
    event_code character varying(100) NOT NULL,
    changed_by integer,
    changed_at timestamp without time zone,
    reason text,
    remarks text,
    geo_latitude numeric(10,7),
    geo_longitude numeric(10,7),
    source_system character varying(50)
);


--
-- Name: order_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_status_history_id_seq OWNED BY public.order_status_history.id;


--
-- Name: order_validation_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_validation_messages (
    id integer NOT NULL,
    validation_run_id integer NOT NULL,
    order_id integer NOT NULL,
    order_item_id integer,
    severity character varying(20) NOT NULL,
    rule_code character varying(100) NOT NULL,
    message text NOT NULL,
    blocking boolean,
    created_at timestamp without time zone
);


--
-- Name: order_validation_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_validation_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_validation_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_validation_messages_id_seq OWNED BY public.order_validation_messages.id;


--
-- Name: order_validation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_validation_runs (
    id integer NOT NULL,
    order_id integer NOT NULL,
    validation_status public.validationstatusenum NOT NULL,
    risk_level public.risklevelenum,
    total_requested_value numeric(15,2),
    total_validated_value numeric(15,2),
    total_short_stock_value numeric(15,2),
    credit_limit numeric(15,2),
    outstanding_amount numeric(15,2),
    credit_exposure_after_order numeric(15,2),
    requires_approval boolean,
    approval_reason text,
    validated_by integer,
    validated_at timestamp without time zone,
    is_current boolean,
    created_at timestamp without time zone
);


--
-- Name: order_validation_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_validation_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_validation_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_validation_runs_id_seq OWNED BY public.order_validation_runs.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_number character varying(50),
    memo_number character varying(8),
    depot_code character varying(50),
    depot_name character varying(255),
    customer_id character varying(50) NOT NULL,
    customer_name character varying(255) NOT NULL,
    customer_code character varying(50),
    pso_id character varying(50) NOT NULL,
    pso_name character varying(255) NOT NULL,
    pso_code character varying(50),
    route_code character varying(50),
    route_name character varying(255),
    delivery_date date NOT NULL,
    status public.orderstatusenum NOT NULL,
    order_source character varying(50),
    order_type character varying(50),
    delivery_status character varying(50),
    validated boolean,
    validation_status character varying(50),
    risk_level character varying(20),
    requires_approval boolean,
    external_order_id character varying(100),
    external_source character varying(50),
    printed boolean,
    printed_at timestamp without time zone,
    postponed boolean,
    assigned_to integer,
    assigned_vehicle integer,
    loaded boolean,
    loaded_at timestamp without time zone,
    assignment_date timestamp without time zone,
    collection_status character varying(50),
    collection_type character varying(50),
    collected_amount numeric(15,2),
    pending_amount numeric(15,2),
    collection_approved boolean,
    collection_approved_at timestamp without time zone,
    collection_approved_by integer,
    collection_source character varying(50),
    loading_number character varying(50),
    loading_date date,
    area character varying(100),
    mobile_accepted boolean,
    mobile_accepted_by character varying(100),
    mobile_accepted_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    delivery_rejected boolean DEFAULT false,
    delivery_rejected_at timestamp without time zone,
    delivery_rejected_reason text
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    module character varying(100) NOT NULL,
    is_active boolean,
    created_at timestamp without time zone
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: picking_order_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.picking_order_deliveries (
    id integer NOT NULL,
    picking_order_id integer,
    delivery_id integer,
    memo_no character varying(100),
    value numeric(14,2),
    status character varying(50),
    pso character varying(100),
    remarks text,
    cash numeric(14,2),
    dues numeric(14,2),
    amend numeric(14,2),
    returns numeric(14,2),
    created_at timestamp without time zone
);


--
-- Name: picking_order_deliveries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.picking_order_deliveries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: picking_order_deliveries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.picking_order_deliveries_id_seq OWNED BY public.picking_order_deliveries.id;


--
-- Name: picking_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.picking_orders (
    id integer NOT NULL,
    order_number character varying(50) NOT NULL,
    loading_no character varying(50),
    loading_date date,
    area character varying(100),
    delivery_by character varying(150),
    vehicle_no character varying(100),
    remarks text,
    status character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: picking_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.picking_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: picking_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.picking_orders_id_seq OWNED BY public.picking_orders.id;


--
-- Name: price_setups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_setups (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    product_id integer NOT NULL,
    trade_price numeric(15,2),
    unit_price numeric(15,2),
    ifc_price numeric(15,2),
    mc_price numeric(15,2),
    validity_start_date date,
    validity_end_date date,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: price_setups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_setups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_setups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_setups_id_seq OWNED BY public.price_setups.id;


--
-- Name: primary_packagings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.primary_packagings (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: primary_packagings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.primary_packagings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: primary_packagings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.primary_packagings_id_seq OWNED BY public.primary_packagings.id;


--
-- Name: product_item_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_item_stock (
    id integer NOT NULL,
    product_id integer NOT NULL,
    product_code character varying(50) NOT NULL,
    sku_code character varying(50) NOT NULL,
    gross_stock_receive numeric(15,2),
    issue numeric(15,2),
    stock_qty numeric(15,2),
    adjusted_stock_in_qty numeric(15,2),
    adjusted_stock_out_qty numeric(15,2),
    depot_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: product_item_stock_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_item_stock_details (
    id integer NOT NULL,
    item_code integer NOT NULL,
    batch_no character varying(100) NOT NULL,
    expiry_date date,
    quantity numeric(15,2),
    available_quantity numeric(15,2),
    reserved_quantity numeric(15,2),
    manufacturing_date date,
    storage_type character varying(50),
    status character varying(50),
    source_type character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: product_item_stock_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_item_stock_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_item_stock_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_item_stock_details_id_seq OWNED BY public.product_item_stock_details.id;


--
-- Name: product_item_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_item_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_item_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_item_stock_id_seq OWNED BY public.product_item_stock.id;


--
-- Name: product_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_receipt_items (
    id integer NOT NULL,
    receipt_id integer,
    legacy_code character varying(50),
    item_code character varying(50),
    item_name character varying(255),
    pack_size character varying(50),
    uom character varying(20),
    expiry_date date,
    batch_number character varying(100),
    number_of_ifc numeric(12,2),
    depot_quantity numeric(12,2),
    ifc_per_full_mc numeric(12,2),
    number_of_full_mc numeric(12,2),
    ifc_in_loose_mc numeric(12,2),
    created_at timestamp without time zone
);


--
-- Name: product_receipt_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_receipt_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_receipt_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_receipt_items_id_seq OWNED BY public.product_receipt_items.id;


--
-- Name: product_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_receipts (
    id integer NOT NULL,
    receipt_number character varying(50) NOT NULL,
    source_type public.receiptsourceenum NOT NULL,
    target_depot_id integer,
    to_address text,
    tfa_number character varying(50),
    iso_number character varying(50),
    shipment_mode character varying(100),
    delivery_person character varying(100),
    vehicle_info character varying(100),
    issued_date date,
    vat_number character varying(50),
    remarks text,
    status public.productreceiptstatus,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: product_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_receipts_id_seq OWNED BY public.product_receipts.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    sku character varying(50) NOT NULL,
    old_code character varying(50),
    new_code character varying(50),
    generic_name character varying(255),
    business_unit character varying(50),
    category character varying(100),
    hsn_code character varying(20),
    unit_of_measure character varying(20),
    base_price numeric(15,2),
    free_goods_threshold numeric(12,2),
    free_goods_quantity numeric(12,2),
    primary_packaging character varying(50),
    product_type_commercial boolean,
    product_type_sample boolean,
    product_type_institutional boolean,
    product_type_export boolean,
    ifc_value1 numeric(10,2),
    ifc_value2 numeric(10,2),
    ifc_result numeric(10,2),
    mc_value1 numeric(10,2),
    mc_value2 numeric(10,2),
    mc_value3 numeric(10,2),
    mc_result numeric(10,2),
    cold_chain_available boolean,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    uom_id integer,
    primary_packaging_id integer
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: promotion_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_customers (
    id integer NOT NULL,
    promotion_id integer NOT NULL,
    customer_id integer NOT NULL
);


--
-- Name: promotion_customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promotion_customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promotion_customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promotion_customers_id_seq OWNED BY public.promotion_customers.id;


--
-- Name: promotion_depots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_depots (
    id integer NOT NULL,
    promotion_id integer NOT NULL,
    depot_id integer NOT NULL
);


--
-- Name: promotion_depots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promotion_depots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promotion_depots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promotion_depots_id_seq OWNED BY public.promotion_depots.id;


--
-- Name: promotion_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_products (
    id integer NOT NULL,
    promotion_id integer NOT NULL,
    product_id integer NOT NULL
);


--
-- Name: promotion_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promotion_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promotion_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promotion_products_id_seq OWNED BY public.promotion_products.id;


--
-- Name: promotion_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_rules (
    id integer NOT NULL,
    promotion_id integer NOT NULL,
    rule_type character varying(50) NOT NULL,
    condition_json jsonb,
    benefit_json jsonb,
    priority integer,
    combinable boolean,
    max_usage integer
);


--
-- Name: promotion_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promotion_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promotion_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promotion_rules_id_seq OWNED BY public.promotion_rules.id;


--
-- Name: promotion_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_usage_logs (
    id integer NOT NULL,
    promotion_id integer NOT NULL,
    order_id integer,
    customer_id integer,
    benefit_amount numeric(15,2),
    created_at timestamp without time zone
);


--
-- Name: promotion_usage_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promotion_usage_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promotion_usage_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promotion_usage_logs_id_seq OWNED BY public.promotion_usage_logs.id;


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id integer NOT NULL,
    promotion_code character varying(50) NOT NULL,
    promotion_name character varying(255) NOT NULL,
    promotion_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status public.promotionstatusenum,
    approval_status character varying(50),
    created_by integer,
    approved_by integer,
    approved_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: promotions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promotions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promotions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promotions_id_seq OWNED BY public.promotions.id;


--
-- Name: reconciliation_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_lines (
    id integer NOT NULL,
    reconciliation_run_id integer NOT NULL,
    order_id integer,
    invoice_no character varying(50),
    delivered_value numeric(15,2),
    collected_value numeric(15,2),
    return_value numeric(15,2),
    adjustment_value numeric(15,2),
    variance_amount numeric(15,2),
    collection_status character varying(50),
    delivery_status character varying(50)
);


--
-- Name: reconciliation_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reconciliation_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reconciliation_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reconciliation_lines_id_seq OWNED BY public.reconciliation_lines.id;


--
-- Name: reconciliation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_runs (
    id integer NOT NULL,
    reconciliation_no character varying(50) NOT NULL,
    depot_id integer,
    loading_number character varying(50),
    delivery_man_id integer,
    vehicle_id integer,
    total_delivered_value numeric(15,2),
    total_collection_value numeric(15,2),
    total_return_value numeric(15,2),
    total_adjustment_value numeric(15,2),
    cash_in_hand numeric(15,2),
    deposit_value numeric(15,2),
    variance_amount numeric(15,2),
    status public.reconciliationstatusenum,
    prepared_by integer,
    checked_by integer,
    approved_by integer,
    created_at timestamp without time zone,
    approved_at timestamp without time zone
);


--
-- Name: reconciliation_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reconciliation_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reconciliation_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reconciliation_runs_id_seq OWNED BY public.reconciliation_runs.id;


--
-- Name: reconciliation_variances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_variances (
    id integer NOT NULL,
    reconciliation_run_id integer NOT NULL,
    variance_type character varying(100) NOT NULL,
    variance_amount numeric(15,2),
    reason text,
    responsible_user_id integer,
    resolution_status character varying(50)
);


--
-- Name: reconciliation_variances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reconciliation_variances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reconciliation_variances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reconciliation_variances_id_seq OWNED BY public.reconciliation_variances.id;


--
-- Name: refund_liabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_liabilities (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    order_id integer,
    return_id character varying(50),
    cn_no character varying(50),
    liability_amount numeric(15,2) NOT NULL,
    remaining_amount numeric(15,2) NOT NULL,
    status character varying(50),
    created_at timestamp without time zone
);


--
-- Name: refund_liabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refund_liabilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refund_liabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refund_liabilities_id_seq OWNED BY public.refund_liabilities.id;


--
-- Name: refund_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_settlements (
    id integer NOT NULL,
    liability_id integer NOT NULL,
    settlement_order_id integer,
    settlement_amount numeric(15,2) NOT NULL,
    settled_by integer,
    settled_at timestamp without time zone
);


--
-- Name: refund_settlements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refund_settlements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refund_settlements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refund_settlements_id_seq OWNED BY public.refund_settlements.id;


--
-- Name: role_masters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_masters (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    role_type public.roletypeenum NOT NULL,
    name character varying(255) NOT NULL,
    parent_id integer,
    employee_id integer,
    territory character varying(100),
    region character varying(100),
    district character varying(100),
    area character varying(100),
    description text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: role_masters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_masters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_masters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_masters_id_seq OWNED BY public.role_masters.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_code character varying(50) NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone
);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: route_shipping_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_shipping_points (
    id integer NOT NULL,
    route_id integer NOT NULL,
    shipping_point_id integer NOT NULL,
    distance_km numeric(10,2) NOT NULL,
    sequence integer NOT NULL,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: route_shipping_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.route_shipping_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: route_shipping_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.route_shipping_points_id_seq OWNED BY public.route_shipping_points.id;


--
-- Name: route_stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_stops (
    id integer NOT NULL,
    route_id integer NOT NULL,
    stop_sequence integer NOT NULL,
    customer_id integer,
    customer_name character varying(255),
    address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    city character varying(100),
    state character varying(100),
    pincode character varying(20),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: route_stops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.route_stops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: route_stops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.route_stops_id_seq OWNED BY public.route_stops.id;


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routes (
    id integer NOT NULL,
    route_id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    depot_id integer,
    stops integer,
    distance character varying(50),
    avg_time character varying(50),
    status character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: routes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.routes_id_seq OWNED BY public.routes.id;


--
-- Name: shipping_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_points (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    depot_id integer,
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(20),
    phone character varying(50),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: shipping_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipping_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shipping_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipping_points_id_seq OWNED BY public.shipping_points.id;


--
-- Name: stock_adjustment_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_adjustment_items (
    id integer NOT NULL,
    adjustment_id integer,
    product_id integer,
    batch character varying(100),
    quantity_change numeric(10,2),
    created_at timestamp without time zone
);


--
-- Name: stock_adjustment_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_adjustment_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_adjustment_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_adjustment_items_id_seq OWNED BY public.stock_adjustment_items.id;


--
-- Name: stock_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_adjustments (
    id integer NOT NULL,
    adjustment_number character varying(50) NOT NULL,
    adjustment_date date NOT NULL,
    depot_id integer,
    adjustment_type character varying(50),
    reason text,
    status character varying(50),
    submitted_by integer,
    approved_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_adjustments_id_seq OWNED BY public.stock_adjustments.id;


--
-- Name: stock_issuance_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_issuance_items (
    id integer NOT NULL,
    issuance_id integer,
    product_id integer,
    batch character varying(100),
    quantity numeric(10,2),
    created_at timestamp without time zone
);


--
-- Name: stock_issuance_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_issuance_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_issuance_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_issuance_items_id_seq OWNED BY public.stock_issuance_items.id;


--
-- Name: stock_issuances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_issuances (
    id integer NOT NULL,
    issuance_number character varying(50) NOT NULL,
    issuance_date date NOT NULL,
    customer_id integer,
    depot_id integer,
    total_quantity numeric(10,2),
    status character varying(50),
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: stock_issuances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_issuances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_issuances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_issuances_id_seq OWNED BY public.stock_issuances.id;


--
-- Name: stock_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_ledger (
    id integer NOT NULL,
    product_id integer,
    batch character varying(100),
    depot_id integer,
    storage_type character varying(50),
    quantity numeric(10,2),
    reserved_quantity numeric(10,2),
    available_quantity numeric(10,2),
    expiry_date date,
    status character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: stock_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_ledger_id_seq OWNED BY public.stock_ledger.id;


--
-- Name: stock_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_receipt_items (
    id integer NOT NULL,
    receipt_id integer,
    product_id integer,
    batch character varying(100),
    quantity numeric(10,2),
    expiry_date date,
    created_at timestamp without time zone
);


--
-- Name: stock_receipt_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_receipt_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_receipt_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_receipt_items_id_seq OWNED BY public.stock_receipt_items.id;


--
-- Name: stock_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_receipts (
    id integer NOT NULL,
    receipt_number character varying(50) NOT NULL,
    receipt_date date NOT NULL,
    challan_number character varying(100),
    depot_id integer,
    vendor_id integer,
    total_quantity numeric(10,2),
    status character varying(50),
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: stock_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_receipts_id_seq OWNED BY public.stock_receipts.id;


--
-- Name: sync_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_checkpoints (
    id integer NOT NULL,
    user_id integer,
    device_id character varying(100),
    source_system character varying(50) NOT NULL,
    last_sync_at timestamp without time zone,
    last_version character varying(50),
    updated_at timestamp without time zone
);


--
-- Name: sync_checkpoints_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sync_checkpoints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sync_checkpoints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sync_checkpoints_id_seq OWNED BY public.sync_checkpoints.id;


--
-- Name: sync_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_conflicts (
    id integer NOT NULL,
    sync_event_id integer NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(100) NOT NULL,
    server_version character varying(50),
    client_version character varying(50),
    resolution character varying(50),
    created_at timestamp without time zone
);


--
-- Name: sync_conflicts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sync_conflicts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sync_conflicts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sync_conflicts_id_seq OWNED BY public.sync_conflicts.id;


--
-- Name: sync_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_events (
    id integer NOT NULL,
    idempotency_key character varying(100) NOT NULL,
    source_system character varying(50) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(100),
    event_type character varying(100) NOT NULL,
    payload_json jsonb,
    client_version character varying(50),
    status public.synceventstatusenum,
    processed_at timestamp without time zone,
    created_at timestamp without time zone
);


--
-- Name: sync_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sync_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sync_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sync_events_id_seq OWNED BY public.sync_events.id;


--
-- Name: sync_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_queue (
    id integer NOT NULL,
    sync_event_id integer NOT NULL,
    retry_count integer,
    next_retry_at timestamp without time zone,
    status character varying(50),
    error_message text,
    created_at timestamp without time zone
);


--
-- Name: sync_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sync_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sync_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sync_queue_id_seq OWNED BY public.sync_queue.id;


--
-- Name: transport_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_expenses (
    id integer NOT NULL,
    trip_id integer,
    trip_number character varying(50),
    route_id integer,
    expense_type character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    expense_date date NOT NULL,
    is_auto_calculated boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: transport_expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transport_expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transport_expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transport_expenses_id_seq OWNED BY public.transport_expenses.id;


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    id integer NOT NULL,
    trip_number character varying(50) NOT NULL,
    delivery_id integer,
    vehicle_id integer NOT NULL,
    driver_id integer NOT NULL,
    route_id integer NOT NULL,
    trip_date date NOT NULL,
    distance_km numeric(10,2),
    estimated_fuel_cost numeric(10,2),
    actual_fuel_cost numeric(10,2),
    status character varying(50),
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: trips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trips_id_seq OWNED BY public.trips.id;


--
-- Name: uoms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uoms (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: uoms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.uoms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: uoms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.uoms_id_seq OWNED BY public.uoms.id;


--
-- Name: validation_rule_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.validation_rule_configs (
    id integer NOT NULL,
    rule_code character varying(100) NOT NULL,
    rule_name character varying(255) NOT NULL,
    enabled boolean,
    severity character varying(20),
    config_json jsonb,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: validation_rule_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.validation_rule_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: validation_rule_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.validation_rule_configs_id_seq OWNED BY public.validation_rule_configs.id;


--
-- Name: vehicle_loading_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_loading_items (
    id integer NOT NULL,
    loading_id integer,
    issuance_id integer,
    created_at timestamp without time zone
);


--
-- Name: vehicle_loading_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicle_loading_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicle_loading_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehicle_loading_items_id_seq OWNED BY public.vehicle_loading_items.id;


--
-- Name: vehicle_loadings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_loadings (
    id integer NOT NULL,
    loading_number character varying(50) NOT NULL,
    loading_date date NOT NULL,
    vehicle_id integer,
    driver_id integer,
    route_id integer,
    total_quantity numeric(10,2),
    status character varying(50),
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: vehicle_loadings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicle_loadings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicle_loadings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehicle_loadings_id_seq OWNED BY public.vehicle_loadings.id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id integer NOT NULL,
    vehicle_id character varying(50) NOT NULL,
    vehicle_type character varying(50) NOT NULL,
    registration_number character varying(50) NOT NULL,
    capacity numeric(10,2),
    depot_id integer,
    vendor character varying(255),
    status character varying(50),
    is_active boolean,
    fuel_type character varying(50),
    fuel_rate numeric(10,2),
    fuel_efficiency numeric(10,2),
    model character varying(100),
    year integer,
    maintenance_schedule_km numeric(10,2),
    last_maintenance_date date,
    last_maintenance_km numeric(10,2),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehicles_id_seq OWNED BY public.vehicles.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(20),
    phone character varying(50),
    email character varying(255),
    gstin character varying(20),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: chemist_shops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chemist_shops ALTER COLUMN id SET DEFAULT nextval('public.chemist_shops_id_seq'::regclass);


--
-- Name: collection_deposits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_deposits ALTER COLUMN id SET DEFAULT nextval('public.collection_deposits_id_seq'::regclass);


--
-- Name: collection_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_transactions ALTER COLUMN id SET DEFAULT nextval('public.collection_transactions_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: customer_credit_balances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_balances ALTER COLUMN id SET DEFAULT nextval('public.customer_credit_balances_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: day_end_closings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_end_closings ALTER COLUMN id SET DEFAULT nextval('public.day_end_closings_id_seq'::regclass);


--
-- Name: delivery_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_order_items ALTER COLUMN id SET DEFAULT nextval('public.delivery_order_items_id_seq'::regclass);


--
-- Name: delivery_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders ALTER COLUMN id SET DEFAULT nextval('public.delivery_orders_id_seq'::regclass);


--
-- Name: depot_transfer_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfer_items ALTER COLUMN id SET DEFAULT nextval('public.depot_transfer_items_id_seq'::regclass);


--
-- Name: depot_transfers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfers ALTER COLUMN id SET DEFAULT nextval('public.depot_transfers_id_seq'::regclass);


--
-- Name: depots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depots ALTER COLUMN id SET DEFAULT nextval('public.depots_id_seq'::regclass);


--
-- Name: device_login_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_login_attempts ALTER COLUMN id SET DEFAULT nextval('public.device_login_attempts_id_seq'::regclass);


--
-- Name: doctors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors ALTER COLUMN id SET DEFAULT nextval('public.doctors_id_seq'::regclass);


--
-- Name: drivers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers ALTER COLUMN id SET DEFAULT nextval('public.drivers_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: external_order_refs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_order_refs ALTER COLUMN id SET DEFAULT nextval('public.external_order_refs_id_seq'::regclass);


--
-- Name: integration_failures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_failures ALTER COLUMN id SET DEFAULT nextval('public.integration_failures_id_seq'::regclass);


--
-- Name: integration_job_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_job_logs ALTER COLUMN id SET DEFAULT nextval('public.integration_job_logs_id_seq'::regclass);


--
-- Name: integration_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_jobs ALTER COLUMN id SET DEFAULT nextval('public.integration_jobs_id_seq'::regclass);


--
-- Name: integration_systems id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_systems ALTER COLUMN id SET DEFAULT nextval('public.integration_systems_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: login_audits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_audits ALTER COLUMN id SET DEFAULT nextval('public.login_audits_id_seq'::regclass);


--
-- Name: materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials ALTER COLUMN id SET DEFAULT nextval('public.materials_id_seq'::regclass);


--
-- Name: mobile_devices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_devices ALTER COLUMN id SET DEFAULT nextval('public.mobile_devices_id_seq'::regclass);


--
-- Name: order_batch_allocations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_batch_allocations ALTER COLUMN id SET DEFAULT nextval('public.order_batch_allocations_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: order_status_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history ALTER COLUMN id SET DEFAULT nextval('public.order_status_history_id_seq'::regclass);


--
-- Name: order_validation_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_validation_messages ALTER COLUMN id SET DEFAULT nextval('public.order_validation_messages_id_seq'::regclass);


--
-- Name: order_validation_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_validation_runs ALTER COLUMN id SET DEFAULT nextval('public.order_validation_runs_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: picking_order_deliveries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.picking_order_deliveries ALTER COLUMN id SET DEFAULT nextval('public.picking_order_deliveries_id_seq'::regclass);


--
-- Name: picking_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.picking_orders ALTER COLUMN id SET DEFAULT nextval('public.picking_orders_id_seq'::regclass);


--
-- Name: price_setups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_setups ALTER COLUMN id SET DEFAULT nextval('public.price_setups_id_seq'::regclass);


--
-- Name: primary_packagings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.primary_packagings ALTER COLUMN id SET DEFAULT nextval('public.primary_packagings_id_seq'::regclass);


--
-- Name: product_item_stock id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_item_stock ALTER COLUMN id SET DEFAULT nextval('public.product_item_stock_id_seq'::regclass);


--
-- Name: product_item_stock_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_item_stock_details ALTER COLUMN id SET DEFAULT nextval('public.product_item_stock_details_id_seq'::regclass);


--
-- Name: product_receipt_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_receipt_items ALTER COLUMN id SET DEFAULT nextval('public.product_receipt_items_id_seq'::regclass);


--
-- Name: product_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_receipts ALTER COLUMN id SET DEFAULT nextval('public.product_receipts_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: promotion_customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_customers ALTER COLUMN id SET DEFAULT nextval('public.promotion_customers_id_seq'::regclass);


--
-- Name: promotion_depots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_depots ALTER COLUMN id SET DEFAULT nextval('public.promotion_depots_id_seq'::regclass);


--
-- Name: promotion_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_products ALTER COLUMN id SET DEFAULT nextval('public.promotion_products_id_seq'::regclass);


--
-- Name: promotion_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_rules ALTER COLUMN id SET DEFAULT nextval('public.promotion_rules_id_seq'::regclass);


--
-- Name: promotion_usage_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usage_logs ALTER COLUMN id SET DEFAULT nextval('public.promotion_usage_logs_id_seq'::regclass);


--
-- Name: promotions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions ALTER COLUMN id SET DEFAULT nextval('public.promotions_id_seq'::regclass);


--
-- Name: reconciliation_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_lines ALTER COLUMN id SET DEFAULT nextval('public.reconciliation_lines_id_seq'::regclass);


--
-- Name: reconciliation_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs ALTER COLUMN id SET DEFAULT nextval('public.reconciliation_runs_id_seq'::regclass);


--
-- Name: reconciliation_variances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_variances ALTER COLUMN id SET DEFAULT nextval('public.reconciliation_variances_id_seq'::regclass);


--
-- Name: refund_liabilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_liabilities ALTER COLUMN id SET DEFAULT nextval('public.refund_liabilities_id_seq'::regclass);


--
-- Name: refund_settlements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_settlements ALTER COLUMN id SET DEFAULT nextval('public.refund_settlements_id_seq'::regclass);


--
-- Name: role_masters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_masters ALTER COLUMN id SET DEFAULT nextval('public.role_masters_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: route_shipping_points id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_shipping_points ALTER COLUMN id SET DEFAULT nextval('public.route_shipping_points_id_seq'::regclass);


--
-- Name: route_stops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_stops ALTER COLUMN id SET DEFAULT nextval('public.route_stops_id_seq'::regclass);


--
-- Name: routes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes ALTER COLUMN id SET DEFAULT nextval('public.routes_id_seq'::regclass);


--
-- Name: shipping_points id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_points ALTER COLUMN id SET DEFAULT nextval('public.shipping_points_id_seq'::regclass);


--
-- Name: stock_adjustment_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items ALTER COLUMN id SET DEFAULT nextval('public.stock_adjustment_items_id_seq'::regclass);


--
-- Name: stock_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments ALTER COLUMN id SET DEFAULT nextval('public.stock_adjustments_id_seq'::regclass);


--
-- Name: stock_issuance_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_issuance_items ALTER COLUMN id SET DEFAULT nextval('public.stock_issuance_items_id_seq'::regclass);


--
-- Name: stock_issuances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_issuances ALTER COLUMN id SET DEFAULT nextval('public.stock_issuances_id_seq'::regclass);


--
-- Name: stock_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_ledger ALTER COLUMN id SET DEFAULT nextval('public.stock_ledger_id_seq'::regclass);


--
-- Name: stock_receipt_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipt_items ALTER COLUMN id SET DEFAULT nextval('public.stock_receipt_items_id_seq'::regclass);


--
-- Name: stock_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipts ALTER COLUMN id SET DEFAULT nextval('public.stock_receipts_id_seq'::regclass);


--
-- Name: sync_checkpoints id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_checkpoints ALTER COLUMN id SET DEFAULT nextval('public.sync_checkpoints_id_seq'::regclass);


--
-- Name: sync_conflicts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_conflicts ALTER COLUMN id SET DEFAULT nextval('public.sync_conflicts_id_seq'::regclass);


--
-- Name: sync_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_events ALTER COLUMN id SET DEFAULT nextval('public.sync_events_id_seq'::regclass);


--
-- Name: sync_queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_queue ALTER COLUMN id SET DEFAULT nextval('public.sync_queue_id_seq'::regclass);


--
-- Name: transport_expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_expenses ALTER COLUMN id SET DEFAULT nextval('public.transport_expenses_id_seq'::regclass);


--
-- Name: trips id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips ALTER COLUMN id SET DEFAULT nextval('public.trips_id_seq'::regclass);


--
-- Name: uoms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uoms ALTER COLUMN id SET DEFAULT nextval('public.uoms_id_seq'::regclass);


--
-- Name: validation_rule_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_rule_configs ALTER COLUMN id SET DEFAULT nextval('public.validation_rule_configs_id_seq'::regclass);


--
-- Name: vehicle_loading_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_loading_items ALTER COLUMN id SET DEFAULT nextval('public.vehicle_loading_items_id_seq'::regclass);


--
-- Name: vehicle_loadings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_loadings ALTER COLUMN id SET DEFAULT nextval('public.vehicle_loadings_id_seq'::regclass);


--
-- Name: vehicles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN id SET DEFAULT nextval('public.vehicles_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: chemist_shops chemist_shops_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chemist_shops
    ADD CONSTRAINT chemist_shops_code_key UNIQUE (code);


--
-- Name: chemist_shops chemist_shops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chemist_shops
    ADD CONSTRAINT chemist_shops_pkey PRIMARY KEY (id);


--
-- Name: collection_deposits collection_deposits_deposit_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_deposits
    ADD CONSTRAINT collection_deposits_deposit_number_key UNIQUE (deposit_number);


--
-- Name: collection_deposits collection_deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_deposits
    ADD CONSTRAINT collection_deposits_pkey PRIMARY KEY (id);


--
-- Name: collection_transactions collection_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_transactions
    ADD CONSTRAINT collection_transactions_pkey PRIMARY KEY (id);


--
-- Name: companies companies_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_code_key UNIQUE (code);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: customer_credit_balances customer_credit_balances_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_balances
    ADD CONSTRAINT customer_credit_balances_customer_id_key UNIQUE (customer_id);


--
-- Name: customer_credit_balances customer_credit_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_balances
    ADD CONSTRAINT customer_credit_balances_pkey PRIMARY KEY (id);


--
-- Name: customers customers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_code_key UNIQUE (code);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: day_end_closings day_end_closings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_end_closings
    ADD CONSTRAINT day_end_closings_pkey PRIMARY KEY (id);


--
-- Name: delivery_order_items delivery_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_order_items
    ADD CONSTRAINT delivery_order_items_pkey PRIMARY KEY (id);


--
-- Name: delivery_orders delivery_orders_delivery_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_delivery_number_key UNIQUE (delivery_number);


--
-- Name: delivery_orders delivery_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_pkey PRIMARY KEY (id);


--
-- Name: depot_transfer_items depot_transfer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfer_items
    ADD CONSTRAINT depot_transfer_items_pkey PRIMARY KEY (id);


--
-- Name: depot_transfers depot_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfers
    ADD CONSTRAINT depot_transfers_pkey PRIMARY KEY (id);


--
-- Name: depot_transfers depot_transfers_transfer_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfers
    ADD CONSTRAINT depot_transfers_transfer_number_key UNIQUE (transfer_number);


--
-- Name: depots depots_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depots
    ADD CONSTRAINT depots_code_key UNIQUE (code);


--
-- Name: depots depots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depots
    ADD CONSTRAINT depots_pkey PRIMARY KEY (id);


--
-- Name: device_login_attempts device_login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_login_attempts
    ADD CONSTRAINT device_login_attempts_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_code_key UNIQUE (code);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_driver_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_driver_id_key UNIQUE (driver_id);


--
-- Name: drivers drivers_license_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_license_number_key UNIQUE (license_number);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- Name: employees employees_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_id_key UNIQUE (employee_id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: external_order_refs external_order_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_order_refs
    ADD CONSTRAINT external_order_refs_pkey PRIMARY KEY (id);


--
-- Name: integration_failures integration_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_failures
    ADD CONSTRAINT integration_failures_pkey PRIMARY KEY (id);


--
-- Name: integration_job_logs integration_job_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_job_logs
    ADD CONSTRAINT integration_job_logs_pkey PRIMARY KEY (id);


--
-- Name: integration_jobs integration_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_jobs
    ADD CONSTRAINT integration_jobs_pkey PRIMARY KEY (id);


--
-- Name: integration_systems integration_systems_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_systems
    ADD CONSTRAINT integration_systems_code_key UNIQUE (code);


--
-- Name: integration_systems integration_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_systems
    ADD CONSTRAINT integration_systems_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: login_audits login_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_audits
    ADD CONSTRAINT login_audits_pkey PRIMARY KEY (id);


--
-- Name: materials materials_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_code_key UNIQUE (code);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: mobile_devices mobile_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT mobile_devices_pkey PRIMARY KEY (id);


--
-- Name: order_batch_allocations order_batch_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_batch_allocations
    ADD CONSTRAINT order_batch_allocations_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: order_validation_messages order_validation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_validation_messages
    ADD CONSTRAINT order_validation_messages_pkey PRIMARY KEY (id);


--
-- Name: order_validation_runs order_validation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_validation_runs
    ADD CONSTRAINT order_validation_runs_pkey PRIMARY KEY (id);


--
-- Name: orders orders_memo_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_memo_number_key UNIQUE (memo_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: picking_order_deliveries picking_order_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.picking_order_deliveries
    ADD CONSTRAINT picking_order_deliveries_pkey PRIMARY KEY (id);


--
-- Name: picking_orders picking_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.picking_orders
    ADD CONSTRAINT picking_orders_order_number_key UNIQUE (order_number);


--
-- Name: picking_orders picking_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.picking_orders
    ADD CONSTRAINT picking_orders_pkey PRIMARY KEY (id);


--
-- Name: price_setups price_setups_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_setups
    ADD CONSTRAINT price_setups_code_key UNIQUE (code);


--
-- Name: price_setups price_setups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_setups
    ADD CONSTRAINT price_setups_pkey PRIMARY KEY (id);


--
-- Name: primary_packagings primary_packagings_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.primary_packagings
    ADD CONSTRAINT primary_packagings_code_key UNIQUE (code);


--
-- Name: primary_packagings primary_packagings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.primary_packagings
    ADD CONSTRAINT primary_packagings_pkey PRIMARY KEY (id);


--
-- Name: product_item_stock_details product_item_stock_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_item_stock_details
    ADD CONSTRAINT product_item_stock_details_pkey PRIMARY KEY (id);


--
-- Name: product_item_stock product_item_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_item_stock
    ADD CONSTRAINT product_item_stock_pkey PRIMARY KEY (id);


--
-- Name: product_receipt_items product_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_receipt_items
    ADD CONSTRAINT product_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: product_receipts product_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_receipts
    ADD CONSTRAINT product_receipts_pkey PRIMARY KEY (id);


--
-- Name: product_receipts product_receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_receipts
    ADD CONSTRAINT product_receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: products products_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_code_key UNIQUE (code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: promotion_customers promotion_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_customers
    ADD CONSTRAINT promotion_customers_pkey PRIMARY KEY (id);


--
-- Name: promotion_depots promotion_depots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_depots
    ADD CONSTRAINT promotion_depots_pkey PRIMARY KEY (id);


--
-- Name: promotion_products promotion_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_products
    ADD CONSTRAINT promotion_products_pkey PRIMARY KEY (id);


--
-- Name: promotion_rules promotion_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_rules
    ADD CONSTRAINT promotion_rules_pkey PRIMARY KEY (id);


--
-- Name: promotion_usage_logs promotion_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usage_logs
    ADD CONSTRAINT promotion_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_promotion_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_promotion_code_key UNIQUE (promotion_code);


--
-- Name: reconciliation_lines reconciliation_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_lines
    ADD CONSTRAINT reconciliation_lines_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_runs reconciliation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT reconciliation_runs_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_runs reconciliation_runs_reconciliation_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT reconciliation_runs_reconciliation_no_key UNIQUE (reconciliation_no);


--
-- Name: reconciliation_variances reconciliation_variances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_variances
    ADD CONSTRAINT reconciliation_variances_pkey PRIMARY KEY (id);


--
-- Name: refund_liabilities refund_liabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_liabilities
    ADD CONSTRAINT refund_liabilities_pkey PRIMARY KEY (id);


--
-- Name: refund_settlements refund_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_settlements
    ADD CONSTRAINT refund_settlements_pkey PRIMARY KEY (id);


--
-- Name: role_masters role_masters_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_masters
    ADD CONSTRAINT role_masters_code_key UNIQUE (code);


--
-- Name: role_masters role_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_masters
    ADD CONSTRAINT role_masters_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: route_shipping_points route_shipping_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_shipping_points
    ADD CONSTRAINT route_shipping_points_pkey PRIMARY KEY (id);


--
-- Name: route_stops route_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT route_stops_pkey PRIMARY KEY (id);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: routes routes_route_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_route_id_key UNIQUE (route_id);


--
-- Name: shipping_points shipping_points_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_points
    ADD CONSTRAINT shipping_points_code_key UNIQUE (code);


--
-- Name: shipping_points shipping_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_points
    ADD CONSTRAINT shipping_points_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustment_items stock_adjustment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustments stock_adjustments_adjustment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_adjustment_number_key UNIQUE (adjustment_number);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id);


--
-- Name: stock_issuance_items stock_issuance_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_issuance_items
    ADD CONSTRAINT stock_issuance_items_pkey PRIMARY KEY (id);


--
-- Name: stock_issuances stock_issuances_issuance_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_issuances
    ADD CONSTRAINT stock_issuances_issuance_number_key UNIQUE (issuance_number);


--
-- Name: stock_issuances stock_issuances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_issuances
    ADD CONSTRAINT stock_issuances_pkey PRIMARY KEY (id);


--
-- Name: stock_ledger stock_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_pkey PRIMARY KEY (id);


--
-- Name: stock_receipt_items stock_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipt_items
    ADD CONSTRAINT stock_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: stock_receipts stock_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_pkey PRIMARY KEY (id);


--
-- Name: stock_receipts stock_receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: sync_checkpoints sync_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_checkpoints
    ADD CONSTRAINT sync_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: sync_conflicts sync_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_pkey PRIMARY KEY (id);


--
-- Name: sync_events sync_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_events
    ADD CONSTRAINT sync_events_pkey PRIMARY KEY (id);


--
-- Name: sync_queue sync_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT sync_queue_pkey PRIMARY KEY (id);


--
-- Name: transport_expenses transport_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_expenses
    ADD CONSTRAINT transport_expenses_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: trips trips_trip_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_trip_number_key UNIQUE (trip_number);


--
-- Name: uoms uoms_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uoms
    ADD CONSTRAINT uoms_code_key UNIQUE (code);


--
-- Name: uoms uoms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uoms
    ADD CONSTRAINT uoms_pkey PRIMARY KEY (id);


--
-- Name: external_order_refs uq_external_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_order_refs
    ADD CONSTRAINT uq_external_order UNIQUE (source_system, external_order_id);


--
-- Name: promotion_customers uq_promo_customer; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_customers
    ADD CONSTRAINT uq_promo_customer UNIQUE (promotion_id, customer_id);


--
-- Name: promotion_depots uq_promo_depot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_depots
    ADD CONSTRAINT uq_promo_depot UNIQUE (promotion_id, depot_id);


--
-- Name: promotion_products uq_promo_product; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_products
    ADD CONSTRAINT uq_promo_product UNIQUE (promotion_id, product_id);


--
-- Name: role_permissions uq_role_permission; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT uq_role_permission UNIQUE (role_code, permission_id);


--
-- Name: mobile_devices uq_user_device; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT uq_user_device UNIQUE (user_id, device_id);


--
-- Name: validation_rule_configs validation_rule_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_rule_configs
    ADD CONSTRAINT validation_rule_configs_pkey PRIMARY KEY (id);


--
-- Name: validation_rule_configs validation_rule_configs_rule_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_rule_configs
    ADD CONSTRAINT validation_rule_configs_rule_code_key UNIQUE (rule_code);


--
-- Name: vehicle_loading_items vehicle_loading_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_loading_items
    ADD CONSTRAINT vehicle_loading_items_pkey PRIMARY KEY (id);


--
-- Name: vehicle_loadings vehicle_loadings_loading_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_loadings
    ADD CONSTRAINT vehicle_loadings_loading_number_key UNIQUE (loading_number);


--
-- Name: vehicle_loadings vehicle_loadings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_loadings
    ADD CONSTRAINT vehicle_loadings_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_registration_number_key UNIQUE (registration_number);


--
-- Name: vehicles vehicles_vehicle_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_vehicle_id_key UNIQUE (vehicle_id);


--
-- Name: vendors vendors_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_code_key UNIQUE (code);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: ix_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: ix_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: ix_audit_logs_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_entity_id ON public.audit_logs USING btree (entity_id);


--
-- Name: ix_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_audit_logs_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_transaction_id ON public.audit_logs USING btree (transaction_id);


--
-- Name: ix_chemist_shops_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_chemist_shops_id ON public.chemist_shops USING btree (id);


--
-- Name: ix_collection_deposits_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_collection_deposits_id ON public.collection_deposits USING btree (id);


--
-- Name: ix_collection_transactions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_collection_transactions_id ON public.collection_transactions USING btree (id);


--
-- Name: ix_companies_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_companies_id ON public.companies USING btree (id);


--
-- Name: ix_customer_credit_balances_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_customer_credit_balances_id ON public.customer_credit_balances USING btree (id);


--
-- Name: ix_customers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_customers_id ON public.customers USING btree (id);


--
-- Name: ix_day_end_closings_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_day_end_closings_id ON public.day_end_closings USING btree (id);


--
-- Name: ix_delivery_order_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_delivery_order_items_id ON public.delivery_order_items USING btree (id);


--
-- Name: ix_delivery_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_delivery_orders_id ON public.delivery_orders USING btree (id);


--
-- Name: ix_depot_transfer_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_depot_transfer_items_id ON public.depot_transfer_items USING btree (id);


--
-- Name: ix_depot_transfers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_depot_transfers_id ON public.depot_transfers USING btree (id);


--
-- Name: ix_depots_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_depots_id ON public.depots USING btree (id);


--
-- Name: ix_device_login_attempts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_device_login_attempts_created_at ON public.device_login_attempts USING btree (created_at);


--
-- Name: ix_device_login_attempts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_device_login_attempts_id ON public.device_login_attempts USING btree (id);


--
-- Name: ix_doctors_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_doctors_id ON public.doctors USING btree (id);


--
-- Name: ix_drivers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_drivers_id ON public.drivers USING btree (id);


--
-- Name: ix_employees_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_employees_id ON public.employees USING btree (id);


--
-- Name: ix_external_order_refs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_external_order_refs_id ON public.external_order_refs USING btree (id);


--
-- Name: ix_integration_failures_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_integration_failures_created_at ON public.integration_failures USING btree (created_at);


--
-- Name: ix_integration_failures_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_integration_failures_id ON public.integration_failures USING btree (id);


--
-- Name: ix_integration_job_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_integration_job_logs_id ON public.integration_job_logs USING btree (id);


--
-- Name: ix_integration_jobs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_integration_jobs_created_at ON public.integration_jobs USING btree (created_at);


--
-- Name: ix_integration_jobs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_integration_jobs_id ON public.integration_jobs USING btree (id);


--
-- Name: ix_integration_jobs_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_integration_jobs_idempotency_key ON public.integration_jobs USING btree (idempotency_key);


--
-- Name: ix_integration_systems_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_integration_systems_id ON public.integration_systems USING btree (id);


--
-- Name: ix_invoices_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_invoices_id ON public.invoices USING btree (id);


--
-- Name: ix_login_audits_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_login_audits_created_at ON public.login_audits USING btree (created_at);


--
-- Name: ix_login_audits_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_login_audits_id ON public.login_audits USING btree (id);


--
-- Name: ix_materials_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_materials_id ON public.materials USING btree (id);


--
-- Name: ix_mobile_devices_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mobile_devices_device_id ON public.mobile_devices USING btree (device_id);


--
-- Name: ix_mobile_devices_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mobile_devices_id ON public.mobile_devices USING btree (id);


--
-- Name: ix_mobile_devices_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mobile_devices_user_id ON public.mobile_devices USING btree (user_id);


--
-- Name: ix_order_batch_allocations_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_batch_allocations_id ON public.order_batch_allocations USING btree (id);


--
-- Name: ix_order_batch_allocations_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_batch_allocations_order_id ON public.order_batch_allocations USING btree (order_id);


--
-- Name: ix_order_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_items_id ON public.order_items USING btree (id);


--
-- Name: ix_order_status_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_status_history_changed_at ON public.order_status_history USING btree (changed_at);


--
-- Name: ix_order_status_history_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_status_history_id ON public.order_status_history USING btree (id);


--
-- Name: ix_order_status_history_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_status_history_order_id ON public.order_status_history USING btree (order_id);


--
-- Name: ix_order_validation_messages_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_validation_messages_id ON public.order_validation_messages USING btree (id);


--
-- Name: ix_order_validation_runs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_validation_runs_created_at ON public.order_validation_runs USING btree (created_at);


--
-- Name: ix_order_validation_runs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_validation_runs_id ON public.order_validation_runs USING btree (id);


--
-- Name: ix_order_validation_runs_is_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_validation_runs_is_current ON public.order_validation_runs USING btree (is_current);


--
-- Name: ix_order_validation_runs_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_validation_runs_order_id ON public.order_validation_runs USING btree (order_id);


--
-- Name: ix_orders_delivery_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_delivery_status ON public.orders USING btree (delivery_status);


--
-- Name: ix_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_id ON public.orders USING btree (id);


--
-- Name: ix_permissions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_permissions_id ON public.permissions USING btree (id);


--
-- Name: ix_picking_order_deliveries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_picking_order_deliveries_id ON public.picking_order_deliveries USING btree (id);


--
-- Name: ix_picking_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_picking_orders_id ON public.picking_orders USING btree (id);


--
-- Name: ix_price_setups_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_price_setups_id ON public.price_setups USING btree (id);


--
-- Name: ix_primary_packagings_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_primary_packagings_id ON public.primary_packagings USING btree (id);


--
-- Name: ix_product_item_stock_details_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_item_stock_details_id ON public.product_item_stock_details USING btree (id);


--
-- Name: ix_product_item_stock_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_item_stock_id ON public.product_item_stock USING btree (id);


--
-- Name: ix_product_receipt_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_receipt_items_id ON public.product_receipt_items USING btree (id);


--
-- Name: ix_product_receipts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_product_receipts_id ON public.product_receipts USING btree (id);


--
-- Name: ix_products_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_products_id ON public.products USING btree (id);


--
-- Name: ix_promotion_customers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promotion_customers_id ON public.promotion_customers USING btree (id);


--
-- Name: ix_promotion_depots_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promotion_depots_id ON public.promotion_depots USING btree (id);


--
-- Name: ix_promotion_products_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promotion_products_id ON public.promotion_products USING btree (id);


--
-- Name: ix_promotion_rules_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promotion_rules_id ON public.promotion_rules USING btree (id);


--
-- Name: ix_promotion_usage_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promotion_usage_logs_id ON public.promotion_usage_logs USING btree (id);


--
-- Name: ix_promotions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promotions_id ON public.promotions USING btree (id);


--
-- Name: ix_reconciliation_lines_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reconciliation_lines_id ON public.reconciliation_lines USING btree (id);


--
-- Name: ix_reconciliation_runs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reconciliation_runs_id ON public.reconciliation_runs USING btree (id);


--
-- Name: ix_reconciliation_runs_loading_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reconciliation_runs_loading_number ON public.reconciliation_runs USING btree (loading_number);


--
-- Name: ix_reconciliation_variances_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reconciliation_variances_id ON public.reconciliation_variances USING btree (id);


--
-- Name: ix_refund_liabilities_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_refund_liabilities_customer_id ON public.refund_liabilities USING btree (customer_id);


--
-- Name: ix_refund_liabilities_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_refund_liabilities_id ON public.refund_liabilities USING btree (id);


--
-- Name: ix_refund_settlements_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_refund_settlements_id ON public.refund_settlements USING btree (id);


--
-- Name: ix_role_masters_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_role_masters_id ON public.role_masters USING btree (id);


--
-- Name: ix_role_permissions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_role_permissions_id ON public.role_permissions USING btree (id);


--
-- Name: ix_role_permissions_role_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_role_permissions_role_code ON public.role_permissions USING btree (role_code);


--
-- Name: ix_route_shipping_points_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_route_shipping_points_id ON public.route_shipping_points USING btree (id);


--
-- Name: ix_route_stops_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_route_stops_id ON public.route_stops USING btree (id);


--
-- Name: ix_routes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_routes_id ON public.routes USING btree (id);


--
-- Name: ix_shipping_points_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_shipping_points_id ON public.shipping_points USING btree (id);


--
-- Name: ix_stock_adjustment_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_adjustment_items_id ON public.stock_adjustment_items USING btree (id);


--
-- Name: ix_stock_adjustments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_adjustments_id ON public.stock_adjustments USING btree (id);


--
-- Name: ix_stock_issuance_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_issuance_items_id ON public.stock_issuance_items USING btree (id);


--
-- Name: ix_stock_issuances_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_issuances_id ON public.stock_issuances USING btree (id);


--
-- Name: ix_stock_ledger_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_ledger_id ON public.stock_ledger USING btree (id);


--
-- Name: ix_stock_receipt_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_receipt_items_id ON public.stock_receipt_items USING btree (id);


--
-- Name: ix_stock_receipts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_receipts_id ON public.stock_receipts USING btree (id);


--
-- Name: ix_sync_checkpoints_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sync_checkpoints_id ON public.sync_checkpoints USING btree (id);


--
-- Name: ix_sync_conflicts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sync_conflicts_id ON public.sync_conflicts USING btree (id);


--
-- Name: ix_sync_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sync_events_created_at ON public.sync_events USING btree (created_at);


--
-- Name: ix_sync_events_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sync_events_id ON public.sync_events USING btree (id);


--
-- Name: ix_sync_events_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_sync_events_idempotency_key ON public.sync_events USING btree (idempotency_key);


--
-- Name: ix_sync_queue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sync_queue_id ON public.sync_queue USING btree (id);


--
-- Name: ix_transport_expenses_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_transport_expenses_id ON public.transport_expenses USING btree (id);


--
-- Name: ix_trips_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_trips_id ON public.trips USING btree (id);


--
-- Name: ix_uoms_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_uoms_id ON public.uoms USING btree (id);


--
-- Name: ix_validation_rule_configs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_validation_rule_configs_id ON public.validation_rule_configs USING btree (id);


--
-- Name: ix_vehicle_loading_items_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vehicle_loading_items_id ON public.vehicle_loading_items USING btree (id);


--
-- Name: ix_vehicle_loadings_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vehicle_loadings_id ON public.vehicle_loadings USING btree (id);


--
-- Name: ix_vehicles_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vehicles_id ON public.vehicles USING btree (id);


--
-- Name: ix_vendors_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vendors_id ON public.vendors USING btree (id);


--
-- Name: audit_logs audit_logs_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id);


--
-- Name: collection_deposits collection_deposits_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_deposits
    ADD CONSTRAINT collection_deposits_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.employees(id);


--
-- Name: collection_deposits collection_deposits_collection_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_deposits
    ADD CONSTRAINT collection_deposits_collection_person_id_fkey FOREIGN KEY (collection_person_id) REFERENCES public.employees(id);


--
-- Name: collection_transactions collection_transactions_collection_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_transactions
    ADD CONSTRAINT collection_transactions_collection_person_id_fkey FOREIGN KEY (collection_person_id) REFERENCES public.employees(id);


--
-- Name: collection_transactions collection_transactions_deposit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_transactions
    ADD CONSTRAINT collection_transactions_deposit_id_fkey FOREIGN KEY (deposit_id) REFERENCES public.collection_deposits(id);


--
-- Name: collection_transactions collection_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_transactions
    ADD CONSTRAINT collection_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: customer_credit_balances customer_credit_balances_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_balances
    ADD CONSTRAINT customer_credit_balances_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: day_end_closings day_end_closings_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_end_closings
    ADD CONSTRAINT day_end_closings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.employees(id);


--
-- Name: day_end_closings day_end_closings_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_end_closings
    ADD CONSTRAINT day_end_closings_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.employees(id);


--
-- Name: day_end_closings day_end_closings_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_end_closings
    ADD CONSTRAINT day_end_closings_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: delivery_order_items delivery_order_items_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_order_items
    ADD CONSTRAINT delivery_order_items_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.delivery_orders(id) ON DELETE CASCADE;


--
-- Name: delivery_order_items delivery_order_items_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_order_items
    ADD CONSTRAINT delivery_order_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id);


--
-- Name: delivery_order_items delivery_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_order_items
    ADD CONSTRAINT delivery_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: delivery_orders delivery_orders_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- Name: delivery_orders delivery_orders_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: delivery_orders delivery_orders_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: depot_transfer_items depot_transfer_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfer_items
    ADD CONSTRAINT depot_transfer_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: depot_transfer_items depot_transfer_items_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfer_items
    ADD CONSTRAINT depot_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.depot_transfers(id) ON DELETE CASCADE;


--
-- Name: depot_transfers depot_transfers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfers
    ADD CONSTRAINT depot_transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.employees(id);


--
-- Name: depot_transfers depot_transfers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfers
    ADD CONSTRAINT depot_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id);


--
-- Name: depot_transfers depot_transfers_from_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfers
    ADD CONSTRAINT depot_transfers_from_depot_id_fkey FOREIGN KEY (from_depot_id) REFERENCES public.depots(id);


--
-- Name: depot_transfers depot_transfers_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfers
    ADD CONSTRAINT depot_transfers_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.employees(id);


--
-- Name: depot_transfers depot_transfers_to_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfers
    ADD CONSTRAINT depot_transfers_to_depot_id_fkey FOREIGN KEY (to_depot_id) REFERENCES public.depots(id);


--
-- Name: depot_transfers depot_transfers_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depot_transfers
    ADD CONSTRAINT depot_transfers_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: depots depots_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depots
    ADD CONSTRAINT depots_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: device_login_attempts device_login_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_login_attempts
    ADD CONSTRAINT device_login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id);


--
-- Name: employees employees_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: employees employees_role_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_role_master_id_fkey FOREIGN KEY (role_master_id) REFERENCES public.role_masters(id);


--
-- Name: external_order_refs external_order_refs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_order_refs
    ADD CONSTRAINT external_order_refs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: integration_failures integration_failures_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_failures
    ADD CONSTRAINT integration_failures_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.integration_jobs(id);


--
-- Name: integration_job_logs integration_job_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_job_logs
    ADD CONSTRAINT integration_job_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.integration_jobs(id) ON DELETE CASCADE;


--
-- Name: integration_jobs integration_jobs_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_jobs
    ADD CONSTRAINT integration_jobs_system_id_fkey FOREIGN KEY (system_id) REFERENCES public.integration_systems(id);


--
-- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: invoices invoices_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: invoices invoices_issuance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_issuance_id_fkey FOREIGN KEY (issuance_id) REFERENCES public.stock_issuances(id);


--
-- Name: login_audits login_audits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_audits
    ADD CONSTRAINT login_audits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id);


--
-- Name: mobile_devices mobile_devices_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT mobile_devices_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES public.employees(id);


--
-- Name: mobile_devices mobile_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT mobile_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id);


--
-- Name: order_batch_allocations order_batch_allocations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_batch_allocations
    ADD CONSTRAINT order_batch_allocations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_batch_allocations order_batch_allocations_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_batch_allocations
    ADD CONSTRAINT order_batch_allocations_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: order_batch_allocations order_batch_allocations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_batch_allocations
    ADD CONSTRAINT order_batch_allocations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_batch_allocations order_batch_allocations_validation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_batch_allocations
    ADD CONSTRAINT order_batch_allocations_validation_run_id_fkey FOREIGN KEY (validation_run_id) REFERENCES public.order_validation_runs(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.employees(id);


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_validation_messages order_validation_messages_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_validation_messages
    ADD CONSTRAINT order_validation_messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_validation_messages order_validation_messages_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_validation_messages
    ADD CONSTRAINT order_validation_messages_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE SET NULL;


--
-- Name: order_validation_messages order_validation_messages_validation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_validation_messages
    ADD CONSTRAINT order_validation_messages_validation_run_id_fkey FOREIGN KEY (validation_run_id) REFERENCES public.order_validation_runs(id) ON DELETE CASCADE;


--
-- Name: order_validation_runs order_validation_runs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_validation_runs
    ADD CONSTRAINT order_validation_runs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_validation_runs order_validation_runs_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_validation_runs
    ADD CONSTRAINT order_validation_runs_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.employees(id);


--
-- Name: orders orders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.employees(id);


--
-- Name: orders orders_assigned_vehicle_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_vehicle_fkey FOREIGN KEY (assigned_vehicle) REFERENCES public.vehicles(id);


--
-- Name: orders orders_collection_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_collection_approved_by_fkey FOREIGN KEY (collection_approved_by) REFERENCES public.employees(id);


--
-- Name: picking_order_deliveries picking_order_deliveries_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.picking_order_deliveries
    ADD CONSTRAINT picking_order_deliveries_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.delivery_orders(id) ON DELETE SET NULL;


--
-- Name: picking_order_deliveries picking_order_deliveries_picking_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.picking_order_deliveries
    ADD CONSTRAINT picking_order_deliveries_picking_order_id_fkey FOREIGN KEY (picking_order_id) REFERENCES public.picking_orders(id) ON DELETE CASCADE;


--
-- Name: price_setups price_setups_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_setups
    ADD CONSTRAINT price_setups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_item_stock product_item_stock_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_item_stock
    ADD CONSTRAINT product_item_stock_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: product_item_stock_details product_item_stock_details_item_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_item_stock_details
    ADD CONSTRAINT product_item_stock_details_item_code_fkey FOREIGN KEY (item_code) REFERENCES public.product_item_stock(id) ON DELETE CASCADE;


--
-- Name: product_item_stock product_item_stock_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_item_stock
    ADD CONSTRAINT product_item_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_receipt_items product_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_receipt_items
    ADD CONSTRAINT product_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.product_receipts(id) ON DELETE CASCADE;


--
-- Name: product_receipts product_receipts_target_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_receipts
    ADD CONSTRAINT product_receipts_target_depot_id_fkey FOREIGN KEY (target_depot_id) REFERENCES public.depots(id);


--
-- Name: products products_primary_packaging_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_primary_packaging_id_fkey FOREIGN KEY (primary_packaging_id) REFERENCES public.primary_packagings(id);


--
-- Name: products products_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uoms(id);


--
-- Name: promotion_customers promotion_customers_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_customers
    ADD CONSTRAINT promotion_customers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: promotion_customers promotion_customers_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_customers
    ADD CONSTRAINT promotion_customers_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE;


--
-- Name: promotion_depots promotion_depots_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_depots
    ADD CONSTRAINT promotion_depots_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: promotion_depots promotion_depots_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_depots
    ADD CONSTRAINT promotion_depots_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE;


--
-- Name: promotion_products promotion_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_products
    ADD CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: promotion_products promotion_products_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_products
    ADD CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE;


--
-- Name: promotion_rules promotion_rules_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_rules
    ADD CONSTRAINT promotion_rules_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE;


--
-- Name: promotion_usage_logs promotion_usage_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usage_logs
    ADD CONSTRAINT promotion_usage_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: promotion_usage_logs promotion_usage_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usage_logs
    ADD CONSTRAINT promotion_usage_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: promotion_usage_logs promotion_usage_logs_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_usage_logs
    ADD CONSTRAINT promotion_usage_logs_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id);


--
-- Name: promotions promotions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.employees(id);


--
-- Name: promotions promotions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id);


--
-- Name: reconciliation_lines reconciliation_lines_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_lines
    ADD CONSTRAINT reconciliation_lines_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: reconciliation_lines reconciliation_lines_reconciliation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_lines
    ADD CONSTRAINT reconciliation_lines_reconciliation_run_id_fkey FOREIGN KEY (reconciliation_run_id) REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE;


--
-- Name: reconciliation_runs reconciliation_runs_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT reconciliation_runs_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.employees(id);


--
-- Name: reconciliation_runs reconciliation_runs_checked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT reconciliation_runs_checked_by_fkey FOREIGN KEY (checked_by) REFERENCES public.employees(id);


--
-- Name: reconciliation_runs reconciliation_runs_delivery_man_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT reconciliation_runs_delivery_man_id_fkey FOREIGN KEY (delivery_man_id) REFERENCES public.employees(id);


--
-- Name: reconciliation_runs reconciliation_runs_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT reconciliation_runs_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: reconciliation_runs reconciliation_runs_prepared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT reconciliation_runs_prepared_by_fkey FOREIGN KEY (prepared_by) REFERENCES public.employees(id);


--
-- Name: reconciliation_runs reconciliation_runs_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT reconciliation_runs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: reconciliation_variances reconciliation_variances_reconciliation_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_variances
    ADD CONSTRAINT reconciliation_variances_reconciliation_run_id_fkey FOREIGN KEY (reconciliation_run_id) REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE;


--
-- Name: reconciliation_variances reconciliation_variances_responsible_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_variances
    ADD CONSTRAINT reconciliation_variances_responsible_user_id_fkey FOREIGN KEY (responsible_user_id) REFERENCES public.employees(id);


--
-- Name: refund_liabilities refund_liabilities_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_liabilities
    ADD CONSTRAINT refund_liabilities_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: refund_liabilities refund_liabilities_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_liabilities
    ADD CONSTRAINT refund_liabilities_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: refund_settlements refund_settlements_liability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_settlements
    ADD CONSTRAINT refund_settlements_liability_id_fkey FOREIGN KEY (liability_id) REFERENCES public.refund_liabilities(id);


--
-- Name: refund_settlements refund_settlements_settled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_settlements
    ADD CONSTRAINT refund_settlements_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.employees(id);


--
-- Name: refund_settlements refund_settlements_settlement_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_settlements
    ADD CONSTRAINT refund_settlements_settlement_order_id_fkey FOREIGN KEY (settlement_order_id) REFERENCES public.orders(id);


--
-- Name: role_masters role_masters_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_masters
    ADD CONSTRAINT role_masters_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: role_masters role_masters_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_masters
    ADD CONSTRAINT role_masters_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.role_masters(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: route_shipping_points route_shipping_points_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_shipping_points
    ADD CONSTRAINT route_shipping_points_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: route_shipping_points route_shipping_points_shipping_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_shipping_points
    ADD CONSTRAINT route_shipping_points_shipping_point_id_fkey FOREIGN KEY (shipping_point_id) REFERENCES public.shipping_points(id);


--
-- Name: route_stops route_stops_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT route_stops_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: route_stops route_stops_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT route_stops_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: routes routes_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: shipping_points shipping_points_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_points
    ADD CONSTRAINT shipping_points_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: stock_adjustment_items stock_adjustment_items_adjustment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_adjustment_id_fkey FOREIGN KEY (adjustment_id) REFERENCES public.stock_adjustments(id);


--
-- Name: stock_adjustment_items stock_adjustment_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_adjustments stock_adjustments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.employees(id);


--
-- Name: stock_adjustments stock_adjustments_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: stock_adjustments stock_adjustments_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.employees(id);


--
-- Name: stock_issuance_items stock_issuance_items_issuance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_issuance_items
    ADD CONSTRAINT stock_issuance_items_issuance_id_fkey FOREIGN KEY (issuance_id) REFERENCES public.stock_issuances(id);


--
-- Name: stock_issuance_items stock_issuance_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_issuance_items
    ADD CONSTRAINT stock_issuance_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_issuances stock_issuances_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_issuances
    ADD CONSTRAINT stock_issuances_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id);


--
-- Name: stock_issuances stock_issuances_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_issuances
    ADD CONSTRAINT stock_issuances_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: stock_issuances stock_issuances_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_issuances
    ADD CONSTRAINT stock_issuances_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: stock_ledger stock_ledger_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: stock_ledger stock_ledger_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_ledger
    ADD CONSTRAINT stock_ledger_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_receipt_items stock_receipt_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipt_items
    ADD CONSTRAINT stock_receipt_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_receipt_items stock_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipt_items
    ADD CONSTRAINT stock_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.stock_receipts(id);


--
-- Name: stock_receipts stock_receipts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id);


--
-- Name: stock_receipts stock_receipts_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- Name: stock_receipts stock_receipts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_receipts
    ADD CONSTRAINT stock_receipts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: sync_checkpoints sync_checkpoints_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_checkpoints
    ADD CONSTRAINT sync_checkpoints_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id);


--
-- Name: sync_conflicts sync_conflicts_sync_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_sync_event_id_fkey FOREIGN KEY (sync_event_id) REFERENCES public.sync_events(id);


--
-- Name: sync_queue sync_queue_sync_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT sync_queue_sync_event_id_fkey FOREIGN KEY (sync_event_id) REFERENCES public.sync_events(id);


--
-- Name: transport_expenses transport_expenses_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_expenses
    ADD CONSTRAINT transport_expenses_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: transport_expenses transport_expenses_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_expenses
    ADD CONSTRAINT transport_expenses_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: trips trips_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.orders(id);


--
-- Name: trips trips_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- Name: trips trips_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: trips trips_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: vehicle_loading_items vehicle_loading_items_issuance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_loading_items
    ADD CONSTRAINT vehicle_loading_items_issuance_id_fkey FOREIGN KEY (issuance_id) REFERENCES public.stock_issuances(id);


--
-- Name: vehicle_loading_items vehicle_loading_items_loading_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_loading_items
    ADD CONSTRAINT vehicle_loading_items_loading_id_fkey FOREIGN KEY (loading_id) REFERENCES public.vehicle_loadings(id);


--
-- Name: vehicle_loadings vehicle_loadings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_loadings
    ADD CONSTRAINT vehicle_loadings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id);


--
-- Name: vehicle_loadings vehicle_loadings_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_loadings
    ADD CONSTRAINT vehicle_loadings_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- Name: vehicle_loadings vehicle_loadings_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_loadings
    ADD CONSTRAINT vehicle_loadings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: vehicles vehicles_depot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_depot_id_fkey FOREIGN KEY (depot_id) REFERENCES public.depots(id);


--
-- PostgreSQL database dump complete
--



-- The dump clears search_path. Restore it so Alembic can see alembic_version.
SELECT pg_catalog.set_config('search_path', 'public', false);
