import PlanGate from "@/components/PlanGate";
import InventoryList from "@/components/pages/InventoryList";

export default function Page() {
  return (
    <PlanGate minPlan="standard">
      <InventoryList />
    </PlanGate>
  );
}
