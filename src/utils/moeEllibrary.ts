/**
 * Egyptian MOE e-library (ellibrary.moe.gov.eg/books/) — same schema as books.json
 */
export const MOE_ELIBRARY_PORTAL = "https://ellibrary.moe.gov.eg/books/";

export type MoeBook = {
  stage: string;
  grade: string;
  term: string;
  subject: string;
  type: string;
  link: string;
};

const PRIMARY: Record<number, string[]> = {
  1: ["الصف الأول الإبتدائي"],
  2: ["الصف الثاني الابتدائي"],
  3: ["الصف الثالث الابتدائي"],
  4: ["الصف الرابع الابتدائي"],
  5: ["الصف الخامس الابتدائي"],
  6: ["الصف السادس الابتدائي"],
};

const PREP: Record<number, string[]> = {
  1: ["الصف الأول الإعدادي"],
  2: ["الصف الثاني الإعدادي"],
  3: ["الصف الثالث الإعدادي"],
};

const SECONDARY: Record<number, string[]> = {
  1: ["الصف الاول الثانوي", "الصف الأول الثانوي"],
  2: ["الصف الثاني الثانوي"],
  3: ["الصف الثالث الثانوي"],
};

const KG: Record<number, string[]> = {
  1: ["مستوى أول"],
  2: ["مستوي ثان", "مستوى ثان"],
};

/** Loose Arabic normalization for comparisons */
export function normalizeKeyAr(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/إ|أ|آ/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

/** Map DB `stages.name_ar` to exact `stage` string inside MOE books.json */
export function mapDbStageNameToMoeStage(dbNameAr: string | null | undefined): string | null {
  if (!dbNameAr) return null;
  const n = normalizeKeyAr(dbNameAr);
  if (n.includes("ابتدائ")) return "الإبتدائية";
  if (n.includes("اعداد") || n.includes("إعداد")) return "الإعدادية";
  if (n.includes("ثانوي") && n.includes("عام")) return "الثانوي العام";
  if ((n.includes("رياض") && n.includes("اطفال")) || n.includes("كيجي")) return "رياض الاطفال";
  if (n.includes("مجتمع")) return "التعليم المجتمعي";
  return null;
}

export function moeGradeLabels(moeStage: string, gradeNumber: number | null | undefined): string[] | null {
  if (gradeNumber == null || gradeNumber < 1) return null;
  if (moeStage === "الإبتدائية") return PRIMARY[gradeNumber] ?? null;
  if (moeStage === "الإعدادية") return PREP[gradeNumber] ?? null;
  if (moeStage === "الثانوي العام") return SECONDARY[gradeNumber] ?? null;
  if (moeStage === "رياض الاطفال") return KG[gradeNumber] ?? null;
  return null;
}

export function moeTermFromSemester(sem: "all" | 1 | 2): string | null {
  if (sem === "all") return null;
  if (sem === 1) return "الفصل الدراسى الأول";
  return "الفصل الدراسى الثانى";
}

/** Prefer filtering by PDF path segment (/Term1/ vs /Term2/) — `term` text in JSON is not always reliable */
export function linkMatchesMoeSemester(link: string, semester: "all" | 1 | 2): boolean {
  if (semester === "all") return true;
  const u = link.toLowerCase();
  if (semester === 1) return u.includes("/term1/");
  return u.includes("/term2/");
}

export function filterMoeBooksForStudent(
  books: MoeBook[],
  opts: {
    moeStage: string | null;
    gradeLabels: string[] | null;
    semester?: "all" | 1 | 2;
    studentBookOnly?: boolean;
  }
): MoeBook[] {
  const { moeStage, gradeLabels, semester = "all", studentBookOnly = true } = opts;
  return books.filter((b) => {
    if (!moeStage || b.stage !== moeStage) return false;
    if (gradeLabels?.length && !gradeLabels.includes(b.grade)) return false;
    if (studentBookOnly && b.type !== "كتاب الطالب") return false;
    if (!linkMatchesMoeSemester(b.link, semester)) return false;
    return true;
  });
}

function subjectNamesLooselyMatch(normPlatform: string, normMoe: string): boolean {
  if (!normPlatform || !normMoe) return false;
  if (normMoe.includes(normPlatform) || normPlatform.includes(normMoe)) return true;
  const pt = normPlatform.split(" ").filter((t) => t.length >= 2);
  if (pt.length === 0) return false;
  const mtokens = normMoe.split(" ");
  const hits = pt.filter((t) => mtokens.some((m) => m.includes(t) || t.includes(m)));
  return hits.length >= Math.min(2, pt.length);
}

export function moeBooksForSubjectName(pool: MoeBook[], platformSubjectNameAr: string): MoeBook[] {
  const pn = normalizeKeyAr(platformSubjectNameAr);
  if (!pn) return [];
  return pool.filter((b) => subjectNamesLooselyMatch(pn, normalizeKeyAr(b.subject)));
}

export function pickPreferredMoeBook(books: MoeBook[]): MoeBook | null {
  if (!books.length) return null;
  const arabicMedium = books.find((b) => /باللغة العربية/.test(b.subject));
  if (arabicMedium) return arabicMedium;
  return books[0];
}
