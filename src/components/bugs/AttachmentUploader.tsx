import { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Image, Film, File, Clipboard, Eye, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { formatFileSize } from '@/utils/dateUtils';

interface PendingFile {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

interface AttachmentUploaderProps {
  onFilesSelected: (files: PendingFile[]) => void;
  maxFiles?: number;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Film;
  if (type === 'application/pdf') return FileText;
  return File;
}

export default function AttachmentUploader({ onFilesSelected, maxFiles = 10 }: AttachmentUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Maintain mutable refs for all states, props, and handlers to completely eliminate stale closures in window event listeners
  const pendingRef = useRef<PendingFile[]>([]);
  const onFilesSelectedRef = useRef(onFilesSelected);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    onFilesSelectedRef.current = onFilesSelected;
  }, [onFilesSelected]);

  // Main file processing handler that reads both Files and Blobs robustly
  function handleFiles(files: FileList | File[] | Blob[]) {
    const arr = Array.from(files).slice(0, maxFiles - pendingRef.current.length);
    if (arr.length === 0) return;

    const readers = arr.map(file => {
      return new Promise<PendingFile>(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
          const type = file.type || 'application/octet-stream';
          let displayName = (file as any).name;
          
          // Generate a beautiful, unique filename for unnamed clipboard blobs or generic images
          if (!displayName || displayName === 'image.png' || displayName === 'blob') {
            const ext = type.split('/')[1] || 'png';
            const cleanExt = ext === 'plain' ? 'txt' : ext;
            displayName = `Screenshot-${Date.now()}.${cleanExt}`;
          }

          resolve({
            name: displayName,
            size: file.size,
            type: type,
            dataUrl: type.startsWith('image/') ? (e.target?.result as string) : undefined,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(newFiles => {
      const updated = [...pendingRef.current, ...newFiles];
      setPending(updated);
      onFilesSelectedRef.current(updated);
    });
  }

  const handleFilesRef = useRef(handleFiles);
  useEffect(() => {
    handleFilesRef.current = handleFiles;
  });

  // Listen to window paste event to support direct Ctrl+V screenshots pasting anywhere
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      const filesToHandle: (File | Blob)[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            filesToHandle.push(file);
          }
        }
      }

      if (filesToHandle.length > 0) {
        // Prevent default pasting behavior since we are attaching the files to the bug report
        e.preventDefault();
        handleFilesRef.current(filesToHandle);
        toast.success(`Attached ${filesToHandle.length} screenshot(s) from keyboard!`);
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Click handler to directly read/extract images from browser clipboard API
  async function handleClipboardPaste(e: React.MouseEvent) {
    e.stopPropagation(); // Avoid triggering file selection panel
    
    // Check if Clipboard API is available in context (e.g. secure localhost or https)
    if (!navigator.clipboard || !navigator.clipboard.read) {
      toast.error("Clipboard API access is restricted by your browser. Please use Ctrl+V!");
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      const filesToHandle: Blob[] = [];

      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            filesToHandle.push(blob);
          }
        }
      }

      if (filesToHandle.length > 0) {
        handleFilesRef.current(filesToHandle);
        toast.success(`Successfully pasted ${filesToHandle.length} screenshot(s) from clipboard!`);
      } else {
        toast.error("No image found in clipboard. Use Snipping Tool (Win+Shift+S) first!");
      }
    } catch (err) {
      toast.error("Clipboard permission denied. Copy your screenshot and press Ctrl+V anywhere on the page!");
    }
  }

  function remove(idx: number) {
    const updated = pending.filter((_, i) => i !== idx);
    setPending(updated);
    onFilesSelectedRef.current(updated);
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all duration-150',
          dragging ? 'border-brand bg-brand-glow' : 'border-bg-border bg-bg-base hover:border-brand hover:bg-brand-glow'
        )}
      >
        <Upload size={24} className={clsx('transition-colors', dragging ? 'text-brand' : 'text-text-muted')} />
        <div className="text-sm text-text-secondary">
          <span className="text-brand font-medium">Click to upload</span> or drag & drop
        </div>
        <div className="text-xs text-text-muted">Images, videos, logs, PDFs — up to {maxFiles} files</div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* Quick Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="btn-secondary btn-sm flex-1 justify-center py-2 text-xs"
        >
          <Upload size={13} /> Select Files
        </button>
        <button
          type="button"
          onClick={handleClipboardPaste}
          className="btn-secondary btn-sm flex-1 justify-center py-2 text-xs hover:border-brand/40 text-brand font-semibold"
        >
          <Clipboard size={13} /> Paste Screenshot
        </button>
      </div>

      {/* Pending files grid */}
      {pending.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          {pending.map((f, i) => {
            const Icon = getFileIcon(f.type);
            return (
              <div
                key={i}
                className="group relative rounded-xl border border-bg-border bg-bg-card/45 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col hover:border-brand/40 hover:shadow-card-hover transition-all duration-200"
              >
                {/* Visual Preview */}
                <div className="aspect-video w-full bg-bg-base relative flex items-center justify-center overflow-hidden border-b border-bg-border/30">
                  {f.dataUrl ? (
                    <img
                      src={f.dataUrl}
                      alt={f.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                      <Icon size={24} className="text-text-muted mb-1" />
                      <span className="text-[9px] text-text-disabled uppercase font-bold tracking-wider">{f.type.split('/')[1] || 'FILE'}</span>
                    </div>
                  )}

                  {/* Actions overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200 backdrop-blur-xs">
                    {f.dataUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(f.dataUrl || null);
                        }}
                        className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white rounded-lg transition-all transform scale-95 group-hover:scale-100 duration-150"
                        title="Zoom Image"
                      >
                        <Eye size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(i);
                      }}
                      className="p-2 bg-red-600/10 hover:bg-red-600/25 border border-red-600/30 text-red-400 hover:text-red-300 rounded-lg transition-all transform scale-95 group-hover:scale-100 duration-150"
                      title="Remove Attachment"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Card footer details */}
                <div className="p-2.5 flex-1 flex flex-col justify-between bg-bg-card/20">
                  <div className="text-xs font-semibold text-text-primary truncate" title={f.name}>
                    {f.name}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted">
                    <span>{formatFileSize(f.size)}</span>
                    <span className="uppercase text-[9px] font-bold text-brand bg-brand-glow px-1 rounded-sm">
                      {f.type.split('/')[0]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / View Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            <button
              onClick={() => setSelectedImage(null)}
              className="btn-ghost btn-icon bg-black/40 hover:bg-black/60 text-white rounded-full"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="Preview Attachment"
              className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/10 shadow-2xl animate-slide-up"
            />
          </div>
        </div>
      )}
    </div>
  );
}
