import StaffGate from "@/components/StaffGate";
import ReviewsGrid from "@/components/pages/ReviewsGrid";

export default function Page() {
  return (
    <StaffGate permission="reviews" minPlan="premium">
      <ReviewsGrid />
    </StaffGate>
  );
}
