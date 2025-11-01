import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const approvalRequests = [
  {
    id: "SA-001",
    type: "Stock Adjustment",
    submittedBy: "John Smith",
    date: "2025-01-08",
    status: "pending",
    product: "Paracetamol 500mg",
    batch: "PCM2024-11",
    qty: -50,
    reason: "Damaged goods",
  },
  {
    id: "SA-002",
    type: "Stock Adjustment",
    submittedBy: "Sarah Johnson",
    date: "2025-01-07",
    status: "submitted",
    product: "Amoxicillin 250mg",
    batch: "AMX2024-08",
    qty: 100,
    reason: "Count correction",
  },
  {
    id: "SA-003",
    type: "Stock Adjustment",
    submittedBy: "Mike Wilson",
    date: "2025-01-06",
    status: "approved",
    product: "Ibuprofen 400mg",
    batch: "IBU2024-09",
    qty: -25,
    reason: "Expired items",
  },
  {
    id: "SA-004",
    type: "Stock Adjustment",
    submittedBy: "Emma Davis",
    date: "2025-01-05",
    status: "rejected",
    product: "Vitamin C 1000mg",
    batch: "VTC2024-12",
    qty: 200,
    reason: "System discrepancy",
  },
];

const Approvals = () => {
  const [selectedRequest, setSelectedRequest] = useState<typeof approvalRequests[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [comment, setComment] = useState("");

  const handleAction = (request: typeof approvalRequests[0], action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    console.log(`${actionType} request ${selectedRequest?.id} with comment: ${comment}`);
    setDialogOpen(false);
    setComment("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "status-neutral";
      case "submitted":
        return "status-info";
      case "approved":
        return "status-success";
      case "rejected":
        return "status-error";
      default:
        return "status-neutral";
    }
  };

  const filterByStatus = (status: string) => {
    if (status === "all") return approvalRequests;
    return approvalRequests.filter((req) => req.status === status);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Approvals</h1>
        <p className="text-muted-foreground">Manage approval requests and workflows</p>
      </div>

      <Card className="p-6 card-elevated">
        <Tabs defaultValue="all" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All Requests</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search requests..." className="pl-10" />
            </div>
          </div>

          {["all", "pending", "submitted", "approved", "rejected"].map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              <div className="rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left p-4 text-sm font-medium">Request ID</th>
                        <th className="text-left p-4 text-sm font-medium">Type</th>
                        <th className="text-left p-4 text-sm font-medium">Submitted By</th>
                        <th className="text-left p-4 text-sm font-medium">Date</th>
                        <th className="text-left p-4 text-sm font-medium">Product</th>
                        <th className="text-left p-4 text-sm font-medium">Qty</th>
                        <th className="text-left p-4 text-sm font-medium">Status</th>
                        <th className="text-right p-4 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterByStatus(status).map((request) => (
                        <tr key={request.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-4 text-sm font-medium">{request.id}</td>
                          <td className="p-4 text-sm">{request.type}</td>
                          <td className="p-4 text-sm">{request.submittedBy}</td>
                          <td className="p-4 text-sm text-muted-foreground">{request.date}</td>
                          <td className="p-4 text-sm">{request.product}</td>
                          <td className="p-4 text-sm">
                            <span className={request.qty < 0 ? "text-destructive" : "text-success"}>
                              {request.qty > 0 ? "+" : ""}
                              {request.qty}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`status-chip ${getStatusColor(request.status)}`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              {request.status === "submitted" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-success hover:text-success"
                                    onClick={() => handleAction(request, "approve")}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-destructive hover:text-destructive"
                                    onClick={() => handleAction(request, "reject")}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              Request ID: {selectedRequest?.id} - {selectedRequest?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Product:</span> {selectedRequest?.product}
              </p>
              <p className="text-sm">
                <span className="font-medium">Batch:</span> {selectedRequest?.batch}
              </p>
              <p className="text-sm">
                <span className="font-medium">Quantity:</span>{" "}
                <span className={selectedRequest && selectedRequest.qty < 0 ? "text-destructive" : "text-success"}>
                  {selectedRequest?.qty}
                </span>
              </p>
              <p className="text-sm">
                <span className="font-medium">Reason:</span> {selectedRequest?.reason}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comments</label>
              <Textarea
                placeholder="Add your comments..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className={actionType === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {actionType === "approve" ? "Approve Request" : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Approvals;
