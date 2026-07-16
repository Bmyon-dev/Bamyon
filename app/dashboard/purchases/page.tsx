import PlanGate from "@/components/PlanGate";
import PurchasesForm from "@/components/pages/PurchasesForm";

export default function Page() {
  return (
    <PlanGate minPlan="standard">
      <PurchasesForm homeHref="/dashboard" />
    </PlanGate>
  );
}
