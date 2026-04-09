import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Award, ClipboardCheck, Calendar, BarChart3, Shield, Users } from 'lucide-react';

const features = [
  { icon: BookOpen, title: 'Training Tracks', description: 'Structured training paths with videos, quizzes, and hands-on assignments.' },
  { icon: ClipboardCheck, title: 'Compliance Documents', description: 'Track staff documents, licenses, and ensure regulatory compliance.' },
  { icon: Award, title: 'Certificates & Hours', description: 'Auto-generate certificates on completion and track professional development hours.' },
  { icon: ClipboardCheck, title: 'Daily Checklists', description: 'Customizable daily checklists with automated admin notifications.' },
  { icon: Calendar, title: 'Staff Calendar', description: 'Shared calendar for events, deadlines, and important dates.' },
  { icon: BarChart3, title: 'Reports & Analytics', description: 'Comprehensive dashboards tracking staff progress and engagement.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-foreground">Childcare Staff Training</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Staff Login</Link>
            </Button>
            <Button asChild>
              <Link to="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="container text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Training Management for Childcare Centers</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Simplify Staff Training &
            <span className="block mt-2 text-primary">Compliance Tracking</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            A comprehensive platform designed for childcare organizations to manage staff training,
            track compliance, issue certificates, and maintain professional development records.
          </p>

          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <Button size="lg" className="text-lg px-8" asChild>
              <Link to="/login">Staff Portal</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild>
              <a href="mailto:support@childcarestafftraining.com">Contact Us</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Everything Your Center Needs</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              From onboarding new staff to tracking ongoing professional development — all in one platform.
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

      {/* CTA */}
      <section className="py-24">
        <div className="container">
          <div className="relative bg-card rounded-3xl p-12 shadow-xl border overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />

            <div className="relative text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                Ready to Streamline Your Training?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Contact us to set up your organization on the platform. We'll get your team up and running quickly.
              </p>
              <Button size="lg" className="mt-8 text-lg px-10" asChild>
                <a href="mailto:support@childcarestafftraining.com">Get in Touch</a>
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