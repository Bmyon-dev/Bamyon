import PlanGate from "@/components/PlanGate";
import CatalogueManager from "@/components/pages/CatalogueManager";

export default function Page() {
  return (
    <PlanGate minPlan="standard">
      <CatalogueManager />
    </PlanGate>
  );
}
