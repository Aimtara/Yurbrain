import { buildFounderReviewFromSignals } from "./scoring";
import { createMockFounderReviewSignals } from "./mock-signals";

const review = buildFounderReviewFromSignals(createMockFounderReviewSignals("2026-04-19T12:00:00.000Z"));

console.log(JSON.stringify(review, null, 2));
