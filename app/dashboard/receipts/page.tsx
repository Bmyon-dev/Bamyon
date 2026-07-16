import PlanGate from "@/components/PlanGate";
import ReceiptForm from "@/components/pages/ReceiptForm";

export default function Page() {
  return (
    <PlanGate minPlan="standard">
      <ReceiptForm />
    </PlanGate>
  );
}
