import clsx from 'clsx';
import { useRef, useState, type ReactNode } from 'react';
import type { Attachment } from '@/domain/types';
import { useFormat } from '@/hooks/useFormat';
import { IconButton } from './Button';
import { Icon } from './Icon';

interface FileDropzoneProps {
  onFiles: (files: Attachment[]) => void;
  accept?: string;
  maxSizeMb?: number;
  multiple?: boolean;
  title: ReactNode;
  hint?: ReactNode;
  onError?: (message: 'validation.fileTooLarge') => void;
  className?: string;
  compact?: boolean;
}

/**
 * Drag & drop / click-to-pick file zone. Files stay in the browser: only name and size are kept
 * (the mock backend has no file storage). The future API would upload and return an id here.
 */
export function FileDropzone({ onFiles, accept, maxSizeMb = 25, multiple = true, title, hint, onError, className, compact }: FileDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (list: FileList | null) => {
    if (!list) return;
    const files = [...list];
    if (files.some((f) => f.size > maxSizeMb * 1024 * 1024)) onError?.('validation.fileTooLarge');
    const ok = files.filter((f) => f.size <= maxSizeMb * 1024 * 1024);
    if (ok.length) onFiles(ok.map((f) => ({ id: `${f.name}-${f.size}-${Date.now()}`, name: f.name, sizeBytes: f.size })));
  };

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      className={clsx(
        'flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-center transition-colors',
        compact ? 'px-4 py-3 sm:flex-row sm:gap-2' : 'px-6 py-8',
        dragging ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-low/50 hover:border-primary/60',
        className,
      )}
    >
      <Icon name="cloud_upload" size={compact ? 20 : 28} className="text-primary" />
      <span className="text-label-md text-primary">{title}</span>
      {hint && <span className="text-body-sm text-on-surface-variant">{hint}</span>}
      <input ref={input} type="file" className="hidden" accept={accept} multiple={multiple} onChange={(e) => handle(e.target.files)} />
    </button>
  );
}

/** A file row: PDF icon, name, size, view / delete actions (BUY-06, SUP-02/04). */
export function AttachmentRow({ file, onRemove, onView, removeLabel = 'Remove', viewLabel = 'View', subtitle }: { file: Attachment; onRemove?: () => void; onView?: () => void; removeLabel?: string; viewLabel?: string; subtitle?: ReactNode }) {
  const f = useFormat();
  const isPdf = file.name.toLowerCase().endsWith('.pdf');
  return (
    <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
      <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', isPdf ? 'bg-danger-container text-danger' : 'bg-primary-fixed text-primary')}>
        <Icon name={isPdf ? 'picture_as_pdf' : 'description'} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-label-md text-on-surface">{file.name}</p>
        <p className="text-body-sm text-on-surface-variant">
          {f.fileSize(file.sizeBytes)}
          {subtitle && <> • {subtitle}</>}
        </p>
      </div>
      {onView && <IconButton icon="visibility" label={viewLabel} onClick={onView} />}
      {onRemove && <IconButton icon="delete" label={removeLabel} onClick={onRemove} />}
    </div>
  );
}
