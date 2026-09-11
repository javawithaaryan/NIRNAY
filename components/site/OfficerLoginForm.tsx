"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { roleDescriptions, roleLabels, signIn, useSession, type PortalRole } from "@/lib/auth/session";
import { primaryButtonClass } from "@/lib/ui/buttonStyles";

const roleOptions: PortalRole[] = ["OPERATOR", "AUTHORITY"];

export function OfficerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const [name, setName] = useState("");
  const [role, setRole] = useState<PortalRole>("OPERATOR");
  const [error, setError] = useState<string | null>(null);
  const next = searchParams.get("next");
  const destination = next && next.startsWith("/") ? next : "/dashboard";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Enter a display name of at least 2 characters.");
      return;
    }
    signIn(name, role);
    router.push(destination);
  };

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 md:py-16">
      <section aria-labelledby="login-title" className="w-full max-w-md overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest">
        <div className="flex items-center gap-3 bg-primary-container px-6 py-4 text-on-primary">
          <ShieldCheck aria-hidden="true" className="size-6 text-secondary-container" />
          <div>
            <h1 id="login-title" className="text-base font-bold">
              Officer / Control Portal
            </h1>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-primary-fixed">Prototype sign-in</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <p className="rounded-xs border border-warning-outline bg-warning-container p-3 text-xs leading-relaxed text-warning">
            Round-1 prototype authentication. This screen is not connected to any government identity system; the role you pick
            only controls what the portal lets you do in this browser.
          </p>
          {session && (
            <p className="text-xs text-on-surface-variant">
              Signed in as <span className="font-semibold text-primary-container">{session.name}</span> ({roleLabels[session.role]}).
              Signing in again replaces this session.
            </p>
          )}
          <div>
            <label htmlFor="officer-name" className="text-sm font-semibold text-on-surface">
              Display name
            </label>
            <input
              id="officer-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="e.g. Duty officer, Kohima control room"
              className="mt-1.5 w-full rounded-xs border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface placeholder:text-outline focus:border-secondary"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-on-surface">Prototype role</legend>
            <div className="mt-2 space-y-2">
              {roleOptions.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-3 rounded-xs border p-3 transition-colors ${
                    role === option ? "border-primary-container bg-primary-container/5" : "border-outline-variant/60 hover:bg-surface-container-low"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option}
                    checked={role === option}
                    onChange={() => setRole(option)}
                    className="mt-1 accent-primary-container"
                  />
                  <span>
                    <span className="block text-sm font-bold text-primary-container">{roleLabels[option]}</span>
                    <span className="block text-xs text-on-surface-variant">{roleDescriptions[option]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-xs font-medium text-on-error-container">
              {error}
            </p>
          )}
          <button type="submit" className={`${primaryButtonClass} w-full`}>
            Enter portal
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
