import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasterDataTable, ColumnDef } from "@/components/master-data/MasterDataTable";
import { apiEndpoints } from "@/lib/api";
import { generateCode } from "@/utils/codeGenerator";

interface PriceSetup {
  id: number;
  code: string;
  product_id: number;
  product_name?: string;
  trade_price?: number;
  unit_price?: number;
  ifc_price?: number;
  mc_price?: number;
  validity_start_date?: string;
  validity_end_date?: string;
  is_active: boolean;
}

interface Product {
  id: number;
  name: string;
  code: string;
}

export default function PriceSetup() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<PriceSetup | null>(null);
  const [priceSetups, setPriceSetups] = useState<PriceSetup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    product_id: "",
    trade_price: "",
    unit_price: "",
    ifc_price: "",
    mc_price: "",
    validity_start_date: "",
    validity_end_date: "",
  });

  const [newSetupCode, setNewSetupCode] = useState<string>("");

  useEffect(() => {
    fetchPriceSetups();
    fetchProducts();
  }, []);

  const fetchPriceSetups = async () => {
    try {
      setLoading(true);
      const data = await apiEndpoints.priceSetups.getAll();
      // Enrich with product names
      const enrichedData = await Promise.all(
        data.map(async (setup: PriceSetup) => {
          try {
            const product = await apiEndpoints.products.getById(setup.product_id);
            return { ...setup, product_name: product.name };
          } catch {
            return { ...setup, product_name: "Unknown" };
          }
        })
      );
      setPriceSetups(enrichedData);
    } catch (error) {
      console.error("Failed to fetch Price Setups:", error);
      toast({
        title: "Error",
        description: "Failed to load Price Setups. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiEndpoints.products.getAll();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch Products:", error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    document.title = "Price Setup | App";
  }, []);

  const generateSetupCode = (): string => {
    const existingCodes = priceSetups.map(s => s.code);
    return generateCode("PRICE", existingCodes);
  };

  useEffect(() => {
    if (showAddForm && !editMode) {
      setNewSetupCode(generateSetupCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm, editMode]);

  const handleAdd = async () => {
    try {
      if (!formData.product_id) {
        toast({
          title: "Validation Error",
          description: "Please select a product.",
          variant: "destructive",
        });
        return;
      }

      const setupData: any = {
        code: newSetupCode,
        product_id: parseInt(formData.product_id),
        trade_price: formData.trade_price ? parseFloat(formData.trade_price) : null,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        ifc_price: formData.ifc_price ? parseFloat(formData.ifc_price) : null,
        mc_price: formData.mc_price ? parseFloat(formData.mc_price) : null,
        validity_start_date: formData.validity_start_date || null,
        validity_end_date: formData.validity_end_date || null,
        is_active: true,
      };

      if (editMode && selectedSetup) {
        await apiEndpoints.priceSetups.update(selectedSetup.id, setupData);
        toast({
          title: "Price Setup updated",
          description: "Price Setup information has been updated successfully.",
        });
      } else {
        await apiEndpoints.priceSetups.create(setupData);
        toast({
          title: "Price Setup added",
          description: `New Price Setup created with code ${newSetupCode}.`,
        });
      }

      await fetchPriceSetups();
      resetForm();
    } catch (error: any) {
      console.error("Failed to save Price Setup:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save Price Setup. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (setup: PriceSetup) => {
    setSelectedSetup(setup);
    setFormData({
      product_id: setup.product_id.toString(),
      trade_price: setup.trade_price?.toString() || "",
      unit_price: setup.unit_price?.toString() || "",
      ifc_price: setup.ifc_price?.toString() || "",
      mc_price: setup.mc_price?.toString() || "",
      validity_start_date: setup.validity_start_date || "",
      validity_end_date: setup.validity_end_date || "",
    });
    setNewSetupCode(setup.code);
    setEditMode(true);
    setShowAddForm(true);
  };

  const handleDelete = async (setup: PriceSetup) => {
    try {
      await apiEndpoints.priceSetups.delete(setup.id);
      toast({
        title: "Price Setup deleted",
        description: "The Price Setup has been removed.",
        variant: "destructive",
      });
      await fetchPriceSetups();
    } catch (error: any) {
      console.error("Failed to delete Price Setup:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete Price Setup. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      trade_price: "",
      unit_price: "",
      ifc_price: "",
      mc_price: "",
      validity_start_date: "",
      validity_end_date: "",
    });
    setNewSetupCode("");
    setEditMode(false);
    setSelectedSetup(null);
    setShowAddForm(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const columns: ColumnDef<PriceSetup>[] = [
    {
      key: "code",
      header: "Code",
      render: (value) => (
        <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
          {String(value)}
        </span>
      ),
    },
    {
      key: "product_name",
      header: "Product",
      render: (_, setup) => (
        <span className="font-medium">{setup.product_name || "Unknown"}</span>
      ),
    },
    {
      key: "trade_price",
      header: "Trade Price",
      render: (value) => (
        <span className="text-muted-foreground">
          {value ? `${Number(value).toFixed(2)}` : "-"}
        </span>
      ),
    },
    {
      key: "unit_price",
      header: "Unit Price",
      render: (value) => (
        <span className="text-muted-foreground">
          {value ? `${Number(value).toFixed(2)}` : "-"}
        </span>
      ),
    },
    {
      key: "ifc_price",
      header: "IFC Price",
      render: (value) => (
        <span className="text-muted-foreground">
          {value ? `${Number(value).toFixed(2)}` : "-"}
        </span>
      ),
    },
    {
      key: "mc_price",
      header: "MC Price",
      render: (value) => (
        <span className="text-muted-foreground">
          {value ? `${Number(value).toFixed(2)}` : "-"}
        </span>
      ),
    },
    {
      key: "validity_start_date",
      header: "Start Date",
      render: (value) => (
        <span className="text-muted-foreground">
          {value ? new Date(value).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      key: "validity_end_date",
      header: "End Date",
      render: (value) => (
        <span className="text-muted-foreground">
          {value ? new Date(value).toLocaleDateString() : "-"}
        </span>
      ),
    },
  ];

  if (showAddForm) {
    return (
      <main className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Tag className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              {editMode ? "Edit Price Setup" : "Add New Price Setup"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {editMode ? "Update Price Setup information" : "Create a new Price Setup for products"}
          </p>
        </header>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="code" className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Code *
                </Label>
                <Input
                  id="code"
                  value={newSetupCode}
                  disabled
                  className="bg-muted font-mono font-semibold"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Auto-generated code (cannot be changed)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(val) => handleChange("product_id", val)}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} ({product.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {products.length === 0 && (
                  <p className="text-xs text-muted-foreground">No products available. Add products first.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trade_price">Trade Price</Label>
                  <Input
                    id="trade_price"
                    type="number"
                    step="0.01"
                    value={formData.trade_price}
                    onChange={(e) => handleChange("trade_price", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_price">Unit Price</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => handleChange("unit_price", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifc_price">IFC Price</Label>
                  <Input
                    id="ifc_price"
                    type="number"
                    step="0.01"
                    value={formData.ifc_price}
                    onChange={(e) => handleChange("ifc_price", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mc_price">MC Price</Label>
                  <Input
                    id="mc_price"
                    type="number"
                    step="0.01"
                    value={formData.mc_price}
                    onChange={(e) => handleChange("mc_price", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validity_start_date">Validity Start Date</Label>
                  <Input
                    id="validity_start_date"
                    type="date"
                    value={formData.validity_start_date}
                    onChange={(e) => handleChange("validity_start_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validity_end_date">Validity End Date</Label>
                  <Input
                    id="validity_end_date"
                    type="date"
                    value={formData.validity_end_date}
                    onChange={(e) => handleChange("validity_end_date", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  {editMode ? "Update Price Setup" : "Create Price Setup"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Price Setup Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage price setups for products</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading Price Setups...</p>
        </div>
      ) : (
        <MasterDataTable
          title="Price Setup Catalog"
          description={`Total Price Setups: ${priceSetups.length}`}
          data={priceSetups}
          columns={columns}
          searchPlaceholder="Search Price Setups..."
          searchFields={["code", "product_name"]}
          itemsPerPage={10}
          onAdd={() => setShowAddForm(true)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No Price Setups found"
          showCode={false}
        />
      )}
    </main>
  );
}

