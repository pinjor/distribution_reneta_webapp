import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoints } from "@/lib/api";
import { Loader2 } from "lucide-react";
import SearchableCombobox, { SearchableOption } from "@/components/SearchableCombobox";

interface DeliveryItem {
  trade_amount?: number;
}

interface DeliverySummary {
  id: number;
  delivery_number: string;
  items: DeliveryItem[];
}

interface PickingLine {
  delivery_id: number;
  memo_no: string;
  value: number;
  status: string;
  pso: string;
  remarks: string;
  cash: number;
  dues: number;
  amend: number;
  returns: number;
}

export default function PickingOrderCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliverySummary[]>([]);
  const [lines, setLines] = useState<PickingLine[]>([]);
  const [formValues, setFormValues] = useState({
    loading_no: "",
    loading_date: new Date().toISOString().slice(0, 10),
    delivery_by: "",
    delivery_by_id: "",
    vehicle_no: "",
    vehicle_id: "",
    area: "",
    route_id: "",
    remarks: "",
  });
  const [employees, setEmployees] = useState<{ value: string; label: string; description?: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ value: string; label: string; description?: string }[]>([]);
  const [routes, setRoutes] = useState<{ value: string; label: string; description?: string }[]>([]);
  const [loadingMasterData, setLoadingMasterData] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);

  const selectedDeliveryIds = useMemo(() => {
    const fromState = (location.state as { deliveryIds?: number[] } | undefined)?.deliveryIds;
    if (Array.isArray(fromState) && fromState.length > 0) return fromState;

    const fromQuery = searchParams
      .get("deliveryIds")
      ?.split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    return fromQuery && fromQuery.length > 0 ? fromQuery : [];
  }, [location.state, searchParams]);

  useEffect(() => {
    if (selectedDeliveryIds.length === 0) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const results = await Promise.all(
          selectedDeliveryIds.map(async (id) => {
            const response = await apiEndpoints.orderDeliveries.getById(id);
            const items = Array.isArray(response.items) ? response.items : [];
            return {
              id: Number(response.id),
              delivery_number: response.delivery_number,
              items: items.map((item: any) => ({
                trade_amount: Number(item.trade_amount || 0),
              })),
            } as DeliverySummary;
          }),
        );
        setDeliveries(results);
        const defaultLines = results.map((delivery) => {
          const totalValue = delivery.items.reduce((sum, item) => sum + Number(item.trade_amount || 0), 0);
          return {
            delivery_id: delivery.id,
            memo_no: delivery.delivery_number,
            value: totalValue,
            status: "C",
            pso: "",
            remarks: "",
            cash: 0,
            dues: 0,
            amend: 0,
            returns: 0,
          } as PickingLine;
        });
        setLines(defaultLines);
      } catch (error) {
        console.error("Failed to load deliveries for picking order", error);
        toast({ title: "Unable to load deliveries", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedDeliveryIds, toast]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        setLoadingMasterData(true);
        const [employeeResponse, vehicleResponse, routeResponse] = await Promise.all([
          apiEndpoints.employees.getAll(),
          apiEndpoints.vehicles.getAll(),
          apiEndpoints.routes.getAll(),
        ]);

        const employeeOptions: SearchableOption[] = Array.isArray(employeeResponse)
          ? employeeResponse.map((employee: any, index: number) => ({
              value: String(employee.id ?? employee.employee_id ?? `employee-${index}`),
              label: [employee.first_name, employee.last_name].filter(Boolean).join(" ") || employee.employee_id || "Unnamed employee",
              description: employee.employee_id || employee.email || employee.phone || undefined,
            }))
          : [];

        const vehicleOptions: SearchableOption[] = Array.isArray(vehicleResponse)
          ? vehicleResponse.map((vehicle: any, index: number) => ({
              value: String(vehicle.id ?? vehicle.vehicle_id ?? `vehicle-${index}`),
              label: vehicle.vehicle_id || vehicle.registration_number || "Vehicle",
              description: vehicle.vehicle_type || vehicle.capacity ? `${vehicle.vehicle_type ?? ""} ${vehicle.capacity ?? ""}`.trim() : undefined,
            }))
          : [];

        const routeOptions: SearchableOption[] = Array.isArray(routeResponse)
          ? routeResponse.map((route: any, index: number) => ({
              value: String(route.id ?? route.route_code ?? route.code ?? `route-${index}`),
              label: route.name || route.route_name || route.code || "Route",
              description: route.code || route.route_code || route.depot_name || undefined,
            }))
          : [];

        const fallbackEmployees =
          employeeOptions.length === 0
            ? [
                { value: "employee-sample-1", label: "Parvez Baksa", description: "Driver · TURAG" },
                { value: "employee-sample-2", label: "Sajid Khan", description: "Delivery · DHAKA" },
              ]
            : [];
        const fallbackVehicles =
          vehicleOptions.length === 0
            ? [
                { value: "vehicle-sample-4045", label: "Van No. 4045", description: "Mini Truck · 1.5 Ton" },
                { value: "vehicle-sample-4046", label: "Truck 4046", description: "Refrigerated" },
              ]
            : [];
        const fallbackRoutes =
          routeOptions.length === 0
            ? [
                { value: "route-sample-turag", label: "TURAG Depot", description: "Area: PAIKPARA" },
                { value: "route-sample-mirpur", label: "Mirpur Zone", description: "Area: Dhaka" },
              ]
            : [];

        setEmployees(employeeOptions.length > 0 ? employeeOptions : fallbackEmployees);
        setVehicles(vehicleOptions.length > 0 ? vehicleOptions : fallbackVehicles);
        setRoutes(routeOptions.length > 0 ? routeOptions : fallbackRoutes);
        setMasterError(null);
      } catch (error) {
        console.error("Failed to load master data for picking order", error);
        setMasterError("Unable to load employees, vehicles or routes. You can still enter details manually.");
      } finally {
        setLoadingMasterData(false);
      }
    };

    loadMasterData();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleLineChange = (index: number, field: keyof PickingLine, value: string) => {
    setLines((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line;
        const parsedFields: Array<keyof PickingLine> = ["value", "cash", "dues", "amend", "returns"];
        if (parsedFields.includes(field)) {
          return { ...line, [field]: value === "" ? 0 : Number(value) };
        }
        return { ...line, [field]: value };
      }),
    );
  };

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => ({
        value: acc.value + Number(line.value || 0),
        cash: acc.cash + Number(line.cash || 0),
        dues: acc.dues + Number(line.dues || 0),
        amend: acc.amend + Number(line.amend || 0),
        returns: acc.returns + Number(line.returns || 0),
      }),
      { value: 0, cash: 0, dues: 0, amend: 0, returns: 0 },
    );
  }, [lines]);

  const handleEmployeeSelect = (option: SearchableOption) => {
    setFormValues((prev) => ({
      ...prev,
      delivery_by_id: option.value,
      delivery_by: option.label,
    }));
  };

  const handleVehicleSelect = (option: SearchableOption) => {
    setFormValues((prev) => ({
      ...prev,
      vehicle_id: option.value,
      vehicle_no: option.label,
    }));
  };

  const handleRouteSelect = (option: SearchableOption) => {
    setFormValues((prev) => ({
      ...prev,
      route_id: option.value,
      area: option.label,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) {
      toast({ title: "Add at least one delivery to the picking challan", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...formValues,
        delivery_by: formValues.delivery_by,
        vehicle_no: formValues.vehicle_no,
        area: formValues.area,
        deliveries: lines.map((line) => ({
          ...line,
          value: Number(line.value || 0),
          cash: Number(line.cash || 0),
          dues: Number(line.dues || 0),
          amend: Number(line.amend || 0),
          returns: Number(line.returns || 0),
        })),
      };
      const response = await apiEndpoints.pickingOrders.create(payload);
      toast({ title: "Picking challan created", description: response.order_number });
      navigate(`/orders/loading-request/${response.id}`);
    } catch (error: any) {
      console.error("Failed to create picking order", error);
      toast({
        title: "Unable to save picking challan",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Preparing picking challan...
          </CardContent>
        </Card>
      </main>
    );
  }

  if (selectedDeliveryIds.length === 0) {
    return (
      <main className="p-6 space-y-4">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Select one or more order deliveries from the packing queue to create a picking challan.
          </CardContent>
        </Card>
        <div className="flex justify-center">
          <Button onClick={() => navigate("/orders/picking")}>Go to picking queue</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Create picking challan</h1>
          <p className="text-muted-foreground">
            Confirm loading details for the selected deliveries. Totals will update automatically as you edit each row.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Challan details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="loading-no">Loading number</Label>
              <Input
                id="loading-no"
                value={formValues.loading_no}
                onChange={(event) => handleChange("loading_no", event.target.value)}
                placeholder="Generated automatically if left blank"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="loading-date">Loading date</Label>
              <Input
                id="loading-date"
                type="date"
                value={formValues.loading_date}
                onChange={(event) => handleChange("loading_date", event.target.value)}
              />
            </div>
            {employees.length > 0 ? (
              <div>
                <SearchableCombobox
                  label="Delivery by"
                  placeholder="Select driver / employee"
                  options={employees}
                  value={formValues.delivery_by_id}
                  onSelect={handleEmployeeSelect}
                  disabled={loadingMasterData}
                  emptyMessage="No employees found"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="delivery-by">Delivery by</Label>
                <Input
                  id="delivery-by"
                  value={formValues.delivery_by}
                  onChange={(event) => handleChange("delivery_by", event.target.value)}
                  placeholder="Driver or delivery personnel"
                />
              </div>
            )}
            {vehicles.length > 0 ? (
              <div>
                <SearchableCombobox
                  label="Vehicle number"
                  placeholder="Select vehicle"
                  options={vehicles}
                  value={formValues.vehicle_id}
                  onSelect={handleVehicleSelect}
                  disabled={loadingMasterData}
                  emptyMessage="No vehicles found"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="vehicle-no">Vehicle number</Label>
                <Input
                  id="vehicle-no"
                  value={formValues.vehicle_no}
                  onChange={(event) => handleChange("vehicle_no", event.target.value)}
                  placeholder="Vehicle ID / registration"
                />
              </div>
            )}
            {routes.length > 0 ? (
              <div className="md:col-span-2">
                <SearchableCombobox
                  label="Area"
                  placeholder="Select route / territory"
                  options={routes}
                  value={formValues.route_id}
                  onSelect={handleRouteSelect}
                  disabled={loadingMasterData}
                  emptyMessage="No routes found"
                />
              </div>
            ) : (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="area">Area</Label>
                <Input
                  id="area"
                  value={formValues.area}
                  onChange={(event) => handleChange("area", event.target.value)}
                  placeholder="Territory / area coverage"
                />
              </div>
            )}
            {masterError ? (
              <p className="text-xs text-destructive md:col-span-2">{masterError}</p>
            ) : null}
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                rows={3}
                value={formValues.remarks}
                onChange={(event) => handleChange("remarks", event.target.value)}
                placeholder="Additional notes for warehouse or dispatch team"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Delivery summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="text-xs uppercase text-muted-foreground">
                    <TableHead>Memo no.</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>PSO</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>Dues</TableHead>
                    <TableHead>Amend</TableHead>
                    <TableHead>Return</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={line.delivery_id} className="text-sm">
                      <TableCell className="font-medium text-foreground">
                        <Input
                          value={line.memo_no}
                          onChange={(event) => handleLineChange(index, "memo_no", event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.value.toString()}
                          onChange={(event) => handleLineChange(index, "value", event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.status}
                          onChange={(event) => handleLineChange(index, "status", event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.pso}
                          onChange={(event) => handleLineChange(index, "pso", event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.remarks}
                          onChange={(event) => handleLineChange(index, "remarks", event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.cash.toString()}
                          onChange={(event) => handleLineChange(index, "cash", event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.dues.toString()}
                          onChange={(event) => handleLineChange(index, "dues", event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.amend.toString()}
                          onChange={(event) => handleLineChange(index, "amend", event.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.returns.toString()}
                          onChange={(event) => handleLineChange(index, "returns", event.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-medium text-sm">
                    <TableCell>Total</TableCell>
                    <TableCell>{totals.value.toLocaleString()}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell>{totals.cash.toLocaleString()}</TableCell>
                    <TableCell>{totals.dues.toLocaleString()}</TableCell>
                    <TableCell>{totals.amend.toLocaleString()}</TableCell>
                    <TableCell>{totals.returns.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(-1)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save picking challan
          </Button>
        </div>
      </form>
    </main>
  );
}


