import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";

const rows = Array.from({ length: 12 }, (_, index) => ({
  id: `row-${index + 1}`,
  name: `Item ${index + 1}`,
  qty: index + 1,
}));

describe("DataTable", () => {
  it("paginates client-side rows and reports the visible range", () => {
    render(
      <DataTable
        title="Items"
        data={rows}
        columns={[
          { key: "name", label: "Name", sortable: true },
          { key: "qty", label: "Quantity", align: "right" },
        ]}
        initialPageSize={10}
        getRowId={(row) => row.id}
      />,
    );

    expect(screen.getByText("Showing 1–10 of 12 records")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.queryByText("Item 11")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Showing 11–12 of 12 records")).toBeInTheDocument();
    expect(screen.getByText("Item 11")).toBeInTheDocument();
  });

  it("calls the existing sort handler when a sortable header is clicked", () => {
    const onSort = vi.fn();
    render(
      <DataTable
        data={rows.slice(0, 3)}
        columns={[{ key: "name", label: "Name", sortable: true }]}
        onSort={onSort}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSort).toHaveBeenCalledWith("name");
  });

  it("shows an empty state when there are no rows", () => {
    render(
      <DataTable
        data={[]}
        columns={[{ key: "name", label: "Name" }]}
        emptyMessage="No recent receipts found"
      />,
    );

    expect(screen.getByText("No recent receipts found")).toBeInTheDocument();
    expect(screen.getByText("Showing 0 records")).toBeInTheDocument();
  });
});
