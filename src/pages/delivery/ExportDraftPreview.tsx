import { useParams } from "react-router-dom";
import { apiEndpoints } from "@/lib/api";
import { mapExportDraftPrint } from "@/lib/draftPrint";
import { DraftPreviewPage } from "@/pages/delivery/DraftPreviewPage";

export default function ExportDraftPreview() {
  const { id } = useParams<{ id: string }>();
  const detailPath = `/delivery/export/${id}`;
  return (
    <DraftPreviewPage
      title="Export Draft Preview"
      detailPath={detailPath}
      load={async () => {
        if (!id) return null;
        const row = await apiEndpoints.exportDeliveries.getById(id);
        return mapExportDraftPrint(row);
      }}
    />
  );
}
