/** The recommended learning path. Drives the guided ordering on /learn. */
export interface CurriculumUnit {
  level: string;
  topic: string;
}

export const CURRICULUM: CurriculumUnit[] = [
  { level: "A1", topic: "Greetings & Basics" },
  { level: "A1", topic: "Numbers" },
  { level: "A1", topic: "Family" },
  { level: "A1", topic: "Food & Drink" },
  { level: "A1", topic: "Colors" },
  { level: "A1", topic: "Days & Time" },
  { level: "A1", topic: "Common Verbs" },
  { level: "A1", topic: "House & Home" },
  { level: "A1", topic: "Body" },
  { level: "A1", topic: "Clothing" },
  { level: "A2", topic: "Travel" },
  { level: "A2", topic: "Work & Jobs" },
  { level: "A2", topic: "Common Adjectives" },
];
