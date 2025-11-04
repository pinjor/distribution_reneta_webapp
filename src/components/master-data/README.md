# Master Data Table Template

A reusable template component for master data management pages with built-in pagination, search, badge coloring, and code generation.

## Features

- ✅ **Pagination** - Automatic pagination with customizable items per page
- ✅ **Search** - Built-in search across specified fields
- ✅ **Badge Coloring** - Automatic color mapping for status fields
- ✅ **Code Generation** - Auto-generate unique codes for entities
- ✅ **Actions** - Edit and Delete buttons
- ✅ **Fully Typed** - TypeScript support with generic types

## Quick Start

```tsx
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { generateCode } from "@/utils/codeGenerator";
import { getBadgeVariant } from "@/utils/badgeColors";

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  status: "Active" | "Inactive";
  price: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);

  // Define columns
  const columns: ColumnDef<Product>[] = [
    {
      key: "name",
      header: "Product Name",
      render: (_, product) => (
        <span className="font-medium">{product.name}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
    },
    {
      key: "status",
      header: "Status",
      render: (value) => (
        <Badge variant={getBadgeVariant(value)}>
          {value}
        </Badge>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (value) => `$${value.toFixed(2)}`,
      align: "right",
    },
  ];

  return (
    <MasterDataTable
      title="Products"
      description={`Total products: ${products.length}`}
      data={products}
      columns={columns}
      searchPlaceholder="Search products..."
      searchFields={["name", "code", "category"]}
      itemsPerPage={10}
      onAdd={() => {/* Open add form */}}
      onEdit={(product) => {/* Open edit form */}}
      onDelete={(product) => {/* Handle delete */}}
      showCode={true}
      codeKey="code"
    />
  );
}
```

## Code Generation

```tsx
import { generateCode } from "@/utils/codeGenerator";

// Generate a unique code
const existingCodes = products.map(p => p.code);
const newCode = generateCode("PROD", existingCodes);
// Returns: "PROD-0001", "PROD-0002", etc.
```

## Badge Coloring

```tsx
import { getBadgeVariant, createStatusColorMap } from "@/utils/badgeColors";

// Use default color mappings
<Badge variant={getBadgeVariant(status)}>{status}</Badge>

// Or create custom mappings
const customColors = createStatusColorMap({
  "Pending": "warning",
  "Approved": "success",
});
<Badge variant={getBadgeVariant(status, customColors)}>{status}</Badge>
```

## API Reference

### MasterDataTable Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | ✅ | Table title |
| `description` | `string` | ❌ | Table description |
| `data` | `T[]` | ✅ | Array of data items |
| `columns` | `ColumnDef<T>[]` | ✅ | Column definitions |
| `searchPlaceholder` | `string` | ❌ | Search input placeholder |
| `searchFields` | `(keyof T)[]` | ❌ | Fields to search (empty = all) |
| `itemsPerPage` | `number` | ❌ | Items per page (default: 10) |
| `onAdd` | `() => void` | ❌ | Add button handler |
| `onEdit` | `(item: T) => void` | ❌ | Edit button handler |
| `onDelete` | `(item: T) => void` | ❌ | Delete button handler |
| `emptyMessage` | `string` | ❌ | Empty state message |
| `badgeColorMap` | `StatusColorMap` | ❌ | Custom badge color mappings |
| `showCode` | `boolean` | ❌ | Show code column (default: false) |
| `codeKey` | `keyof T` | ❌ | Code field key (default: "code") |

### ColumnDef

```tsx
interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  cellClassName?: string;
}
```

### Default Badge Color Mappings

- **High** → `destructive` (red)
- **Medium** → `warning` (yellow/orange)
- **Low** → `info` (blue)
- **Active/Open/InStock** → `success` (green)
- **Inactive/Block/Closed/OutOfStock** → `destructive` (red)
- **Credit** → `default`
- **Cash** → `warning`

## Examples

See `src/pages/settings/Customers.tsx` for a complete implementation example.

