import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Plus, Edit, Trash2 } from "lucide-react";
import { apiEndpoints } from "@/lib/api";

interface TripExpenseItemProps {
  tripNumber: string;
  trip: any;
  expenses: any[];
  total: number;
  vehicle: any;
  driver: any;
  onAddExpense: (tripNumber: string) => void;
  onEditExpense: (expense: any) => void;
  onDeleteExpense: (id: number) => void;
  isExpanded: boolean;
}

export function TripExpenseItem({
  tripNumber,
  trip,
  expenses,
  total,
  vehicle,
  driver,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  isExpanded,
}: TripExpenseItemProps) {
  const routeId = trip?.route_id;

  // Get route shipping points for this trip
  const { data: routeShippingPoints = [] } = useQuery({
    queryKey: ["route-shipping-points", routeId],
    queryFn: () => {
      if (!routeId) return Promise.resolve([]);
      return apiEndpoints.routeShippingPoints.getAll(routeId);
    },
    enabled: isExpanded && !!routeId,
  });

  // Group expenses by shipping point
  const getExpensesByShippingPoint = () => {
    if (!routeShippingPoints || routeShippingPoints.length === 0) {
      return [{ shippingPoint: null, expenses, total: expenses.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0) }];
    }

    // First, try to match expenses to shipping points based on description
    const grouped: any[] = routeShippingPoints.map((rsp: any) => ({
      shippingPoint: rsp,
      expenses: [] as any[],
      total: 0,
    }));

    const unmatchedExpenses: any[] = [];

    expenses.forEach((exp: any) => {
      // Try to extract shipping point number from description
      const description = exp.description || '';
      const match = description.match(/shipping point (\d+)/i);
      
      if (match) {
        const pointSequence = parseInt(match[1], 10);
        const group = grouped.find((g: any) => g.shippingPoint?.sequence === pointSequence);
        if (group) {
          group.expenses.push(exp);
          group.total += parseFloat(exp.amount || 0);
        } else {
          unmatchedExpenses.push(exp);
        }
      } else {
        unmatchedExpenses.push(exp);
      }
    });

    // Distribute unmatched expenses evenly across shipping points
    if (unmatchedExpenses.length > 0) {
      const expensesPerPoint = Math.ceil(unmatchedExpenses.length / routeShippingPoints.length);
      grouped.forEach((group: any, index: number) => {
        const startIdx = index * expensesPerPoint;
        const endIdx = Math.min(startIdx + expensesPerPoint, unmatchedExpenses.length);
        const pointExpenses = unmatchedExpenses.slice(startIdx, endIdx);
        group.expenses.push(...pointExpenses);
        group.total += pointExpenses.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount || 0) || 0), 0);
      });
    }

    return grouped;
  };

  const expensesByShippingPoint = getExpensesByShippingPoint();
  const totalShippingPointsExpenses = expensesByShippingPoint.reduce((sum: number, group: any) => sum + group.total, 0);

  return (
    <div className="space-y-4 pt-4">
      {/* Shipping Point Wise Expenses */}
      {routeShippingPoints.length > 0 ? (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Point Wise Expenses
            </h3>
            <Button size="sm" onClick={() => onAddExpense(tripNumber)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>

          {expensesByShippingPoint.map((group: any, groupIndex: number) => (
            <Card key={groupIndex} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">
                    {group.shippingPoint ? (
                      <span>
                        {group.shippingPoint.sequence}. {group.shippingPoint.shipping_point?.name || `Shipping Point ${group.shippingPoint.shipping_point_id}`}
                        <span className="text-muted-foreground ml-2">
                          ({group.shippingPoint.distance_km} km)
                        </span>
                      </span>
                    ) : (
                      <span>Other Expenses</span>
                    )}
                  </CardTitle>
                  <span className="text-sm font-semibold">
                    Total: ৳{group.total.toFixed(2)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {group.expenses.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">
                    No expenses for this shipping point
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.expenses.map((expense: any) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {new Date(expense.expense_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge>{expense.expense_type}</Badge>
                          </TableCell>
                          <TableCell>{expense.description || "-"}</TableCell>
                          <TableCell className="text-right font-medium">
                            ৳{typeof expense.amount === 'number' 
                              ? expense.amount.toFixed(2) 
                              : parseFloat(expense.amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditExpense(expense)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteExpense(expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Total Summary for Shipping Points */}
          <Card className="bg-muted">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Expenses (All Shipping Points):</span>
                <span className="text-2xl font-bold">৳{totalShippingPointsExpenses.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* If no shipping points, show all expenses in one table */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Expenses
            </h3>
            <Button size="sm" onClick={() => onAddExpense(tripNumber)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    No expenses for this trip
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense: any) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge>{expense.expense_type}</Badge>
                    </TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      ৳{typeof expense.amount === 'number' 
                        ? expense.amount.toFixed(2) 
                        : parseFloat(expense.amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditExpense(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteExpense(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </>
      )}

      {/* Total Summary */}
      <Card className="bg-muted">
        <CardContent className="pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Expenses for this Trip:</span>
            <span className="text-2xl font-bold">৳{total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

