import { useParams } from "react-router-dom";
import { apiEndpoints } from "@/lib/api";
import { mapSampleGiftDraftPrint } from "@/lib/draftPrint";
import { DraftPreviewPage } from "@/pages/delivery/DraftPreviewPage";

export default function SampleGiftDraftPreview() {
  const { id } = useParams<{ id: string }>();
  const detailPath = `/delivery/sample-gift/${id}`;
  return (
    <DraftPreviewPage
      title="Sample/Gift Draft Preview"
      detailPath={detailPath}
      load={async () => {
        if (!id) return null;
        const row = await apiEndpoints.sampleGiftDeliveries.getById(id);
        return mapSampleGiftDraftPrint(row);
      }}
    />
  );
}
