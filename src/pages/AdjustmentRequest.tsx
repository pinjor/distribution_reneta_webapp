import { useEffect, useState } from "react";
import { Search, Printer, Trash2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AdjustmentRequest {
  id: string;
  voucherNo: string;
  voucherDate: string;
  store: string;
  status: "pending" | "submitted";
}

export default function AdjustmentRequest() {
  const { toast } = useToast();
  const [selectedStore, setSelectedStore] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Load depots/stores
  const { data: depotsResponse, isLoading: depotsLoading } = useQuery({
    queryKey: ['depots'],
    queryFn: apiEndpoints.depots.getAll,
  });

  const depots = depotsResponse?.data || depotsResponse || [];

  const { data: adjustmentsResponse, isLoading: adjLoading } = useQuery({
    queryKey: ["stock-adjustments"],
    queryFn: apiEndpoints.stockAdjustments.getAll,
  });

  const adjustments: AdjustmentRequest[] = (Array.isArray(adjustmentsResponse) ? adjustmentsResponse : []).map(
    (adj: any) => ({
      id: String(adj.id),
      voucherNo: adj.adjustment_number || String(adj.id),
      voucherDate: adj.adjustment_date || "",
      store: String(adj.depot_id ?? ""),
      status: String(adj.status || "pending").toLowerCase() === "pending" ? "pending" : "submitted",
    }),
  );

  const filteredAdjustments = adjustments.filter((adj) => {
    const matchesStore = !selectedStore || adj.store.toLowerCase().includes(selectedStore.toLowerCase());
    // Map "approved" filter to "submitted" status in data
    const matchesStatus = statusFilter === "approved" 
      ? adj.status === "submitted" 
      : adj.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      adj.voucherNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adj.store.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Date filtering would go here if needed
    const matchesDate = true; // Simplified for now

    return matchesStore && matchesStatus && matchesSearch && matchesDate;
  });

  const handleSearch = () => {
    // Search logic is handled by filteredAdjustments
  };

  const handleClear = () => {
    setSelectedStore("");
    setFromDate("");
    setToDate("");
    setSearchQuery("");
  };

  const handlePrint = (voucherNo: string) => {
    window.print();
    void voucherNo;
  };

  const handleDelete = (id: string) => {
    toast({
      title: "Delete is not available",
      description: `Stock adjustments have no delete API. Request ${id} was not changed.`,
      variant: "destructive",
    });
  };

  const handleSubmit = (id: string) => {
    toast({
      title: "Already stored",
      description: `Adjustment ${id} is already a Pending record. Approval is a separate inventory policy.`,
    });
  };

  const fieldClass =
    "border-[#D5E1F2] bg-white text-[#0B1B33] placeholder:text-[#8AA0BE] focus-visible:ring-[#0C4CA1]/30";

  useEffect(() => {
    document.title = "Stock Adjustment Work List | Renata";
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Filter Section */}
      <Card className="card-elevated overflow-hidden border border-[#D5E1F2] bg-white shadow-[0_16px_40px_-28px_rgba(12,76,161,0.45)]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0C4CA1] text-white shadow-[0_8px_16px_-10px_rgba(12,76,161,0.9)]">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[#0C4CA1]">Stock Adjustment Work List</span>
              <span className="text-sm font-normal text-[#2C4A73]">
                Review, search, and submit stock adjustment requests.
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="store" className="text-sm font-medium text-[#2C4A73]">Store</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore} disabled={depotsLoading}>
                <SelectTrigger id="store" className={`mt-1 ${fieldClass}`}>
                  <SelectValue placeholder="Select Store" />
                </SelectTrigger>
                <SelectContent>
                  {depotsLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                  ) : depots.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No stores available</div>
                  ) : (
                    depots.map((depot: any) => (
                      <SelectItem key={depot.id} value={depot.name}>
                        {depot.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fromDate" className="text-sm font-medium text-[#2C4A73]">From</Label>
              <Input
                id="fromDate"
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className={`mt-1 ${fieldClass}`}
              />
            </div>
            <div>
              <Label htmlFor="toDate" className="text-sm font-medium text-[#2C4A73]">To</Label>
              <Input
                id="toDate"
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className={`mt-1 ${fieldClass}`}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} className="flex-1 bg-[#0C4CA1] text-white hover:bg-[#08357A]">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                className="flex-1 border-[#0C4CA1] bg-white text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]"
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium text-[#2C4A73]">Status:</Label>
              <RadioGroup
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "pending" | "approved")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id="pending" />
                  <Label htmlFor="pending" className="cursor-pointer font-normal text-[#0B1B33]">Pending</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approved" id="approved" />
                  <Label htmlFor="approved" className="cursor-pointer font-normal text-[#0B1B33]">Approved</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8AA0BE]" />
                <Input
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pr-10 ${fieldClass}`}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="card-elevated overflow-hidden border border-[#D5E1F2] bg-white shadow-[0_16px_40px_-28px_rgba(12,76,161,0.45)]">
        <CardContent className="p-6">
          <div className="overflow-x-auto rounded-lg border border-[#D5E1F2]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">SL</TableHead>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Voucher Date</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead className="w-32">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No adjustment requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAdjustments.map((adj, index) => (
                    <TableRow key={adj.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{adj.voucherNo}</TableCell>
                      <TableCell>{adj.voucherDate}</TableCell>
                      <TableCell>{adj.store}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(adj.voucherNo)}
                            className="h-8 w-8 p-0 text-[#0C4CA1] hover:bg-[#E7EEF8] hover:text-[#08357A]"
                            title="Print"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(adj.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {adj.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSubmit(adj.id)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Submit"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
