import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { CheckIcon, LoaderIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateDepartment } from '@/hooks/useDepartments';
import { toastSuccess, toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';

const COLOR_SWATCHES = [
  '#3B82F6',
  '#22C55E',
  '#EF4444',
  '#F59E0B',
  '#A855F7',
  '#06B6D4',
  '#F97316',
  '#EC4899',
] as const;

const departmentSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  code: z
    .string()
    .min(1, 'Short code is required')
    .max(6, 'Max 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Alphanumeric only'),
  head: z.string().min(1, 'Department head is required'),
  color: z.string().min(1, 'Pick a color'),
});

type DepartmentForm = z.infer<typeof departmentSchema>;

interface AddDepartmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDepartmentModal({ open, onClose, onSuccess }: AddDepartmentModalProps) {
  const createDepartment = useCreateDepartment();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DepartmentForm>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: '', code: '', head: '', color: COLOR_SWATCHES[0] },
  });

  const watchedName = watch('name');
  const watchedCode = watch('code');
  const watchedHead = watch('head');
  const watchedColor = watch('color');

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: DepartmentForm) => {
    try {
      await createDepartment.mutateAsync(data);
      toastSuccess(`Department ${data.code} added successfully`);
      onSuccess();
      handleClose();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        toastError(err.response.data.message);
      } else {
        toastError('Failed to create department');
      }
    }
  };

  const previewInitials = watchedCode ? watchedCode.slice(0, 2) : '??';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Department</DialogTitle>
          <DialogDescription>Create a new department for the GAD database.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="dept-name" className="text-sm font-medium">
              Full name
            </label>
            <Input id="dept-name" placeholder="e.g. Municipal Agriculture Office" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Short Code */}
          <div className="space-y-1.5">
            <label htmlFor="dept-code" className="text-sm font-medium">
              Short code
            </label>
            <Input
              id="dept-code"
              placeholder="e.g. MAO"
              maxLength={6}
              {...register('code', {
                onChange: (e) => {
                  const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setValue('code', upper, { shouldValidate: true });
                },
              })}
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>

          {/* Department Head */}
          <div className="space-y-1.5">
            <label htmlFor="dept-head" className="text-sm font-medium">
              Department head
            </label>
            <Input id="dept-head" placeholder="e.g. Juan Dela Cruz" {...register('head')} />
            {errors.head && <p className="text-xs text-destructive">{errors.head.message}</p>}
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color, { shouldValidate: true })}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110',
                    watchedColor === color && 'ring-2 ring-offset-2 ring-foreground/40'
                  )}
                  style={{ backgroundColor: color }}
                >
                  {watchedColor === color && <CheckIcon className="size-3.5 text-white" />}
                </button>
              ))}
            </div>
            {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
          </div>

          {/* Live Preview */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-md text-sm font-bold text-white"
                style={{ backgroundColor: watchedColor }}
              >
                {previewInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {watchedName || 'Department Name'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {watchedHead || 'Department Head'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDepartment.isPending}>
              {createDepartment.isPending && (
                <LoaderIcon className="size-4 animate-spin" />
              )}
              Add Department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
