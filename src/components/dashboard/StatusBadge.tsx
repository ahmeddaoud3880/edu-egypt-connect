interface StatusBadgeProps {
  status: "critical" | "warning" | "normal" | "overdue" | "pending" | "resolved";
  label: string;
}

const styles: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-amber-50 text-amber-700",
  normal: "bg-green-50 text-green-700",
  overdue: "bg-destructive/10 text-destructive",
  pending: "bg-amber-50 text-amber-700",
  resolved: "bg-green-50 text-green-700",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${styles[status] || styles.normal}`}>
      {label}
    </span>
  );
}
