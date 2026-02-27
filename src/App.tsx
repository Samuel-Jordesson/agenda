/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Save, 
  Trash2, 
  Sparkles,
  Loader2,
  Trophy,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Event {
  id: string;
  name: string;
  day: string;
  time: string;
  local: string;
  createdAt: number;
}

interface ExtractionResult {
  name: string;
  day: string;
  time: string;
  local: string;
}

export default function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    day: '',
    time: '',
    local: ''
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('smart-events');
    if (saved) {
      try {
        setEvents(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved events", e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('smart-events', JSON.stringify(events));
  }, [events]);

  const extractInfo = async (text: string): Promise<ExtractionResult | null> => {
    if (!text.trim()) return null;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract event details from this text: "${text}". 
        The current date is ${new Date().toLocaleDateString()} and today is ${new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}.
        Return a JSON object with fields: name, day, time, local. 
        If a field is not found, use an empty string. 
        Format "day" as a readable date or relative day (e.g. "Amanhã", "25/12/2023").`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              day: { type: Type.STRING },
              time: { type: Type.STRING },
              local: { type: Type.STRING },
            },
            required: ["name", "day", "time", "local"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return result as ExtractionResult;
    } catch (error) {
      console.error("AI Extraction failed:", error);
      return null;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      alert("Por favor, preencha o nome do evento.");
      return;
    }

    let finalData = { ...form };

    // If only name is filled, analyze and save immediately
    if (form.name.trim() && !form.day && !form.time && !form.local) {
      setIsExtracting(true);
      const extracted = await extractInfo(form.name);
      setIsExtracting(false);
      
      if (extracted) {
        finalData = {
          name: extracted.name || form.name,
          day: extracted.day || 'Não definido',
          time: extracted.time || '',
          local: extracted.local || ''
        };
      }
    }

    if (!finalData.day) {
      alert("Por favor, preencha o dia do evento.");
      return;
    }

    const newEvent: Event = {
      id: crypto.randomUUID(),
      ...finalData,
      createdAt: Date.now()
    };

    setEvents(prev => [newEvent, ...prev]);
    setForm({ name: '', day: '', time: '', local: '' });
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Trophy size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda Esportiva</h1>
              <p className="text-sm text-slate-500 font-medium">Organize seus eventos com IA</p>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Status: Online</p>
          </div>
        </header>

        {/* Unified Smart Form Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-indigo-500" size={18} />
                <h2 className="font-semibold text-slate-800">Novo Evento</h2>
              </div>
              {isExtracting && (
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold animate-pulse">
                  <Loader2 className="animate-spin" size={14} />
                  IA ANALISANDO...
                </div>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">
                    Título / Descrição Completa
                    <span className="text-[10px] font-normal lowercase text-slate-400">(Digite tudo aqui para a IA preencher o resto)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({...form, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg placeholder:text-slate-400"
                      placeholder="Ex: Bahia x Vitória amanhã às 20h no Fonte Nova"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Sparkles className="text-slate-300" size={18} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Dia</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.day}
                      onChange={(e) => setForm({...form, day: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Data ou Dia"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Hora</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.time}
                      onChange={(e) => setForm({...form, time: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Horário"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Local</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.local}
                      onChange={(e) => setForm({...form, local: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Estádio ou Endereço"
                    />
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isExtracting || !form.name.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Salvar Evento</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-bottom border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-indigo-500" size={18} />
              <h2 className="font-semibold text-slate-800">Eventos Salvos</h2>
            </div>
            <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
              {events.length} TOTAL
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Evento</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Dia</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Local</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {events.length === 0 ? (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center"
                    >
                      <td colSpan={5} className="px-6 py-12 text-slate-400 italic">
                        Nenhum evento agendado ainda. Use a caixa acima para começar!
                      </td>
                    </motion.tr>
                  ) : (
                    events.map((event) => (
                      <motion.tr
                        layout
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{event.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar size={14} className="text-slate-400" />
                            <span>{event.day}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock size={14} className="text-slate-400" />
                            <span>{event.time || '--:--'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin size={14} className="text-slate-400" />
                            <span>{event.local || 'Não definido'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <footer className="mt-8 text-center text-slate-400 text-xs">
          <p>© 2024 Smart Agenda • Desenvolvido com Gemini AI</p>
        </footer>
      </div>
    </div>
  );
}
