export interface Lawsuit {
  id: string;
  processNumber: string;
  court: string;
  comarca: string;
  lawsuitClass: string;
  status: 'Ativo' | 'Suspenso' | 'Arquivado';
  clientName: string;
  lawyerName: string;
  createdAt: string;
}

export interface Deadline {
  id: string;
  lawsuitId: string;
  processNumber: string;
  description: string;
  deadlineDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'Pendente' | 'Concluído' | 'Atrasado';
  daysLeft: number;
}

export interface Document {
  id: string;
  lawsuitId: string;
  fileName: string;
  fileType: 'pdf' | 'png' | 'jpg';
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TimelineEvent {
  id: string;
  lawsuitId: string;
  title: string;
  descriptionLeiga: string;
  eventDate: string;
  status: 'done' | 'current' | 'upcoming';
}

export const mockLawsuits: Lawsuit[] = [
  {
    id: 'processo-1',
    processNumber: '0012345-67.2024.8.19.0001',
    court: '3ª Vara Cível',
    comarca: 'Rio de Janeiro - RJ',
    lawsuitClass: 'Procedimento Comum Cível',
    status: 'Ativo',
    clientName: 'Roberto Albuquerque',
    lawyerName: 'Dr. Carlos Silva',
    createdAt: '2024-03-15',
  },
  {
    id: 'processo-2',
    processNumber: '0098765-43.2023.8.26.0100',
    court: '12ª Vara da Família',
    comarca: 'São Paulo - SP',
    lawsuitClass: 'Inventário e Partilha',
    status: 'Ativo',
    clientName: 'Ana Maria Torres',
    lawyerName: 'Dra. Mariana Silva',
    createdAt: '2023-08-20',
  }
];

export const mockDeadlines: Deadline[] = [
  {
    id: 'prazo-1',
    lawsuitId: 'processo-1',
    processNumber: '0012345-67.2024.8.19.0001',
    description: 'Réplica à Contestação apresentada pelo Réu',
    deadlineDate: '2026-07-23',
    priority: 'high',
    status: 'Pendente',
    daysLeft: 1,
  },
  {
    id: 'prazo-2',
    lawsuitId: 'processo-2',
    processNumber: '0098765-43.2023.8.26.0100',
    description: 'Manifestar-se sobre laudo de avaliação pericial',
    deadlineDate: '2026-07-27',
    priority: 'medium',
    status: 'Pendente',
    daysLeft: 4,
  },
  {
    id: 'prazo-3',
    lawsuitId: 'processo-1',
    processNumber: '0012345-67.2024.8.19.0001',
    description: 'Recolhimento de custas para expedição de mandado',
    deadlineDate: '2026-07-31',
    priority: 'low',
    status: 'Pendente',
    daysLeft: 8,
  }
];

export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    lawsuitId: 'processo-1',
    fileName: 'Procuracao_Assinada_Roberto.pdf',
    fileType: 'pdf',
    fileSize: '425 KB',
    uploadedBy: 'Roberto Albuquerque (Cliente)',
    uploadedAt: '2024-03-16 14:32',
  },
  {
    id: 'doc-2',
    lawsuitId: 'processo-1',
    fileName: 'Comprovante_Residencia.jpg',
    fileType: 'jpg',
    fileSize: '1.2 MB',
    uploadedBy: 'Roberto Albuquerque (Cliente)',
    uploadedAt: '2024-03-16 14:35',
  }
];

export const mockTimelineEvents: TimelineEvent[] = [
  {
    id: 'evt-1',
    lawsuitId: 'processo-1',
    title: 'Ação Distribuída (Início)',
    descriptionLeiga: 'Nossa equipe protocolou o processo na Justiça. O juiz foi designado.',
    eventDate: '15 Mar 2024',
    status: 'done',
  },
  {
    id: 'evt-2',
    lawsuitId: 'processo-1',
    title: 'O Réu foi Citado',
    descriptionLeiga: 'A parte contrária foi notificada oficialmente pelo tribunal e agora deve apresentar a defesa.',
    eventDate: '02 Abr 2024',
    status: 'done',
  },
  {
    id: 'evt-3',
    lawsuitId: 'processo-1',
    title: 'Aguardando Resposta do Réu',
    descriptionLeiga: 'Estamos monitorando o prazo legal para que o réu apresente a contestação dele.',
    eventDate: 'Em andamento',
    status: 'current',
  },
  {
    id: 'evt-4',
    lawsuitId: 'processo-1',
    title: 'Audiência de Conciliação',
    descriptionLeiga: 'Reunião entre as partes mediada pelo tribunal para tentar um acordo consensual.',
    eventDate: 'Agendada para 15 Set 2026',
    status: 'upcoming',
  }
];
