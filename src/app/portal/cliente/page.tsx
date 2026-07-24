'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Upload, 
  Download, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  LogOut, 
  ShieldCheck, 
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { mockLawsuits, mockDocuments, mockTimelineEvents, Document } from '@/lib/mockData';
import Logo from '@/components/Logo';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function ClientPortal() {
  const router = useRouter();
  const [clientName, setClientName] = useState('Roberto Albuquerque');
  const [lawsuit, setLawsuit] = useState<any>(mockLawsuits[0]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>(mockTimelineEvents);
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchClientData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Busca o nome real do usuário da tabela public.users
        const { data: dbUser } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (dbUser) {
          setClientName(dbUser.full_name || 'Cliente');
        } else {
          setClientName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente');
        }

        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (!clientData) return;

        const { data: lawsuitsData } = await supabase
          .from('lawsuits')
          .select('*')
          .eq('client_id', clientData.id);

        if (lawsuitsData && lawsuitsData.length > 0) {
          const primaryLawsuit = lawsuitsData[0];
          setLawsuit({
            id: primaryLawsuit.id,
            processNumber: primaryLawsuit.process_number,
            court: primaryLawsuit.court,
            comarca: primaryLawsuit.comarca,
            lawsuitClass: primaryLawsuit.lawsuit_class,
            status: primaryLawsuit.status,
          });

          // Buscar Linha do Tempo
          const { data: timelineData } = await supabase
            .from('timeline_events')
            .select('*')
            .eq('lawsuit_id', primaryLawsuit.id);
          
          if (timelineData && timelineData.length > 0) {
            setTimelineEvents(timelineData.map((e: any) => ({
              id: e.id,
              lawsuitId: e.lawsuit_id,
              title: e.title,
              descriptionLeiga: e.description_leiga,
              eventDate: e.event_date,
              status: e.status
            })));
          }

          // Buscar Documentos
          const { data: docsData } = await supabase
            .from('documents')
            .select('*')
            .eq('lawsuit_id', primaryLawsuit.id);

          if (docsData && docsData.length > 0) {
            setDocuments(docsData.map((d: any) => ({
              id: d.id,
              lawsuitId: d.lawsuit_id,
              fileName: d.file_name,
              fileType: d.file_type as any,
              fileSize: d.file_size,
              uploadedBy: 'Cliente',
              uploadedAt: new Date(d.uploaded_at).toLocaleString('pt-BR')
            })));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados do Supabase:', err);
      }
    };

    fetchClientData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadSuccess(false);

    if (isSupabaseConfigured) {
      try {
        const file = files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${lawsuit.id}/${fileName}`;

        // Upload no Storage
        const { error: uploadError } = await supabase.storage
          .from('process-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('process-documents')
          .getPublicUrl(filePath);

        // Inserir registro na tabela documents
        const { data: docData, error: dbError } = await supabase
          .from('documents')
          .insert({
            lawsuit_id: lawsuit.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: fileExt,
            file_size: `${(file.size / 1024).toFixed(0)} KB`,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        const newDoc: Document = {
          id: docData.id,
          lawsuitId: lawsuit.id,
          fileName: docData.file_name,
          fileType: docData.file_type as any,
          fileSize: docData.file_size,
          uploadedBy: 'Roberto Albuquerque (Cliente)',
          uploadedAt: new Date(docData.uploaded_at).toLocaleString('pt-BR'),
        };

        setDocuments(prev => [newDoc, ...prev]);
        setUploadSuccess(true);
      } catch (err) {
        console.error('Erro no upload para o Supabase:', err);
      } finally {
        setIsUploading(false);
      }
    } else {
      // Fallback para modo demonstração
      setTimeout(() => {
        const newDoc: Document = {
          id: `doc-${Date.now()}`,
          lawsuitId: lawsuit.id,
          fileName: files[0].name,
          fileType: files[0].name.endsWith('.pdf') ? 'pdf' : files[0].name.endsWith('.png') ? 'png' : 'jpg',
          fileSize: `${(files[0].size / 1024).toFixed(0)} KB`,
          uploadedBy: 'Roberto Albuquerque (Cliente)',
          uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        };

        setDocuments(prev => [newDoc, ...prev]);
        setIsUploading(false);
        setUploadSuccess(true);

        setTimeout(() => setUploadSuccess(false), 4000);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070c14] text-slate-800 dark:text-slate-100 font-sans flex flex-col">
      {/* Client Header */}
      <header className="bg-[#111111] text-white border-b border-[#b8975a]/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-10" showText={false} />
            <div className="text-left">
              <span className="text-base font-serif font-bold tracking-[0.2em] text-[#b8975a] uppercase">Torres & Silva</span>
              <p className="text-[8px] tracking-wider text-slate-400 uppercase font-medium">Portal do Cliente</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-350 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#121824] to-[#111111] rounded-2xl p-6 lg:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#b8975a]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-[#b8975a] font-semibold tracking-wider uppercase">Área Exclusiva</span>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-white mt-1">
                Olá, {clientName}
              </h1>
              <p className="text-slate-300 text-sm mt-2 max-w-xl">
                Acompanhe o andamento da sua ação judicial de forma transparente e envie os documentos solicitados diretamente por aqui.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-[#b8975a]/25 rounded-xl p-4 flex flex-col justify-center min-w-[200px]">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Número do Processo</span>
              <span className="text-sm font-mono font-bold text-[#b8975a] mt-1">{lawsuit.processNumber}</span>
              <span className="text-xs text-slate-300 mt-2 block">{lawsuit.lawsuitClass}</span>
              <span className="text-[11px] text-slate-400 block">{lawsuit.court} - {lawsuit.comarca}</span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Timeline Column (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#b8975a]" />
                  <span>Linha do Tempo Simplificada</span>
                </h2>
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-450 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {lawsuit.status}
                </span>
              </div>

              {/* Simple Leiga Timeline */}
              <div className="relative border-l-2 border-slate-250 dark:border-slate-800 ml-4 pl-6 space-y-8">
                {timelineEvents.map((event) => (
                  <div key={event.id} className="relative">
                    {/* Marker Indicator */}
                    <span className={`absolute -left-[35px] top-1.5 flex items-center justify-center rounded-full border-4 border-white dark:border-[#1a1a1a] ${
                      event.status === 'done'
                        ? 'bg-emerald-500 text-white h-5 w-5'
                        : event.status === 'current'
                        ? 'bg-[#b8975a] text-white h-5 w-5 animate-pulse'
                        : 'bg-slate-300 dark:bg-slate-750 text-slate-400 h-5 w-5'
                    }`}>
                      {event.status === 'done' && <CheckCircle2 className="h-3 w-3" />}
                    </span>

                    {/* Content */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-base font-bold ${
                          event.status === 'current' ? 'text-[#b8975a]' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {event.title}
                        </h3>
                        <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                          {event.eventDate}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
                        {event.descriptionLeiga}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assistance Box */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Dúvidas sobre o andamento?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-350">
                  Fale diretamente com seu advogado responsável pelo WhatsApp ou agende uma chamada.
                </p>
              </div>
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto text-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-all"
              >
                Falar com Dr. Carlos
              </a>
            </div>
          </div>

          {/* Document Column (1/3 width on desktop) */}
          <div className="space-y-6">
            
            {/* Upload Area */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-[#b8975a]" />
                <span>Enviar Documento</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Envie fotos, comprovantes ou contratos solicitados (Formatos: PDF, JPG, PNG de até 10MB).
              </p>

              {/* Upload Drop Zone */}
              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-6 text-center hover:border-[#b8975a]/60 dark:hover:border-[#b8975a]/60 transition-all bg-slate-50/50 dark:bg-slate-900/30">
                <input 
                  type="file" 
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <Loader2 className="h-8 w-8 text-[#b8975a] animate-spin" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Enviando e criptografando arquivo...</span>
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    <Upload className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Clique para selecionar</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">ou arraste e solte o arquivo aqui</p>
                  </div>
                )}
              </div>

              {uploadSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/35 text-emerald-600 dark:text-emerald-400 rounded-lg p-3 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Documento enviado com sucesso! Associado ao seu processo.</span>
                </div>
              )}
            </div>

            {/* Documents List */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#b8975a]" />
                <span>Documentos do Processo</span>
              </h2>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-[#121824]/10 dark:bg-[#b8975a]/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-[#b8975a]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {doc.fileName}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                          {doc.fileSize} • {doc.uploadedAt}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      title="Download do documento"
                      className="p-1.5 text-slate-400 hover:text-[#b8975a] rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* LGPD Conformity Footer */}
      <footer className="bg-white dark:bg-[#111111] border-t border-slate-200 dark:border-slate-900 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#b8975a]" />
            <span>Dados protegidos nos termos da LGPD (Lei nº 13.709/2018). Canal do DPO: dpo@torressilva.com.br</span>
          </div>
          <span>© {new Date().getFullYear()} Torres & Silva Advogados. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
