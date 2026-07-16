import StaffGate from "@/components/StaffGate";
import ReceiptForm from "@/components/pages/ReceiptForm";

export default function Page() {
  return (
    <StaffGate permission="receipts" minPlan="standard">
      <ReceiptForm />
    </StaffGate>
  );
}
