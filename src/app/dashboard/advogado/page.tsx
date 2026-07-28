'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Scale, 
  Calendar, 
  User, 
  FileText, 
  ChevronRight, 
  LogOut, 
  CheckCircle2, 
  Inbox, 
  Plus, 
  AlertCircle, 
  Clock, 
  Check, 
  X, 
  Upload,
  ExternalLink,
  ChevronDown,
  FolderOpen,
  Users,
  ShieldAlert,
  ShieldCheck,
  Pencil,
  Trash2
} from 'lucide-react';
import Logo from '@/components/Logo';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface PrazoFatal {
  id: string;
  processo_numero: string;
  titulo: string;
  data_fatal: string;
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
  status: 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO';
  responsavel_id: string | null;
  protocolo_comprovante_url: string | null;
  created_at?: string;
}

interface DocumentoRecebido {
  id: string;
  cliente_nome: string;
  documento_tipo: string;
  arquivo_url: string;
  tamanho_kb: number;
  status_validacao: 'PENDENTE' | 'VALIDADO' | 'REJEITADO';
  processo_vinculado_id: string | null;
  created_at?: string;
}

interface ProcessoAtivo {
  id: string;
  process_number: string;
  court: string;
  comarca: string;
  lawsuit_class: string;
  status: 'Ativo' | 'Suspenso' | 'Arquivado';
  client_id: string;
  client_name?: string;
  value_of_cause?: string | null;
  distribution_date?: string | null;
  active_parties?: string | null;
  passive_parties?: string | null;
}

interface ClienteCadastrado {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  cpf_cnpj: string;
  client_type: 'individual' | 'corporate';
  lgpd_consent: boolean;
  created_at: string;
}

export default function LawyerDashboard() {
  const router = useRouter();
  
  // Controle de Navegação Interna (Abas)
  const [activeTab, setActiveTab] = useState<'prazos' | 'processos' | 'clientes'>('prazos');

  // Estados de Dados
  const [deadlines, setDeadlines] = useState<PrazoFatal[]>([]);
  const [documents, setDocuments] = useState<DocumentoRecebido[]>([]);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [lawsuitsList, setLawsuitsList] = useState<ProcessoAtivo[]>([]);
  const [clientsList, setClientsList] = useState<ClienteCadastrado[]>([]);
  
  // Estado do Usuário Logado
  const [lawyerName, setLawyerName] = useState('Dr. Advogado');
  const [lawyerEmail, setLawyerEmail] = useState('advogado@torressilva.com.br');
  
  // Estados de Interface e Modais
  const [filter, setFilter] = useState<'all' | 'ALTA' | 'MEDIA' | 'BAIXA'>('all');
  const [processFilter, setProcessFilter] = useState<'all' | 'Ativo' | 'Suspenso' | 'Arquivado'>('all');
  const [clientFilter, setClientFilter] = useState<'all' | 'individual' | 'corporate'>('all');
  const [loading, setLoading] = useState(true);
  
  // Modal de Cadastro de Novo Prazo
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProcesso, setNewProcesso] = useState('');
  const [newTitulo, setNewTitulo] = useState('');
  const [newDataFatal, setNewDataFatal] = useState('');
  const [newPrioridade, setNewPrioridade] = useState<'ALTA' | 'MEDIA' | 'BAIXA'>('ALTA');
  const [newResponsavel, setNewResponsavel] = useState('');

  // Modal de Cadastro de Novo Processo
  const [showAddProcessModal, setShowAddProcessModal] = useState(false);
  const [procNumber, setProcNumber] = useState('');
  const [procCourt, setProcCourt] = useState('');
  const [procComarca, setProcComarca] = useState('');
  const [procClass, setProcClass] = useState('');
  const [procStatus, setProcStatus] = useState<'Ativo' | 'Suspenso' | 'Arquivado'>('Ativo');
  const [procClientId, setProcClientId] = useState('');

  // Modal de Cadastro de Novo Cliente
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCpfCnpj, setNewClientCpfCnpj] = useState('');
  const [newClientType, setNewClientType] = useState<'individual' | 'corporate'>('individual');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Modal de Conclusão de Prazo
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<PrazoFatal | null>(null);
  const [protocoloNum, setProtocoloNum] = useState('');
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Modal de Validação de Documento
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoRecebido | null>(null);
  const [linkedProcessId, setLinkedProcessId] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Modal de Importação via OAB (Escavador)
  const [showImportOabModal, setShowImportOabModal] = useState(false);
  const [oabNumber, setOabNumber] = useState('');
  const [oabUf, setOabUf] = useState('SP');
  const [isSearchingOab, setIsSearchingOab] = useState(false);
  const [foundProcessos, setFoundProcessos] = useState<any[]>([]);
  const [selectedProcessos, setSelectedProcessos] = useState<string[]>([]);
  const [processoClients, setProcessoClients] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [isSearchingCNJ, setIsSearchingCNJ] = useState(false);
  const [procValueOfCause, setProcValueOfCause] = useState<string>('');
  const [procDistributionDate, setProcDistributionDate] = useState<string>('');
  const [procMovements, setProcMovements] = useState<any[]>([]);
  const [procActiveParties, setProcActiveParties] = useState<string>('');
  const [procPassiveParties, setProcPassiveParties] = useState<string>('');

  // Estados do Drawer Lateral de Detalhes do Processo
  const [selectedLawsuitForDetail, setSelectedLawsuitForDetail] = useState<ProcessoAtivo | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState<'resumo' | 'prazos' | 'tarefas' | 'historico'>('resumo');
  const [drawerDeadlines, setDrawerDeadlines] = useState<any[]>([]);
  const [drawerTasks, setDrawerTasks] = useState<any[]>([]);
  const [drawerEvents, setDrawerEvents] = useState<any[]>([]);
  const [isLoadingDrawerData, setIsLoadingDrawerData] = useState(false);
  const [newDrawerDeadlineDesc, setNewDrawerDeadlineDesc] = useState('');
  const [newDrawerDeadlineDate, setNewDrawerDeadlineDate] = useState('');
  const [newDrawerDeadlinePriority, setNewDrawerDeadlinePriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newDrawerTaskTitle, setNewDrawerTaskTitle] = useState('');
  const [newDrawerEventTitle, setNewDrawerEventTitle] = useState('');
  const [newDrawerEventDesc, setNewDrawerEventDesc] = useState('');

  // Estados do Modal de Edição de Processo
  const [showEditProcessModal, setShowEditProcessModal] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProcessoAtivo | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editCourt, setEditCourt] = useState('');
  const [editComarca, setEditComarca] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editStatus, setEditStatus] = useState<'Ativo' | 'Suspenso' | 'Arquivado'>('Ativo');
  const [editClientId, setEditClientId] = useState('');
  const [editValueOfCause, setEditValueOfCause] = useState('');
  const [editDistributionDate, setEditDistributionDate] = useState('');
  const [editActiveParties, setEditActiveParties] = useState('');
  const [editPassiveParties, setEditPassiveParties] = useState('');

  // Função para buscar processos com os nomes dos clientes
  const fetchLawsuits = async () => {
    try {
      const { data: dbLawsuits, error } = await supabase
        .from('lawsuits')
        .select(`
          id,
          process_number,
          court,
          comarca,
          lawsuit_class,
          status,
          client_id,
          value_of_cause,
          distribution_date,
          active_parties,
          passive_parties,
          clients (
            id,
            users (
              full_name
            )
          )
        `);
      
      if (error) throw error;
      
      if (dbLawsuits) {
        const mapped: ProcessoAtivo[] = dbLawsuits.map((l: any) => {
          // Trata se l.clients vier como array (caso comum em relacionamentos do Supabase) ou objeto
          const clientData = Array.isArray(l.clients) ? l.clients[0] : l.clients;
          return {
            id: l.id,
            process_number: l.process_number,
            court: l.court,
            comarca: l.comarca,
            lawsuit_class: l.lawsuit_class,
            status: l.status,
            client_id: l.client_id,
            client_name: clientData?.users?.full_name || 'Cliente Geral',
            value_of_cause: l.value_of_cause,
            distribution_date: l.distribution_date,
            active_parties: l.active_parties,
            passive_parties: l.passive_parties
          };
        });
        setLawsuitsList(mapped);
      }
    } catch (err: any) {
      console.error('Erro ao buscar processos:', err);
      alert('Erro ao buscar processos no Supabase: ' + err.message);
    }
  };

  // Função para buscar a lista de clientes cadastrados
  const fetchClients = async () => {
    try {
      const { data: dbClients, error } = await supabase
        .from('clients')
        .select(`
          id,
          cpf_cnpj,
          client_type,
          created_at,
          users (
            full_name,
            email,
            phone,
            lgpd_consent
          )
        `);

      if (error) throw error;

      if (dbClients) {
        const mapped: ClienteCadastrado[] = dbClients.map((c: any) => {
          const userData = Array.isArray(c.users) ? c.users[0] : c.users;
          return {
            id: c.id,
            client_name: userData?.full_name || 'Cliente Sem Nome',
            client_email: userData?.email || 'Sem e-mail',
            client_phone: userData?.phone || 'Sem telefone',
            cpf_cnpj: c.cpf_cnpj,
            client_type: c.client_type,
            lgpd_consent: userData?.lgpd_consent || false,
            created_at: c.created_at
          };
        });
        setClientsList(mapped);
      }
    } catch (err: any) {
      console.error('Erro ao buscar clientes:', err);
      alert('Erro ao buscar clientes no Supabase: ' + err.message);
    }
  };

  // 1. Carregamento de Dados Iniciais e Subs de Realtime
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      
      // Se Supabase não estiver configurado, carregar dados Mocks
      if (!isSupabaseConfigured) {
        setDeadlines([
          {
            id: 'mock-1',
            processo_numero: '0012345-67.2024.8.19.0001',
            titulo: 'Réplica à Contestação apresentada pelo Réu',
            data_fatal: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            prioridade: 'ALTA',
            status: 'PENDENTE',
            responsavel_id: null,
            protocolo_comprovante_url: null
          },
          {
            id: 'mock-2',
            processo_numero: '0038765-43.2023.8.26.0100',
            titulo: 'Manifestar-se sobre laudo de avaliação pericial',
            data_fatal: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            prioridade: 'MEDIA',
            status: 'PENDENTE',
            responsavel_id: null,
            protocolo_comprovante_url: null
          },
          {
            id: 'mock-3',
            processo_numero: '0012345-67.2024.8.19.0001',
            titulo: 'Recolhimento de custas para expedição de mandado',
            data_fatal: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
            prioridade: 'BAIXA',
            status: 'PENDENTE',
            responsavel_id: null,
            protocolo_comprovante_url: null
          }
        ]);
        setDocuments([
          {
            id: 'mock-doc-1',
            cliente_nome: 'Roberto Albuquerque',
            documento_tipo: 'Procuracao_Assinada_Roberto.pdf',
            arquivo_url: '#',
            tamanho_kb: 425,
            status_validacao: 'PENDENTE',
            processo_vinculado_id: null
          },
          {
            id: 'mock-doc-2',
            cliente_nome: 'Roberto Albuquerque',
            documento_tipo: 'Comprovante_Residencia.jpg',
            arquivo_url: '#',
            tamanho_kb: 1228,
            status_validacao: 'PENDENTE',
            processo_vinculado_id: null
          }
        ]);
        setLawyers([{ id: 'mock-l1', full_name: 'Dr. Carlos Silva' }]);
        setClientsList([
          {
            id: 'mock-c1',
            client_name: 'Roberto Albuquerque',
            client_email: 'roberto.albuquerque@gmail.com',
            client_phone: '(11) 99888-7766',
            cpf_cnpj: '123.456.789-00',
            client_type: 'individual',
            lgpd_consent: true,
            created_at: new Date().toISOString()
          }
        ]);
        setLawsuitsList([
          {
            id: 'mock-lawsuit-1',
            process_number: '0012345-67.2024.8.19.0001',
            court: '3ª Vara Cível de Madureira',
            comarca: 'Rio de Janeiro / RJ',
            lawsuit_class: 'Procedimento Comum Cível',
            status: 'Ativo',
            client_id: 'mock-c1',
            client_name: 'Roberto Albuquerque'
          }
        ]);
        setLoading(false);
        return;
      }

      try {
        // Carrega dados de usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          if (dbUser) {
            setLawyerName(dbUser.full_name || 'Dr. Advogado');
            setLawyerEmail(dbUser.email || user.email || '');
          } else {
            setLawyerName(user.user_metadata?.full_name || 'Dr. Advogado');
            setLawyerEmail(user.email || '');
          }
        }

        // Buscar Advogados do escritório
        const { data: dbLawyers } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('role', 'lawyer');
        if (dbLawyers) setLawyers(dbLawyers);

        // Buscar Clientes cadastrados
        await fetchClients();

        // Buscar Processos Iniciais
        await fetchLawsuits();

        // Buscar Prazos Fatais
        const { data: dbPrazos } = await supabase
          .from('prazos_fatais')
          .select('*')
          .order('data_fatal', { ascending: true });
        if (dbPrazos) setDeadlines(dbPrazos);

        // Buscar Documentos Recebidos
        const { data: dbDocs } = await supabase
          .from('documentos_recebidos')
          .select('*')
          .order('created_at', { ascending: false });
        if (dbDocs) setDocuments(dbDocs);

      } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Habilitar escutas em tempo real (Supabase Realtime)
    if (isSupabaseConfigured) {
      const prazosChannel = supabase
        .channel('prazos_realtime_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'prazos_fatais' },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              setDeadlines(prev => [payload.new as PrazoFatal, ...prev].sort((a, b) => new Date(a.data_fatal).getTime() - new Date(b.data_fatal).getTime()));
            } else if (payload.eventType === 'UPDATE') {
              setDeadlines(prev => prev.map(p => p.id === payload.new.id ? (payload.new as PrazoFatal) : p));
            } else if (payload.eventType === 'DELETE') {
              setDeadlines(prev => prev.filter(p => p.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      const docsChannel = supabase
        .channel('docs_realtime_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'documentos_recebidos' },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              setDocuments(prev => [payload.new as DocumentoRecebido, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setDocuments(prev => prev.map(d => d.id === payload.new.id ? (payload.new as DocumentoRecebido) : d));
            } else if (payload.eventType === 'DELETE') {
              setDocuments(prev => prev.filter(d => d.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      const lawsuitsChannel = supabase
        .channel('lawsuits_realtime_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'lawsuits' },
          async () => {
            await fetchLawsuits();
          }
        )
        .subscribe();

      const clientsChannel = supabase
        .channel('clients_realtime_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clients' },
          async () => {
            await fetchClients();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(prazosChannel);
        supabase.removeChannel(docsChannel);
        supabase.removeChannel(lawsuitsChannel);
        supabase.removeChannel(clientsChannel);
      };
    }
  }, []);

  // 2. Ações de Prazos Fatais
  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcesso || !newTitulo || !newDataFatal) return;

    const dataNew = {
      processo_numero: newProcesso,
      titulo: newTitulo,
      data_fatal: new Date(newDataFatal).toISOString(),
      prioridade: newPrioridade,
      status: 'PENDENTE' as const,
      responsavel_id: newResponsavel || null,
      protocolo_comprovante_url: null
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('prazos_fatais')
          .insert(dataNew);
        if (error) throw error;
      } catch (err: any) {
        alert('Erro ao cadastrar prazo: ' + err.message);
      }
    } else {
      const mockNew: PrazoFatal = {
        id: `prazo-mock-${Date.now()}`,
        ...dataNew
      };
      setDeadlines(prev => [mockNew, ...prev].sort((a, b) => new Date(a.data_fatal).getTime() - new Date(b.data_fatal).getTime()));
    }

    setNewProcesso('');
    setNewTitulo('');
    setNewDataFatal('');
    setNewPrioridade('ALTA');
    setNewResponsavel('');
    setShowAddModal(false);
  };

  const handleCompleteDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeadline) return;

    setIsCompleting(true);
    let comprovanteUrl = null;

    if (isSupabaseConfigured) {
      try {
        if (comprovanteFile) {
          const fileExt = comprovanteFile.name.split('.').pop();
          const fileName = `${selectedDeadline.id}_${Date.now()}.${fileExt}`;
          const filePath = `comprovantes/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('process-documents')
            .upload(filePath, comprovanteFile);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from('process-documents')
            .getPublicUrl(filePath);
          comprovanteUrl = data.publicUrl;
        }

        const { error } = await supabase
          .from('prazos_fatais')
          .update({
            status: 'CONCLUIDO',
            protocolo_comprovante_url: comprovanteUrl || protocoloNum || 'Finalizado'
          })
          .eq('id', selectedDeadline.id);

        if (error) throw error;
      } catch (err: any) {
        alert('Erro ao concluir prazo: ' + err.message);
      } finally {
        setIsCompleting(false);
        setShowCompleteModal(false);
        setSelectedDeadline(null);
        setProtocoloNum('');
        setComprovanteFile(null);
      }
    } else {
      setDeadlines(prev => 
        prev.map(p => p.id === selectedDeadline.id 
          ? { ...p, status: 'CONCLUIDO', protocolo_comprovante_url: protocoloNum || 'Finalizado simulado' } 
          : p
        )
      );
      setIsCompleting(false);
      setShowCompleteModal(false);
      setSelectedDeadline(null);
      setProtocoloNum('');
      setComprovanteFile(null);
    }
  };

  const handleSearchCNJ = async () => {
    const cleanNumber = procNumber.replace(/\D/g, '');
    if (cleanNumber.length !== 20) {
      alert('Por favor, digite o número do processo com os 20 dígitos (Padrão CNJ) antes de buscar.');
      return;
    }

    setIsSearchingCNJ(true);
    try {
      // 1. Tenta buscar pelo Backend
      const res = await fetch('/api/lawsuits/import-by-cnj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processNumber: procNumber })
      });
      const resData = await res.json();
      
      if (!res.ok || resData.success === false) {
        throw new Error(resData.message || resData.error || 'Erro no servidor.');
      }

      const { court, comarca, lawsuit_class, value_of_cause, distribution_date, active_parties, passive_parties, movements } = resData.data;
      setProcCourt(court);
      setProcComarca(comarca);
      setProcClass(lawsuit_class);
      setProcValueOfCause(value_of_cause || '');
      setProcDistributionDate(distribution_date || '');
      setProcActiveParties(active_parties || '');
      setProcPassiveParties(passive_parties || '');
      setProcMovements(movements || []);
      alert('Dados do processo importados com sucesso da base do Datajud/CNJ!');
    } catch (err: any) {
      // 2. Fallback de conexão direta pelo navegador do usuário (ignora bloqueio de IP da Hostinger)
      console.warn('Backend falhou (provável bloqueio de IP da hospedagem). Iniciando busca direta do navegador...', err);
      try {
        const clean = cleanNumber;
        const j = clean.slice(13, 14); // Segmento da Justiça
        const tr = clean.slice(14, 16); // Tribunal
        let tribunal = 'tjsp';
        
        if (j === '8') {
          const ufMap: Record<string, string> = {
            '01': 'tjac', '02': 'tjal', '03': 'tjap', '04': 'tjam', '05': 'tjba',
            '06': 'tjce', '07': 'tjdft', '08': 'tjes', '09': 'tjgo', '10': 'tjma',
            '11': 'tjmt', '12': 'tjms', '13': 'tjmg', '14': 'tjpa', '15': 'tjpb',
            '16': 'tjpr', '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn',
            '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc', '25': 'tjse',
            '26': 'tjsp', '27': 'tjto'
          };
          tribunal = ufMap[tr] || 'tjsp';
        } else if (j === '5') {
          tribunal = `trt${parseInt(tr, 10)}`;
        } else if (j === '4') {
          tribunal = `trf${parseInt(tr, 10)}`;
        } else if (j === '1') {
          tribunal = 'stf';
        } else if (j === '3') {
          tribunal = 'stj';
        }

        const directUrl = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;
        // Usamos o proxy de CORS gratuito allorigins.win para contornar a política de CORS do navegador ao acessar o CNJ diretamente
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
        
        const directRes = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'ApiKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: { match: { numeroProcesso: clean } },
            size: 1
          }),
          signal: AbortSignal.timeout(20000) // Aumentado para 20 segundos
        });

        if (!directRes.ok) throw new Error(`Conexão direta recusada pelo CNJ via Proxy (Status ${directRes.status}).`);
        const directData = await directRes.json();
        const hit = directData.hits?.hits?.[0];
        
        if (!hit) {
          throw new Error('Processo não encontrado na base do Datajud.');
        }
        
        const source = hit._source || {};
        setProcCourt(source.orgaoJulgador?.nome || 'Vara Cível');
        setProcComarca(source.tribunal || tribunal.toUpperCase());
        setProcClass(source.classe?.nome || 'Procedimento Comum Cível');
        setProcValueOfCause(source.valorCausa ? `R$ ${Number(source.valorCausa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '');
        setProcDistributionDate(source.dataHoraDistribuicao 
          ? source.dataHoraDistribuicao.slice(0, 10) 
          : (source.dataAjuizamento && source.dataAjuizamento.length >= 8)
            ? `${source.dataAjuizamento.slice(0, 4)}-${source.dataAjuizamento.slice(4, 6)}-${source.dataAjuizamento.slice(6, 8)}`
            : '');
        setProcActiveParties(source.partes
          ?.filter((p: any) => {
            const polo = String(p.polo || '').toUpperCase();
            const tipo = String(p.tipoParticipacao || '').toUpperCase();
            return polo === 'ATIVO' || polo === 'AT' || tipo.includes('AUTOR') || tipo.includes('RECLAMANTE') || tipo.includes('ATIVO') || tipo.includes('IMPETRANTE');
          })
          .map((p: any) => p.nome)
          .join(', ') || '');
        setProcPassiveParties(source.partes
          ?.filter((p: any) => {
            const polo = String(p.polo || '').toUpperCase();
            const tipo = String(p.tipoParticipacao || '').toUpperCase();
            return polo === 'PASSIVO' || polo === 'PA' || tipo.includes('REU') || tipo.includes('RECLAMADO') || tipo.includes('PASSIVO') || tipo.includes('IMPETRADO');
          })
          .map((p: any) => p.nome)
          .join(', ') || '');
        setProcMovements(source.movimentos?.map((m: any) => ({
          title: m.nome || 'Movimentação Processual',
          description_leiga: m.complemento || 'Movimentação registrada no tribunal.',
          event_date: m.dataHora ? new Date(m.dataHora).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('pt-BR')
        })) || []);
        alert('Dados do processo importados com sucesso via conexão direta (CORS Fallback)!');
      } catch (directErr: any) {
        alert('Erro ao buscar processo no Datajud: ' + directErr.message);
      }
    } finally {
      setIsSearchingCNJ(false);
    }
  };

  // 3. Ações de Processos Ativos
  const handleCreateLawsuit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procNumber || !procCourt || !procComarca || !procClass || !procClientId) return;

    const dataNew = {
      process_number: procNumber,
      court: procCourt,
      comarca: procComarca,
      lawsuit_class: procClass,
      status: procStatus,
      client_id: procClientId,
      value_of_cause: procValueOfCause || null,
      distribution_date: procDistributionDate || null,
      active_parties: procActiveParties || null,
      passive_parties: procPassiveParties || null
    };

    if (isSupabaseConfigured) {
      try {
        const { data: inserted, error } = await supabase
          .from('lawsuits')
          .insert(dataNew)
          .select('id')
          .single();
        if (error) throw error;

        // Se houver histórico de movimentações pré-buscadas no CNJ, insere todas no timeline_events
        if (inserted && procMovements.length > 0) {
          const eventsToInsert = procMovements.map(m => ({
            lawsuit_id: inserted.id,
            title: m.title,
            description_leiga: m.description_leiga,
            event_date: m.event_date,
            status: 'done'
          }));
          const { error: evErr } = await supabase.from('timeline_events').insert(eventsToInsert);
          if (evErr) {
            console.warn('Aviso ao importar linha do tempo do CNJ:', evErr);
            alert('O processo foi cadastrado com sucesso, mas não foi possível importar a linha do tempo automática do CNJ (provavelmente devido a políticas de segurança RLS na tabela timeline_events). Você pode cadastrar andamentos manualmente no painel do processo.');
          }
        }
        
        alert('Processo cadastrado e histórico do CNJ importado com sucesso!');
        fetchLawsuits(); // Recarrega a lista
      } catch (err: any) {
        alert('Erro ao cadastrar processo: ' + err.message);
      }
    } else {
      const selectedClient = clientsList.find(c => c.id === procClientId);
      const mockNew: ProcessoAtivo = {
        id: `processo-mock-${Date.now()}`,
        client_name: selectedClient?.client_name || 'Cliente Geral',
        ...dataNew
      };
      setLawsuitsList(prev => [mockNew, ...prev]);
    }

    setProcNumber('');
    setProcCourt('');
    setProcComarca('');
    setProcClass('');
    setProcStatus('Ativo');
    setProcClientId('');
    setProcValueOfCause('');
    setProcDistributionDate('');
    setProcMovements([]);
    setProcActiveParties('');
    setProcPassiveParties('');
    setShowAddProcessModal(false);
  };

  const handleDeleteLawsuit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evita abrir o drawer lateral ao clicar no botão de excluir
    if (!confirm('Deseja realmente excluir este processo? Esta ação é irreversível e apagará todos os prazos, tarefas e movimentações vinculadas.')) return;

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('lawsuits')
          .delete()
          .eq('id', id);
        if (error) throw error;
        alert('Processo excluído com sucesso!');
        fetchLawsuits();
      } else {
        setLawsuitsList(prev => prev.filter(l => l.id !== id));
      }
    } catch (err: any) {
      alert('Erro ao excluir processo: ' + err.message);
    }
  };

  const handleSaveEditLawsuit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProcess || !editNumber || !editCourt || !editComarca || !editClass || !editClientId) return;

    const dataUpdated = {
      process_number: editNumber,
      court: editCourt,
      comarca: editComarca,
      lawsuit_class: editClass,
      status: editStatus,
      client_id: editClientId,
      value_of_cause: editValueOfCause || null,
      distribution_date: editDistributionDate || null,
      active_parties: editActiveParties || null,
      passive_parties: editPassiveParties || null
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('lawsuits')
          .update(dataUpdated)
          .eq('id', editingProcess.id);
        if (error) throw error;
        alert('Processo atualizado com sucesso!');
        fetchLawsuits();
      } else {
        setLawsuitsList(prev => prev.map(l => l.id === editingProcess.id ? { ...l, ...dataUpdated, client_name: clientsList.find(c => c.id === editClientId)?.client_name || 'Cliente Geral' } : l));
      }
      setShowEditProcessModal(false);
      setEditingProcess(null);
    } catch (err: any) {
      alert('Erro ao atualizar processo: ' + err.message);
    }
  };

  // Funções do Drawer Lateral de Detalhes
  const fetchDrawerData = async (lawsuitId: string) => {
    setIsLoadingDrawerData(true);
    try {
      if (isSupabaseConfigured) {
        // 1. Busca prazos
        const { data: deadlines, error: dlErr } = await supabase
          .from('deadlines')
          .select('*')
          .eq('lawsuit_id', lawsuitId)
          .order('deadline_date', { ascending: true });
        if (dlErr) throw dlErr;

        // 2. Busca tarefas
        const { data: tasks, error: tskErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('lawsuit_id', lawsuitId)
          .order('created_at', { ascending: false });
        if (tskErr) throw tskErr;

        // 3. Busca histórico de andamentos (timeline_events)
        const { data: events, error: evErr } = await supabase
          .from('timeline_events')
          .select('*')
          .eq('lawsuit_id', lawsuitId)
          .order('created_at', { ascending: false });
        if (evErr) throw evErr;

        setDrawerDeadlines(deadlines || []);
        setDrawerTasks(tasks || []);
        setDrawerEvents(events || []);
      } else {
        // Fallbacks offline para Modo Demo
        setDrawerDeadlines([
          { id: 'dl-1', description: 'Manifestação sobre Contestação', deadline_date: '2026-08-10', priority: 'high', status: 'Pendente' }
        ]);
        setDrawerTasks([
          { id: 'tsk-1', title: 'Falar com o cliente Kassiane Guedes', status: 'Pendente' },
          { id: 'tsk-2', title: 'Solicitar extratos bancários', status: 'Concluído' }
        ]);
        setDrawerEvents([
          { id: 'ev-1', title: 'Distribuição da Ação', description_leiga: 'O processo foi iniciado com sucesso.', event_date: '28 Jul 2026', status: 'done' }
        ]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados do painel:', err);
      alert('Erro ao carregar dados do processo: ' + err.message);
    } finally {
      setIsLoadingDrawerData(false);
    }
  };

  const handleAddDrawerDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLawsuitForDetail || !newDrawerDeadlineDesc || !newDrawerDeadlineDate) return;

    const dataNew = {
      lawsuit_id: selectedLawsuitForDetail.id,
      description: newDrawerDeadlineDesc,
      deadline_date: newDrawerDeadlineDate,
      priority: newDrawerDeadlinePriority,
      status: 'Pendente'
    };

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('deadlines').insert(dataNew).select();
        if (error) throw error;
        if (data) setDrawerDeadlines(prev => [...prev, data[0]]);
      } else {
        setDrawerDeadlines(prev => [...prev, { id: `dl-${Date.now()}`, ...dataNew }]);
      }
      setNewDrawerDeadlineDesc('');
      setNewDrawerDeadlineDate('');
      alert('Prazo adicionado com sucesso!');
    } catch (err: any) {
      alert('Erro ao criar prazo: ' + err.message);
    }
  };

  const handleAddDrawerTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLawsuitForDetail || !newDrawerTaskTitle) return;

    const dataNew = {
      lawsuit_id: selectedLawsuitForDetail.id,
      title: newDrawerTaskTitle,
      status: 'Pendente'
    };

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('tasks').insert(dataNew).select();
        if (error) throw error;
        if (data) setDrawerTasks(prev => [data[0], ...prev]);
      } else {
        setDrawerTasks(prev => [{ id: `tsk-${Date.now()}`, ...dataNew }, ...prev]);
      }
      setNewDrawerTaskTitle('');
    } catch (err: any) {
      alert('Erro ao criar tarefa: ' + err.message);
    }
  };

  const handleToggleDrawerTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Pendente' ? 'Concluído' : 'Pendente';
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('tasks')
          .update({ status: nextStatus })
          .eq('id', taskId);
        if (error) throw error;
      }
      setDrawerTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
    } catch (err: any) {
      alert('Erro ao atualizar tarefa: ' + err.message);
    }
  };

  const handleAddDrawerEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLawsuitForDetail || !newDrawerEventTitle || !newDrawerEventDesc) return;

    const dataNew = {
      lawsuit_id: selectedLawsuitForDetail.id,
      title: newDrawerEventTitle,
      description_leiga: newDrawerEventDesc,
      event_date: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'done'
    };

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('timeline_events').insert(dataNew).select();
        if (error) throw error;
        if (data) setDrawerEvents(prev => [data[0], ...prev]);
      } else {
        setDrawerEvents(prev => [{ id: `ev-${Date.now()}`, ...dataNew }, ...prev]);
      }
      setNewDrawerEventTitle('');
      setNewDrawerEventDesc('');
      alert('Movimentação adicionada com sucesso!');
    } catch (err: any) {
      alert('Erro ao criar andamento: ' + err.message);
    }
  };

  const handleSearchOab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oabNumber || !oabUf) return;

    setIsSearchingOab(true);
    setFoundProcessos([]);
    setSelectedProcessos([]);
    setProcessoClients({});

    try {
      const res = await fetch('/api/lawsuits/import-by-oab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oabNumber, oabUf })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao buscar processos pela OAB.');

      setFoundProcessos(data.processos || []);
      if (data.isMock) {
        alert('Busca efetuada com sucesso! Exibindo processos de simulação do Escavador.');
      }
    } catch (err: any) {
      alert('Erro ao buscar OAB: ' + err.message);
    } finally {
      setIsSearchingOab(false);
    }
  };

  const handleImportProcessos = async () => {
    if (selectedProcessos.length === 0) return;

    for (const procNum of selectedProcessos) {
      if (!processoClients[procNum]) {
        alert(`Por favor, selecione o cliente para o processo ${procNum}.`);
        return;
      }
    }

    setIsImporting(true);

    try {
      const importPromises = selectedProcessos.map(async (procNum) => {
        const proc = foundProcessos.find(p => p.process_number === procNum);
        if (!proc) return;

        const dataNew = {
          process_number: proc.process_number,
          court: proc.court,
          comarca: proc.comarca,
          lawsuit_class: proc.lawsuit_class,
          status: proc.status || 'Ativo',
          client_id: processoClients[procNum]
        };

        if (isSupabaseConfigured) {
          const { error } = await supabase
            .from('lawsuits')
            .insert(dataNew);
          if (error) throw error;
        } else {
          const selectedClient = clientsList.find(c => c.id === dataNew.client_id);
          const mockNew: ProcessoAtivo = {
            id: `processo-mock-${Date.now()}-${Math.random()}`,
            client_name: selectedClient?.client_name || 'Cliente Geral',
            ...dataNew
          };
          setLawsuitsList(prev => [mockNew, ...prev]);
        }
      });

      await Promise.all(importPromises);
      alert('Processos importados com sucesso!');
      setShowImportOabModal(false);
      setOabNumber('');
      setFoundProcessos([]);
      setSelectedProcessos([]);
      setProcessoClients({});
      
      if (isSupabaseConfigured) {
        await fetchLawsuits();
      }
    } catch (err: any) {
      alert('Erro ao importar processos: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // 4. Ações de Cadastro de Clientes
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail || !newClientCpfCnpj) return;

    setIsSavingClient(true);

    if (isSupabaseConfigured) {
      try {
        // Envia requisição para a nossa API interna que usa o cliente administrativo do Supabase
        // para cadastrar o cliente com e-mail já confirmado, sem exigir digitação de senha
        const res = await fetch('/api/admin/create-client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: newClientName,
            email: newClientEmail,
            phone: newClientPhone,
            cpfCnpj: newClientCpfCnpj,
            clientType: newClientType
          })
        });

        const resData = await res.json();
        if (!res.ok || resData.error) {
          throw new Error(resData.error || 'Erro na requisição de cadastro.');
        }

        alert('Cliente cadastrado e integrado com sucesso ao Supabase!');
        await fetchClients();
      } catch (err: any) {
        alert('Erro ao cadastrar cliente: ' + err.message);
      } finally {
        setIsSavingClient(false);
        setShowAddClientModal(false);
        setNewClientName('');
        setNewClientEmail('');
        setNewClientPhone('');
        setNewClientCpfCnpj('');
        setNewClientType('individual');
        setNewClientPassword('');
      }
    } else {
      // Mock Offline
      const mockNew: ClienteCadastrado = {
        id: `client-mock-${Date.now()}`,
        client_name: newClientName,
        client_email: newClientEmail,
        client_phone: newClientPhone,
        cpf_cnpj: newClientCpfCnpj,
        client_type: newClientType,
        lgpd_consent: true,
        created_at: new Date().toISOString()
      };
      setClientsList(prev => [mockNew, ...prev]);
      setIsSavingClient(false);
      setShowAddClientModal(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientCpfCnpj('');
      setNewClientType('individual');
      setNewClientPassword('');
    }
  };

  // 5. Ações de Documentos Recebidos
  const handleValidateDoc = async (action: 'VALIDADO' | 'REJEITADO') => {
    if (!selectedDoc) return;

    setIsValidating(true);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('documentos_recebidos')
          .update({
            status_validacao: action,
            processo_vinculado_id: action === 'VALIDADO' ? (linkedProcessId || null) : null
          })
          .eq('id', selectedDoc.id);

        if (error) throw error;
      } catch (err: any) {
        alert('Erro ao validar documento: ' + err.message);
      } finally {
        setIsValidating(false);
        setShowValidateModal(false);
        setSelectedDoc(null);
        setLinkedProcessId('');
      }
    } else {
      setDocuments(prev => 
        prev.map(d => d.id === selectedDoc.id 
          ? { ...d, status_validacao: action, processo_vinculado_id: action === 'VALIDADO' ? linkedProcessId : null } 
          : d
        )
      );
      setIsValidating(false);
      setShowValidateModal(false);
      setSelectedDoc(null);
      setLinkedProcessId('');
    }
  };

  // 6. Contagem Regressiva e Filtros
  const calculateDaysLeft = (targetDate: string) => {
    const diffTime = new Date(targetDate).getTime() - Date.now();
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Expirado';
    if (diffHours <= 24) return `Restam 24h`;
    
    const diffDays = Math.ceil(diffHours / 24);
    return `Restam ${diffDays} dias`;
  };

  // Filtragens
  const filteredDeadlines = deadlines.filter(d => {
    if (filter === 'all') return true;
    return d.prioridade === filter;
  });

  const filteredLawsuits = lawsuitsList.filter(l => {
    if (processFilter === 'all') return true;
    return l.status === processFilter;
  });

  const filteredClients = clientsList.filter(c => {
    if (clientFilter === 'all') return true;
    return c.client_type === clientFilter;
  });

  // KPIs Prazos
  const activeDeadlinesCount = deadlines.filter(d => d.status === 'PENDENTE').length;
  const highPriorityCriticalCount = deadlines.filter(d => d.status === 'PENDENTE' && d.prioridade === 'ALTA').length;
  const currentMonthCompletedCount = deadlines.filter(d => d.status === 'CONCLUIDO').length;

  // KPIs Processos
  const totalLawsuitsCount = lawsuitsList.length;
  const activeLawsuitsCount = lawsuitsList.filter(l => l.status === 'Ativo').length;
  const suspendedLawsuitsCount = lawsuitsList.filter(l => l.status === 'Suspenso').length;

  // KPIs Clientes
  const totalClientsCount = clientsList.length;
  const individualClientsCount = clientsList.filter(c => c.client_type === 'individual').length;
  const corporateClientsCount = clientsList.filter(c => c.client_type === 'corporate').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070c14] text-slate-800 dark:text-slate-100 font-sans flex">
      
      {/* Left Sidebar (Desktop Only) */}
      <aside className="hidden lg:flex w-64 bg-[#111111] text-slate-300 flex-col border-r border-[#b8975a]/25 shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <Logo className="h-10 w-10" showText={false} />
          <div className="text-left">
            <span className="text-sm font-serif font-bold tracking-[0.15em] text-[#b8975a] block uppercase">Torres & Silva</span>
            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold block mt-0.5">Painel do Advogado</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-550 tracking-wider px-3 block mb-2">Principal</span>
          
          <button 
            onClick={() => setActiveTab('prazos')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
              activeTab === 'prazos'
                ? 'bg-slate-800/50 text-[#b8975a] font-semibold border-l-2 border-[#b8975a]'
                : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Prazos & Audiências</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('processos')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
              activeTab === 'processos'
                ? 'bg-slate-800/50 text-[#b8975a] font-semibold border-l-2 border-[#b8975a]'
                : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Processos Ativos</span>
          </button>

          <button 
            onClick={() => setActiveTab('clientes')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
              activeTab === 'clientes'
                ? 'bg-slate-800/50 text-[#b8975a] font-semibold border-l-2 border-[#b8975a]'
                : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'
            }`}
          >
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
            <div className="h-9 w-9 rounded-full bg-[#b8975a] text-[#111111] flex items-center justify-center font-bold uppercase shrink-0">
              {lawyerName.split(' ').map(n => n[0]).join('').substring(0, 2)}
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

          <div className="hidden lg:flex items-center gap-2 text-slate-550 dark:text-slate-400 text-sm">
            <span>Escritório Central</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 dark:text-white font-medium">
              {activeTab === 'prazos' 
                ? 'Controle Operacional de Prazos' 
                : activeTab === 'processos'
                  ? 'Processos Ativos e Acompanhamento'
                  : 'Clientes Cadastrados no Portal'}
            </span>
          </div>

          <button
            onClick={() => router.push('/')}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: PRAZOS & AUDIÊNCIAS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'prazos' && (
          <main className="flex-grow p-6 space-y-6 overflow-y-auto">
            
            {/* Header */}
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
                <p className="text-sm text-slate-550 dark:text-slate-400">Monitore os prazos fatais, audiências e responda à documentação dos clientes.</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-2 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Prazo Fatal</span>
              </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Prazos Ativos</span>
                  <span className="block text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {loading ? '...' : activeDeadlinesCount}
                  </span>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                  <Clock className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Alerta Crítico (Alta)</span>
                  <span className="block text-3xl font-bold text-red-500 mt-1">
                    {loading ? '...' : highPriorityCriticalCount}
                  </span>
                </div>
                <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                  <AlertCircle className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Prazos Concluídos</span>
                  <span className="block text-3xl font-bold text-emerald-500 mt-1">
                    {loading ? '...' : currentMonthCompletedCount}
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Prazos List */}
              <div className="xl:col-span-2 bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#b8975a]" />
                    <span>Agenda de Prazos Fatais</span>
                  </h2>
                  
                  {/* Tabs Filter */}
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                    {(['all', 'ALTA', 'MEDIA', 'BAIXA'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setFilter(opt)}
                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                          filter === opt
                            ? 'bg-[#b8975a] text-[#111111]'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {opt === 'all' ? 'Todos' : opt.charAt(0) + opt.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deadlines List */}
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-center text-sm text-slate-500 py-6">Carregando prazos fatais...</p>
                  ) : filteredDeadlines.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-6">Nenhum prazo encontrado para este filtro.</p>
                  ) : (
                    filteredDeadlines.map((deadline) => (
                      <div 
                        key={deadline.id}
                        className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#b8975a]/30 transition-all"
                      >
                        <div className="space-y-1.5 bg-transparent">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                              deadline.prioridade === 'ALTA'
                                ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                : deadline.prioridade === 'MEDIA'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                  : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                            }`}>
                              PRIORIDADE {deadline.prioridade}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              Proc: {deadline.processo_numero}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-200">{deadline.titulo}</h3>
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-[#b8975a]" />
                              Data Fatal: {new Date(deadline.data_fatal).toLocaleDateString('pt-BR')}
                            </span>
                            {deadline.status === 'PENDENTE' ? (
                              <span className="flex items-center gap-1 text-amber-500 font-medium">
                                <Clock className="h-3.5 w-3.5" />
                                {calculateDaysLeft(deadline.data_fatal)}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                                <Check className="h-3.5 w-3.5" />
                                Concluído
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="shrink-0 flex items-center gap-2">
                          {deadline.status === 'PENDENTE' ? (
                            <button
                              onClick={() => {
                                setSelectedDeadline(deadline);
                                setShowCompleteModal(true);
                              }}
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

              {/* Documentos Recebidos */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-[#b8975a]" />
                  <span>Documentos Recebidos</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Arquivos anexados por clientes pendentes de validação processual.
                </p>

                <div className="space-y-3">
                  {loading ? (
                    <p className="text-center text-xs text-slate-500 py-4">Carregando documentos...</p>
                  ) : documents.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-4">Nenhum documento recebido.</p>
                  ) : (
                    documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-lg space-y-2 hover:border-[#b8975a]/30 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-[#b8975a] shrink-0" />
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate block">
                              {doc.documento_tipo}
                            </span>
                          </div>
                          {doc.arquivo_url && doc.arquivo_url !== '#' && (
                            <a 
                              href={doc.arquivo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-white"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-550 dark:text-slate-450">
                          <span>Autor: {doc.cliente_nome}</span>
                          <span>Tam: {doc.tamanho_kb} KB</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/85">
                          <span className={`text-[9px] font-bold ${
                            doc.status_validacao === 'PENDENTE'
                              ? 'text-amber-500'
                              : doc.status_validacao === 'VALIDADO'
                                ? 'text-emerald-500'
                                : 'text-red-500'
                          }`}>
                            {doc.status_validacao}
                          </span>
                          
                          {doc.status_validacao === 'PENDENTE' && (
                            <button 
                              onClick={() => {
                                setSelectedDoc(doc);
                                setShowValidateModal(true);
                              }}
                              className="text-[10px] font-bold text-[#b8975a] hover:underline cursor-pointer"
                            >
                              Validar & Vincular
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: PROCESSOS ATIVOS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'processos' && (
          <main className="flex-grow p-6 space-y-6 overflow-y-auto">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Processos Ativos</h1>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border w-fit ${
                    isSupabaseConfigured
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-500'
                  }`}>
                    {isSupabaseConfigured ? 'Supabase Ativo' : 'Modo Demo (Mocks)'}
                  </span>
                </div>
                <p className="text-sm text-slate-555 dark:text-slate-400">Gerencie a carteira de processos judiciais e vincule-os a clientes cadastrados.</p>
              </div>
              <button
                onClick={() => setShowAddProcessModal(true)}
                className="flex items-center justify-center gap-2 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Processo</span>
              </button>
            </div>

            {/* KPIs Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total de Processos</span>
                  <span className="block text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {loading ? '...' : totalLawsuitsCount}
                  </span>
                </div>
                <div className="p-3 bg-slate-500/10 rounded-xl text-slate-500 dark:text-slate-400">
                  <FolderOpen className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Em Tramitação (Ativo)</span>
                  <span className="block text-3xl font-bold text-emerald-500 mt-1">
                    {loading ? '...' : activeLawsuitsCount}
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Suspensos</span>
                  <span className="block text-3xl font-bold text-amber-500 mt-1">
                    {loading ? '...' : suspendedLawsuitsCount}
                  </span>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                  <AlertCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* List Table container */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-[#b8975a]" />
                  <span>Carteira de Processos Judiciais</span>
                </h2>

                {/* Filter */}
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                  {(['all', 'Ativo', 'Suspenso', 'Arquivado'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setProcessFilter(opt)}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        processFilter === opt
                          ? 'bg-[#b8975a] text-[#111111]'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {opt === 'all' ? 'Todos' : opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lawsuits Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                  <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">NÚMERO DO PROCESSO</th>
                      <th className="px-6 py-4">CLIENTE</th>
                      <th className="px-6 py-4">CLASSE</th>
                      <th className="px-6 py-4">FORUM / TRIBUNAL</th>
                      <th className="px-6 py-4">STATUS</th>
                      <th className="px-6 py-4">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          Carregando processos ativos...
                        </td>
                      </tr>
                    ) : filteredLawsuits.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          Nenhum processo cadastrado.
                        </td>
                      </tr>
                    ) : (
                      filteredLawsuits.map((lawsuit) => (
                        <tr 
                          key={lawsuit.id}
                          onClick={() => {
                            setSelectedLawsuitForDetail(lawsuit);
                            setDetailActiveTab('resumo');
                            setShowDetailDrawer(true);
                            fetchDrawerData(lawsuit.id);
                          }}
                          className="hover:bg-slate-100/60 dark:hover:bg-slate-900/40 transition-all cursor-pointer select-none"
                        >
                          <td className="px-6 py-4 font-mono font-semibold text-slate-800 dark:text-slate-150">
                            {lawsuit.process_number}
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                            {lawsuit.client_name}
                          </td>
                          <td className="px-6 py-4">{lawsuit.lawsuit_class}</td>
                          <td className="px-6 py-4">
                            <span className="block font-semibold text-slate-750 dark:text-slate-200">{lawsuit.court}</span>
                            <span className="block text-[10px] text-slate-400">{lawsuit.comarca}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                              lawsuit.status === 'Ativo'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                : lawsuit.status === 'Suspenso'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                  : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                            }`}>
                              {lawsuit.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 bg-transparent">
                              <button
                                title="Editar Processo"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProcess(lawsuit);
                                  setEditNumber(lawsuit.process_number);
                                  setEditCourt(lawsuit.court);
                                  setEditComarca(lawsuit.comarca);
                                  setEditClass(lawsuit.lawsuit_class);
                                  setEditStatus(lawsuit.status);
                                  setEditClientId(lawsuit.client_id);
                                  setEditValueOfCause(lawsuit.value_of_cause || '');
                                  setEditDistributionDate(lawsuit.distribution_date || '');
                                  setEditActiveParties(lawsuit.active_parties || '');
                                  setEditPassiveParties(lawsuit.passive_parties || '');
                                  setShowEditProcessModal(true);
                                }}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-350 cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                title="Excluir Processo"
                                onClick={(e) => handleDeleteLawsuit(e, lawsuit.id)}
                                className="p-1 rounded bg-red-500/10 hover:bg-red-500/25 text-red-500 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: CLIENTES CADASTRADOS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'clientes' && (
          <main className="flex-grow p-6 space-y-6 overflow-y-auto">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Clientes Cadastrados</h1>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border w-fit ${
                    isSupabaseConfigured
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-500'
                  }`}>
                    {isSupabaseConfigured ? 'Supabase Ativo' : 'Modo Demo (Mocks)'}
                  </span>
                </div>
                <p className="text-sm text-slate-555 dark:text-slate-400">Consulte a listagem de clientes integrados à plataforma e verifique os termos da LGPD.</p>
              </div>
              
              <button
                onClick={() => setShowAddClientModal(true)}
                className="flex items-center justify-center gap-2 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Cliente</span>
              </button>
            </div>

            {/* KPIs Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total de Clientes</span>
                  <span className="block text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {loading ? '...' : totalClientsCount}
                  </span>
                </div>
                <div className="p-3 bg-slate-500/10 rounded-xl text-slate-500 dark:text-slate-400">
                  <Users className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Pessoa Física (PF)</span>
                  <span className="block text-3xl font-bold text-[#b8975a] mt-1">
                    {loading ? '...' : individualClientsCount}
                  </span>
                </div>
                <div className="p-3 bg-[#b8975a]/10 rounded-xl text-[#b8975a]">
                  <User className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Pessoa Jurídica (PJ)</span>
                  <span className="block text-3xl font-bold text-blue-500 mt-1">
                    {loading ? '...' : corporateClientsCount}
                  </span>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                  <Scale className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* List Table container */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#b8975a]" />
                  <span>Base de Clientes Cadastrados</span>
                </h2>

                {/* Filter */}
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                  {(['all', 'individual', 'corporate'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setClientFilter(opt)}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        clientFilter === opt
                          ? 'bg-[#b8975a] text-[#111111]'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {opt === 'all' ? 'Todos' : opt === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clients Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                  <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">NOME DO CLIENTE</th>
                      <th className="px-6 py-4">CPF / CNPJ</th>
                      <th className="px-6 py-4">TIPO</th>
                      <th className="px-6 py-4">CONTATO</th>
                      <th className="px-6 py-4">STATUS LGPD</th>
                      <th className="px-6 py-4">CADASTRO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          Carregando clientes cadastrados...
                        </td>
                      </tr>
                    ) : filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          Nenhum cliente cadastrado.
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => (
                        <tr 
                          key={client.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
                        >
                          <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-150">
                            {client.client_name}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">
                            {client.cpf_cnpj}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold">
                            {client.client_type === 'individual' ? (
                              <span className="text-[#b8975a] px-2 py-0.5 bg-[#b8975a]/10 rounded border border-[#b8975a]/20">Pessoa Física</span>
                            ) : (
                              <span className="text-blue-500 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">Pessoa Jurídica</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="block font-semibold text-slate-750 dark:text-slate-200">{client.client_email}</span>
                            <span className="block text-[10px] text-slate-400">{client.client_phone}</span>
                          </td>
                          <td className="px-6 py-4">
                            {client.lgpd_consent ? (
                              <span className="text-emerald-500 flex items-center gap-1 text-xs font-semibold">
                                <ShieldCheck className="h-4 w-4" />
                                <span>Consentido</span>
                              </span>
                            ) : (
                              <span className="text-red-500 flex items-center gap-1 text-xs font-semibold">
                                <ShieldAlert className="h-4 w-4" />
                                <span>Pendente</span>
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {new Date(client.created_at).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

      </div>

      {/* Modal: Novo Prazo Fatal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-4">Novo Prazo Fatal</h3>
            
            <form onSubmit={handleCreateDeadline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">PROCESSO</label>
                <div className="relative">
                  <select
                    value={newProcesso}
                    onChange={(e) => setNewProcesso(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                    required
                  >
                    <option value="">Selecione o processo de destino</option>
                    {lawsuitsList.map((ls) => (
                      <option key={ls.id} value={ls.process_number}>{ls.process_number} ({ls.client_name})</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DESCRIÇÃO DA INTIMAÇÃO</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Ex: Réplica à Contestação apresentada..."
                  value={newTitulo}
                  onChange={(e) => setNewTitulo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DATA FATAL</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={newDataFatal}
                    onChange={(e) => setNewDataFatal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">PRIORIDADE</label>
                  <div className="relative">
                    <select
                      value={newPrioridade}
                      onChange={(e) => setNewPrioridade(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                    >
                      <option value="ALTA">Alta</option>
                      <option value="MEDIA">Média</option>
                      <option value="BAIXA">Baixa</option>
                    </select>
                    <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">ADVOGADO RESPONSÁVEL</label>
                <div className="relative">
                  <select
                    value={newResponsavel}
                    onChange={(e) => setNewResponsavel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                  >
                    <option value="">Selecione um advogado</option>
                    {lawyers.map((l) => (
                      <option key={l.id} value={l.id}>{l.full_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-bold rounded-lg text-sm shadow-lg transition-all"
              >
                Cadastrar Prazo Fatal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Processo */}
      {showAddProcessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowAddProcessModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-4">Novo Processo Judicial</h3>
            
            <form onSubmit={handleCreateLawsuit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NÚMERO DO PROCESSO</label>
                <div className="flex gap-2 bg-transparent">
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: 0012345-67.2024.8.19.0001"
                    value={procNumber}
                    onChange={(e) => setProcNumber(e.target.value)}
                    className="flex-grow px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSearchCNJ}
                    disabled={isSearchingCNJ}
                    className="px-3 bg-slate-800 hover:bg-slate-750 text-[#b8975a] border border-[#b8975a]/25 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {isSearchingCNJ ? 'Carregando...' : 'Autopreencher'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Digite os 20 números do CNJ e clique para preencher Classe, Vara e Comarca automaticamente via Datajud (Grátis).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">TRIBUNAL / VARA</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: 3ª Vara Cível de Madureira"
                  value={procCourt}
                  onChange={(e) => setProcCourt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">COMARCA / UF</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Rio de Janeiro / RJ"
                    value={procComarca}
                    onChange={(e) => setProcComarca(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">STATUS</label>
                  <div className="relative">
                    <select
                      value={procStatus}
                      onChange={(e) => setProcStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Suspenso">Suspenso</option>
                      <option value="Arquivado">Arquivado</option>
                    </select>
                    <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">CLASSE PROCESSUAL</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Procedimento Comum Cível"
                  value={procClass}
                  onChange={(e) => setProcClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">VALOR DA CAUSA</label>
                  <input 
                    type="text" 
                    placeholder="Ex: R$ 50.000,00"
                    value={procValueOfCause}
                    onChange={(e) => setProcValueOfCause(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DATA DE DISTRIBUIÇÃO</label>
                  <input 
                    type="date" 
                    value={procDistributionDate}
                    onChange={(e) => setProcDistributionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">POLO ATIVO (AUTOR)</label>
                  <input 
                    type="text" 
                    placeholder="Nome do autor"
                    value={procActiveParties}
                    onChange={(e) => setProcActiveParties(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">POLO PASSIVO (RÉU)</label>
                  <input 
                    type="text" 
                    placeholder="Nome do réu"
                    value={procPassiveParties}
                    onChange={(e) => setProcPassiveParties(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">CLIENTE VINCULADO</label>
                <div className="relative">
                  <select
                    value={procClientId}
                    onChange={(e) => setProcClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                    required
                  >
                    <option value="">Selecione o proprietário do processo</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.id}>{c.client_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-bold rounded-lg text-sm shadow-lg transition-all"
              >
                Cadastrar Processo Ativo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Cliente */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowAddClientModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-4">Novo Cliente do Escritório</h3>
            
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NOME COMPLETO</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Roberto Albuquerque"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">TIPO DE CLIENTE</label>
                  <div className="relative">
                    <select
                      value={newClientType}
                      onChange={(e) => setNewClientType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                    >
                      <option value="individual">Pessoa Física</option>
                      <option value="corporate">Pessoa Jurídica</option>
                    </select>
                    <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">CPF OU CNPJ</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: 000.000.000-00"
                    value={newClientCpfCnpj}
                    onChange={(e) => setNewClientCpfCnpj(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">E-MAIL</label>
                  <input 
                    type="email" 
                    required
                    placeholder="cliente@email.com"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">TELEFONE</label>
                  <input 
                    type="text" 
                    placeholder="Ex: (11) 99999-9999"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingClient}
                className="w-full py-2.5 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-bold rounded-lg text-sm shadow-lg transition-all disabled:opacity-50"
              >
                {isSavingClient ? 'Cadastrando no Supabase...' : 'Cadastrar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Conclusão de Prazo */}
      {showCompleteModal && selectedDeadline && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setShowCompleteModal(false);
                setSelectedDeadline(null);
                setProtocoloNum('');
                setComprovanteFile(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-2">Concluir Prazo</h3>
            <p className="text-xs text-slate-500 mb-4 truncate">Processo: {selectedDeadline.processo_numero}</p>

            <form onSubmit={handleCompleteDeadline} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">NÚMERO DE PROTOCOLO</label>
                <input 
                  type="text" 
                  placeholder="Ex: PROTOCOLO-123456"
                  value={protocoloNum}
                  onChange={(e) => setProtocoloNum(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="border-2 border-dashed border-slate-350 dark:border-slate-850 rounded-lg p-6 text-center">
                <input 
                  type="file" 
                  accept="application/pdf"
                  id="pdf_file"
                  className="hidden"
                  onChange={(e) => setComprovanteFile(e.target.files ? e.target.files[0] : null)}
                />
                <label htmlFor="pdf_file" className="cursor-pointer space-y-2 block">
                  <Upload className="h-8 w-8 text-[#b8975a] mx-auto" />
                  <span className="block text-xs text-slate-500">
                    {comprovanteFile ? comprovanteFile.name : 'Upload do Comprovante de Protocolo (PDF)'}
                  </span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompleteModal(false);
                    setSelectedDeadline(null);
                    setProtocoloNum('');
                    setComprovanteFile(null);
                  }}
                  className="flex-1 py-2 bg-slate-200 dark:bg-slate-850 hover:bg-slate-350 text-slate-700 dark:text-white font-semibold rounded-lg text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCompleting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50"
                >
                  {isCompleting ? 'Finalizando...' : 'Concluir Prazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Validar & Vincular Documento */}
      {showValidateModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setShowValidateModal(false);
                setSelectedDoc(null);
                setLinkedProcessId('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-2">Validar & Vincular</h3>
            <p className="text-xs text-slate-500 mb-4">Cliente: {selectedDoc.cliente_nome}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">VINCULAR AO PROCESSO</label>
                <div className="relative">
                  <select
                    value={linkedProcessId}
                    onChange={(e) => setLinkedProcessId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                  >
                    <option value="">Selecione um processo do escritório</option>
                    {lawsuitsList.map((ls) => (
                      <option key={ls.id} value={ls.id}>{ls.process_number}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleValidateDoc('REJEITADO')}
                  disabled={isValidating}
                  className="flex-1 py-2 bg-red-650 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50"
                >
                  Rejeitar
                </button>
                <button
                  onClick={() => handleValidateDoc('VALIDADO')}
                  disabled={isValidating}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50"
                >
                  Validar & Vincular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Importação via OAB (Escavador) */}
      {showImportOabModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
            <button 
              onClick={() => {
                setShowImportOabModal(false);
                setOabNumber('');
                setFoundProcessos([]);
                setSelectedProcessos([]);
                setProcessoClients({});
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-2">Importar Processos via OAB</h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 mb-4">Busque processos cadastrados nos tribunais através do número da OAB do advogado (via Escavador API).</p>

            {/* Busca form */}
            <form onSubmit={handleSearchOab} className="flex gap-3 mb-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/80">
              <div className="w-1/3 bg-transparent">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">ESTADO (UF)</label>
                <div className="relative">
                  <select
                    value={oabUf}
                    onChange={(e) => setOabUf(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 text-xs outline-none text-slate-900 dark:text-white appearance-none font-semibold"
                  >
                    {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex-1 bg-transparent">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">NÚMERO DA OAB</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 123456"
                  value={oabNumber}
                  onChange={(e) => setOabNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 text-xs outline-none text-slate-900 dark:text-white font-semibold font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSearchingOab}
                  className="px-4 py-1.5 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-bold text-xs rounded transition-all disabled:opacity-50 h-[32px] cursor-pointer"
                >
                  {isSearchingOab ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </form>

            {/* Resultado da busca */}
            <div className="flex-grow overflow-y-auto space-y-3 min-h-[200px] max-h-[40vh] pr-1">
              {isSearchingOab ? (
                <p className="text-center text-xs text-slate-500 py-12">Consultando a API do Escavador...</p>
              ) : foundProcessos.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-12">Nenhum processo listado. Insira a OAB acima para buscar.</p>
              ) : (
                foundProcessos.map((proc, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 flex-1 bg-transparent">
                      <div className="flex items-center gap-2 bg-transparent">
                        <input
                          type="checkbox"
                          id={`chk-${idx}`}
                          checked={selectedProcessos.includes(proc.process_number)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProcessos(prev => [...prev, proc.process_number]);
                            } else {
                              setSelectedProcessos(prev => prev.filter(n => n !== proc.process_number));
                            }
                          }}
                          className="h-3.5 w-3.5 accent-[#b8975a]"
                        />
                        <label htmlFor={`chk-${idx}`} className="font-mono font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                          {proc.process_number}
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold">{proc.court} • {proc.comarca}</p>
                      <p className="text-[10px] text-slate-450 truncate max-w-sm">{proc.lawsuit_class}</p>
                    </div>

                    {/* Vínculo de Cliente */}
                    {selectedProcessos.includes(proc.process_number) && (
                      <div className="w-full md:w-48 shrink-0 bg-transparent">
                        <label className="block text-[9px] font-bold text-[#b8975a] mb-0.5">VINCULAR CLIENTE *</label>
                        <div className="relative">
                          <select
                            value={processoClients[proc.process_number] || ''}
                            onChange={(e) => setProcessoClients(prev => ({ ...prev, [proc.process_number]: e.target.value }))}
                            className="w-full px-2 py-1 rounded bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 text-[10px] outline-none text-slate-900 dark:text-white appearance-none"
                            required
                          >
                            <option value="">Selecione o proprietário</option>
                            {clientsList.map((c) => (
                              <option key={c.id} value={c.id}>{c.client_name}</option>
                            ))}
                          </select>
                          <ChevronDown className="h-3 w-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 mt-4 shrink-0 bg-transparent">
              <button
                type="button"
                onClick={() => {
                  setShowImportOabModal(false);
                  setOabNumber('');
                  setFoundProcessos([]);
                  setSelectedProcessos([]);
                  setProcessoClients({});
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-850 hover:bg-slate-350 text-slate-700 dark:text-white font-semibold rounded-lg text-xs transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportProcessos}
                disabled={selectedProcessos.length === 0 || isImporting}
                className="px-4 py-2 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-bold rounded-lg text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isImporting ? 'Importando...' : `Importar ${selectedProcessos.length} Processo(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER LATERAL: Detalhes do Processo */}
      {showDetailDrawer && selectedLawsuitForDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-all duration-300">
          {/* Overlay para fechar ao clicar fora */}
          <div className="absolute inset-0 cursor-default" onClick={() => setShowDetailDrawer(false)} />
          
          <div className="relative w-full max-w-xl bg-white dark:bg-[#151515] h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-in z-10">
            {/* Header do Drawer */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#b8975a] tracking-wider">Detalhamento da Causa</span>
                <h4 className="text-base font-mono font-bold text-slate-900 dark:text-white mt-0.5">{selectedLawsuitForDetail.process_number}</h4>
              </div>
              <button 
                onClick={() => setShowDetailDrawer(false)}
                className="p-1.5 rounded-lg bg-slate-200/50 hover:bg-slate-300/60 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu de Abas (Tabs) do Drawer */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-white dark:bg-[#151515]">
              {(['resumo', 'prazos', 'tarefas', 'historico'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDetailActiveTab(tab)}
                  className={`flex-1 py-3 text-xs font-bold border-b-2 capitalize transition-all cursor-pointer ${
                    detailActiveTab === tab
                      ? 'border-b-2 border-[#b8975a] text-[#b8975a]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab === 'historico' ? 'Andamentos' : tab}
                </button>
              ))}
            </div>

            {/* Conteúdo do Drawer */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white dark:bg-[#151515] text-slate-800 dark:text-slate-300">
              {isLoadingDrawerData ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b8975a]" />
                  <p className="text-xs text-slate-550 dark:text-slate-450 font-medium">Buscando dados processuais...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: RESUMO DO PROCESSO */}
                  {detailActiveTab === 'resumo' && (
                    <div className="space-y-4 bg-transparent">
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-3">
                        <h5 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Capa do Processo</h5>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Tribunal / Vara</span>
                            <span className="font-semibold text-slate-850 dark:text-slate-150">{selectedLawsuitForDetail.court}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Comarca / Região</span>
                            <span className="font-semibold text-slate-850 dark:text-slate-150">{selectedLawsuitForDetail.comarca}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Classe Processual</span>
                            <span className="font-semibold text-slate-850 dark:text-slate-150">{selectedLawsuitForDetail.lawsuit_class}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Status do Processo</span>
                            <span className="font-bold text-emerald-500">{selectedLawsuitForDetail.status}</span>
                          </div>
                          {selectedLawsuitForDetail.value_of_cause && (
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Valor da Causa</span>
                              <span className="font-semibold text-slate-850 dark:text-slate-150">{selectedLawsuitForDetail.value_of_cause}</span>
                            </div>
                          )}
                          {selectedLawsuitForDetail.distribution_date && (
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Data de Distribuição</span>
                              <span className="font-semibold text-slate-850 dark:text-slate-150">{new Date(selectedLawsuitForDetail.distribution_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-3">
                        <h5 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Partes e Envolvidos</h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Polo Ativo (Autor)</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100">{selectedLawsuitForDetail.active_parties || selectedLawsuitForDetail.client_name}</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">Cliente</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Polo Passivo (Réu)</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLawsuitForDetail.passive_parties || 'Informação não declarada (Disponível nos Autos)'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PRAZOS E INTIMAÇÕES */}
                  {detailActiveTab === 'prazos' && (
                    <div className="space-y-4 bg-transparent">
                      {/* Form de adicionar prazo */}
                      <form onSubmit={handleAddDrawerDeadline} className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-3">
                        <h5 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Adicionar Novo Prazo</h5>
                        <div className="space-y-2">
                          <input
                            type="text"
                            required
                            placeholder="Descrição do prazo (ex: Manifestar sobre laudo)"
                            value={newDrawerDeadlineDesc}
                            onChange={e => setNewDrawerDeadlineDesc(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs outline-none text-slate-900 dark:text-white"
                          />
                          <div className="flex gap-2">
                            <input
                              type="date"
                              required
                              value={newDrawerDeadlineDate}
                              onChange={e => setNewDrawerDeadlineDate(e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs outline-none text-slate-900 dark:text-white"
                            />
                            <select
                              value={newDrawerDeadlinePriority}
                              onChange={e => setNewDrawerDeadlinePriority(e.target.value as any)}
                              className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs outline-none text-slate-900 dark:text-white font-semibold"
                            >
                              <option value="high">Alta Prioridade</option>
                              <option value="medium">Média Prioridade</option>
                              <option value="low">Baixa Prioridade</option>
                            </select>
                          </div>
                          <button
                            type="submit"
                            className="w-full py-1.5 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-bold rounded-lg text-xs transition-all cursor-pointer"
                          >
                            Salvar Prazo
                          </button>
                        </div>
                      </form>

                      {/* Lista de prazos */}
                      <div className="space-y-2 bg-transparent">
                        <h5 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Prazos Agendados</h5>
                        {drawerDeadlines.length === 0 ? (
                          <p className="text-xs text-slate-500 py-4 text-center">Nenhum prazo agendado para este processo.</p>
                        ) : (
                          drawerDeadlines.map(dl => (
                            <div key={dl.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/20 text-xs">
                              <div>
                                <p className="font-semibold text-slate-850 dark:text-slate-150">{dl.description}</p>
                                <p className="text-[10px] text-slate-450 mt-0.5">Prazo Fatal: {new Date(dl.deadline_date).toLocaleDateString('pt-BR')}</p>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                dl.priority === 'high'
                                  ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                  : dl.priority === 'medium'
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                    : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                              }`}>
                                {dl.priority === 'high' ? 'Alta' : dl.priority === 'medium' ? 'Média' : 'Baixa'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: TAREFAS & PENDÊNCIAS */}
                  {detailActiveTab === 'tarefas' && (
                    <div className="space-y-4 bg-transparent">
                      {/* Form de adicionar tarefa */}
                      <form onSubmit={handleAddDrawerTask} className="flex gap-2 bg-transparent">
                        <input
                          type="text"
                          required
                          placeholder="Nova tarefa jurídica (ex: Ligar para testemunha)..."
                          value={newDrawerTaskTitle}
                          onChange={e => setNewDrawerTaskTitle(e.target.value)}
                          className="flex-grow px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs outline-none text-slate-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          className="px-4 bg-slate-800 hover:bg-slate-750 text-[#b8975a] border border-[#b8975a]/20 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          Adicionar
                        </button>
                      </form>

                      {/* Lista de tarefas */}
                      <div className="space-y-2 bg-transparent">
                        <h5 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Checklist de Tarefas</h5>
                        {drawerTasks.length === 0 ? (
                          <p className="text-xs text-slate-500 py-4 text-center">Nenhuma tarefa pendente para este processo.</p>
                        ) : (
                          drawerTasks.map(t => (
                            <div 
                              key={t.id}
                              onClick={() => handleToggleDrawerTask(t.id, t.status)}
                              className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-850 hover:bg-slate-55 dark:hover:bg-slate-900/30 cursor-pointer select-none text-xs transition-all"
                            >
                              <input 
                                type="checkbox"
                                checked={t.status === 'Concluído'}
                                onChange={() => {}} // Tratado no onClick do container
                                className="h-4 w-4 accent-[#b8975a] cursor-pointer"
                              />
                              <span className={`font-medium ${
                                t.status === 'Concluído' ? 'line-through text-slate-400 dark:text-slate-650' : 'text-slate-800 dark:text-slate-200'
                              }`}>
                                {t.title}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: HISTÓRICO / LINHA DO TEMPO */}
                  {detailActiveTab === 'historico' && (
                    <div className="space-y-4 bg-transparent">
                      {/* Form de adicionar andamento manual */}
                      <form onSubmit={handleAddDrawerEvent} className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-3">
                        <h5 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Inserir Andamento Manual</h5>
                        <div className="space-y-2 bg-transparent">
                          <input
                            type="text"
                            required
                            placeholder="Título do andamento (ex: Despacho publicado)"
                            value={newDrawerEventTitle}
                            onChange={e => setNewDrawerEventTitle(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs outline-none text-slate-900 dark:text-white"
                          />
                          <textarea
                            required
                            rows={2}
                            placeholder="Descrição simples/leiga do andamento para o cliente..."
                            value={newDrawerEventDesc}
                            onChange={e => setNewDrawerEventDesc(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs outline-none text-slate-900 dark:text-white"
                          />
                          <button
                            type="submit"
                            className="w-full py-1.5 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-bold rounded-lg text-xs transition-all cursor-pointer"
                          >
                            Registrar Movimentação
                          </button>
                        </div>
                      </form>

                      {/* Timeline de andamentos */}
                      <div className="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-6 bg-transparent">
                        <h5 className="text-xs font-bold text-slate-450 uppercase tracking-wider -ml-4 pl-4 bg-white dark:bg-[#151515] pb-2">Linha do Tempo</h5>
                        {drawerEvents.length === 0 ? (
                          <p className="text-xs text-slate-550 py-4 text-center -ml-4">Nenhuma movimentação registrada.</p>
                        ) : (
                          drawerEvents.map(ev => (
                            <div key={ev.id} className="relative space-y-1 bg-transparent">
                              {/* Bolinha da timeline */}
                              <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-[#b8975a] bg-white dark:bg-[#151515]" />
                              
                              <div className="text-xs bg-transparent">
                                <span className="text-[10px] text-[#b8975a] font-bold block">{ev.event_date}</span>
                                <h6 className="font-bold text-slate-850 dark:text-slate-150">{ev.title}</h6>
                                <p className="text-slate-500 dark:text-slate-400 mt-0.5">{ev.description_leiga}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal: Editar Processo */}
      {showEditProcessModal && editingProcess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setShowEditProcessModal(false);
                setEditingProcess(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-2">Editar Processo</h3>
            <p className="text-xs text-slate-500 mb-4">Atualize as informações gerais e capa do processo judicial.</p>

            <form onSubmit={handleSaveEditLawsuit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">NÚMERO DO PROCESSO (CNJ)</label>
                <input 
                  type="text" 
                  required
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">TRIBUNAL / VARA</label>
                <input 
                  type="text" 
                  required
                  value={editCourt}
                  onChange={(e) => setEditCourt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">COMARCA / UF</label>
                  <input 
                    type="text" 
                    required
                    value={editComarca}
                    onChange={(e) => setEditComarca(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">STATUS</label>
                  <div className="relative">
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none font-semibold"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Suspenso">Suspenso</option>
                      <option value="Arquivado">Arquivado</option>
                    </select>
                    <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">CLASSE PROCESSUAL</label>
                <input 
                  type="text" 
                  required
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">VALOR DA CAUSA</label>
                  <input 
                    type="text" 
                    placeholder="Ex: R$ 50.000,00"
                    value={editValueOfCause}
                    onChange={(e) => setEditValueOfCause(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">DATA DE DISTRIBUIÇÃO</label>
                  <input 
                    type="date" 
                    value={editDistributionDate}
                    onChange={(e) => setEditDistributionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">POLO ATIVO (AUTOR)</label>
                  <input 
                    type="text" 
                    value={editActiveParties}
                    onChange={(e) => setEditActiveParties(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">POLO PASSIVO (RÉU)</label>
                  <input 
                    type="text" 
                    value={editPassiveParties}
                    onChange={(e) => setEditPassiveParties(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1">CLIENTE VINCULADO</label>
                <div className="relative">
                  <select
                    value={editClientId}
                    onChange={(e) => setEditClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white appearance-none"
                    required
                  >
                    <option value="">Selecione o proprietário do processo</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.id}>{c.client_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProcessModal(false);
                    setEditingProcess(null);
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-850 hover:bg-slate-350 text-slate-700 dark:text-white font-semibold rounded-lg text-sm transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#b8975a] hover:bg-[#e2c690] text-[#111111] font-bold rounded-lg text-sm transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
