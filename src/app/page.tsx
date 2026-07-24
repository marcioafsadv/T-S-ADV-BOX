'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Lock, ArrowRight, Phone, FileText } from 'lucide-react';
import Logo from '@/components/Logo';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'client' | 'lawyer'>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lgpdAccepted, setLgpdAccepted] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados adicionais para Cadastro (Sign Up)
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [oabNumber, setOabNumber] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    if (!lgpdAccepted) {
      setError('Você precisa aceitar os termos da LGPD para prosseguir.');
      return;
    }

    setLoading(true);
    setError('');

    if (isSupabaseConfigured) {
      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError(authError.message);
          setLoading(false);
          return;
        }

        // Obtendo role dos metadados do usuário ou tabela users
        const userRole = data.user?.user_metadata?.role || role;
        if (userRole === 'lawyer') {
          router.push('/dashboard/advogado');
        } else {
          router.push('/portal/cliente');
        }
      } catch (err: any) {
        setError('Erro de conexão: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback para modo demonstração
      setTimeout(() => {
        setLoading(false);
        if (role === 'lawyer') {
          router.push('/dashboard/advogado');
        } else {
          router.push('/portal/cliente');
        }
      }, 800);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (role === 'client' && !cpfCnpj) {
      setError('Por favor, insira o seu CPF ou CNPJ.');
      return;
    }
    if (role === 'lawyer' && !oabNumber) {
      setError('Por favor, insira o seu número da OAB.');
      return;
    }
    if (!lgpdAccepted) {
      setError('Você precisa aceitar os termos da LGPD para prosseguir.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    if (isSupabaseConfigured) {
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
              phone: phone,
              cpf_cnpj: role === 'client' ? cpfCnpj : undefined,
              oab_number: role === 'lawyer' ? oabNumber : undefined,
              lgpd_consent: true,
            }
          }
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        setSuccessMessage('Cadastro realizado com sucesso! Carregando painel...');
        
        setTimeout(() => {
          if (role === 'lawyer') {
            router.push('/dashboard/advogado');
          } else {
            router.push('/portal/cliente');
          }
        }, 1500);
      } catch (err: any) {
        setError('Erro de conexão: ' + err.message);
        setLoading(false);
      }
    } else {
      // Fallback para cadastro simulado
      setTimeout(() => {
        setLoading(false);
        setSuccessMessage('Cadastro simulado com sucesso! Carregando...');
        setTimeout(() => {
          if (role === 'lawyer') {
            router.push('/dashboard/advogado');
          } else {
            router.push('/portal/cliente');
          }
        }, 1000);
      }, 1000);
    }
  };

  // Quick fill credentials for demo
  const fillCredentials = (selectedRole: 'client' | 'lawyer') => {
    setRole(selectedRole);
    if (selectedRole === 'lawyer') {
      setEmail('carlos.silva@torressilva.com.br');
      setPassword('carlos123');
    } else {
      setEmail('roberto.albuquerque@gmail.com');
      setPassword('roberto123');
    }
    setError('');
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#111111] text-slate-100 font-sans">
      {/* Brand & Presentation Side (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0b111e] flex-col justify-between p-16 border-r border-[#b8975a]/20 overflow-hidden">
        {/* Background Image: High-definition Office Glass Partition (Print 3) */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none scale-100 transition-all duration-700" 
          style={{ backgroundImage: "url('/office_background.jpg')" }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0f243c]/70 to-[#0b1623]/40 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#b8975a]/10 via-transparent to-transparent pointer-events-none" />
        
        {/* Push content down */}
        <div />

        {/* Centered Content: Enriched and scaled logo blending onto the dark glass background */}
        <div className="flex flex-col items-center justify-center space-y-8 z-10 w-full max-w-md mx-auto my-auto">
          <Logo showText={true} maxHeight="340px" />
          
          <div className="space-y-4 text-center">
            <h1 className="text-3xl font-serif font-semibold leading-tight text-white drop-shadow-md">
              Excelência jurídica com transparência digital absoluta.
            </h1>
            <p className="text-slate-300 text-xs leading-relaxed max-w-sm mx-auto drop-shadow-sm">
              Bem-vindo ao nosso portal integrado de gestão e atendimento. Aqui, nossos advogados gerenciam prazos fatais com precisão, e nossos clientes acompanham cada atualização em tempo real.
            </p>
          </div>
        </div>

        {/* Centered LGPD Notice */}
        <div className="flex items-center justify-center gap-2 text-slate-450 text-xs z-10 w-full">
          <ShieldCheck className="h-4.5 w-4.5 text-[#b8975a] shrink-0" />
          <span>Plataforma 100% adequada à Lei Geral de Proteção de Dados (LGPD).</span>
        </div>
      </div>

      {/* Login Card Side */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-24 bg-gradient-to-b from-[#111111] to-[#121824]">
        {/* Mobile Header */}
        <div className="flex lg:hidden items-center justify-center mb-10">
          <Logo showText={true} maxHeight="120px" />
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-3xl font-serif font-bold text-white tracking-tight">
                {isRegisterMode ? 'Criar Conta' : 'Portal Integrado'}
              </h2>
              <span className={`self-center text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                isSupabaseConfigured
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
              }`}>
                {isSupabaseConfigured ? 'Supabase Ativo' : 'Modo Demo (Mocks)'}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {isRegisterMode 
                ? 'Preencha os campos abaixo para se cadastrar na plataforma.' 
                : 'Escolha seu perfil e insira suas credenciais de acesso.'}
            </p>
          </div>

          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
            <button
              onClick={() => setRole('client')}
              className={`py-3 rounded-lg text-sm font-medium transition-all ${
                role === 'client'
                  ? 'bg-[#b8975a] text-[#111111] shadow-lg font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Área do Cliente
            </button>
            <button
              onClick={() => setRole('lawyer')}
              className={`py-3 rounded-lg text-sm font-medium transition-all ${
                role === 'lawyer'
                  ? 'bg-[#b8975a] text-[#111111] shadow-lg font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Painel do Advogado
            </button>
          </div>


          <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/35 text-red-200 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/35 text-emerald-300 rounded-lg p-3 text-sm">
                {successMessage}
              </div>
            )}

            <div className="space-y-4">
              {isRegisterMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome Completo</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <User className="h-5 w-5" />
                      </span>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex: Roberto de Albuquerque"
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-[#b8975a] focus:ring-1 focus:ring-[#b8975a] text-white placeholder-slate-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone / WhatsApp</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Phone className="h-5 w-5" />
                      </span>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ex: (11) 99999-9999"
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-[#b8975a] focus:ring-1 focus:ring-[#b8975a] text-white placeholder-slate-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {role === 'client' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">CPF ou CNPJ</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                          <FileText className="h-5 w-5" />
                        </span>
                        <input
                          type="text"
                          required
                          value={cpfCnpj}
                          onChange={(e) => setCpfCnpj(e.target.value)}
                          placeholder="Ex: 000.000.000-00"
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-[#b8975a] focus:ring-1 focus:ring-[#b8975a] text-white placeholder-slate-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Número da OAB</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                          <FileText className="h-5 w-5" />
                        </span>
                        <input
                          type="text"
                          required
                          value={oabNumber}
                          onChange={(e) => setOabNumber(e.target.value)}
                          placeholder="Ex: 123456/SP"
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-[#b8975a] focus:ring-1 focus:ring-[#b8975a] text-white placeholder-slate-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <User className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-[#b8975a] focus:ring-1 focus:ring-[#b8975a] text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-[#b8975a] focus:ring-1 focus:ring-[#b8975a] text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="lgpd"
                  type="checkbox"
                  checked={lgpdAccepted}
                  onChange={(e) => setLgpdAccepted(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-800 text-[#b8975a] focus:ring-offset-slate-900 focus:ring-[#b8975a] bg-slate-900"
                />
              </div>
              <label htmlFor="lgpd" className="ml-3 text-xs text-slate-400 leading-normal">
                Estou ciente e aceito que meus dados sejam tratados em total conformidade com a <span className="text-white font-medium">LGPD</span> para fins de acompanhamento processual.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#b8975a] to-[#e2c690] hover:from-[#e2c690] hover:to-[#b8975a] text-[#111111] font-bold rounded-lg shadow-lg shadow-[#b8975a]/10 hover:shadow-[#b8975a]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {loading 
                  ? 'Processando...' 
                  : (isRegisterMode ? 'Cadastrar e Acessar' : 'Acessar o Painel')}
              </span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-xs text-slate-400 hover:text-white transition-all underline cursor-pointer"
              >
                {isRegisterMode ? 'Já possui uma conta? Faça Login' : 'Não possui uma conta? Cadastre-se'}
              </button>
            </div>
          </form>

          {/* Footer mobile */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-slate-550 text-[11px] pt-6 border-t border-slate-900">
            <ShieldCheck className="h-4 w-4 text-[#b8975a]" />
            <span>Plataforma adequada à LGPD.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
