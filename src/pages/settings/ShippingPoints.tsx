import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPinned, Plus, Search, Edit, Trash2, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShippingPoint {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  zone: string;
  capacity: string;
  status: "active" | "inactive" | "maintenance";
}

export default function ShippingPoints() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [shippingPoints, setShippingPoints] = useState<ShippingPoint[]>([
    { id: "1", code: "SP-001", name: "Downtown Hub", address: "500 Main St", city: "New York, NY", zone: "Zone A", capacity: "200 orders/day", status: "active" },
    { id: "2", code: "SP-002", name: "Airport Terminal", address: "Terminal 2, Gate 5", city: "Newark, NJ", zone: "Zone B", capacity: "150 orders/day", status: "active" },
    { id: "3", code: "SP-003", name: "Port Facility", address: "Port 12, Dock 8", city: "Jersey City, NJ", zone: "Zone C", capacity: "300 orders/day", status: "maintenance" },
    { id: "4", code: "SP-004", name: "Suburban Center", address: "45 Commerce Blvd", city: "Stamford, CT", zone: "Zone D", capacity: "100 orders/day", status: "active" },
  ]);

  useEffect(() => {
    document.title = "Shipping Points | App";
  }, []);

  const filteredPoints = shippingPoints.filter(point =>
    point.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    point.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    point.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    point.zone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    toast({
      title: "Shipping point added",
      description: "New location has been created successfully.",
    });
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    setShippingPoints(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Shipping point deleted",
      description: "The location has been removed.",
      variant: "destructive",
    });
  };

  return (
    <main className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <MapPinned className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Shipping Points</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage distribution nodes and delivery locations</p>
      </header>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Shipping Points</CardTitle>
              <CardDescription>Total locations: {shippingPoints.length}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Point
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Shipping Point</DialogTitle>
                    <DialogDescription>Create a new distribution or delivery location</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sp-code">Point Code *</Label>
                        <Input id="sp-code" placeholder="SP-XXX" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sp-zone">Zone</Label>
                        <Input id="sp-zone" placeholder="Zone A" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sp-name">Location Name *</Label>
                      <Input id="sp-name" placeholder="Downtown Hub" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sp-address">Address</Label>
                      <Input id="sp-address" placeholder="123 Main Street" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sp-city">City, State</Label>
                      <Input id="sp-city" placeholder="New York, NY" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sp-capacity">Capacity</Label>
                      <Input id="sp-capacity" placeholder="200 orders/day" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd}>Create Point</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPoints.map((point) => (
                <TableRow key={point.id}>
                  <TableCell className="font-medium">{point.code}</TableCell>
                  <TableCell>{point.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Navigation className="h-3 w-3 text-muted-foreground" />
                        {point.address}
                      </div>
                      <div className="text-sm text-muted-foreground">{point.city}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{point.zone}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{point.capacity}</TableCell>
                  <TableCell>
                    <Badge className={
                      point.status === "active" ? "status-success" :
                      point.status === "maintenance" ? "status-warning" :
                      "status-neutral"
                    }>
                      {point.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(point.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
