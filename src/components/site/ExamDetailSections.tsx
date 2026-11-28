import { useState } from "react";
import { BookOpen, ChevronDown, ClipboardList, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EXAM_DETAIL_META,
  filledExamDetails,
  parseDetailText,
  type ExamDetailKey,
  type ExamDetails,
} from "@/lib/exam-details";

const SECTION_STYLE: Record<ExamDetailKey, { icon: LucideIcon; tint: string }> = {
  eligibility: { icon: User, tint: "bg-blue-50 text-blue-600" },
  pattern: { icon: ClipboardList, tint: "bg-emerald-50 text-emerald-600" },
  syllabus: { icon: BookOpen, tint: "bg-violet-50 text-violet-600" },
};

/**
 * The exam page's Eligibility / Exam Pattern / Syllabus, from
 * TestSeries.examDetails. Only sections an admin has written are shown, each
 * as an expandable card (the first starts open). Text is rendered as plain
 * text nodes — never HTML.
 */
export function ExamDetailSections({ details }: { details: ExamDetails | null | undefined }) {
  const sections = filledExamDetails(details);
  // undefined = the user hasn't toggled anything yet: open the first section.
  // (details usually arrive after the first render, so this can't be fixed
  // at mount time.)
  const [toggled, setOpen] = useState<ExamDetailKey | null | undefined>(undefined);
  const open = toggled === undefined ? (sections[0] ?? null) : toggled;

  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Eligibility, exam pattern and syllabus haven't been added for this exam yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((key) => {
        const { icon: Icon, tint } = SECTION_STYLE[key];
        const { title, hint } = EXAM_DETAIL_META[key];
        const isOpen = open === key;
        const panelId = `exam-detail-${key}`;
        return (
          <div key={key} className="rounded-xl border border-border">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : key)}
              className="w-full flex items-center gap-4 p-4 text-left rounded-xl hover:bg-muted/40 transition"
            >
              <span className={cn("h-12 w-12 rounded-xl grid place-items-center shrink-0", tint)}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-base">{title}</div>
                {!isOpen && <div className="text-sm text-muted-foreground mt-0.5 truncate">{hint}</div>}
              </div>
              <ChevronDown
                className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-180")}
              />
            </button>
            {isOpen && (
              <div id={panelId} className="px-4 pb-4 pt-0 sm:pl-20 space-y-3 text-sm leading-relaxed">
                {parseDetailText(details?.[key]).map((block, i) =>
                  block.type === "ul" ? (
                    <ul key={i} className="list-disc pl-5 space-y-1">
                      {block.items.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i}>
                      {block.lines.map((line, j) => (
                        <span key={j}>
                          {j > 0 && <br />}
                          {line}
                        </span>
                      ))}
                    </p>
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
