import StaffGate from "@/components/StaffGate";
import InvoiceForm from "@/components/pages/InvoiceForm";

export default function Page() {
  return (
    <StaffGate permission="invoices" minPlan="standard">
      <InvoiceForm />
    </StaffGate>
  );
}
