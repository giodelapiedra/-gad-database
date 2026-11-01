import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Eye,
  EyeOff,
  Loader2,
  Users,
  Scale,
  HeartHandshake,
  GraduationCap,
  BookOpen,
  Baby,
  Shield,
  Sprout,
  Landmark,
  Globe,
  HandHeart,
  Venus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logo from '@/assets/logo.svg';
import { AxiosError } from 'axios';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { roleFallback } from '@/components/auth/ProtectedRoute';
import api from '@/lib/axios';
import { toastError } from '@/lib/toast';
import type { ApiResponse, User } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Min 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginResponse {
  token: string;
  user: User;
}

/* GAD-themed icons that drift slowly behind the login card. Positions are in
   viewport %; tone alternates between the brand rose / blue / zinc. */
type FloatIcon = {
  Icon: LucideIcon;
  top: string;
  left: string;
  size: number;
  color: string;
  dur: number;
  delay: number;
  rot: number;
  variant: 'gad-float' | 'gad-float-alt';
};

const FLOAT_ICONS: FloatIcon[] = [
  { Icon: Users, top: '12%', left: '8%', size: 52, color: 'text-[#E11D48]/15', dur: 9, delay: 0, rot: -8, variant: 'gad-float' },
  { Icon: Scale, top: '22%', left: '82%', size: 60, color: 'text-[#2563EB]/15', dur: 11, delay: 0.6, rot: 6, variant: 'gad-float-alt' },
  { Icon: HeartHandshake, top: '70%', left: '10%', size: 58, color: 'text-[#E11D48]/15', dur: 10, delay: 1.2, rot: 5, variant: 'gad-float-alt' },
  { Icon: GraduationCap, top: '78%', left: '84%', size: 54, color: 'text-[#18181B]/[0.08]', dur: 12, delay: 0.3, rot: -5, variant: 'gad-float' },
  { Icon: BookOpen, top: '40%', left: '4%', size: 44, color: 'text-[#2563EB]/12', dur: 8.5, delay: 1.8, rot: 7, variant: 'gad-float' },
  { Icon: Baby, top: '52%', left: '90%', size: 46, color: 'text-[#E11D48]/12', dur: 10.5, delay: 0.9, rot: -6, variant: 'gad-float-alt' },
  { Icon: Shield, top: '8%', left: '46%', size: 40, color: 'text-[#18181B]/[0.07]', dur: 11.5, delay: 1.5, rot: 4, variant: 'gad-float' },
  { Icon: Sprout, top: '86%', left: '44%', size: 42, color: 'text-[#2563EB]/12', dur: 9.5, delay: 0.4, rot: -7, variant: 'gad-float-alt' },
  { Icon: Landmark, top: '30%', left: '26%', size: 38, color: 'text-[#18181B]/[0.06]', dur: 13, delay: 2.1, rot: 5, variant: 'gad-float' },
  { Icon: Globe, top: '64%', left: '70%', size: 40, color: 'text-[#18181B]/[0.06]', dur: 12.5, delay: 1, rot: -4, variant: 'gad-float-alt' },
  { Icon: HandHeart, top: '18%', left: '66%', size: 44, color: 'text-[#E11D48]/12', dur: 10, delay: 1.7, rot: 6, variant: 'gad-float' },
  { Icon: Venus, top: '48%', left: '16%', size: 36, color: 'text-[#E11D48]/14', dur: 8, delay: 0.7, rot: -5, variant: 'gad-float-alt' },
];

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* drifting GAD icons */}
      {FLOAT_ICONS.map(({ Icon, top, left, size, color, dur, delay, rot, variant }, i) => (
        <div
          key={i}
          className={`absolute ${variant} ${color}`}
          style={
            {
              top,
              left,
              '--dur': `${dur}s`,
              '--delay': `${delay}s`,
              '--rot': `${rot}deg`,
            } as React.CSSProperties
          }
        >
          <Icon style={{ width: size, height: size }} strokeWidth={1.5} />
        </div>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, user } = useAuth();

  // Already logged in → go to their home page immediately
  if (!isLoading && isAuthenticated) {
    return <Navigate to={roleFallback(user?.role)} replace />;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');

    try {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
      const { token, user } = res.data.data;
      login(token, user);
      navigate(roleFallback(user.role));
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        const msg = err.response.data.message;
        setError(msg);
        toastError(msg);
      } else {
        setError('Something went wrong. Please try again.');
        toastError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <AnimatedBackground />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="gad-enter w-full max-w-[420px]">
          {/* Logo + branding */}
          <div className="mb-7 flex flex-col items-center text-center">
            <img
              src={logo}
              alt="GAD Logo"
              className="mb-5 size-40 drop-shadow-[0_6px_16px_rgba(9,9,11,0.12)]"
            />
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#A1A1AA]">
              City Government of Tanauan, Batangas
            </p>
            <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-tight text-[#09090B]">
              GAD Records Management
            </h1>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-black/5 bg-white/80 p-7 shadow-[0_10px_40px_rgba(9,9,11,0.08)] backdrop-blur-xl sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-[#09090B]">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-[#71717A]">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@gad.gov.ph"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-[#DC2626]">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#71717A]"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-[#DC2626]">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-lg bg-[#18181B] text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#18181B]/90"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              'Sign In'
            )}
          </Button>

          {error && (
            <div className="rounded-lg border border-[#DC2626]/20 bg-[#DC2626]/5 px-3 py-2.5">
              <p className="text-sm text-[#DC2626]">{error}</p>
            </div>
          )}
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-[#A1A1AA]">
            City Government of Tanauan, Batangas &copy; 2026. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
