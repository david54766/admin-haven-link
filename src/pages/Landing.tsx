import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Award, ClipboardCheck, Calendar, BarChart3, Shield, Users, Building2, Upload, UserPlus, CheckCircle2, Paintbrush, Monitor } from 'lucide-react';

const features = [
  { icon: BookOpen, title: 'Training Tracks', description: 'Build structured training paths with videos, quizzes, lessons, and hands-on assignments for every role.' },
  { icon: Shield, title: 'Compliance Management', description: 'Track staff documents, licenses, and certifications to stay ahead of regulatory requirements.' },
  { icon: Award, title: 'Certificates & Hours', description: 'Auto-generate certificates on course completion and log professional development hours effortlessly.' },
  { icon: ClipboardCheck, title: 'Daily Checklists', description: 'Create custom daily checklists with automated notifications so nothing gets missed.' },
  { icon: Calendar, title: 'Staff Calendar', description: 'A shared calendar for training deadlines, events, and important dates across your organization.' },
  { icon: BarChart3, title: 'Reports & Analytics', description: 'Real-time dashboards showing staff progress, compliance status, and engagement metrics.' },
];

const steps = [
  { icon: Building2, step: '01', title: 'We Set Up Your Portal', description: 'Get a dedicated training portal for your organization — branded with your logo, colors, and identity.' },
  { icon: Upload, step: '02', title: 'Add Your Training Content', description: 'Upload videos, create quizzes, add documents, build checklists — everything your staff needs to succeed.' },
  { icon: UserPlus, step: '03', title: 'Onboard & Track Staff', description: 'Invite your team, assign training tracks, monitor progress, and ensure compliance — all from one dashboard.' },
];

const valueProps = [
  { icon: Paintbrush, title: 'Your Own Branded Portal', description: 'Each organization gets a fully isolated, branded training environment.' },
  { icon: Monitor, title: 'No IT Required', description: 'We handle setup, hosting, and maintenance. You focus on your staff.' },
  { icon: CheckCircle2, title: 'Compliance Ready', description: 'Built-in document tracking, certificate expiry alerts, and audit-ready reports.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
            <span className="text-sm sm:text-lg font-bold text-foreground truncate">Childcare Staff Training</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/login">Log In</Link>
            </Button>
            <Button size="sm" asChild>
              <a href="mailto:support@childcarestafftraining.com" className="text-xs sm:text-sm">Demo</a>
            </Button>
            <Button variant="ghost" size="sm" asChild className="sm:hidden">
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-14 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="container text-center relative px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-medium">A Dedicated Portal for Every Organization</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            The Training Platform Built for
            <span className="block mt-2 text-primary">Childcare Organizations</span>
          </h1>

          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground">
            Give your center its own branded training portal — onboard staff faster,
            track compliance automatically, and issue certificates in minutes. No IT required.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button size="lg" className="text-lg px-8" asChild>
              <a href="mailto:support@childcarestafftraining.com">Request a Demo</a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild>
              <Link to="/login">Existing Customer? Log In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 sm:py-20 bg-muted/30">
        <div className="container px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Get your organization's training portal up and running in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <s.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-sm font-bold text-primary mb-2">STEP {s.step}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 sm:py-20">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Everything Your Center Needs</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              A complete training management system — from onboarding new hires to tracking ongoing professional development.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border bg-card hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-12 sm:py-16 bg-muted/30">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {valueProps.map((vp) => (
              <div key={vp.title} className="flex items-start gap-4">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <vp.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{vp.title}</h3>
                  <p className="text-sm text-muted-foreground">{vp.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-24">
        <div className="container px-4">
          <div className="relative bg-card rounded-2xl sm:rounded-3xl p-8 sm:p-12 shadow-xl border overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />

            <div className="relative text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                Get Your Center's Training Portal
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Join childcare organizations already using our platform to simplify staff training and compliance.
                We'll have your portal ready in no time.
              </p>
              <Button size="lg" className="mt-8 text-lg px-10" asChild>
                <a href="mailto:support@childcarestafftraining.com">Request a Demo</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Childcare Staff Training</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} childcarestafftraining.com. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
