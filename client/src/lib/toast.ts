import { toast } from 'sonner'

export function toastSuccess(msg: string) {
  toast.success(msg)
}

export function toastError(msg: string) {
  toast.error(msg)
}

export function toastInfo(msg: string) {
  toast.info(msg)
}
