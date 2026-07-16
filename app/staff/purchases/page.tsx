import StaffGate from "@/components/StaffGate";
import PurchasesForm from "@/components/pages/PurchasesForm";

export default function Page() {
  return (
    <StaffGate permission="purchases" minPlan="standard">
      <PurchasesForm homeHref="/staff" />
    </StaffGate>
  );
}
