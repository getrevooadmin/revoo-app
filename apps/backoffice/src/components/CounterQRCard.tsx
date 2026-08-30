"use client";

import React, { useRef } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PrintIcon from '@mui/icons-material/Print';
import GetAppIcon from '@mui/icons-material/GetApp';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import FlashOnIcon from '@mui/icons-material/FlashOn';

interface CounterQRCardProps {
  business: { id: string; name: string; logo_url?: string | null } | null;
  activeCode?: any | null;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function CounterQRCard({ business, activeCode, onToast }: CounterQRCardProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  if (!business) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const counterUrl = `${origin}/${business.id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(counterUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(counterUrl);
    onToast('¡Enlace del QR copiado al portapapeles!');
  };

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-Caja-${business.name.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      onToast('¡Imagen QR descargada con éxito!');
    } catch (err) {
      window.open(qrImageUrl, '_blank');
    }
  };

  const handlePrintFlyer = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Mostrador - ${business.name}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 40px;
              background-color: #faf8f5;
              color: #232d2a;
              text-align: center;
            }
            .card {
              background: white;
              border: 3px solid #153e35;
              border-radius: 32px;
              padding: 48px;
              max-width: 450px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.08);
            }
            .title {
              font-size: 28px;
              font-weight: 900;
              color: #153e35;
              margin-top: 16px;
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 14px;
              color: #6b7773;
              margin-bottom: 24px;
            }
            .qr-img {
              width: 260px;
              height: 260px;
              border-radius: 20px;
              border: 2px solid #e8e1d5;
              padding: 12px;
              background: white;
            }
            .footer-tag {
              margin-top: 24px;
              font-size: 12px;
              font-weight: 800;
              color: #c49340;
              text-transform: uppercase;
              letter-spacing: 1.5px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            ${business.logo_url ? `<img src="${business.logo_url}" style="width:72px;height:72px;border-radius:20px;object-fit:cover;border:1px solid #e8e1d5" />` : ''}
            <div class="title">${business.name}</div>
            <div class="subtitle">¡Escanea con tu cámara, acumula puntos y gana premios!</div>
            <img src="${qrImageUrl}" class="qr-img" />
            <div class="footer-tag">Club de Fidelización & Recompensas</div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs font-sans">
      <div className="border-b border-[#e8e1d5] pb-4 mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-dark flex items-center gap-2">
            <QrCode2Icon className="text-primary" fontSize="small" />
            <span>QR Permanente de Mostrador / Caja</span>
          </h3>
          <p className="text-xs text-[#6b7773] mt-0.5">Coloca este código QR en tu caja registradora para que los clientes escaneen y acumulen puntos.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* QR Image Box */}
        <div className="bg-[#faf8f5] p-4 rounded-3xl border border-[#e8e1d5] flex flex-col items-center shrink-0">
          <img
            src={qrImageUrl}
            alt="QR Mostrador"
            className="w-40 h-40 object-contain rounded-2xl bg-white p-2 border border-[#e8e1d5] shadow-xs"
          />
          <span className="text-[10px] text-gray-500 font-mono font-bold mt-2 select-all">
            {counterUrl}
          </span>
        </div>

        {/* Info & Action Buttons */}
        <div className="flex-1 space-y-3 w-full">
          {activeCode ? (
            <div className="p-3 bg-primary-light border border-primary-border rounded-2xl animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-extrabold text-primary">
                <FlashOnIcon fontSize="small" className="animate-pulse" />
                <span>Código Activo en Caja:</span>
                <span className="font-mono text-sm font-black select-all">{activeCode.code}</span>
              </div>
              <p className="text-[10px] text-gray-500 font-semibold mt-1">
                Al escanear el QR, este código se auto-cargará en el celular del cliente.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-[#faf8f5] border border-[#e8e1d5] rounded-2xl text-xs text-gray-600 font-medium">
              <span>⚪ Ningún código activo en caja. Al generar una nueva compra se asignará automáticamente.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadQR}
              className="px-3 py-2.5 bg-primary hover:bg-primary-hover active:scale-95 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <GetAppIcon fontSize="small" />
              <span>Descargar (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintFlyer}
              className="px-3 py-2.5 bg-[#faf8f5] hover:bg-[#f2ece1] text-dark border border-[#e8e1d5] font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <PrintIcon fontSize="small" className="text-primary" />
              <span>Imprimir Plantilla</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2.5 bg-[#faf8f5] hover:bg-[#f2ece1] text-dark border border-[#e8e1d5] font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ContentCopyIcon fontSize="small" className="text-primary" />
              <span>Copiar Enlace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
