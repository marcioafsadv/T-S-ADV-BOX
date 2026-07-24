'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Scale,
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  FileText, 
  Search, 
  LogOut, 
  User, 
  Tag, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { mockDeadlines, mockLawsuits, mockDocuments, Deadline } from '@/lib/mockData';
import Logo from '@/components/Logo';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function LawyerDashboard() {
  const router = useRouter();
  
  const [deadlines, setDeadlines] = useState<Deadline[]>(mockDeadlines);
  const [lawsuitsList, setLawsuitsList] = useState<any[]>(mockLawsuits);
  const [lawyerName, setLawyerName] = useState('Dr. Carlos Silva');
  const [lawyerEmail, setLawyerEmail] = useState('carlos.silva@torressilva.com.br');
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [lawsuitId, setLawsuitId] = useState(mockLawsuits[0].id);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchLawyerData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Busca o nome real do usuário da tabela public.users
        const { data: dbUser } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        if (dbUser) {
          setLawyerName(dbUser.full_name || 'Dr. Advogado');
          setLawyerEmail(dbUser.email || user.email || 'advogado@torressilva.com.br');
        } else {
          setLawyerName(user.user_metadata?.full_name || 'Dr. Advogado');
          setLawyerEmail(user.email || 'advogado@torressilva.com.br');
        }

        // Buscar processos
        const { data: lawsuitsData } = await supabase
          .from('lawsuits')
          .select('*');

        if (lawsuitsData && lawsuitsData.length > 0) {
          const mappedLawsuits = lawsuitsData.map((l: any) => ({
            id: l.id,
            processNumber: l.process_number,
            court: l.court,
            comarca: l.comarca,
            lawsuitClass: l.lawsuit_class,
            status: l.status,
            clientName: 'Cliente'
          }));
          setLawsuitsList(mappedLawsuits);
          setLawsuitId(mappedLawsuits[0].id);
        }

        // Buscar prazos com join em lawsuits para obter o process_number
        const { data: deadlinesData } = await supabase
          .from('deadlines')
          .select('*, lawsuits(process_number)')
          .order('deadline_date', { ascending: true });

        if (deadlinesData && deadlinesData.length > 0) {
          setDeadlines(deadlinesData.map((d: any) => {
            const diffTime = new Date(d.deadline_date).getTime() - new Date().getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return {
              id: d.id,
              lawsuitId: d.lawsuit_id,
              processNumber: (d.lawsuits as any)?.process_number || '0000000-00.0000.0.00.0000',
              description: d.description,
              deadlineDate: d.deadline_date,
              priority: d.priority as any,
              status: d.status as any,
              daysLeft: diffDays > 0 ? diffDays : 0
            };
          }));
        }
      } catch (err) {
        console.error('Erro ao carregar dados do Supabase para advogado:', err);
      }
    };

    fetchLawyerData();
  }, []);

  const handleCompleteDeadline = async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('deadlines')
          .update({ status: 'Concluído', completed_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        console.error('Erro ao atualizar status no Supabase:', err);
      }
    }

    setDeadlines(prev => 
      prev.map(d => d.id === id ? { ...d, status: 'Concluído' } : d)
    );
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !deadlineDate) return;

    const selectedLawsuit = lawsuitsList.find(l => l.id === lawsuitId);
    const diffTime = new Date(deadlineDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('deadlines')
          .insert({
            lawsuit_id: lawsuitId,
            description,
            deadline_date: deadlineDate,
            priority,
            status: 'Pendente'
          })
          .select()
          .single();

        if (error) throw error;

        const newDeadline: Deadline = {
          id: data.id,
          lawsuitId,
          processNumber: selectedLawsuit?.processNumber || '0000000-00.0000.0.00.0000',
          description,
          deadlineDate,
          priority,
          status: 'Pendente',
          daysLeft: diffDays > 0 ? diffDays : 0,
        };

        setDeadlines(prev => [newDeadline, ...prev]);
      } catch (err) {
        console.error('Erro ao inserir prazo no Supabase:', err);
      }
    } else {
      const newDeadline: Deadline = {
        id: `prazo-${Date.now()}`,
        lawsuitId,
        processNumber: selectedLawsuit?.processNumber || '0000000-00.0000.0.00.0000',
        description,
        deadlineDate,
        priority,
        status: 'Pendente',
        daysLeft: diffDays > 0 ? diffDays : 0,
      };

      setDeadlines(prev => [newDeadline, ...prev]);
    }

    setDescription('');
    setDeadlineDate('');
    setShowAddForm(false);
  };

  // Filter deadlines list
  const filteredDeadlines = deadlines.filter(d => {
    if (filter === 'all') return true;
    return d.priority === filter;
  });

  // Calculate metrics
  const activeDeadlines = deadlines.filter(d => d.status === 'Pendente');
  const highPriorityCount = activeDeadlines.filter(d => d.priority === 'high').length;
  const completedCount = deadlines.filter(d => d.status === 'Concluído').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070c14] text-slate-800 dark:text-slate-100 font-sans flex">
      
      {/* Left Sidebar (Desktop Only) */}
      <aside className="hidden lg:flex w-64 bg-[#111111] text-slate-300 flex-col border-r border-[#b8975a]/25">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <Logo className="h-10 w-10" showText={false} />
          <div className="text-left">
            <span className="text-sm font-serif font-bold tracking-[0.15em] text-[#b8975a] block uppercase">Torres & Silva</span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold block mt-0.5">Painel do Advogado</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 block mb-2">Principal</span>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-slate-800/50 text-[#b8975a] font-semibold border-l-2 border-[#b8975a]">
            <Calendar className="h-4 w-4" />
            <span>Prazos & Audiências</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-900/60 hover:text-white transition-all text-slate-400">
            <Scale className="h-4 w-4" />
            <span>Processos Ativos</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-900/60 hover:text-white transition-all text-slate-400">
            <User className="h-4 w-4" />
            <span>Clientes cadastrados</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-900/60 hover:text-white transition-all text-slate-400">
            <FileText className="h-4 w-4" />
            <span>Documentação Geral</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-9 w-9 rounded-full bg-[#b8975a] text-[#111111] flex items-center justify-center font-bold uppercase">
              {lawyerName.includes('Dr.') ? lawyerName.replace('Dr. ', '').split(' ').slice(0, 2).map(n => n[0]).join('') : lawyerName.split(' ').slice(0, 2).map(n => n[0]).join('')}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-white block truncate">{lawyerName}</span>
              <span className="text-[10px] text-slate-400 block truncate">{lawyerEmail}</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs hover:bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo className="h-6 w-6" showText={false} />
            <span className="text-base font-serif font-bold text-slate-900 dark:text-white">TORRES & SILVA</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <span>Escritório Central</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 dark:text-white font-medium">Controle Operacional de Prazos</span>
          </div>

          {/* Quick exit for mobile */}
          <button
            onClick={() => router.push('/')}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* Dashboard Content */}
        <main className="flex-grow p-6 space-y-6 overflow-y-auto">
          
          {/* Welcome and Summary Cards */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Gestão Operacional de Prazos</h1>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border w-fit ${
                  isSupabaseConfigured
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-500'
                }`}>
                  {isSupabaseConfigured ? 'Supabase Ativo' : 'Modo Demo (Mocks)'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Monitore os prazos fatais, audiências e responda à documentação dos clientes.</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center gap-2 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Prazo Fatal</span>
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-450 dark:text-slate-400 font-semibold uppercase tracking-wider block">Prazos Ativos</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{activeDeadlines.length}</span>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#b8975a]/10 flex items-center justify-center text-[#b8975a]">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-450 dark:text-slate-400 font-semibold uppercase tracking-wider block">Alerta Crítico (Alta)</span>
                <span className="text-2xl font-bold text-red-500">{highPriorityCount}</span>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-450 dark:text-slate-400 font-semibold uppercase tracking-wider block">Prazos Concluídos</span>
                <span className="text-2xl font-bold text-emerald-500">{completedCount}</span>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Form Modal (conditional) */}
          {showAddForm && (
            <div className="bg-white dark:bg-[#1a1a1a] border border-[#b8975a]/30 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-md font-serif font-bold text-slate-900 dark:text-white">Criar Novo Prazo Processual</h3>
                <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-250 text-sm">Cancelar</button>
              </div>
              <form onSubmit={handleAddDeadline} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs text-slate-450 font-medium">Descrição da Tarefa</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Apresentar contrarrazões de apelação"
                    className="w-full text-sm px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 text-white placeholder-slate-550 focus:border-[#b8975a] outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-450 font-medium">Vincular ao Processo</label>
                  <select
                    value={lawsuitId}
                    onChange={(e) => setLawsuitId(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 text-white focus:border-[#b8975a] outline-none"
                  >
                    {mockLawsuits.map(l => (
                      <option key={l.id} value={l.id}>{l.processNumber} ({l.clientName})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-450 font-medium">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full text-sm px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 text-white focus:border-[#b8975a] outline-none"
                  >
                    <option value="high">Alta (Urgente)</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-450 font-medium">Data Fatal</label>
                  <input
                    type="date"
                    required
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 text-white focus:border-[#b8975a] outline-none"
                  />
                </div>
                <div className="md:col-span-4 flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#b8975a] text-[#111111] hover:bg-[#e2c690] font-bold rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Adicionar Prazo
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grid Layout: Deadlines list & Pending Client Documents */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Deadlines List Section (2/3 width) */}
            <div className="lg:col-span-2 bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#b8975a]" />
                  <span>Agenda de Prazos Fatais</span>
                </h2>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      filter === 'all' ? 'bg-[#b8975a] text-[#111111]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilter('high')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      filter === 'high' ? 'bg-red-500 text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                    }`}
                  >
                    Alta
                  </button>
                  <button
                    onClick={() => setFilter('medium')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      filter === 'medium' ? 'bg-yellow-500 text-slate-900' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                    }`}
                  >
                    Média
                  </button>
                  <button
                    onClick={() => setFilter('low')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      filter === 'low' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                    }`}
                  >
                    Baixa
                  </button>
                </div>
              </div>

              {/* Deadlines Table / Cards list */}
              <div className="space-y-4">
                {filteredDeadlines.length === 0 ? (
                  <p className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">Nenhum prazo correspondente encontrado.</p>
                ) : (
                  filteredDeadlines.map((deadline) => (
                    <div 
                      key={deadline.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        deadline.status === 'Concluído'
                          ? 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                          : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-[#b8975a]/30'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            deadline.priority === 'high'
                              ? 'bg-red-500/10 border border-red-500/35 text-red-500'
                              : deadline.priority === 'medium'
                              ? 'bg-yellow-500/10 border border-yellow-500/35 text-yellow-600 dark:text-yellow-500'
                              : 'bg-blue-500/10 border border-blue-500/35 text-blue-500'
                          }`}>
                            Prioridade {deadline.priority === 'high' ? 'Alta' : deadline.priority === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 block truncate">
                            Proc: {deadline.processNumber}
                          </span>
                        </div>
                        <h4 className={`text-sm font-bold text-slate-800 dark:text-slate-100 ${
                          deadline.status === 'Concluído' ? 'line-through text-slate-500' : ''
                        }`}>
                          {deadline.description}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-450">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Data Fatal: {new Date(deadline.deadlineDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                          {deadline.status === 'Pendente' && (
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              ({deadline.daysLeft === 1 ? 'Restam 24h' : `Restam ${deadline.daysLeft} dias`})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="shrink-0 flex items-center gap-2">
                        {deadline.status === 'Pendente' ? (
                          <button
                            onClick={() => handleCompleteDeadline(deadline.id)}
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Concluir</span>
                          </button>
                        ) : (
                          <span className="text-emerald-500 flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Resolvido</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Client uploads notification panel (1/3 width) */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Inbox className="h-5 w-5 text-[#b8975a]" />
                <span>Documentos Recebidos</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arquivos anexados por clientes pendentes de validação processual.
              </p>

              <div className="space-y-3">
                {mockDocuments.map((doc) => (
                  <div 
                    key={doc.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-lg space-y-2 hover:border-[#b8975a]/30 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#b8975a] shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate block">
                        {doc.fileName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>Autor: {doc.uploadedBy.split(' ')[0]}</span>
                      <span>Tam: {doc.fileSize}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                      <span className="text-[10px] text-slate-500">{doc.uploadedAt}</span>
                      <button className="text-[10px] font-bold text-[#b8975a] hover:underline cursor-pointer">
                        Validar & Vincular
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
