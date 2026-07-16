import PlanGate from "@/components/PlanGate";
import ReviewsGrid from "@/components/pages/ReviewsGrid";

export default function Page() {
  return (
    <PlanGate minPlan="premium">
      <ReviewsGrid />
    </PlanGate>
  );
}
