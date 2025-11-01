import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Clock, Eye, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { approvalRequests } from "@/lib/mockData";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

const Approvals = () => {
  const [selectedRequest, setSelectedRequest] = useState<typeof approvalRequests[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  
  const { sortedData, sortKey, sortOrder, handleSort } = useTableSort(approvalRequests, "date" as any);
  const { filteredData, searchTerm, setSearchTerm } = useTableFilter(sortedData);

  const handleAction = (request: typeof approvalRequests[0], action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error("Please provide a comment");
      return;
    }
    
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setProcessing(false);
    
    toast.success(`Request ${actionType === "approve" ? "approved" : "rejected"} successfully`);
    setDialogOpen(false);
    setComment("");
  };

  const getStatusBadge = (status: string, priority: string) => {
    const statusColors: Record<string, string> = {
      Pending: "status-neutral",
      Submitted: "status-info",
      Approved: "status-success",
      Rejected: "status-error",
    };
    
    const priorityColors: Record<string, string> = {
      High: "bg-destructive/10 text-destructive border-destructive/20",
      Medium: "bg-warning/10 text-warning border-warning/20",
      Low: "bg-muted text-muted-foreground",
    };

    return (
      <div className="flex gap-2">
        <Badge className={statusColors[status]}>{status}</Badge>
        <Badge variant="outline" className={priorityColors[priority]}>{priority}</Badge>
      </div>
    );
  };

  const filterByStatus = (status: string) => {
    if (status === "all") return filteredData;
    return filteredData.filter((req) => req.status.toLowerCase() === status.toLowerCase());
  };

  const columns = [
    { key: "id" as const, label: "Request ID", sortable: true },
    { key: "type" as const, label: "Type", sortable: true },
    { key: "submittedBy" as const, label: "Submitted By", sortable: true },
    { key: "depot" as const, label: "Depot", sortable: true },
    { key: "date" as const, label: "Date", sortable: true },
    {
      key: "status" as const,
      label: "Status",
      sortable: true,
      render: (val: any, row: any) => getStatusBadge(val, row.priority),
    },
    {
      key: "id" as const,
      label: "Actions",
      align: "right" as const,
      render: (_: any, row: any) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedRequest(row)}
            className="hover-scale"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {row.status === "Pending" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction(row, "approve")}
                className="text-success hover:text-success hover-scale"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction(row, "reject")}
                className="text-destructive hover:text-destructive hover-scale"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Approval Workflow</h1>
        <p className="text-muted-foreground">Review and manage pending approval requests</p>
      </div>

      <Card className="p-6 card-elevated">
        <div className="flex justify-between items-center mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="all" className="gap-2">
                  All Requests
                  <Badge variant="secondary">{approvalRequests.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                  <Badge variant="secondary">
                    {approvalRequests.filter((r) => r.status === "Pending").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="submitted" className="gap-2">
                  Submitted
                  <Badge variant="secondary">
                    {approvalRequests.filter((r) => r.status === "Submitted").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button variant="outline" size="sm" className="hover-scale">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filter
                </Button>
              </div>
            </div>

            <TabsContent value="all">
              <DataTable
                data={filterByStatus("all")}
                columns={columns}
                sortKey={sortKey}
                sortOrder={sortOrder}
                onSort={handleSort}
                emptyMessage="No approval requests found"
              />
            </TabsContent>

            <TabsContent value="pending">
              <DataTable
                data={filterByStatus("pending")}
                columns={columns}
                sortKey={sortKey}
                sortOrder={sortOrder}
                onSort={handleSort}
                emptyMessage="No pending requests"
              />
            </TabsContent>

            <TabsContent value="submitted">
              <DataTable
                data={filterByStatus("submitted")}
                columns={columns}
                sortKey={sortKey}
                sortOrder={sortOrder}
                onSort={handleSort}
                emptyMessage="No submitted requests"
              />
            </TabsContent>

            <TabsContent value="approved">
              <DataTable
                data={filterByStatus("approved")}
                columns={columns}
                sortKey={sortKey}
                sortOrder={sortOrder}
                onSort={handleSort}
                emptyMessage="No approved requests"
              />
            </TabsContent>

            <TabsContent value="rejected">
              <DataTable
                data={filterByStatus("rejected")}
                columns={columns}
                sortKey={sortKey}
                sortOrder={sortOrder}
                onSort={handleSort}
                emptyMessage="No rejected requests"
              />
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              Request ID: {selectedRequest?.id} - {selectedRequest?.type}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="font-medium">Submitted By:</span> {selectedRequest?.submittedBy}
              </p>
              <p className="text-sm">
                <span className="font-medium">Depot:</span> {selectedRequest?.depot}
              </p>
              <p className="text-sm">
                <span className="font-medium">Date:</span> {selectedRequest?.date}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Comment *</label>
              <Textarea
                placeholder="Enter your comment or reason..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={processing}
              className="hover-scale"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={processing || !comment.trim()}
              className={`hover-scale ${
                actionType === "reject" ? "bg-destructive hover:bg-destructive/90" : ""
              }`}
            >
              {processing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "approve" ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirm {actionType === "approve" ? "Approval" : "Rejection"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Approvals;
