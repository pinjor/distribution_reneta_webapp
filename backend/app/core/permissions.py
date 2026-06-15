"""Permission codes and default role mappings."""

# Module.action permission codes
PERMISSIONS: list[tuple[str, str, str]] = [
    ("orders.read", "View Orders", "orders"),
    ("orders.write", "Create/Edit Orders", "orders"),
    ("orders.validate", "Validate Orders", "orders"),
    ("orders.approve_exception", "Approve Validation Exceptions", "orders"),
    ("orders.assign", "Assign Orders", "orders"),
    ("orders.print", "Print Memos", "orders"),
    ("orders.status", "Change Order Status", "orders"),
    ("inventory.read", "View Inventory", "inventory"),
    ("inventory.write", "Manage Inventory", "inventory"),
    ("billing.read", "View Billing", "billing"),
    ("billing.write", "Manage Deposits", "billing"),
    ("billing.approve", "Approve Deposits/Collections", "billing"),
    ("reconciliation.read", "View Reconciliation", "finance"),
    ("reconciliation.write", "Manage Reconciliation", "finance"),
    ("reconciliation.approve", "Approve Reconciliation", "finance"),
    ("promotions.read", "View Promotions", "promotions"),
    ("promotions.write", "Manage Promotions", "promotions"),
    ("promotions.approve", "Approve Promotions", "promotions"),
    ("reports.read", "View Reports", "reports"),
    ("reports.export", "Export Reports", "reports"),
    ("audit.read", "View Audit Logs", "audit"),
    ("integrations.read", "View Integrations", "integrations"),
    ("integrations.write", "Run Integrations", "integrations"),
    ("devices.read", "View Devices", "devices"),
    ("devices.manage", "Block/Unblock Devices", "devices"),
    ("sync.read", "View Sync Status", "sync"),
    ("sync.write", "Push Sync Events", "sync"),
    ("admin.users", "Manage Users", "admin"),
    ("admin.roles", "Manage Roles", "admin"),
    ("mobile.access", "Mobile App Access", "mobile"),
]

# Role -> permission codes (admin gets all)
ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": [p[0] for p in PERMISSIONS],
    "manager": [
        "orders.read", "orders.write", "orders.validate", "orders.assign", "orders.print",
        "orders.status", "orders.approve_exception",
        "inventory.read", "inventory.write",
        "billing.read", "billing.write", "billing.approve",
        "reconciliation.read", "reconciliation.write", "reconciliation.approve",
        "promotions.read", "promotions.write", "promotions.approve",
        "reports.read", "reports.export", "audit.read",
        "integrations.read", "integrations.write",
        "devices.read", "devices.manage", "sync.read", "sync.write", "mobile.access",
    ],
    "billing": [
        "orders.read", "orders.validate", "orders.approve_exception",
        "billing.read", "billing.write", "billing.approve",
        "reconciliation.read", "reconciliation.write",
        "promotions.read", "reports.read", "reports.export", "audit.read",
    ],
    "finance": [
        "orders.read", "billing.read", "billing.approve",
        "reconciliation.read", "reconciliation.write", "reconciliation.approve",
        "reports.read", "reports.export", "audit.read",
    ],
    "transport": [
        "orders.read", "orders.assign", "orders.print", "orders.status",
        "inventory.read", "reports.read", "mobile.access",
    ],
    "user": [
        "orders.read", "orders.write", "inventory.read", "billing.read", "reports.read",
    ],
}


def permissions_for_role(role: str) -> set[str]:
    role_key = (role or "user").lower()
    if role_key == "admin":
        return set(ROLE_PERMISSIONS["admin"])
    return set(ROLE_PERMISSIONS.get(role_key, ROLE_PERMISSIONS["user"]))
