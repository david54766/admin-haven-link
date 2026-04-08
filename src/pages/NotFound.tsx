import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';
import logo from '@/assets/logo.png';

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-40 h-40 bg-brand-yellow/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-brand-blue/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-brand-purple/15 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-1/4 w-32 h-32 bg-brand-red/15 rounded-full blur-3xl" />
      </div>

      <div className="text-center">
        <img src={logo} alt="Classroom Panda" className="mx-auto h-24 w-auto mb-8" />
        
        <div className="mb-6">
          <span className="text-8xl font-bold bg-gradient-to-r from-brand-red via-brand-purple to-brand-blue bg-clip-text text-transparent">
            404
          </span>
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Page Not Found</h1>
        </div>
        
        <p className="mb-8 text-muted-foreground max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
