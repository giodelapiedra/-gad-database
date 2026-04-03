import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { LoaderIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateRecord } from '@/hooks/useRecords';
import { toastSuccess, toastError } from '@/lib/toast';
import type { Record as GadRecord } from '@/types';

const editSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  year: z.coerce.number().int().min(1900).max(2100),
  status: z.enum(['ACTIVE', 'PENDING', 'INACTIVE']),
});

type EditForm = z.infer<typeof editSchema>;

interface EditRecordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: GadRecord | null;
}

export default function EditRecordModal({ open, onClose, onSuccess, record }: EditRecordModalProps) {
  const updateRecord = useUpdateRecord();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema) as any,
  });

  useEffect(() => {
    if (record) {
      reset({
        name: record.name,
        year: record.year,
        status: record.status,
      });
    }
  }, [record, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: EditForm) => {
    if (!record) return;
    try {
      await updateRecord.mutateAsync({
        id: record.id,
        name: data.name,
        year: data.year,
        status: data.status,
      });
      toastSuccess('Record updated');
      onSuccess();
      handleClose();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        toastError(err.response.data.message);
      } else {
        toastError('Failed to update record');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-name" className="text-sm font-medium">Name</label>
            <Input id="edit-name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="edit-year" className="text-sm font-medium">Year</label>
              <Input id="edit-year" type="number" min={1900} max={2100} {...register('year')} />
              {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={watch('status') ?? 'ACTIVE'} onValueChange={(v) => setValue('status', v as 'ACTIVE' | 'PENDING' | 'INACTIVE', { shouldValidate: true })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={updateRecord.isPending}>
              {updateRecord.isPending && <LoaderIcon className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
