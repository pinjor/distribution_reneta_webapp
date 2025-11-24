import { useState } from "react";
import { MapPin, Truck, Navigation, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";

const routes = [
  { id: "RT-001", name: "Route A (North)", stops: 5, distance: "45 km", status: "in-progress" },
  { id: "RT-002", name: "Route B (South)", stops: 7, distance: "62 km", status: "delivered" },
  { id: "RT-003", name: "Route C (East)", stops: 4, distance: "38 km", status: "planned" },
];

const stops = [
  { id: "ST-001", name: "Chennai Medical", address: "Anna Nagar", status: "pending" },
  { id: "ST-002", name: "Rahman Pharmacy", address: "T Nagar", status: "pending" },
  { id: "ST-003", name: "City Hospital", address: "Adyar", status: "pending" },
];

export default function RoutePlanning() {
  const [selectedDepot, setSelectedDepot] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [date, setDate] = useState("");
  const { toast } = useToast();

  // Load master data
  const { data: depots = [], isLoading: depotsLoading } = useQuery({
    queryKey: ['depots'],
    queryFn: apiEndpoints.depots.getAll,
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiEndpoints.vehicles.getAll,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: apiEndpoints.drivers.getAll,
  });

  const depotsList = depots.data || depots || [];
  const vehiclesList = vehicles.data || vehicles || [];
  const driversList = drivers.data || drivers || [];

  const handleDispatch = () => {
    toast({ title: "Route dispatched", description: "Delivery slip sent to driver" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Route Planning & Dispatch</h1>
        <p className="text-muted-foreground">Plan delivery routes and manage dispatches</p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Create Dispatch Plan</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Depot</label>
            <Select value={selectedDepot} onValueChange={setSelectedDepot} disabled={depotsLoading}>
              <SelectTrigger>
                <SelectValue placeholder={depotsLoading ? "Loading..." : depotsList.length === 0 ? "No depots available" : "Select depot"} />
              </SelectTrigger>
              <SelectContent>
                {depotsList.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No depots available</div>
                ) : (
                  depotsList.map((depot: any) => (
                    <SelectItem key={depot.id} value={String(depot.id)}>
                      {depot.name || depot.depot_name || `Depot ${depot.id}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Vehicle</label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle} disabled={vehiclesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={vehiclesLoading ? "Loading..." : vehiclesList.length === 0 ? "No vehicles available" : "Select vehicle"} />
              </SelectTrigger>
              <SelectContent>
                {vehiclesList.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No vehicles available</div>
                ) : (
                  vehiclesList.map((vehicle: any) => (
                    <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                      {vehicle.reg_no || vehicle.registration_number || `Vehicle ${vehicle.id}`} 
                      {vehicle.capacity ? ` (${vehicle.capacity})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Driver</label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver} disabled={driversLoading}>
              <SelectTrigger>
                <SelectValue placeholder={driversLoading ? "Loading..." : driversList.length === 0 ? "No drivers available" : "Select driver"} />
              </SelectTrigger>
              <SelectContent>
                {driversList.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No drivers available</div>
                ) : (
                  driversList.map((driver: any) => (
                    <SelectItem key={driver.id} value={String(driver.id)}>
                      {driver.name || driver.driver_name || `Driver ${driver.id}`}
                      {driver.license_number ? ` (${driver.license_number})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Route Stops</h2>
          </div>

          <div className="space-y-3">
            {stops.map((stop, idx) => (
              <div key={stop.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{stop.name}</p>
                      <p className="text-sm text-muted-foreground">{stop.address}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{stop.status}</Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Vehicle Capacity</span>
              <span className="text-sm font-semibold">45%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: "45%" }} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Route Summary</h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Distance</p>
              <p className="text-2xl font-semibold">45 km</p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Stops</p>
              <p className="text-2xl font-semibold">5</p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Estimated Time</p>
              <p className="text-2xl font-semibold">3.5 hrs</p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
              <p className="text-2xl font-semibold">12</p>
            </div>

            <div className="space-y-2 pt-4">
              <Button className="w-full" onClick={handleDispatch}>
                <Truck className="h-4 w-4 mr-2" />
                Generate Delivery Slip
              </Button>
              <Button className="w-full" variant="outline">Send to Driver App</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Active Routes</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routes.map((route) => (
            <div key={route.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">{route.name}</p>
                  <p className="text-sm text-muted-foreground">{route.id}</p>
                </div>
                {route.status === "in-progress" && (
                  <Badge className="bg-info/10 text-info border-info/20">In Progress</Badge>
                )}
                {route.status === "delivered" && (
                  <Badge className="bg-success/10 text-success border-success/20">Delivered</Badge>
                )}
                {route.status === "planned" && (
                  <Badge variant="outline">Planned</Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stops</span>
                  <span className="font-medium">{route.stops}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium">{route.distance}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
