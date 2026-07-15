import { QRCodeCanvas } from 'qrcode.react';
import type { TablePublic } from '@bistro/shared-types';
import { buildTableQrUrl } from '../utils/admin';

type Props = {
  table: TablePublic;
  onClose: () => void;
};

export function TableQrModal({ table, onClose }: Props) {
  const url = buildTableQrUrl(table.id);
  const canvasId = `qr-canvas-${table.id}`;

  const downloadPng = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-${table.label.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const printQr = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'noopener,noreferrer,width=480,height=640');
    if (!win) return;
    win.document.write(`<!doctype html>
<html><head><title>QR ${table.label}</title>
<style>
  body { font-family: system-ui, sans-serif; text-align: center; padding: 32px; }
  img { width: 280px; height: 280px; }
  h1 { font-size: 22px; margin: 16px 0 8px; }
  p { color: #555; font-size: 13px; word-break: break-all; max-width: 360px; margin: 0 auto; }
</style></head><body>
  <h1>${table.label}</h1>
  <p>${table.zone} · ${table.capacity} personas</p>
  <img src="${dataUrl}" alt="QR ${table.label}" />
  <p style="margin-top:16px">${url}</p>
  <script>window.onload=function(){window.print();}</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl border border-primary/10 shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="qr-modal-title" className="text-lg font-bold">
              QR — {table.label}
            </h2>
            <p className="text-xs text-primary/50 mt-1">
              {table.zone} · {table.capacity} personas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-primary/40 hover:text-primary text-sm px-2"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-center bg-white rounded-xl p-4 border border-primary/5">
          <QRCodeCanvas id={canvasId} value={url} size={220} level="M" includeMargin />
        </div>

        <p className="mt-3 text-[11px] text-primary/40 break-all text-center leading-snug">{url}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={downloadPng}
            className="px-3 py-2 rounded-xl bg-primary text-white text-sm"
          >
            Descargar PNG
          </button>
          <button
            type="button"
            onClick={printQr}
            className="px-3 py-2 rounded-xl border border-primary/15 text-sm hover:bg-primary/5"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
