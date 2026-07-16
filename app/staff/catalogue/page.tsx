import StaffGate from "@/components/StaffGate";
import CatalogueManager from "@/components/pages/CatalogueManager";

export default function Page() {
  return (
    <StaffGate permission="catalogue" minPlan="standard">
      <CatalogueManager />
    </StaffGate>
  );
}
