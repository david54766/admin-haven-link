import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import logo from '@/assets/logo.png';
import landingLogo from '@/assets/landing-logo.png';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-end gap-3">
          <Button variant="ghost" className="text-foreground hover:bg-accent" asChild>
            <Link to="/login">Staff Login</Link>
          </Button>
          <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground" asChild>
            <Link to="/register">Staff Register</Link>
          </Button>
          <Button className="bg-primary hover:bg-primary/90 shadow-lg" asChild>
            <Link to="/apply">Apply Now</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-brand-yellow/20 rounded-full blur-3xl" />
          <div className="absolute top-40 right-20 w-40 h-40 bg-brand-blue/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-brand-purple/15 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-28 h-28 bg-brand-green/20 rounded-full blur-3xl" />
        </div>

        <div className="container text-center relative">
          {/* Centered Logo */}
          <img 
            src={landingLogo} 
            alt="Classroom Panda" 
            className="mx-auto h-32 md:h-44 w-auto mb-8"
          />
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 text-foreground mb-6">
            <Sparkles className="h-4 w-4 text-brand-purple" />
            <span className="text-sm font-medium">Staff Training Portal</span>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Staff Training & 
            <span className="block mt-2 bg-gradient-to-r from-brand-red via-brand-purple to-brand-blue bg-clip-text text-transparent">
              Development
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            A comprehensive training platform designed exclusively for our staff. 
            Complete required training, track your progress, and grow professionally.
          </p>
          
          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 text-lg px-8" asChild>
              <Link to="/register">Staff Register</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground text-lg px-8" asChild>
              <Link to="/login">Staff Login</Link>
            </Button>
          </div>
          
          <p className="mt-4 text-sm text-muted-foreground">
            New to our team?{' '}
            <Link to="/apply" className="text-secondary hover:underline font-medium">
              Apply to join our team
            </Link>
          </p>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-brand-purple/5 -z-10" />
        
        <div className="container">
          <div className="relative bg-card rounded-3xl p-12 shadow-2xl border overflow-hidden">
            {/* Decorative corner accents */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-yellow/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-brand-blue/30 rounded-full blur-3xl" />
            
            <div className="relative text-center">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                Ready to Join Our Team?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Submit your application to join our team. Applications are reviewed by administrators.
              </p>
              <Button size="lg" className="mt-8 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 text-lg px-10" asChild>
                <Link to="/apply">Submit Application</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={landingLogo} alt="Classroom Panda" className="h-16 w-auto" />
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} Classroom Panda. Internal use only.
          </p>
        </div>
      </footer>
    </div>
  );
}

