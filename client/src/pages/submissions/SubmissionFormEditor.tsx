import { useGetTemplates } from '@/hooks/useTemplates';
import type { BrgyGPBFormData, BrgyARFormData, CityGPBFormData, CityARFormData } from '@/hooks/useTemplates';
import {
  BrgyGPBForm,
  BrgyARForm,
  CityGPBForm,
  CityARForm,
} from '@/pages/templates/TemplatesPage';

export function SubmissionFormEditor({
  templateId, initialData, editId, onBack, isDraftEdit,
}: { templateId: string; initialData: unknown; editId: string; onBack: () => void; isDraftEdit?: boolean }) {
  const { data: templates } = useGetTemplates();
  const template = (templates ?? []).find((t) => t.id === templateId);

  if (!template) {
    return <div className="py-10 text-center text-[13px] text-[#71717A]">Loading form…</div>;
  }

  const common = { template, onBack, editId, isDraftEdit };
  if (templateId === 'BARANGAY_GPB') return <BrgyGPBForm {...common} initialData={initialData as BrgyGPBFormData} />;
  if (templateId === 'BARANGAY_AR')  return <BrgyARForm  {...common} initialData={initialData as BrgyARFormData}  />;
  if (templateId === 'CITY_GPB')     return <CityGPBForm {...common} initialData={initialData as CityGPBFormData} />;
  if (templateId === 'CITY_AR')      return <CityARForm  {...common} initialData={initialData as CityARFormData}  />;
  return <div className="py-10 text-center text-[13px] text-[#71717A]">Unknown template type.</div>;
}
