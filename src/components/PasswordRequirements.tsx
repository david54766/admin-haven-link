import { Check, X } from 'lucide-react';

const checks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1 text-xs">
      {checks.map((c) => {
        const passed = c.test(password);
        return (
          <li key={c.label} className={`flex items-center gap-1.5 ${passed ? 'text-green-600' : 'text-muted-foreground'}`}>
            {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {c.label}
          </li>
        );
      })}
    </ul>
  );
}
