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
  ShieldCheck
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

  // Função para buscar processos com os nomes dos clientes
  const fetchLawsuits = async () => {
    try {
      const { data: dbLawsuits } = await supabase
        .from('lawsuits')
        .select(`
          id,
          process_number,
          court,
          comarca,
          lawsuit_class,
          status,
          client_id,
          clients (
            id,
            users (
              full_name
            )
          )
        `);
      
      if (dbLawsuits) {
        const mapped: ProcessoAtivo[] = dbLawsuits.map((l: any) => ({
          id: l.id,
          process_number: l.process_number,
          court: l.court,
          comarca: l.comarca,
          lawsuit_class: l.lawsuit_class,
          status: l.status,
          client_id: l.client_id,
          client_name: l.clients?.users?.full_name || 'Cliente Geral'
        }));
        setLawsuitsList(mapped);
      }
    } catch (err) {
      console.error('Erro ao buscar processos:', err);
    }
  };

  // Função para buscar a lista de clientes cadastrados
  const fetchClients = async () => {
    try {
      const { data: dbClients } = await supabase
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

      if (dbClients) {
        const mapped: ClienteCadastrado[] = dbClients.map((c: any) => ({
          id: c.id,
          client_name: c.users?.full_name || 'Cliente Sem Nome',
          client_email: c.users?.email || 'Sem e-mail',
          client_phone: c.users?.phone || 'Sem telefone',
          cpf_cnpj: c.cpf_cnpj,
          client_type: c.client_type,
          lgpd_consent: c.users?.lgpd_consent || false,
          created_at: c.created_at
        }));
        setClientsList(mapped);
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
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
      const res = await fetch('/api/lawsuits/import-by-cnj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processNumber: procNumber })
      });
      const resData = await res.json();
      
      if (!res.ok || resData.success === false) {
        throw new Error(resData.message || resData.error || 'Processo não encontrado no Datajud.');
      }

      const { court, comarca, lawsuit_class } = resData.data;
      setProcCourt(court);
      setProcComarca(comarca);
      setProcClass(lawsuit_class);
      alert('Dados do processo importados com sucesso da base do Datajud/CNJ!');
    } catch (err: any) {
      alert('Erro ao buscar processo no Datajud: ' + err.message);
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
      client_id: procClientId
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('lawsuits')
          .insert(dataNew);
        if (error) throw error;
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
    setShowAddProcessModal(false);
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
    if (!newClientName || !newClientEmail || !newClientCpfCnpj || !newClientPassword) return;

    setIsSavingClient(true);

    if (isSupabaseConfigured) {
      try {
        // Envia requisição para a nossa API interna que usa o cliente administrativo do Supabase
        // para cadastrar o cliente com e-mail já confirmado, impedindo o envio de e-mails
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
            clientType: newClientType,
            password: newClientPassword
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          Carregando processos ativos...
                        </td>
                      </tr>
                    ) : filteredLawsuits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          Nenhum processo cadastrado.
                        </td>
                      </tr>
                    ) : (
                      filteredLawsuits.map((lawsuit) => (
                        <tr 
                          key={lawsuit.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
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

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">SENHA DE ACESSO</label>
                <input 
                  type="password" 
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={newClientPassword}
                  onChange={(e) => setNewClientPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm outline-none text-slate-900 dark:text-white"
                />
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

    </div>
  );
}
