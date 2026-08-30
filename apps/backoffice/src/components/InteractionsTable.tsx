"use client";

import React from 'react';
import CampaignIcon from '@mui/icons-material/Campaign';

interface InteractionsTableProps {
  interactions: any[];
  isLoading: boolean;
}

export default function InteractionsTable({ interactions, isLoading }: InteractionsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs text-center py-12">
        <p className="text-xs text-[#6b7773] font-bold">Cargando actividad reciente...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e8e1d5] shadow-xs font-sans">
      <div className="border-b border-[#e8e1d5] pb-4 mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-dark flex items-center gap-2">
            <CampaignIcon className="text-primary" fontSize="small" />
            <span>Actividad Reciente & Opiniones</span>
          </h3>
          <p className="text-xs text-[#6b7773] mt-0.5">Visitas registradas, códigos acumulados y canjes realizados.</p>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-primary-light text-primary border border-primary-border text-[11px] font-extrabold">
          {interactions.length} Registros
        </span>
      </div>

      {interactions.length === 0 ? (
        <div className="text-center py-10 bg-[#faf8f5] rounded-2xl border border-dashed border-[#e8e1d5]">
          <p className="text-xs font-bold text-gray-500">No hay interacciones registradas aún.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-[#e8e1d5] text-[#6b7773] font-extrabold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-2">Cliente</th>
                <th className="pb-3 px-2">Tipo / Factura</th>
                <th className="pb-3 px-2">Puntos</th>
                <th className="pb-3 px-2">Sentimiento AI</th>
                <th className="pb-3 px-2">Opinión</th>
                <th className="pb-3 px-2 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2ece1]">
              {interactions.map((item: any) => (
                <tr key={item.id} className="hover:bg-[#faf8f5] transition-colors">
                  <td className="py-3 px-2 font-bold font-mono text-dark select-all">
                    {item.customer_phone}
                  </td>
                  <td className="py-3 px-2 font-semibold">
                    {item.invoice_number ? (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold">
                        FAC: {item.invoice_number}
                      </span>
                    ) : item.status === 'redimidos' ? (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold">
                        🎁 Canje de Premio
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold">
                        Visita en Local
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 font-black font-mono">
                    <span className={item.points_earned > 0 ? 'text-emerald-600' : item.points_earned < 0 ? 'text-purple-600' : 'text-gray-400'}>
                      {item.points_earned > 0 ? `+${item.points_earned}` : item.points_earned} Pts
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      item.ai_sentiment === 'positive'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.ai_sentiment === 'negative'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.ai_sentiment || 'neutro'}
                    </span>
                  </td>
                  <td className="py-3 px-2 max-w-xs truncate text-[#6b7773] font-medium" title={item.feedback_text}>
                    {item.feedback_text || '-'}
                  </td>
                  <td className="py-3 px-2 text-right text-[10px] text-gray-500 font-bold">
                    {new Date(item.created_at).toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
