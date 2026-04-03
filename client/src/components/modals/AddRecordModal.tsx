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
  DialogDescription,
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
import { useCreateRecord } from '@/hooks/useRecords';
import { toastSuccess, toastError } from '@/lib/toast';

const recordSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  year: z.coerce.number().int().min(1900).max(2100),
  status: z.enum(['ACTIVE', 'PENDING', 'INACTIVE']).default('ACTIVE'),
});

type RecordForm = z.infer<typeof recordSchema>;

interface AddRecordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departmentId: string;
  departmentName?: string;
}

export default function AddRecordModal({
  open,
  onClose,
  onSuccess,
  departmentId,
  departmentName,
}: AddRecordModalProps) {
  const createRecord = useCreateRecord();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecordForm>({
    resolver: zodResolver(recordSchema) as any,
    defaultValues: {
      name: '',
      year: new Date().getFullYear(),
      status: 'ACTIVE',
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: RecordForm) => {
    try {
      await createRecord.mutateAsync({
        name: data.name,
        departmentId,
        year: data.year,
        status: data.status,
      });
      toastSuccess('Record added successfully');
      onSuccess();
      handleClose();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        toastError(err.response.data.message);
      } else {
        toastError('Failed to add record');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Record</DialogTitle>
          <DialogDescription>
            {departmentName ? `Add a record to ${departmentName}. For bulk data, use Excel upload.` : 'Add a new record.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="rec-name" className="text-sm font-medium">Name</label>
            <Input id="rec-name" placeholder="e.g. Juan Dela Cruz" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="rec-year" className="text-sm font-medium">Year</label>
              <Input id="rec-year" type="number" min={1900} max={2100} {...register('year')} />
              {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as 'ACTIVE' | 'PENDING' | 'INACTIVE', { shouldValidate: true })}>
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
            <Button type="submit" disabled={createRecord.isPending}>
              {createRecord.isPending && <LoaderIcon className="size-4 animate-spin" />}
              Add Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
