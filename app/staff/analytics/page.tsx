import StaffGate from "@/components/StaffGate";
import AnalyticsView from "@/components/pages/AnalyticsView";

export default function Page() {
  return (
    <StaffGate permission="analytics" minPlan="premium">
      <AnalyticsView />
    </StaffGate>
  );
}
