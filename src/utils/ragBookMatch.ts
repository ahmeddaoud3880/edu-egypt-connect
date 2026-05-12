import type { RagBook } from "@/services/ragService";

function compact(s: string) {
  return s.replace(/\s+/g, "").toLowerCase();
}

/** MOE e-library row subject label vs ingested RAG catalog (same grade, chunks > 0). */
export function findRagBookForMoeSubject(
  moeSubject: string,
  gradeNumber: number | null | undefined,
  ragBooks: RagBook[],
): RagBook | null {
  const ready = ragBooks.filter(
    (r) => (r.total_chunks ?? 0) > 0 && (gradeNumber == null || r.grade_number === gradeNumber),
  );
  if (!ready.length) return null;
  const subj = compact(moeSubject);
  for (const r of ready) {
    const sn = compact(r.subject_name || "");
    const titleBlob = compact([r.title_ar, r.title].filter(Boolean).join(" "));
    if (sn && (subj.includes(sn) || sn.includes(subj))) return r;
    if (titleBlob.length >= 4 && (subj.includes(titleBlob.slice(0, 8)) || titleBlob.includes(subj.slice(0, 8)))) {
      return r;
    }
  }
  const has = (a: string, p: RegExp) => p.test(a);
  const blobOf = (r: RagBook) => `${r.subject_name || ""} ${r.title_ar || ""} ${r.title || ""}`;
  for (const r of ready) {
    const blob = blobOf(r);
    if (has(subj, /عرب|arabic/) && has(compact(blob), /عرب|arabic/)) return r;
    if (has(subj, /انجل|english/) && has(compact(blob), /انجل|english/)) return r;
    if (has(subj, /رياض|math|ryad/) && has(compact(blob), /رياض|math/)) return r;
    if (has(subj, /اكتشف|discovery/) && has(compact(blob), /اكتشف|discovery/)) return r;
  }
  return null;
}
