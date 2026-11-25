import { useState } from "react";
import { MapPin, Truck, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiEndpoints } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";

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

  const { data: routeRows = [], isLoading: routesLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: apiEndpoints.routes.getAll,
  });
  const routesList = Array.isArray(routeRows) ? routeRows : [];

  const depotsList = depots.data || depots || [];
  const vehiclesList = vehicles.data || vehicles || [];
  const driversList = drivers.data || drivers || [];

  const handleDispatch = () => {
    toast({ title: "Route dispatched", description: "Delivery slip sent to driver" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Route Planning & Dispatch"
        subtitle="Plan delivery routes and manage dispatches"
        icon={Navigation}
        variant="teal"
      />

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

          <p className="text-sm text-muted-foreground">
            Stop-by-stop dispatch preview is not available from the API. Use Shipping Routes and Route Shipping Points for persisted route data.
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Route Summary</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Distance, stop counts, and order totals for a live dispatch are not returned by a dedicated planning endpoint.
            </p>

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
          {routesLoading && (
            <p className="text-sm text-muted-foreground">Loading routes...</p>
          )}
          {!routesLoading && routesList.length === 0 && (
            <p className="text-sm text-muted-foreground">No routes found.</p>
          )}
          {routesList.map((route: any) => (
            <div key={route.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">{route.name}</p>
                  <p className="text-sm text-muted-foreground">{route.code || route.route_id}</p>
                </div>
                <Badge variant="outline">{route.status || "Active"}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stops</span>
                  <span className="font-medium">{route.stops ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium">{route.distance || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
