import { MapPin } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const governorates = [
  { name: "Cairo", ar: "القاهرة", schools: 5420, students: "3.2M", administrations: 38 },
  { name: "Giza", ar: "الجيزة", schools: 3850, students: "2.4M", administrations: 19 },
  { name: "Alexandria", ar: "الإسكندرية", schools: 2980, students: "1.8M", administrations: 14 },
  { name: "Dakahlia", ar: "الدقهلية", schools: 2750, students: "1.6M", administrations: 18 },
  { name: "Sharqia", ar: "الشرقية", schools: 2680, students: "1.7M", administrations: 17 },
  { name: "Qalyubia", ar: "القليوبية", schools: 2100, students: "1.3M", administrations: 12 },
  { name: "Beheira", ar: "البحيرة", schools: 2350, students: "1.4M", administrations: 15 },
  { name: "Gharbia", ar: "الغربية", schools: 1950, students: "1.2M", administrations: 12 },
  { name: "Menoufia", ar: "المنوفية", schools: 1800, students: "1.1M", administrations: 10 },
  { name: "Minya", ar: "المنيا", schools: 2200, students: "1.5M", administrations: 12 },
  { name: "Assiut", ar: "أسيوط", schools: 1950, students: "1.3M", administrations: 11 },
  { name: "Sohag", ar: "سوهاج", schools: 1850, students: "1.2M", administrations: 11 },
  { name: "Fayoum", ar: "الفيوم", schools: 1450, students: "0.9M", administrations: 7 },
  { name: "Beni Suef", ar: "بنى سويف", schools: 1350, students: "0.8M", administrations: 7 },
  { name: "Kafr El Sheikh", ar: "كفر الشيخ", schools: 1500, students: "0.9M", administrations: 10 },
  { name: "Qena", ar: "قنا", schools: 1400, students: "0.9M", administrations: 9 },
  { name: "Luxor", ar: "الأقصر", schools: 620, students: "0.3M", administrations: 5 },
  { name: "Aswan", ar: "أسوان", schools: 780, students: "0.4M", administrations: 6 },
  { name: "Damietta", ar: "دمياط", schools: 850, students: "0.4M", administrations: 5 },
  { name: "Ismailia", ar: "الإسماعيلية", schools: 720, students: "0.3M", administrations: 5 },
  { name: "Suez", ar: "السويس", schools: 520, students: "0.2M", administrations: 4 },
  { name: "Port Said", ar: "بورسعيد", schools: 480, students: "0.2M", administrations: 4 },
  { name: "North Sinai", ar: "شمال سيناء", schools: 380, students: "0.1M", administrations: 6 },
  { name: "South Sinai", ar: "جنوب سيناء", schools: 180, students: "0.05M", administrations: 4 },
  { name: "Red Sea", ar: "البحر الأحمر", schools: 250, students: "0.1M", administrations: 5 },
  { name: "New Valley", ar: "الوادى الجديد", schools: 220, students: "0.07M", administrations: 4 },
  { name: "Matrouh", ar: "مطروح", schools: 450, students: "0.2M", administrations: 7 },
];

export default function EducationalMap() {
  const { t, isAr } = useTranslation();

  return (
    <div>
      <section className="bg-primary text-primary-foreground">
        <div className="container-gov py-16 lg:py-20">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-gold"></div>
            <span className="text-gold text-xs font-semibold tracking-wide uppercase">{t("edumap.badge")}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">{t("edumap.title")}</h1>
          <p className="text-primary-foreground/70 max-w-2xl">{t("edumap.desc")}</p>
        </div>
      </section>

      <section className="bg-background">
        <div className="container-gov section-padding">
          <div className="bg-surface rounded-lg border border-border p-12 mb-12 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">{t("edumap.gisTitle")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{t("edumap.gisDesc")}</p>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-6">{t("edumap.govOverview")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-start px-4 py-3 font-semibold">{t("edumap.governorate")}</th>
                  <th className="text-start px-4 py-3 font-semibold">{t("edumap.arabic")}</th>
                  <th className="text-end px-4 py-3 font-semibold">{t("edumap.administrations")}</th>
                  <th className="text-end px-4 py-3 font-semibold">{t("edumap.schools")}</th>
                  <th className="text-end px-4 py-3 font-semibold">{t("edumap.students")}</th>
                </tr>
              </thead>
              <tbody>
                {governorates.map((gov, i) => (
                  <tr key={gov.name} className={`border-b border-border ${i % 2 === 0 ? "bg-background" : "bg-surface"}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{isAr ? gov.ar : gov.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{isAr ? gov.name : gov.ar}</td>
                    <td className="px-4 py-3 text-end text-foreground">{gov.administrations}</td>
                    <td className="px-4 py-3 text-end text-foreground">{gov.schools.toLocaleString()}</td>
                    <td className="px-4 py-3 text-end text-foreground">{gov.students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
