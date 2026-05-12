import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  BookOpen,
  ExternalLink,
  Loader2,
  Search,
  BookMarked,
  ChevronRight,
  X,
  AlertCircle,
  Globe,
  Library,
  Sparkles,
} from "lucide-react";
import {
  useStudentRegistrationInfo,
  useTextbooksByStage,
  useMoeEllibraryBooks,
} from "@/hooks/useStudentData";
import { ragListBooks, type RagBook } from "@/services/ragService";
import { findRagBookForMoeSubject } from "@/utils/ragBookMatch";
import {
  MOE_ELIBRARY_PORTAL,
  mapDbStageNameToMoeStage,
  moeGradeLabels,
  filterMoeBooksForStudent,
  type MoeBook,
} from "@/utils/moeEllibrary";

type StudyResourcesProps = {
  onAskAboutRagBook?: (book: RagBook) => void;
};

export function StudyResources({ onAskAboutRagBook }: StudyResourcesProps) {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const [search, setSearch] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<number | "all">("all");
  const [viewerBook, setViewerBook] = useState<{ name_ar: string; name: string; url: string } | null>(null);
  const [ragBooks, setRagBooks] = useState<RagBook[]>([]);
  const [ragLoading, setRagLoading] = useState(false);

  const { data: regInfo, isLoading: regLoading } = useStudentRegistrationInfo();
  const { data: textbooks, isLoading: tbLoading } = useTextbooksByStage(regInfo?.stage_id, regInfo?.grade_number ?? null);
  const { data: moeCatalog, isLoading: moeLoading, isError: moeErr } = useMoeEllibraryBooks();

  useEffect(() => {
    if (!regInfo?.grade_number) {
      setRagBooks([]);
      return;
    }
    setRagLoading(true);
    ragListBooks({ grade: regInfo.grade_number })
      .then(setRagBooks)
      .catch(() => setRagBooks([]))
      .finally(() => setRagLoading(false));
  }, [regInfo?.grade_number]);

  const moeStage = useMemo(
    () => (regInfo ? mapDbStageNameToMoeStage(regInfo.stage_name_ar) : null),
    [regInfo]
  );
  const gradeLabels = useMemo(
    () => (moeStage && regInfo ? moeGradeLabels(moeStage, regInfo.grade_number) : null),
    [moeStage, regInfo]
  );

  const moePool = useMemo(() => {
    if (!moeCatalog?.length || !moeStage) return [];
    return filterMoeBooksForStudent(moeCatalog, {
      moeStage,
      gradeLabels,
      semester: selectedSemester === "all" ? "all" : (selectedSemester as 1 | 2),
      studentBookOnly: true,
    });
  }, [moeCatalog, moeStage, gradeLabels, selectedSemester]);

  const moeFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return moePool.filter((b) => {
      if (!q) return true;
      return (
        b.subject.toLowerCase().includes(q) ||
        b.grade.toLowerCase().includes(q) ||
        b.term.toLowerCase().includes(q)
      );
    });
  }, [moePool, search]);

  const moeGrouped = useMemo(() => {
    const g: Record<string, MoeBook[]> = {};
    moeFiltered.forEach((tb) => {
      const key = tb.subject;
      if (!g[key]) g[key] = [];
      g[key].push(tb);
    });
    return g;
  }, [moeFiltered]);

  const filteredDb = (textbooks || []).filter((tb) => {
    const matchSearch =
      search === "" ||
      tb.name_ar.toLowerCase().includes(search.toLowerCase()) ||
      tb.name.toLowerCase().includes(search.toLowerCase()) ||
      (tb as { subjects?: { name_ar?: string } }).subjects?.name_ar?.toLowerCase().includes(search.toLowerCase());
    const matchSemester = selectedSemester === "all" || tb.semester === selectedSemester;
    return matchSearch && matchSemester;
  });

  const groupedDb: Record<string, typeof filteredDb> = {};
  filteredDb.forEach((tb) => {
    const subjectName = (tb as { subjects?: { name_ar?: string } }).subjects?.name_ar || tb.name_ar;
    if (!groupedDb[subjectName]) groupedDb[subjectName] = [];
    groupedDb[subjectName].push(tb);
  });

  const isLoading = regLoading || tbLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{isAr ? "جارى تحميل الموارد..." : "Loading resources..."}</span>
      </div>
    );
  }

  if (!regInfo || !["approved", "activated"].includes(regInfo.request_status)) {
    return (
      <div className="bg-surface-elevated rounded-lg border border-amber-200 p-8 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "ستظهر الموارد فور الموافقة على طلب التسجيل." : "Resources will appear once your registration is approved."}
        </p>
      </div>
    );
  }

  const subjectColors: Record<string, string> = {
    "#2E7D32": "#2E7D32",
    "#1565C0": "#1565C0",
    "#00695C": "#00695C",
    "#E65100": "#E65100",
    "#6A1B9A": "#6A1B9A",
    "#1A237E": "#1A237E",
    "#880E4F": "#880E4F",
    "#1B5E20": "#1B5E20",
    "#BF360C": "#BF360C",
    "#33691E": "#33691E",
    "#4A148C": "#4A148C",
    "#006064": "#006064",
  };

  const gradeBadge =
    regInfo.grade_number != null
      ? isAr
        ? `الصف ${regInfo.grade_number}`
        : `Grade ${regInfo.grade_number}`
      : null;

  return (
    <div className="space-y-6">
      {viewerBook && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-elevated rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-semibold text-sm text-foreground">
                    {isAr ? viewerBook.name_ar : viewerBook.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {isAr ? "وزارة التربية والتعليم — المكتبة الإلكترونية" : "Ministry of Education — e-library"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewerBook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded border border-border"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {isAr ? "فتح فى المتصفح" : "Open in browser"}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setViewerBook(null)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative">
              <iframe
                src={viewerBook.url}
                className="w-full h-full border-0"
                title={viewerBook.name_ar}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="w-5 h-5 text-primary shrink-0" />
          <h2 className="font-semibold text-foreground">{isAr ? "الموارد والكتب" : "Resources & books"}</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {moeFiltered.length} {isAr ? "كتاب (وزارة)" : "MOE books"}
          </span>
          {gradeBadge && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{gradeBadge}</span>
          )}
          {moeLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "ابحث فى المادة أو الصف..." : "Search subject..."}
              className="ps-8 pe-3 py-1.5 text-xs bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-44"
              dir={isAr ? "rtl" : "ltr"}
            />
          </div>
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            {(
              [
                ["all", isAr ? "كل الفصول" : "All"],
                [1, isAr ? "الفصل الأول" : "Term 1"],
                [2, isAr ? "الفصل الثانى" : "Term 2"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setSelectedSemester(val)}
                className={`px-3 py-1.5 transition-colors ${
                  selectedSemester === val ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
        <Globe className="w-5 h-5 text-blue-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {isAr ? "المكتبة الإلكترونية — وزارة التربية والتعليم" : "E-library — Egyptian Ministry of Education"}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            {isAr
              ? "الكتب تُصفّى تلقائياً حسب مرحلتك وصفك والفصل الدراسى من ملف التسجيل."
              : "Books filter by your registered stage, grade, and semester."}
          </p>
          {moeErr && (
            <p className="text-[10px] text-amber-800 dark:text-amber-200 mt-1">
              {isAr ? "تنبيه: يتم استخدام نسخة محلية من الكتالوج." : "Note: using bundled catalog fallback."}
            </p>
          )}
          {!moeStage && (
            <p className="text-[10px] text-amber-800 dark:text-amber-200 mt-1">
              {isAr
                ? "لم نتمكن من مطابقة اسم المرحلة مع كتالوج الوزارة؛ افتح الموقع للاختيار اليدوى."
                : "Stage name not mapped to the Ministry catalog; open the portal to browse manually."}
            </p>
          )}
        </div>
        <a
          href={MOE_ELIBRARY_PORTAL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
        >
          <Library className="w-3.5 h-3.5" />
          {isAr ? "ellibrary.moe.gov.eg" : "Open portal"}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Library className="w-4 h-4 text-primary" />
          {isAr ? "كتب الطالب (الوزارة)" : "Ministry student textbooks"}
        </h3>
        {Object.keys(moeGrouped).length === 0 ? (
          <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed border-border">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground px-4">
              {moeStage
                ? isAr
                  ? "لا توجد كتب مطابقة للبحث أو للفصل المختار."
                  : "No MOE books match your filters."
                : isAr
                  ? "افتح بوابة المكتبة واختر المرحلة والصف يدوياً."
                  : "Open the e-library to select stage and grade."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(moeGrouped).map(([subjectName, books]) => {
              const color = "#4A90D9";
              return (
                <div key={subjectName} className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
                  <div
                    className="flex items-center gap-3 px-5 py-3"
                    style={{ borderLeft: `4px solid ${subjectColors[color] ?? color}` }}
                  >
                    <BookOpen className="w-4 h-4" style={{ color: subjectColors[color] ?? color }} />
                    <h3 className="font-semibold text-foreground text-sm">{subjectName}</h3>
                    <span className="ms-auto text-xs text-muted-foreground">
                      {books.length} {isAr ? "كتاب" : "books"}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {books.map((book, i) => {
                      const ragMatch =
                        onAskAboutRagBook && regInfo?.grade_number != null
                          ? findRagBookForMoeSubject(book.subject, regInfo.grade_number, ragBooks)
                          : null;
                      return (
                      <div
                        key={`${book.link}-${i}`}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <div
                          className="w-10 h-12 rounded flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                          style={{ backgroundColor: subjectColors[color] ?? color }}
                        >
                          {book.link.toLowerCase().includes("/term1/") ? (isAr ? "١" : "1") : isAr ? "٢" : "2"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{book.subject}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {book.grade} • {book.term}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          {ragMatch && onAskAboutRagBook && (
                            <button
                              type="button"
                              onClick={() => onAskAboutRagBook(ragMatch)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs rounded hover:bg-violet-700 transition-colors"
                              title={isAr ? "فتح المساعد الذكى لهذا الكتاب" : "Open AI assistant for this book"}
                            >
                              <Sparkles className="w-3 h-3" />
                              {isAr ? "سؤال للمساعد" : "Ask AI"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setViewerBook({
                                name_ar: book.subject,
                                name: book.subject,
                                url: book.link,
                              })
                            }
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors"
                          >
                            <BookMarked className="w-3 h-3" />
                            {isAr ? "قراءة" : "Read"}
                          </button>
                          <a
                            href={book.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded border border-border hover:bg-muted transition-colors text-muted-foreground"
                            title={isAr ? "تحميل / تبويب جديد" : "Download / new tab"}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {onAskAboutRagBook && ragBooks.some((r) => (r.total_chunks ?? 0) > 0) && (
        <div className="space-y-3 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4 text-violet-600" />
            {isAr ? "كتب مفهرسة للمساعد الذكى" : "AI-indexed textbooks"}
            {ragLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isAr
              ? "اضغط لفتح تبويب المساعد الذكى والسؤال من محتوى الكتاب بعد الاستيعاب."
              : "Open the AI assistant to ask from the ingested textbook content."}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ragBooks
              .filter((r) => (r.total_chunks ?? 0) > 0)
              .map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.title_ar || b.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(b.total_pages ?? 0)} {isAr ? "صفحة" : "pages"} · {b.total_chunks} chunks
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAskAboutRagBook(b)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 text-white text-xs rounded hover:bg-violet-700"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isAr ? "المساعد" : "AI"}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {Object.keys(groupedDb).length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {isAr ? "مواد إضافية من منصة المدرسة" : "Additional materials from your school database"}
          </h3>
          <div className="space-y-4">
            {Object.entries(groupedDb).map(([subjectName, books]) => {
              const clr = (books[0] as { subjects?: { color?: string } }).subjects?.color ?? "#888";
              return (
                <div key={subjectName} className="bg-surface-elevated rounded-lg border border-border overflow-hidden opacity-95">
                  <div
                    className="flex items-center gap-3 px-5 py-3"
                    style={{ borderLeft: `4px solid ${subjectColors[clr] ?? clr}` }}
                  >
                    <BookOpen className="w-4 h-4" style={{ color: subjectColors[clr] ?? clr }} />
                    <h3 className="font-semibold text-foreground text-sm">{subjectName}</h3>
                    <span className="ms-auto text-xs text-muted-foreground">
                      {books.length} {isAr ? "عنصر" : "items"}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {books.map((book) => (
                      <div key={book.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                        <div
                          className="w-10 h-12 rounded flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                          style={{ backgroundColor: subjectColors[clr] ?? clr }}
                        >
                          {book.semester === 1 ? (isAr ? "١" : "1") : isAr ? "٢" : "2"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {isAr ? book.name_ar : book.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {isAr ? `الفصل ${book.semester === 1 ? "الأول" : "الثانى"}` : `Semester ${book.semester}`}
                            {book.academic_year && ` • ${book.academic_year}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setViewerBook({
                                name_ar: book.name_ar,
                                name: book.name,
                                url: book.viewer_url ?? MOE_ELIBRARY_PORTAL,
                              })
                            }
                            className="flex items-center gap-1 px-3 py-1.5 bg-muted text-foreground text-xs rounded hover:bg-muted/80 transition-colors"
                          >
                            <BookMarked className="w-3 h-3" />
                            {isAr ? "عرض" : "View"}
                          </button>
                          <a
                            href={book.viewer_url ?? MOE_ELIBRARY_PORTAL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded border border-border hover:bg-muted transition-colors text-muted-foreground"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
