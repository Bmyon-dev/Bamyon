import StaffGate from "@/components/StaffGate";
import OrdersList from "@/components/pages/OrdersList";

export default function Page() {
  return (
    <StaffGate permission="orders" minPlan="premium">
      <OrdersList />
    </StaffGate>
  );
}
