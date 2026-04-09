import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Award, ClipboardCheck, Calendar, BarChart3, Shield, Users, Building2, Upload, UserPlus, CheckCircle2, Paintbrush, Monitor } from 'lucide-react';
import pandaLogo from '@/assets/classroom-panda-logo.png';

const features = [
  { icon: BookOpen, title: 'Training Tracks', description: 'Build structured training paths with videos, quizzes, lessons, and hands-on assignments for every role.', color: 'bg-[hsl(190,70%,92%)] text-[hsl(190,60%,40%)]' },
  { icon: Shield, title: 'Compliance Management', description: 'Track staff documents, licenses, and certifications to stay ahead of regulatory requirements.', color: 'bg-[hsl(280,60%,92%)] text-[hsl(280,50%,50%)]' },
  { icon: Award, title: 'Certificates & Hours', description: 'Auto-generate certificates on course completion and log professional development hours effortlessly.', color: 'bg-[hsl(330,60%,92%)] text-[hsl(330,60%,55%)]' },
  { icon: ClipboardCheck, title: 'Daily Checklists', description: 'Create custom daily checklists with automated notifications so nothing gets missed.', color: 'bg-[hsl(190,70%,92%)] text-[hsl(190,60%,40%)]' },
  { icon: Calendar, title: 'Staff Calendar', description: 'A shared calendar for training deadlines, events, and important dates across your organization.', color: 'bg-[hsl(280,60%,92%)] text-[hsl(280,50%,50%)]' },
  { icon: BarChart3, title: 'Reports & Analytics', description: 'Real-time dashboards showing staff progress, compliance status, and engagement metrics.', color: 'bg-[hsl(330,60%,92%)] text-[hsl(330,60%,55%)]' },
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[hsl(280,30%,90%)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <img src={pandaLogo} alt="Classroom Panda" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
            <span className="text-sm sm:text-lg font-bold bg-gradient-to-r from-[hsl(330,70%,65%)] to-[hsl(280,55%,60%)] bg-clip-text text-transparent truncate">
              Classroom Panda
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-[hsl(280,40%,40%)] hover:bg-[hsl(280,60%,95%)]">
              <Link to="/login">Log In</Link>
            </Button>
            <Button size="sm" asChild className="bg-gradient-to-r from-[hsl(330,70%,65%)] to-[hsl(280,55%,60%)] hover:from-[hsl(330,70%,58%)] hover:to-[hsl(280,55%,53%)] text-white border-0">
              <a href="mailto:support@childcarestafftraining.com" className="text-xs sm:text-sm">Demo</a>
            </Button>
            <Button variant="ghost" size="sm" asChild className="sm:hidden text-[hsl(280,40%,40%)]">
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-14 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-[hsl(330,70%,85%)] rounded-full blur-3xl opacity-40" />
          <div className="absolute top-40 right-10 w-48 h-48 bg-[hsl(280,55%,85%)] rounded-full blur-3xl opacity-40" />
          <div className="absolute bottom-10 left-1/3 w-44 h-44 bg-[hsl(190,70%,85%)] rounded-full blur-3xl opacity-40" />
        </div>

        <div className="container text-center relative px-4">
          <img src={pandaLogo} alt="Classroom Panda" className="mx-auto h-20 w-20 sm:h-28 sm:w-28 mb-6" />

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(280,60%,95%)] text-[hsl(280,50%,45%)] mb-6">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-medium">A Dedicated Portal for Every Organization</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl text-[hsl(280,30%,20%)]">
            The Training Platform Built for
            <span className="block mt-2 bg-gradient-to-r from-[hsl(330,70%,65%)] via-[hsl(280,55%,60%)] to-[hsl(190,60%,50%)] bg-clip-text text-transparent">
              Childcare Organizations
            </span>
          </h1>

          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-[hsl(280,15%,45%)]">
            Give your center its own branded training portal — onboard staff faster,
            track compliance automatically, and issue certificates in minutes. No IT required.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button size="lg" className="text-lg px-8 bg-gradient-to-r from-[hsl(330,70%,65%)] to-[hsl(280,55%,60%)] hover:from-[hsl(330,70%,58%)] hover:to-[hsl(280,55%,53%)] text-white border-0" asChild>
              <a href="mailto:support@childcarestafftraining.com">Request a Demo</a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-[hsl(280,40%,75%)] text-[hsl(280,40%,40%)] hover:bg-[hsl(280,60%,96%)]" asChild>
              <Link to="/login">Existing Customer? Log In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 sm:py-20 bg-gradient-to-b from-[hsl(280,60%,97%)] to-[hsl(190,50%,97%)]">
        <div className="container px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[hsl(280,30%,20%)]">How It Works</h2>
            <p className="mt-3 text-[hsl(280,15%,45%)] max-w-xl mx-auto">
              Get your organization's training portal up and running in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => {
              const colors = [
                { bg: 'bg-[hsl(330,70%,92%)]', text: 'text-[hsl(330,60%,55%)]', icon: 'text-[hsl(330,60%,55%)]' },
                { bg: 'bg-[hsl(280,55%,92%)]', text: 'text-[hsl(280,50%,50%)]', icon: 'text-[hsl(280,50%,50%)]' },
                { bg: 'bg-[hsl(190,65%,90%)]', text: 'text-[hsl(190,60%,40%)]', icon: 'text-[hsl(190,60%,40%)]' },
              ][i];
              return (
                <div key={s.step} className="text-center">
                  <div className={`mx-auto h-16 w-16 rounded-2xl ${colors.bg} flex items-center justify-center mb-5`}>
                    <s.icon className={`h-8 w-8 ${colors.icon}`} />
                  </div>
                  <div className={`text-sm font-bold ${colors.text} mb-2`}>STEP {s.step}</div>
                  <h3 className="text-xl font-semibold text-[hsl(280,30%,20%)] mb-2">{s.title}</h3>
                  <p className="text-[hsl(280,15%,45%)]">{s.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 sm:py-20">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[hsl(280,30%,20%)]">Everything Your Center Needs</h2>
            <p className="mt-3 text-[hsl(280,15%,45%)] max-w-xl mx-auto">
              A complete training management system — from onboarding new hires to tracking ongoing professional development.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border border-[hsl(280,30%,92%)] bg-white hover:shadow-lg hover:shadow-[hsl(280,50%,90%)]/50 transition-all">
                <CardHeader>
                  <div className={`h-10 w-10 rounded-lg ${feature.color.split(' ')[0]} flex items-center justify-center mb-3`}>
                    <feature.icon className={`h-5 w-5 ${feature.color.split(' ')[1]}`} />
                  </div>
                  <CardTitle className="text-lg text-[hsl(280,30%,20%)]">{feature.title}</CardTitle>
                  <CardDescription className="text-[hsl(280,15%,50%)]">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-[hsl(330,60%,96%)] via-[hsl(280,50%,96%)] to-[hsl(190,50%,96%)]">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {valueProps.map((vp, i) => {
              const iconColors = [
                'bg-[hsl(330,70%,92%)] text-[hsl(330,60%,55%)]',
                'bg-[hsl(280,55%,92%)] text-[hsl(280,50%,50%)]',
                'bg-[hsl(190,65%,90%)] text-[hsl(190,60%,40%)]',
              ][i];
              return (
                <div key={vp.title} className="flex items-start gap-4">
                  <div className={`h-12 w-12 shrink-0 rounded-xl ${iconColors.split(' ')[0]} flex items-center justify-center`}>
                    <vp.icon className={`h-6 w-6 ${iconColors.split(' ')[1]}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[hsl(280,30%,20%)] mb-1">{vp.title}</h3>
                    <p className="text-sm text-[hsl(280,15%,50%)]">{vp.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-24">
        <div className="container px-4">
          <div className="relative bg-gradient-to-br from-[hsl(330,60%,96%)] to-[hsl(280,50%,96%)] rounded-2xl sm:rounded-3xl p-8 sm:p-12 shadow-xl border border-[hsl(280,40%,90%)] overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[hsl(330,70%,80%)] rounded-full blur-3xl opacity-30" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[hsl(190,60%,80%)] rounded-full blur-3xl opacity-30" />

            <div className="relative text-center">
              <img src={pandaLogo} alt="Classroom Panda" className="mx-auto h-14 w-14 mb-4" />
              <h2 className="text-3xl font-bold text-[hsl(280,30%,20%)] md:text-4xl">
                Get Your Center's Training Portal
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[hsl(280,15%,45%)]">
                Join childcare organizations already using our platform to simplify staff training and compliance.
                We'll have your portal ready in no time.
              </p>
              <Button size="lg" className="mt-8 text-lg px-10 bg-gradient-to-r from-[hsl(330,70%,65%)] to-[hsl(280,55%,60%)] hover:from-[hsl(330,70%,58%)] hover:to-[hsl(280,55%,53%)] text-white border-0" asChild>
                <a href="mailto:support@childcarestafftraining.com">Request a Demo</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(280,30%,92%)] py-8 bg-white">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <img src={pandaLogo} alt="Classroom Panda" className="h-6 w-6" />
            <span className="font-semibold bg-gradient-to-r from-[hsl(330,70%,65%)] to-[hsl(280,55%,60%)] bg-clip-text text-transparent">
              Classroom Panda
            </span>
          </div>
          <p className="text-sm text-[hsl(280,15%,55%)] text-center">
            &copy; {new Date().getFullYear()} Classroom Panda. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
