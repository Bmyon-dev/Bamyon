import PlanGate from "@/components/PlanGate";
import OrdersList from "@/components/pages/OrdersList";

export default function Page() {
  return (
    <PlanGate minPlan="premium">
      <OrdersList />
    </PlanGate>
  );
}
