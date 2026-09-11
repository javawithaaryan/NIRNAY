import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";

type NoticeTone = "info" | "warning" | "error" | "success";

const toneStyles: Record<NoticeTone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: "border-outline-variant/50 bg-surface-container-low text-on-surface-variant", icon: "text-secondary", Icon: Info },
  warning: { box: "border-warning-outline bg-warning-container text-warning", icon: "text-warning", Icon: TriangleAlert },
  error: { box: "border-error/40 bg-error-container text-on-error-container", icon: "text-error", Icon: CircleAlert },
  success: { box: "border-success-outline bg-success-container text-success", icon: "text-success", Icon: CircleCheck },
};

type FieldNoticeProps = {
  tone: NoticeTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
};

export function FieldNotice({ tone, title, children, action }: FieldNoticeProps) {
  const style = toneStyles[tone];
  const Icon = style.Icon;

  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex items-start gap-3 rounded-xs border p-3.5 text-sm ${style.box}`}
    >
      <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${style.icon}`} />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}
