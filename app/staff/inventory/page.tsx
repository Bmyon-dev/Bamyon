import StaffGate from "@/components/StaffGate";
import InventoryList from "@/components/pages/InventoryList";

export default function Page() {
  return (
    <StaffGate permission="inventory" minPlan="standard">
      <InventoryList />
    </StaffGate>
  );
}
