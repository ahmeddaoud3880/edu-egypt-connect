import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  BookOpen,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Trash2,
  Download,
  FolderTree,
  BarChart3,
  List,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  ragListBooks,
  ragListDownloadedPdfs,
  ragIngestExisting,
  ragDeleteBook,
  ragListEvalFixtures,
  ragRunEval,
  ragGetBookToc,
  type RagBook,
  type DownloadedPdf,
  type RagEvalReport,
  type TocEntry,
} from "@/services/ragService";

const STAGES = [
  { value: "ابتدائى", label: "ابتدائي" },
  { value: "اعدادى", label: "إعدادي" },
  { value: "ثانوى عام", label: "ثانوي عام" },
  { value: "رياض أطفال", label: "رياض أطفال" },
];

const GRADE_OPTIONS_PRIMARY = [1, 2, 3, 4, 5, 6];
const GRADE_OPTIONS_PREP = [1, 2, 3];
const GRADE_OPTIONS_SECONDARY = [1, 2, 3];
const GRADE_OPTIONS_KG = [1, 2];

function gradesFor(stage: string): number[] {
  if (stage.includes("ابتدائ")) return GRADE_OPTIONS_PRIMARY;
  if (stage.includes("اعداد")) return GRADE_OPTIONS_PREP;
  if (stage.includes("ثانو")) return GRADE_OPTIONS_SECONDARY;
  if (stage.includes("رياض")) return GRADE_OPTIONS_KG;
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

function inferTitleFromName(name: string): string {
  return name.replace(/\.pdf$/i, "").replace(/_/g, " ");
}

function inferStageFromPath(path: string): string {
  const p = path.toLowerCase();
  if (p.includes("/primary/") || p.includes("\\primary\\")) return "ابتدائى";
  if (p.includes("/prep/") || p.includes("\\prep\\")) return "اعدادى";
  if (p.includes("/secondary/") || p.includes("\\secondary\\")) return "ثانوى عام";
  if (p.includes("/kg/") || p.includes("\\kg\\")) return "رياض أطفال";
  return "";
}

function inferGradeFromPath(path: string): number | "" {
  const m = path.match(/[\/\\]g(\d+)[\/\\]/);
  return m ? Number(m[1]) : "";
}

function inferSubjectFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("arabic")) return "اللغة العربية";
  if (n.startsWith("math") || n.includes("/math") || n.includes("\\math")) return "الرياضيات";
  if (n.includes("english")) return "اللغة الانجليزية";
  if (n.includes("science")) return "العلوم";
  if (n.includes("social") || n.includes("derasat")) return "الدراسات الاجتماعية";
  if (n.includes("islamic")) return "التربية الدينية الإسلامية";
  if (n.includes("ch_") || n.includes("chrestian")) return "التربية الدينية المسيحية";
  if (n.includes("discovery")) return "اكتشف";
  if (n.includes("ict")) return "تكنولوجيا المعلومات والاتصالات";
  return "";
}

export function RagLibrary() {
  const { isAr } = useTranslation();
  const [books, setBooks] = useState<RagBook[]>([]);
  const [downloaded, setDownloaded] = useState<DownloadedPdf[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyIngest, setBusyIngest] = useState<string | null>(null);
  const [busyDelete, setBusyDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fixtures, setFixtures] = useState<string[]>(["prim3_grade3_suite_50.json"]);
  const [evalFixture, setEvalFixture] = useState("prim3_grade3_suite_50.json");
  const [evalBusy, setEvalBusy] = useState<string | null>(null);
  const [evalReports, setEvalReports] = useState<Record<string, RagEvalReport>>({});

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bks, dls] = await Promise.all([ragListBooks(), ragListDownloadedPdfs()]);
      setBooks(bks);
      setDownloaded(dls.files);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    ragListEvalFixtures()
      .then(d => {
        const list =
          d.fixtures?.length ? d.fixtures : ["prim3_grade3_suite_50.json"];
        setFixtures(list);
        setEvalFixture(prev => (list.includes(prev) ? prev : list[0] || prev));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load fixture list once on mount
  }, []);

  const ingestedPaths = new Set(books.map((b) => (b as any).source_file).filter(Boolean));

  const ingest = async (
    file: DownloadedPdf,
    overrides?: {
      stage?: string;
      grade?: number;
      subject?: string;
      content_first_pdf_page?: number;
      citation_starts_at_pdf_page?: number | null;
      skip_trailing_pdf_pages?: number;
    },
  ) => {
    setBusyIngest(file.path);
    try {
      const out = await ragIngestExisting({
        file_path: file.path,
        title: inferTitleFromName(file.name),
        title_ar: inferTitleFromName(file.name),
        stage_name: overrides?.stage ?? inferStageFromPath(file.path),
        grade: overrides?.grade ?? (inferGradeFromPath(file.path) || undefined),
        subject_name: overrides?.subject ?? inferSubjectFromName(file.name + " " + file.path),
        content_first_pdf_page: overrides?.content_first_pdf_page ?? 1,
        citation_starts_at_pdf_page: overrides?.citation_starts_at_pdf_page ?? null,
        skip_trailing_pdf_pages: overrides?.skip_trailing_pdf_pages ?? 0,
      });
      if (out.error) throw new Error(out.error);
      if (out.skipped) {
        toast.message(isAr ? "الكتاب موجود بالفعل" : "Book already ingested");
      } else {
        toast.success(isAr ? `تم ingest الكتاب — ${out.chunks} chunks` : `Ingested — ${out.chunks} chunks`);
      }
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Ingest failed");
    } finally {
      setBusyIngest(null);
    }
  };

  const remove = async (bookId: string) => {
    if (!confirm(isAr ? "حذف الكتاب نهائياً من قاعدة بيانات RAG؟" : "Delete this book from the RAG store?")) return;
    setBusyDelete(bookId);
    try {
      await ragDeleteBook(bookId);
      toast.success(isAr ? "تم الحذف" : "Deleted");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyDelete(null);
    }
  };

  const runEvalForBook = async (bookId: string, grade?: number | null) => {
    setEvalBusy(bookId);
    try {
      const r = await ragRunEval({
        book_id: bookId,
        fixture: evalFixture,
        grade: grade ?? undefined,
        top_k: 5,
      });
      setEvalReports(prev => ({ ...prev, [bookId]: r }));
      toast.success(
        isAr
          ? `تقييم الاسترجاع — نسبة أسئلة ذات نتائج: ${(r.non_empty_rate * 100).toFixed(0)}٪`
          : `Eval — questions with ≥1 hit: ${(r.non_empty_rate * 100).toFixed(0)}%`,
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Eval failed");
    } finally {
      setEvalBusy(null);
    }
  };

  const totalChunks = books.reduce((acc, b) => acc + (b.total_chunks || 0), 0);
  const totalPages = books.reduce((acc, b) => acc + (b.total_pages || 0), 0);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={isAr ? "كتب مُستوعبة" : "Ingested books"} value={books.length} icon={BookOpen} color="text-blue-600 bg-blue-50 dark:bg-blue-900/20" />
        <StatCard label={isAr ? "PDFs محملة محلياً" : "Downloaded PDFs"} value={downloaded.length} icon={FileText} color="text-purple-600 bg-purple-50 dark:bg-purple-900/20" />
        <StatCard label={isAr ? "إجمالي الصفحات" : "Total pages"} value={totalPages} icon={FolderTree} color="text-green-600 bg-green-50 dark:bg-green-900/20" />
        <StatCard label={isAr ? "إجمالي المقاطع" : "Total chunks"} value={totalChunks} icon={Sparkles} color="text-orange-600 bg-orange-50 dark:bg-orange-900/20" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isAr ? "مكتبة RAG — الكتب الدراسية" : "RAG Textbook Library"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "ضع ملفات PDF تحت ai_agent/rag/books/ ثم النقر على Ingest. الفهرسة تستخدم BGE‑M3 محليًا (مع إمكانية Gemini من .env)."
              : "Put PDFs under ai_agent/rag/books/ then Ingest. Embeddings default to local BGE‑M3 (Gemini optional via .env)."}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-2 border border-border rounded-lg text-sm flex items-center gap-2 hover:bg-muted disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isAr ? "تحديث" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
        <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="text-xs text-muted-foreground">
          {isAr ? "تقييم استرجاع hybrid + rerank على مجموعة أسئلة JSON:" : "Hybrid + rerank retrieval eval (JSON fixture):"}
        </span>
        <select
          value={evalFixture}
          onChange={(e) => setEvalFixture(e.target.value)}
          className="text-xs border border-border rounded-md px-2 py-1.5 bg-background font-mono max-w-[min(100%,280px)]"
          dir="ltr"
        >
          {fixtures.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-muted-foreground">
          {isAr ? "أضف ملفاتك تحت ai_agent/rag/eval/fixtures ثم أعد تحميل القائمة." : "Add suites under ai_agent/rag/eval/fixtures; refresh to list."}
        </span>
      </div>

      {/* Ingested books */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          {isAr ? "الكتب المُستوعبة (جاهزة للاستخدام بـ AI)" : "Ingested books (ready for AI)"}
        </h3>
        {books.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-border rounded-xl text-sm text-muted-foreground">
            {isAr ? "لا توجد كتب مُستوعبة بعد." : "No books ingested yet."}
          </div>
        ) : (
          <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {books.map((b) => (
                <div key={b.id} className="p-3 hover:bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{b.title_ar || b.title}</p>
                      <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                        {b.grade_number != null && <span>{isAr ? `الصف ${b.grade_number}` : `G${b.grade_number}`}</span>}
                        {b.subject_name && <span>· {b.subject_name}</span>}
                        <span>· {b.total_pages || 0} {isAr ? "صفحة" : "pages"}</span>
                        <span>· {b.total_chunks || 0} chunks</span>
                      </p>
                      {evalReports[b.id] && (
                        <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 font-mono dir-ltr space-x-2">
                          <span>{`non-empty ${(evalReports[b.id].non_empty_rate * 100).toFixed(0)}%`}</span>
                          {evalReports[b.id].keyword_hit_rate != null && (
                            <span>{`| kw-hit ${(evalReports[b.id].keyword_hit_rate! * 100).toFixed(0)}%`}</span>
                          )}
                          <span className="opacity-75">{`| n=${evalReports[b.id].questions_evaluated}`}</span>
                        </p>
                      )}
                      <BookTocPreview bookId={b.id} isAr={isAr} />
                    </div>
                    <div className="flex gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => runEvalForBook(b.id, b.grade_number)}
                        disabled={evalBusy === b.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-blue-400/60 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-40"
                        title={isAr ? "تشغيل مجموعة تقييم الاسترجاع" : "Run retrieval eval fixture"}
                      >
                        {evalBusy === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
                        {isAr ? "تقييم" : "Eval"}
                      </button>
                      <button
                        onClick={() => remove(b.id)}
                        disabled={busyDelete === b.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-red-300/60 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40"
                        title={isAr ? "حذف" : "Delete"}
                      >
                        {busyDelete === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        {isAr ? "حذف" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Downloaded PDFs not yet ingested */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Download className="w-4 h-4 text-purple-600" />
          {isAr ? "PDFs محملة (يمكن استيعابها)" : "Downloaded PDFs (ingestable)"}
        </h3>
        {downloaded.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-border rounded-xl text-sm text-muted-foreground">
            {isAr
              ? "لا توجد PDFs بعد. حمل من سطر الأوامر: python -m rag.download_books --stage primary --grade 3 --subjects ..."
              : "No PDFs yet. From CLI: python -m rag.download_books --stage primary --grade 3 --subjects ..."}
          </div>
        ) : (
          <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {downloaded.map((f) => {
                const already = ingestedPaths.has(f.path);
                return (
                  <DownloadedRow
                    key={f.path}
                    file={f}
                    isAr={isAr}
                    busy={busyIngest === f.path}
                    already={already}
                    onIngest={(o) => ingest(f, o)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ── TOC Preview ──────────────────────────────────────────────────────────────

function BookTocPreview({ bookId, isAr }: { bookId: string; isAr: boolean }) {
  const [open, setOpen] = useState(false);
  const [toc, setToc] = useState<TocEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (toc !== null) { setOpen(v => !v); return; }
    setOpen(true);
    setLoading(true);
    setErr(null);
    try {
      const res = await ragGetBookToc(bookId);
      setToc(res.toc || []);
    } catch (e: any) {
      setErr(e.message || "Failed");
      setToc([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 border-t border-border/40 pt-2">
      <button
        type="button"
        onClick={load}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <List className="w-3.5 h-3.5" />
        {isAr ? "فهرس الكتاب" : "Table of Contents"}
        {toc !== null && <span className="opacity-60">({toc.length})</span>}
      </button>
      {open && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {isAr ? "جارٍ التحميل…" : "Loading…"}
            </div>
          )}
          {err && <p className="text-xs text-destructive px-2">{err}</p>}
          {!loading && toc !== null && toc.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">{isAr ? "لا يوجد فهرس متاح" : "No TOC available"}</p>
          )}
          {!loading && toc && toc.length > 0 && (
            <ul className="space-y-0.5" dir="rtl">
              {toc.map((entry, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-2 text-xs py-1 px-1 rounded hover:bg-muted/40"
                  style={{ paddingInlineStart: `${(entry.level - 1) * 16 + 4}px` }}
                >
                  <span className={`shrink-0 ${entry.level === 1 ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {entry.level === 1 ? "●" : "◦"}
                  </span>
                  <span className={`flex-1 leading-snug ${entry.level === 1 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {entry.title}
                  </span>
                  {entry.page != null && (
                    <span className="text-muted-foreground font-mono shrink-0 text-[10px]">ص{entry.page}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-surface-elevated rounded-xl border border-border p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

interface DownloadedRowProps {
  file: DownloadedPdf;
  isAr: boolean;
  busy: boolean;
  already: boolean;
  onIngest: (overrides: {
    stage?: string;
    grade?: number;
    subject?: string;
    content_first_pdf_page?: number;
    citation_starts_at_pdf_page?: number | null;
    skip_trailing_pdf_pages?: number;
  }) => void;
}

function DownloadedRow({ file, isAr, busy, already, onIngest }: DownloadedRowProps) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState(inferStageFromPath(file.path));
  const [grade, setGrade] = useState<number | "">(inferGradeFromPath(file.path));
  const [subject, setSubject] = useState(inferSubjectFromName(file.name + " " + file.path));
  const [contentFirstPdfPage, setContentFirstPdfPage] = useState(1);
  const [citationStartsAtPdfPage, setCitationStartsAtPdfPage] = useState("");
  const [skipTrailingPdfPages, setSkipTrailingPdfPages] = useState(0);

  return (
    <div className="p-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground truncate" dir="ltr">{file.path} · {(file.size / (1024 * 1024)).toFixed(1)} MB</p>
        </div>
        {already ? (
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
            {isAr ? "تم" : "Ingested"}
          </span>
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/5"
          >
            {open ? (isAr ? "إخفاء" : "Hide") : (isAr ? "ضبط واستيعاب" : "Configure & Ingest")}
          </button>
        )}
      </div>

      {open && !already && (
        <div className="mt-3 space-y-3">
          <div className="grid md:grid-cols-4 gap-2 items-end">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{isAr ? "المرحلة" : "Stage"}</label>
              <select
                value={stage}
                onChange={(e) => { setStage(e.target.value); setGrade(""); }}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
              >
                <option value="">—</option>
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{isAr ? "الصف" : "Grade"}</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : "")}
                disabled={!stage}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
              >
                <option value="">—</option>
                {(stage ? gradesFor(stage) : []).map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{isAr ? "المادة" : "Subject"}</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
                placeholder={isAr ? "مثال: اللغة العربية" : "e.g. Arabic"}
              />
            </div>
            <button
              onClick={() => {
                const raw = citationStartsAtPdfPage.trim();
                let citation: number | null = null;
                if (raw !== "") {
                  const n = Number(raw);
                  citation = Number.isFinite(n) && n >= 1 ? n : null;
                }
                onIngest({
                  stage,
                  grade: grade || undefined,
                  subject,
                  content_first_pdf_page: contentFirstPdfPage,
                  citation_starts_at_pdf_page: citation,
                  skip_trailing_pdf_pages: Math.max(0, skipTrailingPdfPages),
                });
              }}
              disabled={busy || contentFirstPdfPage < 1 || skipTrailingPdfPages < 0}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {isAr ? "Ingest" : "Ingest"}
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {isAr ? "أول صفحة PDF للمحتوى (تخطي الفهرس)" : "First PDF page of body (skip TOC)"}
              </label>
              <input
                type="number"
                min={1}
                value={contentFirstPdfPage}
                onChange={(e) => setContentFirstPdfPage(Math.max(1, Number(e.target.value) || 1))}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {isAr
                  ? "مثال وزارة التربية: غالباً 6 (الصفحات 1–5 فهرس)."
                  : "e.g. MOE books: often 6 (pages 1–5 are TOC)."}
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {isAr
                  ? "صفحة الكتاب المطبوع تبدأ عند رقم PDF (اختياري)"
                  : "Printed book p.1 = this PDF page (optional)"}
              </label>
              <input
                type="number"
                min={1}
                value={citationStartsAtPdfPage}
                onChange={(e) => setCitationStartsAtPdfPage(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
                placeholder={isAr ? "مثال: 6 — أو اترك فارغاً لرقم PDF" : "e.g. 6, or empty for raw PDF page"}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {isAr
                  ? "إن وضعت 6: صفحة PDF 6 تُخزَّن كصفحة 1 في الاستشهادات."
                  : "If set to 6, PDF page 6 is stored as citation page 1."}
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {isAr ? "تخطي آخر N صفحة PDF (فهرس خلفي)" : "Skip last N PDF pages (back index)"}
              </label>
              <input
                type="number"
                min={0}
                value={skipTrailingPdfPages}
                onChange={(e) => setSkipTrailingPdfPages(Math.max(0, Number(e.target.value) || 0))}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {isAr
                  ? "إن ظهرت صفوف من النقاط فقط في آخر الكتاب، جرّب 10–30."
                  : "If dotted TOC lines cluster at the end, try 10–30."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
