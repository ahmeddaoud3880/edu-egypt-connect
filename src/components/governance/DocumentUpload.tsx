import { useState, useRef } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Upload, FileText, X, AlertTriangle } from "lucide-react";
import { uploadGovernanceDoc } from "@/hooks/useGovernanceData";
import { toast } from "sonner";

interface DocumentUploadProps {
  requestId?: string;
  requestType: string;
  onUploadComplete: (path: string) => void;
  existingUrl?: string | null;
}

export function DocumentUpload({ requestId, requestType, onUploadComplete, existingUrl }: DocumentUploadProps) {
  const { isAr } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(isAr ? "الحد الأقصى لحجم الملف 10 ميجابايت" : "Maximum file size is 10MB");
      return;
    }

    setUploading(true);
    try {
      const path = await uploadGovernanceDoc(file, requestId || "temp", requestType);
      setFileName(file.name);
      onUploadComplete(path);
      toast.success(isAr ? "تم رفع المستند بنجاح" : "Document uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
    setUploading(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {isAr ? "المستندات الداعمة" : "Supporting Documents"}
      </label>
      <p className="text-xs text-muted-foreground mb-2">
        {isAr
          ? "صورة بطاقة الرقم القومى / شهادة الميلاد / إثبات العلاقة / خطاب التعيين"
          : "National ID copy / Birth certificate / Proof of relation / Appointment letter"}
      </p>

      {fileName || existingUrl ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <FileText className="w-4 h-4 text-green-700" />
          <span className="text-sm text-green-800 flex-1">{fileName || (isAr ? "مستند مرفق" : "Document attached")}</span>
          <button onClick={() => { setFileName(null); fileRef.current && (fileRef.current.value = ""); }}
            className="p-1 rounded text-green-700 hover:bg-green-100"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            {uploading
              ? (isAr ? "جارى الرفع..." : "Uploading...")
              : (isAr ? "اضغط لرفع مستند (PDF, JPG, PNG — حتى 10 ميجابايت)" : "Click to upload document (PDF, JPG, PNG — up to 10MB)")}
          </p>
        </div>
      )}

      {!fileName && !existingUrl && (
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {isAr ? "يُنصح بإرفاق المستندات الداعمة لتسريع المراجعة" : "Attaching supporting documents is recommended to expedite review"}
        </p>
      )}

      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
    </div>
  );
}
