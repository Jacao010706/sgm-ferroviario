"use client";
import { useState, useCallback, useRef } from "react";

type ConfirmOptions = { message: string; title?: string };

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((messageOrOpts: string | ConfirmOptions): Promise<boolean> => {
    const opts = typeof messageOrOpts === "string" ? { message: messageOrOpts } : messageOrOpts;
    setOptions(opts);
    setOpen(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleYes = () => { setOpen(false); resolveRef.current?.(true); };
  const handleNo  = () => { setOpen(false); resolveRef.current?.(false); };

  const ConfirmDialog = open ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {options.title && (
          <div className="px-6 pt-6 pb-2">
            <h3 className="font-bold text-slate-800 text-base">{options.title}</h3>
          </div>
        )}
        <div className="px-6 py-5">
          <p className="text-slate-600 text-sm">{options.message}</p>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={handleNo}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleYes}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
