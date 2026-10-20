import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ErrorState, LoadingState } from '@/components/ui';
import { useCreateRfqDraft } from '@/hooks/buyer';

/**
 * Entry point for "Tạo RFQ mới": creates a draft (optionally pre-filled with suppliers chosen in
 * BUY-02/BUY-04 via `?suppliers=a,b` or a catalogue product via `?product=id`) and opens step 1.
 */
export default function NewRfqPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const create = useCreateRfqDraft();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const supplierIds = params.get('suppliers')?.split(',').filter(Boolean);
    const productId = params.get('product') ?? undefined;
    create.mutate({ supplierIds, productId }, { onSuccess: (rfq) => navigate(`/buyer/rfqs/${rfq.id}/edit/1`, { replace: true }) });
  }, [create, navigate, params]);

  if (create.isError) return <ErrorState error={create.error} onRetry={() => create.reset()} />;
  return <LoadingState />;
}
