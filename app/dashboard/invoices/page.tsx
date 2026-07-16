import PlanGate from "@/components/PlanGate";
import InvoiceForm from "@/components/pages/InvoiceForm";

export default function Page() {
  return (
    <PlanGate minPlan="standard">
      <InvoiceForm />
    </PlanGate>
  );
}
