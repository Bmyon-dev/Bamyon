import PlanGate from "@/components/PlanGate";
import NetWorthView from "@/components/pages/NetWorthView";

export default function Page() {
  return (
    <PlanGate minPlan="premium">
      <NetWorthView />
    </PlanGate>
  );
}
