import StaffGate from "@/components/StaffGate";
import CrmList from "@/components/pages/CrmList";

export default function Page() {
  return (
    <StaffGate permission="crm" minPlan="premium">
      <CrmList />
    </StaffGate>
  );
}
