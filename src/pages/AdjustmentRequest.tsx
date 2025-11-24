import { useState } from "react";
import { Search, Printer, Trash2, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";

interface AdjustmentRequest {
  id: string;
  voucherNo: string;
  voucherDate: string;
  store: string;
  status: "pending" | "submitted";
}

const mockAdjustments: AdjustmentRequest[] = [
  {
    id: "1",
    voucherNo: "ADJ411250947",
    voucherDate: "23/11/2025",
    store: "Hospital Dispensary Satkania",
    status: "pending",
  },
  {
    id: "2",
    voucherNo: "ADJ406250935",
    voucherDate: "18/06/2025",
    store: "Medical Store(BGHS)",
    status: "pending",
  },
  {
    id: "3",
    voucherNo: "ADJ406250934",
    voucherDate: "18/06/2025",
    store: "Medical Store(BGHS)",
    status: "pending",
  },
  {
    id: "4",
    voucherNo: "ADJ406250933",
    voucherDate: "18/06/2025",
    store: "Medical Store(BGHS)",
    status: "submitted",
  },
  {
    id: "5",
    voucherNo: "ADJ406250932",
    voucherDate: "18/06/2025",
    store: "Medical Store(BGHS)",
    status: "pending",
  },
  {
    id: "6",
    voucherNo: "ADJ406250931",
    voucherDate: "18/06/2025",
    store: "Medical Store(BGHS)",
    status: "submitted",
  },
  {
    id: "7",
    voucherNo: "ADJ406250930",
    voucherDate: "16/06/2025",
    store: "Hospital Dispensary Satkania",
    status: "pending",
  },
];

export default function AdjustmentRequest() {
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

  const filteredAdjustments = mockAdjustments.filter((adj) => {
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
    console.log("Print voucher:", voucherNo);
    // Implement print functionality
  };

  const handleDelete = (id: string) => {
    console.log("Delete adjustment:", id);
    // Implement delete functionality
  };

  const handleSubmit = (id: string) => {
    console.log("Submit adjustment:", id);
    // Implement submit functionality
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gray-800 text-white px-6 py-4 rounded-t-lg">
        <h1 className="text-xl font-semibold">Stock Adjustment Work List (CMSD)</h1>
      </div>

      {/* Filter Section */}
      <Card className="border-t-0 rounded-t-none bg-gray-50">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="store" className="text-sm font-medium">Store</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore} disabled={depotsLoading}>
                <SelectTrigger id="store" className="mt-1">
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
              <Label htmlFor="fromDate" className="text-sm font-medium">From</Label>
              <Input
                id="fromDate"
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="toDate" className="text-sm font-medium">To</Label>
              <Input
                id="toDate"
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} className="bg-green-600 hover:bg-green-700 flex-1">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button onClick={handleClear} variant="outline" className="flex-1">
                Clear
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">Status:</Label>
              <RadioGroup
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "pending" | "approved")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id="pending" />
                  <Label htmlFor="pending" className="cursor-pointer font-normal">Pending</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approved" id="approved" />
                  <Label htmlFor="approved" className="cursor-pointer font-normal">Approved</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card>
        <div className="p-6">
          <div className="border rounded-lg overflow-x-auto">
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
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
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
        </div>
      </Card>
    </div>
  );
}
