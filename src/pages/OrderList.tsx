import { useState } from "react";
import { Package, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const orders = [
  { id: "ORD-001", customer: "Depot A", items: "Paracetamol 500mg", qty: 500, priority: "high", status: "pending" },
  { id: "ORD-002", customer: "Depot B", items: "Amoxicillin 250mg", qty: 300, priority: "normal", status: "pending" },
  { id: "ORD-003", customer: "Depot C", items: "Ibuprofen 400mg", qty: 200, priority: "normal", status: "processing" },
  { id: "ORD-004", customer: "Depot D", items: "Aspirin 100mg", qty: 400, priority: "low", status: "pending" },
];

export default function OrderList() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const filteredOrders = orders.filter(
    (order) =>
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "normal":
        return "bg-primary/10 text-primary border-primary/20";
      case "low":
        return "bg-muted text-muted-foreground border-muted-foreground/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning/10 text-warning border-warning/20";
      case "processing":
        return "bg-primary/10 text-primary border-primary/20";
      case "completed":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleProcess = (orderId: string) => {
    toast({ title: "Order processing", description: `${orderId} is being processed` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Order List</h1>
        <p className="text-muted-foreground">View and manage delivery orders</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button>
            <Package className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{order.items}</TableCell>
                <TableCell>{order.qty}</TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(order.priority)}>
                    {order.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleProcess(order.id)}
                  >
                    Process
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
