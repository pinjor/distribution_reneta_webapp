import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Warehouse, Plus, Search, Edit, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Depot {
  id: string;
  name: string;
  code: string;
  location: string;
  capacity: string;
  status: "active" | "inactive";
}

export default function Depot() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [depots, setDepots] = useState<Depot[]>([
    { id: "1", name: "Main Warehouse", code: "WH-001", location: "New York, NY", capacity: "50,000 sq ft", status: "active" },
    { id: "2", name: "Distribution Center East", code: "WH-002", location: "Boston, MA", capacity: "35,000 sq ft", status: "active" },
    { id: "3", name: "Regional Hub", code: "WH-003", location: "Philadelphia, PA", capacity: "28,000 sq ft", status: "inactive" },
  ]);

  useEffect(() => {
    document.title = "Depot Settings | App";
  }, []);

  const filteredDepots = depots.filter(depot =>
    depot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    depot.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    depot.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    toast({
      title: "Depot added",
      description: "New depot has been created successfully.",
    });
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    setDepots(prev => prev.filter(d => d.id !== id));
    toast({
      title: "Depot deleted",
      description: "The depot has been removed.",
      variant: "destructive",
    });
  };

  return (
    <main className="p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Warehouse className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Depot Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage warehouses, distribution centers, and storage facilities</p>
      </header>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Depots</CardTitle>
              <CardDescription>Total locations: {depots.length}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search depots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Depot
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Depot</DialogTitle>
                    <DialogDescription>Create a new warehouse or distribution center</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="depot-name">Depot Name *</Label>
                      <Input id="depot-name" placeholder="Main Warehouse" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depot-code">Code *</Label>
                      <Input id="depot-code" placeholder="WH-001" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depot-location">Location *</Label>
                      <Input id="depot-location" placeholder="City, State" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depot-capacity">Capacity</Label>
                      <Input id="depot-capacity" placeholder="50,000 sq ft" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd}>Create Depot</Button>
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
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepots.map((depot) => (
                <TableRow key={depot.id}>
                  <TableCell className="font-medium">{depot.code}</TableCell>
                  <TableCell>{depot.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {depot.location}
                    </div>
                  </TableCell>
                  <TableCell>{depot.capacity}</TableCell>
                  <TableCell>
                    <Badge className={depot.status === "active" ? "status-success" : "status-neutral"}>
                      {depot.status}
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
                        onClick={() => handleDelete(depot.id)}
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
