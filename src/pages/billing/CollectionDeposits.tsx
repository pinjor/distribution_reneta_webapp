import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  RefreshCw,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  DollarSign,
  Coins,
  Upload,
  Download,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface CollectionDeposit {
  id: number;
  deposit_number: string;
  deposit_date: string;
  collection_person_id: number;
  collection_person_name: string;
  deposit_method: "BRAC" | "bKash" | "Nagad";
  deposit_amount: number;
  transaction_number: string;
  attachment_url?: string;
  remaining_amount: number;
  total_collection_amount: number;
  notes?: string;
  approved: boolean;
  approved_by?: number;
  approved_at?: string;
  approver_name?: string;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name?: string;
  employee_id: string;
}

export default function CollectionDeposits() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "Collection Deposits | Renata";
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [approvedFilter, setApprovedFilter] = useState<string>("all");
  const [depositForm, setDepositForm] = useState({
    deposit_date: new Date().toISOString().split('T')[0],
    collection_person_id: "",
    deposit_method: "BRAC" as "BRAC" | "bKash" | "Nagad",
    deposit_amount: "",
    transaction_number: "",
    attachment_url: "",
    remaining_amount: "",
    total_collection_amount: "",
    notes: "",
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiEndpoints.employees.getAll(),
  });

  const { data: depositsData, isLoading, refetch } = useQuery({
    queryKey: ['billing-deposits', approvedFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (approvedFilter !== "all") {
        params.approved = approvedFilter === "approved";
      }
      const result = await apiEndpoints.billing.deposits.getAll(params);
      return Array.isArray(result) ? result : [];
    },
  });

  const deposits = depositsData || [];

  const filteredDeposits = deposits.filter((deposit: CollectionDeposit) => {
    const term = searchTerm.toLowerCase();
    return (
      deposit.deposit_number.toLowerCase().includes(term) ||
      deposit.collection_person_name.toLowerCase().includes(term) ||
      deposit.transaction_number.toLowerCase().includes(term)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const depositData = {
        ...depositForm,
        collection_person_id: parseInt(depositForm.collection_person_id),
        deposit_amount: parseFloat(depositForm.deposit_amount),
        remaining_amount: parseFloat(depositForm.remaining_amount) || 0,
        total_collection_amount: parseFloat(depositForm.total_collection_amount),
      };

      await apiEndpoints.billing.deposits.create(depositData);
      toast({
        title: "Deposit created",
        description: "Collection deposit has been created successfully",
      });
      setShowAddDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['billing-deposits'] });
      refetch();
    } catch (error: any) {
      console.error("Failed to create deposit", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create deposit",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (depositId: number) => {
    try {
      // Get current user ID - in real app, get from auth context
      const userId = 1; // TODO: Get from auth context
      await apiEndpoints.billing.deposits.approve(depositId, userId);
      toast({
        title: "Deposit approved",
        description: "Deposit has been approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['billing-deposits'] });
      refetch();
    } catch (error: any) {
      console.error("Failed to approve deposit", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve deposit",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setDepositForm({
      deposit_date: new Date().toISOString().split('T')[0],
      collection_person_id: "",
      deposit_method: "BRAC",
      deposit_amount: "",
      transaction_number: "",
      attachment_url: "",
      remaining_amount: "",
      total_collection_amount: "",
      notes: "",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Collection Deposits</h1>
          <p className="text-muted-foreground mt-1">
            Manage daily collection deposits from collection team
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/billing/deposits/remaining-cash")}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Coins className="h-4 w-4 mr-2" />
            Receive Remaining Cash
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Deposit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Collection Deposit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deposit Date *</Label>
                    <Input
                      type="date"
                      value={depositForm.deposit_date}
                      onChange={(e) => setDepositForm({ ...depositForm, deposit_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Collection Person *</Label>
                    <Select
                      value={depositForm.collection_person_id}
                      onValueChange={(value) => setDepositForm({ ...depositForm, collection_person_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select collection person" />
                      </SelectTrigger>
                      <SelectContent>
                        {(employees || []).map((emp: Employee) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.first_name} {emp.last_name || ""} ({emp.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deposit Method *</Label>
                    <Select
                      value={depositForm.deposit_method}
                      onValueChange={(value: "BRAC" | "bKash" | "Nagad") => 
                        setDepositForm({ ...depositForm, deposit_method: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRAC">BRAC</SelectItem>
                        <SelectItem value="bKash">bKash</SelectItem>
                        <SelectItem value="Nagad">Nagad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Transaction Number *</Label>
                    <Input
                      value={depositForm.transaction_number}
                      onChange={(e) => setDepositForm({ ...depositForm, transaction_number: e.target.value })}
                      placeholder="Enter transaction number"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Collection Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={depositForm.total_collection_amount}
                      onChange={(e) => setDepositForm({ ...depositForm, total_collection_amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={depositForm.deposit_amount}
                      onChange={(e) => setDepositForm({ ...depositForm, deposit_amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Remaining Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={depositForm.remaining_amount}
                      onChange={(e) => setDepositForm({ ...depositForm, remaining_amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Attachment URL</Label>
                  <Input
                    value={depositForm.attachment_url}
                    onChange={(e) => setDepositForm({ ...depositForm, attachment_url: e.target.value })}
                    placeholder="Enter attachment URL or path"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL or path to the deposit receipt/attachment
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={depositForm.notes}
                    onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Deposit
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deposit List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by deposit number, person, transaction..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={approvedFilter} onValueChange={setApprovedFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDeposits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deposits found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deposit Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Collection Person</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Transaction Number</TableHead>
                    <TableHead className="text-right">Total Collection</TableHead>
                    <TableHead className="text-right">Deposit Amount</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeposits.map((deposit: CollectionDeposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="font-medium">{deposit.deposit_number}</TableCell>
                      <TableCell>{format(new Date(deposit.deposit_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{deposit.collection_person_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{deposit.deposit_method}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{deposit.transaction_number}</TableCell>
                      <TableCell className="text-right font-medium">
                        ৳{Number(deposit.total_collection_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ৳{Number(deposit.deposit_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ৳{Number(deposit.remaining_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {deposit.approved ? (
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <XCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!deposit.approved && (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(deposit.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

