import StaffGate from "@/components/StaffGate";
import SalesForm from "@/components/pages/SalesForm";

export default function Page() {
  return (
    <StaffGate permission="sales">
      <SalesForm homeHref="/staff" />
    </StaffGate>
  );
}
