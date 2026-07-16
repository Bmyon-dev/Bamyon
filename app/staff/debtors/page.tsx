import StaffGate from "@/components/StaffGate";
import DebtorsList from "@/components/pages/DebtorsList";

export default function Page() {
  return (
    <StaffGate permission="debtors" minPlan="standard">
      <DebtorsList />
    </StaffGate>
  );
}
