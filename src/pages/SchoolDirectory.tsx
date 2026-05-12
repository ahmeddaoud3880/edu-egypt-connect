import { Search, School, MapPin, Users, Filter } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

const schoolsData = [
  { name: "Al-Azhar Secondary School", ar: "مدرسة الأزهر الثانوية", type: "Secondary", typeAr: "ثانوى", governorate: "Cairo", govAr: "القاهرة", administration: "Nasr City", adminAr: "مدينة نصر", students: 1250, teachers: 85, rating: "A" },
  { name: "El-Orman Experimental School", ar: "مدرسة الأورمان التجريبية", type: "Experimental", typeAr: "تجريبى", governorate: "Giza", govAr: "الجيزة", administration: "Dokki", adminAr: "الدقى", students: 980, teachers: 72, rating: "A" },
  { name: "Alexandria International School", ar: "مدرسة الإسكندرية الدولية", type: "International", typeAr: "دولى", governorate: "Alexandria", govAr: "الإسكندرية", administration: "Montaza", adminAr: "المنتزه", students: 650, teachers: 55, rating: "A+" },
  { name: "Future Language School", ar: "مدرسة المستقبل للغات", type: "Language", typeAr: "لغات", governorate: "Cairo", govAr: "القاهرة", administration: "Heliopolis", adminAr: "مصر الجديدة", students: 1100, teachers: 78, rating: "B+" },
  { name: "Nile Valley Prep School", ar: "مدرسة وادى النيل الإعدادية", type: "Preparatory", typeAr: "إعدادى", governorate: "Dakahlia", govAr: "الدقهلية", administration: "Mansoura", adminAr: "المنصورة", students: 890, teachers: 62, rating: "B" },
  { name: "Suez Canal Technical School", ar: "مدرسة قناة السويس الفنية", type: "Technical", typeAr: "فنى", governorate: "Ismailia", govAr: "الإسماعيلية", administration: "Central", adminAr: "وسط", students: 720, teachers: 48, rating: "B+" },
  { name: "Upper Egypt Model School", ar: "مدرسة صعيد مصر النموذجية", type: "Primary", typeAr: "ابتدائى", governorate: "Assiut", govAr: "أسيوط", administration: "Assiut City", adminAr: "مدينة أسيوط", students: 1450, teachers: 90, rating: "B" },
  { name: "Delta Academy", ar: "أكاديمية الدلتا", type: "Secondary", typeAr: "ثانوى", governorate: "Gharbia", govAr: "الغربية", administration: "Tanta", adminAr: "طنطا", students: 1050, teachers: 70, rating: "A-" },
  { name: "Sinai Frontier School", ar: "مدرسة حدود سيناء", type: "Primary", typeAr: "ابتدائى", governorate: "North Sinai", govAr: "شمال سيناء", administration: "El-Arish", adminAr: "العريش", students: 420, teachers: 30, rating: "C+" },
  { name: "Red Sea International School", ar: "مدرسة البحر الأحمر الدولية", type: "International", typeAr: "دولى", governorate: "Red Sea", govAr: "البحر الأحمر", administration: "Hurghada", adminAr: "الغردقة", students: 380, teachers: 35, rating: "A" },
];

export default function SchoolDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t, isAr } = useTranslation();

  const filtered = schoolsData.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.governorate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.ar.includes(searchQuery) ||
    s.govAr.includes(searchQuery)
  );

  return (
    <div>
      <section className="bg-primary text-primary-foreground">
        <div className="container-gov py-16 lg:py-20">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-gold"></div>
            <span className="text-gold text-xs font-semibold tracking-wide uppercase">{t("dir.badge")}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">{t("dir.title")}</h1>
          <p className="text-primary-foreground/70 max-w-2xl">{t("dir.desc")}</p>
        </div>
      </section>

      <section className="bg-background">
        <div className="container-gov section-padding">
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("dir.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ps-10 pe-4 py-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button className="inline-flex items-center gap-2 px-5 py-3 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
              <Filter className="w-4 h-4" />
              {t("dir.filters")}
            </button>
          </div>

          <div className="text-xs text-muted-foreground mb-4">{filtered.length} {t("dir.found")}</div>
          <div className="grid gap-4">
            {filtered.map((school) => (
              <div key={school.name} className="p-5 border border-border rounded-lg bg-surface-elevated hover:border-primary/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded bg-primary flex items-center justify-center shrink-0">
                      <School className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{isAr ? school.ar : school.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{isAr ? school.govAr : school.governorate}, {isAr ? school.adminAr : school.administration}</span>
                        <span>{t("dir.type")}: {isAr ? school.typeAr : school.type}</span>
                        <span><Users className="w-3 h-3 inline" /> {school.students} {t("dir.students")}</span>
                        <span>{school.teachers} {t("dir.teachers")}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`shrink-0 px-3 py-1 rounded text-xs font-semibold ${
                    school.rating.startsWith("A") ? "bg-green-50 text-green-700" : school.rating.startsWith("B") ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {t("dir.rating")}: {school.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
