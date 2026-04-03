import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
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

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

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
      navigate('/dashboard');
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

  const features = [
    'Department-based records management',
    'Female & Male beneficiary tracking',
    'Excel upload & export support',
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden w-[35%] flex-col justify-between bg-[#09090B] p-10 lg:flex">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            GAD
          </h1>
          <p className="mt-1 text-sm font-medium text-[#A1A1AA]">
            Gender &amp; Development Database
          </p>
        </div>

        <div className="space-y-4">
          {features.map((feature) => (
            <div key={feature} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-white" />
              <span className="text-sm text-white">{feature}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#52525B]">
          City Government of Tanauan, Batangas
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex w-full items-center justify-center bg-white lg:w-[65%]">
        <div className="w-full max-w-[400px] px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[#09090B]">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-[#71717A]">
              Sign in to your account
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
              className="h-9 w-full bg-[#18181B] text-white hover:bg-[#18181B]/90"
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
      </div>
    </div>
  );
}
