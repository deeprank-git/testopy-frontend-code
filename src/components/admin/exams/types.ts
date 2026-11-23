import type { SectionDraft } from "@/lib/admin/exam-rules";

export type TestSection = SectionDraft & { _id: string };

export type AdminTest = {
  _id: string;
  title: string;
  testSeries: string | { _id: string; name?: string };
  paperType?: "mock" | "previous_year";
  examDate?: string;
  duration?: number;
  totalQuestions?: number;
  totalMarks?: number;
  attemptsCount?: number;
  sections?: TestSection[];
  isActive?: boolean;
  isPublished?: boolean;
  isPaid?: boolean;
  maxPauses?: number | null;
  maxPauseDurationMs?: number | null;
};

export type AdminQuestion = {
  _id: string;
  questionText: string;
  options: { _id?: string; text: string }[];
  correctAnswer: number;
  explanation?: string;
  test: string;
  section: string;
  marks?: number;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
};
