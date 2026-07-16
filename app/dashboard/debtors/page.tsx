import PlanGate from "@/components/PlanGate";
import DebtorsList from "@/components/pages/DebtorsList";

export default function Page() {
  return (
    <PlanGate minPlan="standard">
      <DebtorsList />
    </PlanGate>
  );
}
