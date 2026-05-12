import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { Calendar, Filter } from "lucide-react";

interface DashboardFiltersProps {
  showGrade?: boolean;
  showClass?: boolean;
  showSubject?: boolean;
  showRiskType?: boolean;
  showDateRange?: boolean;
}

export function DashboardFilters({
  showGrade = false,
  showClass = false,
  showSubject = false,
  showRiskType = false,
  showDateRange = false,
}: DashboardFiltersProps) {
  const { t, lang } = useTranslation();
  const [term, setTerm] = useState("all");
  const [stage, setStage] = useState("all");
  const [grade, setGrade] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [subject, setSubject] = useState("all");
  const [riskType, setRiskType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const selectCls = "text-xs border border-border rounded px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20";

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-surface-elevated rounded-lg border border-border">
      <Filter className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs font-semibold text-foreground">{t("dash.filters")}:</span>

      {/* Academic Year */}
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <select className={selectCls}>
          <option>2025-2026</option>
          <option>2024-2025</option>
          <option>2023-2024</option>
        </select>
      </div>

      {/* Academic Term */}
      <select value={term} onChange={(e) => setTerm(e.target.value)} className={selectCls}>
        <option value="all">{t("dash.academicTerm")}: {t("dash.all")}</option>
        <option value="1">{t("dash.term1")}</option>
        <option value="2">{t("dash.term2")}</option>
      </select>

      {/* Stage */}
      <select value={stage} onChange={(e) => setStage(e.target.value)} className={selectCls}>
        <option value="all">{t("dash.stage")}: {t("dash.all")}</option>
        <option value="primary">{t("dash.primary")}</option>
        <option value="preparatory">{t("dash.preparatory")}</option>
        <option value="secondary">{t("dash.secondary")}</option>
      </select>

      {/* Grade */}
      {showGrade && (
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className={selectCls}>
          <option value="all">{t("common.grade")}: {t("dash.all")}</option>
          {[1, 2, 3, 4, 5, 6].map((g) => (
            <option key={g} value={`${g}`}>{lang === "ar" ? `الصف ${g}` : `Grade ${g}`}</option>
          ))}
        </select>
      )}

      {/* Class */}
      {showClass && (
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={selectCls}>
          <option value="all">{t("common.class")}: {t("dash.all")}</option>
          {["A", "B", "C"].map((c) => (
            <option key={c} value={c}>{lang === "ar" ? `فصل ${c}` : `Class ${c}`}</option>
          ))}
        </select>
      )}

      {/* Subject */}
      {showSubject && (
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className={selectCls}>
          <option value="all">{t("common.subject")}: {t("dash.all")}</option>
          {[
            { en: "Arabic", ar: "عربى" },
            { en: "Mathematics", ar: "رياضيات" },
            { en: "Science", ar: "علوم" },
            { en: "English", ar: "إنجليزى" },
            { en: "Social Studies", ar: "دراسات اجتماعية" },
          ].map((s) => (
            <option key={s.en} value={s.en}>{lang === "ar" ? s.ar : s.en}</option>
          ))}
        </select>
      )}

      {/* Risk Type */}
      {showRiskType && (
        <select value={riskType} onChange={(e) => setRiskType(e.target.value)} className={selectCls}>
          <option value="all">{lang === "ar" ? "نوع الخطر: الكل" : "Risk Type: All"}</option>
          <option value="academic">{lang === "ar" ? "أكاديمى" : "Academic"}</option>
          <option value="attendance">{lang === "ar" ? "حضور" : "Attendance"}</option>
          <option value="behavioral">{lang === "ar" ? "سلوكى" : "Behavioral"}</option>
          <option value="multiple">{lang === "ar" ? "متعدد" : "Multiple"}</option>
        </select>
      )}

      {/* Date Range */}
      {showDateRange && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={selectCls + " w-[120px]"} />
          <span className="text-xs text-muted-foreground">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={selectCls + " w-[120px]"} />
        </div>
      )}
    </div>
  );
}
