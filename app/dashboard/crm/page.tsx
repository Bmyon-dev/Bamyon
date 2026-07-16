import PlanGate from "@/components/PlanGate";
import CrmList from "@/components/pages/CrmList";

export default function Page() {
  return (
    <PlanGate minPlan="premium">
      <CrmList />
    </PlanGate>
  );
}
