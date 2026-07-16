import PlanGate from "@/components/PlanGate";
import AnalyticsView from "@/components/pages/AnalyticsView";

export default function Page() {
  return (
    <PlanGate minPlan="premium">
      <AnalyticsView />
    </PlanGate>
  );
}
