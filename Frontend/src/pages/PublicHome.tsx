import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BarChart3, QrCode as QrCodeIcon, Shield, Smartphone } from "lucide-react";
import gov from "@/assets/gov.png";
import homeBg from "@/assets/home-bg.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/QrCode";
import { cn } from "@/lib/utils";

function publicUrl(path: string) {
  const base = window.location.origin;
  return `${base}${path}`;
}

const features = [
  {
    icon: Smartphone,
    title: "Self-service intake",
    description:
      "Visitors complete a short form on their own device—no paperwork at the desk.",
  },
  {
    icon: QrCodeIcon,
    title: "Instant access",
    description: "Scan the QR code on display to open the official form in one step.",
  },
  {
    icon: Shield,
    title: "Controlled access",
    description: "Reception staff review submissions before visitors proceed on site.",
  },
  {
    icon: BarChart3,
    title: "Clear records",
    description: "Authorized staff can search, filter, and export activity for reporting.",
  },
] as const;

const steps = [
  {
    step: 1,
    title: "Open the form",
    body: "Use the link or scan the QR code shown in the reception area.",
  },
  {
    step: 2,
    title: "Enter your details",
    body: "Provide the information requested—visitor check-in or a service request, as applicable.",
  },
  {
    step: 3,
    title: "Wait for confirmation",
    body: "Reception reviews your submission. You will see confirmation or next steps on screen.",
  },
  {
    step: 4,
    title: "Check status if needed",
    body: "Use the link from your confirmation to see updates without calling the desk.",
  },
] as const;

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-slate-600 mb-2">{children}</p>;
}

export default function PublicHome() {
  const visitorUrl = publicUrl("/visitor");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-foreground font-sans relative">

      <header className="relative shrink-0 border-b border-white/20 bg-gradient-to-b from-[hsl(207_78%_56%)] via-primary to-[hsl(207_88%_42%)] text-primary-foreground shadow-[0_8px_24px_hsl(207_90%_48%_/_0.2)]">
        <div
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"
          aria-hidden
        />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="relative shrink-0 rounded-xl bg-white/[0.08] p-1.5 ring-1 ring-white/10 shadow-inner">
              <img
                src={gov}
                alt="Government of Rwanda emblem"
                width={72}
                height={72}
                className="rounded-lg h-12 w-12 sm:h-14 sm:w-14 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-medium text-primary-foreground/85">
                Official digital service
              </p>
              <h1 className="text-lg sm:text-xl font-semibold text-primary-foreground mt-0.5">ReceptionMS</h1>
              <p className="text-xs sm:text-sm text-primary-foreground/80">Reception Management System</p>
            </div>
          </div>
          <div className="flex sm:flex-col sm:items-end gap-2 sm:gap-1">
            <Link
              to="/login"
              className={cn(
                "inline-flex items-center justify-center rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2.5 text-sm font-medium text-primary-foreground",
                "shadow-sm backdrop-blur-sm transition-all duration-200",
                "hover:bg-primary-foreground/18 hover:border-primary-foreground/40 active:scale-[0.99]",
                "outline-none focus-visible:ring-2 focus-visible:ring-amber-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              )}
            >
              Staff sign in
            </Link>
            <span className="hidden sm:block text-[10px] text-primary-foreground/65 text-right">Authorized personnel only</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-white/20 text-primary-foreground min-h-[calc(100vh-76px)] sm:min-h-[calc(100vh-84px)] flex items-stretch"
        aria-labelledby="public-home-hero-title"
        style={{
          backgroundImage: `url(${homeBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-primary/65" aria-hidden />
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse [animation-delay:450ms]"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.14]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 100% 80% at 50% -30%, hsl(207 90% 98% / 0.22), transparent 55%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-16 lg:py-20 flex-1 flex items-center">
          <div className="max-w-4xl">
            <p className="text-xs sm:text-sm font-medium text-primary-foreground/85 mb-2.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              Secure · Structured · Transparent
            </p>
            <h2
              id="public-home-hero-title"
              className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-[1.15] text-primary-foreground animate-in fade-in slide-in-from-bottom-4 duration-700"
            >
              Digital reception for visitors and public service requests
            </h2>
            <p className="mt-4 text-sm sm:text-base text-primary-foreground/90 leading-relaxed max-w-3xl animate-in fade-in slide-in-from-bottom-6 duration-900">
              Submit your details through the official channel. Your request is recorded, reviewed by reception staff,
              and handled in line with standard front-desk procedures—reducing wait times and keeping records clear.
            </p>
          </div>
        </div>
      </section>

      <main className="relative flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-14 sm:space-y-16">
        {/* Form — featured panel */}
        <section className="space-y-4" aria-labelledby="form-section-title">
          <div>
            <SectionLabel>Start here</SectionLabel>
            <h3 id="form-section-title" className="text-xl sm:text-2xl font-semibold text-[hsl(218_32%_16%)]">
              Visitor and service form
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Use your mobile device. Scan the QR code displayed at reception or open the secure link below.
            </p>
          </div>

          <Card className="overflow-hidden border-slate-200/90 bg-white/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] backdrop-blur-sm ring-1 ring-slate-900/[0.04] max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="h-1.5 w-full bg-gradient-to-r from-[hsl(207_76%_58%)] via-primary to-amber-500/90" aria-hidden />
            <CardHeader className="pb-2 pt-6 sm:pt-7 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-transparent">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg text-[hsl(218_32%_16%)]">Public submission portal</CardTitle>
                  <CardDescription className="text-sm mt-1.5 leading-relaxed max-w-xl">
                    Official form for visitor registration and service requests. Information is transmitted securely for
                    reception processing.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-7 flex flex-col sm:flex-row sm:items-stretch gap-8 sm:gap-10">
              <div className="flex-1 space-y-4 min-w-0">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Direct link
                  </p>
                  <p className="text-xs font-mono text-foreground/90 break-all bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2.5">
                    {visitorUrl}
                  </p>
                </div>
                <Button asChild size="lg" className="w-full sm:w-auto font-semibold shadow-md shadow-primary/20">
                  <Link to="/visitor">Open official form</Link>
                </Button>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 sm:border-l sm:border-slate-200/90 sm:pl-10 shrink-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Scan to open</p>
                <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 shadow-sm transition-transform duration-200 hover:scale-[1.02]">
                  <QrCode value={visitorUrl} size={128} />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Features */}
        <section className="space-y-5" aria-labelledby="features-title">
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-5 py-6 sm:px-8 sm:py-8 shadow-sm backdrop-blur-sm">
            <SectionLabel>Capabilities</SectionLabel>
            <h3 id="features-title" className="text-xl sm:text-2xl font-semibold text-[hsl(218_32%_16%)]">
              Built for professional reception operations
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              The same standards you expect from public-sector digital services: clarity, accountability, and a
              straightforward experience for every visitor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {features.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="border-slate-200/90 bg-white/85 backdrop-blur-sm shadow-[0_8px_30px_-8px_rgba(15,23,42,0.08)] transition-all duration-200 hover:shadow-[0_12px_40px_-10px_rgba(15,23,42,0.12)] hover:-translate-y-0.5"
              >
                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/8 p-3 text-primary ring-1 ring-primary/15 shrink-0">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base text-[hsl(218_32%_18%)]">{title}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-relaxed">{description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Process */}
        <section className="space-y-5" aria-labelledby="process-title">
          <div>
            <SectionLabel>Procedure</SectionLabel>
            <h3 id="process-title" className="text-xl sm:text-2xl font-semibold text-[hsl(218_32%_16%)]">
              How it works
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              A short, transparent process from submission to confirmation.
            </p>
          </div>
          <ol className="relative space-y-0 border-l-2 border-slate-200 ml-3 sm:ml-4 pl-6 sm:pl-8">
            {steps.map(({ step, title, body }) => (
              <li key={step} className="relative pb-8 last:pb-0">
                <span
                  className="absolute -left-[calc(0.5rem+2px)] sm:-left-[calc(0.75rem+2px)] top-0 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-b from-[hsl(207_78%_52%)] to-primary text-xs font-bold text-primary-foreground shadow-md ring-4 ring-[hsl(210_25%_97%)]"
                  aria-hidden
                >
                  {step}
                </span>
                <Card className="border-slate-200/90 bg-white/90 shadow-sm">
                  <CardContent className="pt-5 pb-5 px-5 sm:px-6">
                    <p className="font-semibold text-[hsl(218_32%_18%)]">{title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">{body}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="relative mt-auto border-t border-primary/25 bg-gradient-to-b from-[hsl(207_86%_44%)] to-[hsl(207_90%_36%)] text-primary-foreground/80">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" aria-hidden />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-3 max-w-md">
              <img src={gov} alt="" width={40} height={40} className="rounded-md opacity-90 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary-foreground">Reception Management System</p>
                <p className="text-xs text-primary-foreground/70 mt-2 leading-relaxed">
                  This portal is intended for public reception use. For staff functions, sign in through the authorized
                  access point only.
                </p>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-primary-foreground/55 sm:text-right max-w-xs leading-relaxed">
              Official information channel · Do not share credentials or personal access links
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
