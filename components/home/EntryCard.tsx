import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

type EntryCardProps = {
  id: string;
  icon: LucideIcon;
  noteIcon: LucideIcon;
  href: string;
  title: string;
  subtitle: string;
  description: string;
  noteTitle: string;
  noteBody: string;
  ctaLabel: string;
};

export function EntryCard({
  id,
  icon: Icon,
  noteIcon: NoteIcon,
  href,
  title,
  subtitle,
  description,
  noteTitle,
  noteBody,
  ctaLabel,
}: EntryCardProps) {
  const titleId = `${id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col justify-between rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-7 transition-[border-color,box-shadow] hover:border-secondary hover:shadow-md sm:p-8"
    >
      <div>
        <div className="mb-5 flex size-12 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface-container-low text-primary-container">
          <Icon aria-hidden="true" className="size-7" />
        </div>
        <h3 id={titleId} className="text-xl font-bold uppercase tracking-tight text-primary-container sm:text-2xl">
          {title}
        </h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-secondary">{subtitle}</p>
        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">{description}</p>
        <div className="mt-6 flex items-start gap-3 rounded-xs border border-outline-variant/40 bg-surface-container-low p-3.5">
          <NoteIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-secondary" />
          <p className="text-xs leading-relaxed text-on-surface-variant">
            <span className="font-semibold text-primary-container">{noteTitle}</span> {noteBody}
          </p>
        </div>
      </div>
      <Link
        href={href}
        className="group mt-8 flex w-full items-center justify-center gap-2 rounded-xs bg-primary-container px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-on-primary shadow-xs transition-colors hover:bg-primary-container-hover active:bg-primary-container-active"
      >
        <span className="text-center">{ctaLabel}</span>
        <ArrowRight
          aria-hidden="true"
          className="size-[1.125rem] transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
        />
      </Link>
    </article>
  );
}
