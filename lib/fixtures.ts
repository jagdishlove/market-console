import raw from "@/data/fixtures.json";
import { FixturesSchema, type Fixture } from "./schema";

export const fixtures = FixturesSchema.parse(raw);

export function pickFixture(question: string): Fixture {
  const q = question.toLowerCase();
  return fixtures.fixtures.find((f) => (f.keywords ?? []).some((k) => q.includes(k))) ?? fixtures.default;
}
