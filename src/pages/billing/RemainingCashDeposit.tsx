import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft,
  Save,
  Download,
  DollarSign,
  Coins,
  User,
  Calendar,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface CollectionDeposit {
  id: number;
  deposit_number: string;
  deposit_date: string;
  collection_person_id: number;
  collection_person_name: string;
  deposit_method: "BRAC" | "bKash" | "Nagad";
  deposit_amount: number;
  transaction_number: string;
  remaining_amount: number;
  total_collection_amount: number;
  notes?: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name?: string;
  employee_id: string;
}

export default function RemainingCashDeposit() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Remaining Cash Deposit | Renata";
  }, []);

  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [depositId, setDepositId] = useState<string>("");
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [receiptNotes, setReceiptNotes] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  // Get current user ID (in real app, get from auth context)
  const currentUserId = 1; // TODO: Get from auth context

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiEndpoints.employees.getAll(),
  });

  const { data: deposits, refetch: refetchDeposits } = useQuery({
    queryKey: ['billing-deposits-person', selectedPersonId],
    queryFn: async () => {
      if (!selectedPersonId) return [];
      const result = await apiEndpoints.billing.deposits.getAll({
        collection_person_id: parseInt(selectedPersonId),
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!selectedPersonId,
  });

  // Filter deposits with remaining amount > 0 and for today
  const today = new Date().toISOString().split('T')[0];
  const availableDeposits = (deposits || []).filter((dep: CollectionDeposit) => {
    const depositDate = new Date(dep.deposit_date).toISOString().split('T')[0];
    return depositDate === today && dep.remaining_amount > 0;
  });

  const selectedDeposit = availableDeposits.find((dep: CollectionDeposit) => dep.id.toString() === depositId);

  useEffect(() => {
    if (selectedDeposit) {
      setReceivedAmount(selectedDeposit.remaining_amount.toString());
    }
  }, [selectedDeposit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPersonId || !depositId || !receivedAmount) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(receivedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (selectedDeposit && amount > selectedDeposit.remaining_amount) {
      toast({
        title: "Amount Exceeded",
        description: `Cannot receive more than remaining amount (৳${selectedDeposit.remaining_amount})`,
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      
      // Call API to receive remaining cash
      const result = await apiEndpoints.billing.deposits.receiveRemaining(
        parseInt(depositId),
        amount,
        currentUserId,
        receiptNotes
      );

      toast({
        title: "Cash Received Successfully",
        description: `Remaining cash of ৳${amount} has been documented`,
      });

      // Generate PDF report
      await generateReceiptPDF(result);

      // Reset form
      setSelectedPersonId("");
      setDepositId("");
      setReceivedAmount("");
      setReceiptNotes("");
      refetchDeposits();
      
      toast({
        title: "Receipt Generated",
        description: "PDF receipt has been generated and can be printed",
      });

    } catch (error: any) {
      console.error("Failed to receive cash", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process cash receipt",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const generateReceiptPDF = async (deposit: CollectionDeposit) => {
    // Create PDF content
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cash Receipt - ${deposit.deposit_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .section { margin: 20px 0; }
          .row { display: flex; justify-content: space-between; margin: 10px 0; }
          .label { font-weight: bold; }
          .footer { margin-top: 40px; border-top: 2px solid #000; padding-top: 20px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Remaining Cash Receipt</h1>
          <p>Collection Deposit Receipt</p>
        </div>
        
        <div class="section">
          <h2>Deposit Information</h2>
          <div class="row">
            <span class="label">Deposit Number:</span>
            <span>${deposit.deposit_number}</span>
          </div>
          <div class="row">
            <span class="label">Date:</span>
            <span>${format(new Date(deposit.deposit_date), "MMMM dd, yyyy")}</span>
          </div>
          <div class="row">
            <span class="label">Collection Person:</span>
            <span>${deposit.collection_person_name}</span>
          </div>
        </div>

        <div class="section">
          <h2>Cash Receipt Details</h2>
          <table>
            <tr>
              <th>Description</th>
              <th>Amount (BDT)</th>
            </tr>
            <tr>
              <td>Total Collection Amount</td>
              <td>৳${Number(deposit.total_collection_amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Initial Deposit Amount</td>
              <td>৳${Number(deposit.deposit_amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>Remaining Cash Received</strong></td>
              <td><strong>৳${receivedAmount}</strong></td>
            </tr>
            <tr>
              <td>Remaining Balance</td>
              <td>৳${Number(deposit.remaining_amount - parseFloat(receivedAmount)).toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <h2>Receipt Information</h2>
          <div class="row">
            <span class="label">Received Date:</span>
            <span>${format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}</span>
          </div>
          ${receiptNotes ? `<div class="row"><span class="label">Notes:</span><span>${receiptNotes}</span></div>` : ''}
        </div>

        <div class="footer">
          <p><strong>This is a system-generated receipt for remaining cash deposit.</strong></p>
          <p>Please keep this receipt for your records.</p>
          <p>Generated on: ${format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}</p>
        </div>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/billing/deposits")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deposits
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Receive Remaining Cash</h1>
          <p className="text-muted-foreground mt-1">
            Document remaining cash deposit from collection employee at depot
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Cash Receipt Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Collection Person Selection */}
              <div className="space-y-2">
                <Label htmlFor="collection-person">Collection Person *</Label>
                <Select
                  value={selectedPersonId}
                  onValueChange={(value) => {
                    setSelectedPersonId(value);
                    setDepositId("");
                    setReceivedAmount("");
                  }}
                  required
                >
                  <SelectTrigger id="collection-person">
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

              {/* Deposit Selection */}
              <div className="space-y-2">
                <Label htmlFor="deposit">Today's Deposit *</Label>
                <Select
                  value={depositId}
                  onValueChange={setDepositId}
                  disabled={!selectedPersonId || availableDeposits.length === 0}
                  required
                >
                  <SelectTrigger id="deposit">
                    <SelectValue placeholder="Select deposit" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDeposits.length > 0 && availableDeposits.map((dep: CollectionDeposit) => (
                      <SelectItem key={dep.id} value={dep.id.toString()}>
                        {dep.deposit_number} - Remaining: ৳{Number(dep.remaining_amount).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deposit Details */}
            {selectedDeposit && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Deposit Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Deposit Number</Label>
                      <p className="font-medium">{selectedDeposit.deposit_number}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Date</Label>
                      <p className="font-medium">{format(new Date(selectedDeposit.deposit_date), "MMM dd, yyyy")}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Total Collection</Label>
                      <p className="font-medium">৳{Number(selectedDeposit.total_collection_amount).toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Remaining Amount</Label>
                      <p className="font-medium text-orange-600">৳{Number(selectedDeposit.remaining_amount).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cash Receipt Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Cash Receipt Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="received-amount">Received Amount (BDT) *</Label>
                  <Input
                    id="received-amount"
                    type="number"
                    step="0.01"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    disabled={!selectedDeposit}
                  />
                  {selectedDeposit && (
                    <p className="text-xs text-muted-foreground">
                      Maximum: ৳{Number(selectedDeposit.remaining_amount).toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt-date">Receipt Date</Label>
                  <Input
                    id="receipt-date"
                    type="text"
                    value={format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt-notes">Receipt Notes (Optional)</Label>
                <Textarea
                  id="receipt-notes"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Additional notes for this cash receipt..."
                  rows={3}
                />
              </div>
            </div>

            {/* Summary */}
            {selectedDeposit && receivedAmount && (
              <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Receipt Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Cash Received</Label>
                      <p className="font-bold text-lg text-green-600">৳{parseFloat(receivedAmount || "0").toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">New Remaining Balance</Label>
                      <p className="font-medium">
                        ৳{(selectedDeposit.remaining_amount - parseFloat(receivedAmount || "0")).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/billing/deposits")}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={processing || !selectedDeposit || !receivedAmount}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Receive Cash & Generate Receipt
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

