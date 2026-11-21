import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowLeft, CalendarDays, Check, ChevronRight, Clock3, Heart, ImagePlus, Instagram, LockKeyhole, Menu, MessageCircle, ShieldCheck, Sparkles, Trash2, UploadCloud, X } from 'lucide-react';
import './styles.css';

type Service = { id: string; name: string; application: number; maintenance: number; image: string | null };
type Config = { studioName: string; tagline: string; whatsapp: string; days: number[]; startTime: string; endTime: string; interval: number; blockedDates: string[]; services: Service[] };
type Stage = 0 | 1 | 2 | 3 | 4;
const money = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const dateISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => dateISO(new Date());
const fromISO = (s: string) => new Date(`${s}T12:00:00`);
const prettyDate = (s: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(fromISO(s));
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data as T;
}
function Photo({ service, className = '' }: { service: Service; className?: string }) {
  return <div className={`photo ${className}`}>
    {service.image ? <img src={service.image} alt={`Resultado do procedimento ${service.name}`} loading="lazy"/> : <div className="photo-placeholder"><Sparkles size={32} strokeWidth={1.2}/><span>Seu olhar merece brilhar</span><small>Foto em breve</small></div>}
  </div>;
}
function App() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loadError, setLoadError] = useState('');
  const [admin, setAdmin] = useState(false);
  const [menu, setMenu] = useState(false);
  const [step, setStep] = useState<Stage>(0);
  const [selected, setSelected] = useState('');
  const [kind, setKind] = useState<'application' | 'maintenance'>('application');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  useEffect(() => { api<Config>('/api/public').then(setCfg).catch(e => setLoadError(e.message)); }, []);
  const service = cfg?.services.find(s => s.id === selected);
  const price = service ? service[kind] : 0;
  const slots = useMemo(() => {
    if (!cfg) return [];
    const [sh, sm] = cfg.startTime.split(':').map(Number);
    const [eh, em] = cfg.endTime.split(':').map(Number);
    const output: string[] = [];
    for (let m = sh * 60 + sm; m < eh * 60 + em; m += cfg.interval) {
      output.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
    return output;
  }, [cfg]);
  const dates = useMemo(() => {
    if (!cfg) return [];
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + monthOffset);
    const month = d.getMonth();
    const blanks = Array.from({ length: d.getDay() }, () => null);
    const days: (string | null)[] = [...blanks];
    while (d.getMonth() === month) { days.push(dateISO(d)); d.setDate(d.getDate() + 1); }
    return days;
  }, [cfg, monthOffset]);
  const titleMonth = useMemo(() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + monthOffset); return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d); }, [monthOffset]);
  const choose = (id: string) => { setSelected(id); setStep(1); setFormError(''); document.getElementById('agendamento')?.scrollIntoView({ behavior: 'smooth' }); };
  const next = () => {
    setFormError('');
    if (step === 0 && !selected) return setFormError('Selecione um modelo para continuar.');
    if (step === 2 && (!date || !time)) return setFormError('Escolha uma data e um horário de preferência.');
    if (step === 3 && (fullName.trim().length < 3 || fullName.trim().length > 100 || !/^[0-9()+\s-]{10,20}$/.test(phone.trim()))) return setFormError('Informe seu nome completo e um telefone válido com DDD.');
    setStep(s => Math.min(4, s + 1) as Stage);
  };
  const contact = () => { if (!cfg?.whatsapp) { setFormError('O WhatsApp do estúdio ainda não foi configurado.'); return; } window.open(`https://wa.me/${cfg.whatsapp}`, '_blank', 'noopener,noreferrer'); };
  const finalize = () => {
    if (!cfg || !service || !cfg.whatsapp) { setFormError('O WhatsApp do estúdio ainda não foi configurado.'); return; }

const text = `Olá! Gostaria de solicitar um agendamento.

Nome: ${fullName.trim()}
Modelo: ${service.name}
Procedimento: ${kind === 'application' ? 'Primeira aplicação' : 'Manutenção'}
Valor: ${money(price)}
Data desejada: ${prettyDate(date)}
Horário desejado: ${time}${notes.trim() ? `\nObservações: ${notes.trim()}` : ''}

Gostaria de confirmar a disponibilidade desse horário. Obrigada!`;

    window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };
  if (loadError) return <div className="loading">Não foi possível carregar o site: {loadError}</div>;
  if (!cfg) return <div className="loading">Preparando seu momento de beleza…</div>;
  return <>
    <div className="topline">O seu momento de autocuidado começa aqui <Heart size={12} fill="currentColor" /></div>
    <header className="header"><div className="container nav">
      <a href="#inicio" className="brand" onClick={() => setAdmin(false)}><img src="/fairy.png" alt="Fadinha decorativa" className="fairy-icon-small" /><span><strong>{cfg.studioName}</strong><small>BEAUTY STUDIO</small></span></a>
      <nav className={menu ? 'links opened' : 'links'}><a href="#inicio" onClick={() => setMenu(false)}>Início</a><a href="#servicos" onClick={() => setMenu(false)}>Serviços</a><a href="#agendamento" onClick={() => { setMenu(false); setAdmin(false); }}>Agendamento</a><a href="#contato" onClick={() => setMenu(false)}>Contato</a></nav>
      <div className="nav-right"><button className="text-admin" onClick={() => { setAdmin(a => !a); setMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><LockKeyhole size={15}/> {admin ? 'Voltar ao site' : 'Área administrativa'}</button><button className="mobile-menu" aria-label="Abrir menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div>
    </div></header>
    {admin ? <Admin cfg={cfg} update={setCfg} /> : <>
      <main>
        <section className="hero" id="inicio"><div className="container hero-grid"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> SEU OLHAR, NOSSA ARTE</div><h1>Realçando o olhar com<i>naturalidade.</i></h1><p className="hero-desc">Escolha o efeito perfeito para você e agende seu momento de beleza. Cada detalhe pensado para valorizar quem você é.</p><div className="hero-actions"><a className="btn btn-primary" href="#agendamento">Agendar meu horário <ArrowRight size={18}/></a><a className="btn btn-outline" href="#servicos">Conhecer os modelos</a></div><div className="hero-foot"><div className="hero-star">
  <img src="/fairy.png" alt="Fadinha decorativa" className="fairy-icon" />
</div><span>Beleza nos detalhes.<br/>Confiança em cada olhar.</span></div></div><div className="hero-visual"><div className="hero-frame"><div className="hero-art"><div className="decor-circle"></div>
<img
  src="/hero-lash.jpg"
  alt="Extensão de cílios Lash Germano"
  className="hero-photo"
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  }}
/>
<span className="hero-art-caption"> </span></div></div></div></div></section>
        <section className="introline"><div className="container intro-inner"><span>DELICADEZA</span><span className="diamond">✦</span><span>ELEGÂNCIA</span><span className="diamond">✦</span><span>AUTOCUIDADO</span><span className="diamond">✦</span><span>SEU MOMENTO</span></div></section>
        <section className="services-section" id="servicos"><div className="container"><div className="section-top"><div><div className="eyebrow"><span className="eyebrow-line"/> NOSSOS PROCEDIMENTOS</div><h2>Um olhar para cada <i>essência.</i></h2><p>Descubra o estilo que combina com você. Cada técnica foi pensada para realçar sua beleza natural.</p></div><span className="section-flower">
  
<img src="/fairy-white.png" alt="Fadinha branca" className="fairy-icon-large" />

</span></div><div className="service-grid">{cfg.services.map((s, i) => <article className="service-card" key={s.id}><div className="service-image"><Photo service={s}/><span className="service-number">{String(i + 1).padStart(2, '0')}</span></div><div className="service-content"><h3>{s.name}</h3><div className="price-row"><span>Aplicação <b>{money(s.application)}</b></span><span>Manutenção <b>{money(s.maintenance)}</b></span></div><button onClick={() => choose(s.id)}>Escolher este modelo <ArrowRight size={17}/></button></div></article>)}</div><p className="price-note">* Valores sujeitos a alteração. Consulte disponibilidade.</p></div></section>
        <section className="booking-section" id="agendamento"><div className="container"><div className="booking-head"><div className="eyebrow justify-center"><span className="eyebrow-line"/> SEU MOMENTO ESPECIAL <span className="eyebrow-line"/></div><h2>Agende seu <i>momento.</i></h2><p>Simples, rápido e feito com carinho. Escolha sua preferência e finalize pelo WhatsApp.</p></div><div className="booking-box"><div className="step-header">{['Modelo', 'Procedimento', 'Data e hora', 'Seus dados', 'Revisar'].map((label, i) => <div className={`step-item ${i === step ? 'current' : ''} ${i < step ? 'done' : ''}`} key={label}><span className="step-dot">{i < step ? <Check size={14}/> : i + 1}</span><small>{label}</small></div>)}</div><div className="step-body">
          {step === 0 && <><div className="step-heading"><span>01 — O PRIMEIRO PASSO</span><h3>Qual efeito combina com você?</h3><p>Escolha um dos nossos modelos de extensão de cílios.</p></div><div className="mini-model-grid">{cfg.services.map(s => <button key={s.id} className={`mini-model ${selected === s.id ? 'selected' : ''}`} onClick={() => setSelected(s.id)}><Photo service={s}/><span>{s.name}</span>{selected === s.id && <Check className="mini-check" size={18}/>}</button>)}</div></>}
          {step === 1 && <><div className="step-heading"><span>02 — PERSONALIZE SUA ESCOLHA</span><h3>Qual tipo de atendimento?</h3><p>Selecione o procedimento que deseja realizar.</p></div><div className="choice-grid"><button className={`choice-card ${kind === 'application' ? 'selected' : ''}`} onClick={() => setKind('application')}><Sparkles size={28}/><h4>Primeira aplicação</h4><p>Para um novo olhar.</p><strong>{money(service?.application ?? 0)}</strong><span className="radio-dot"/></button><button className={`choice-card ${kind === 'maintenance' ? 'selected' : ''}`} onClick={() => setKind('maintenance')}><Heart size={28}/><h4>Manutenção</h4><p>Para renovar a beleza do seu olhar.</p><strong>{money(service?.maintenance ?? 0)}</strong><span className="radio-dot"/></button></div></>}
          {step === 2 && <><div className="step-heading"><span>03 — O MOMENTO IDEAL</span><h3>Quando você gostaria de vir?</h3><p>Selecione uma data e um horário de preferência. A disponibilidade será confirmada pelo estúdio no WhatsApp.</p></div><div className="calendar-grid"><div className="calendar"><div className="calendar-heading"><button aria-label="Mês anterior" disabled={monthOffset === 0} onClick={() => setMonthOffset(n => n - 1)}><ArrowLeft size={17}/></button><strong>{titleMonth}</strong><button aria-label="Mês seguinte" disabled={monthOffset >= 6} onClick={() => setMonthOffset(n => n + 1)}><ArrowRight size={17}/></button></div><div className="calendar-cells">{weekdays.map(x => <span className="weekday" key={x}>{x}</span>)}{dates.map((d, i) => { const valid = !!d && d >= today() && cfg.days.includes(fromISO(d).getDay()) && !cfg.blockedDates.includes(d); return d ? <button key={d} disabled={!valid} className={date === d ? 'active-day' : ''} onClick={() => { setDate(d); setTime(''); }}>{Number(d.slice(8))}</button> : <span key={`blank-${i}`}/>; })}</div></div><div className="time-select"><div className="time-title"><Clock3 size={18}/> Horários de preferência</div>{date ? <><p>Para {prettyDate(date)}</p><div className="slots">{slots.map(x => <button key={x} onClick={() => setTime(x)} className={time === x ? 'active' : ''}>{x}</button>)}</div>{!slots.length && <p>O estúdio ainda não definiu horários.</p>}</> : <div className="time-empty"><CalendarDays size={35}/><p>Escolha uma data ao lado para visualizar os horários.</p></div>}</div></div><div className="hint"><ShieldCheck size={17}/> Horários sujeitos a confirmação. A escolha não é uma reserva automática.</div></>}
          {step === 3 && <><div className="step-heading"><span>04 — QUEREMOS CONHECER VOCÊ</span><h3>Conte um pouquinho sobre você.</h3><p>Precisamos apenas destes dados para preparar sua solicitação.</p></div><div className="form-fields"><label>Nome completo *<input maxLength={100} value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" placeholder="Como podemos chamar você?"/></label><label>Telefone / WhatsApp com DDD *<input maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" type="tel" placeholder="(83) 99999-9999"/></label><label>Alguma observação? (opcional)<textarea maxLength={500} rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Se quiser, conte algo que devemos saber…"/></label></div><small className="privacy-mini">Seus dados são usados apenas para preencher a mensagem no WhatsApp. Não são salvos neste site.</small></>}
          {step === 4 && <><div className="step-heading"><span>05 — TUDO PRONTINHO</span><h3>Vamos conferir os detalhes?</h3><p>Revise suas escolhas antes de enviar a solicitação.</p></div><div className="summary"><div className="summary-photo">{service && <Photo service={service}/>}</div><div className="summary-details"><div className="summary-item"><span>Cliente</span><strong>{fullName}</strong></div><div className="summary-item"><span>Modelo</span><strong>{service?.name}</strong></div><div className="summary-item"><span>Procedimento</span><strong>{kind === 'application' ? 'Primeira aplicação' : 'Manutenção'}</strong></div><div className="summary-item"><span>Data desejada</span><strong>{prettyDate(date)}</strong></div><div className="summary-item"><span>Horário desejado</span><strong>{time}</strong></div><div className="summary-total"><span>Valor previsto</span><strong>{money(price)}</strong></div></div></div><div className="hint"><MessageCircle size={17}/> Seu agendamento só será confirmado após a resposta do estúdio pelo WhatsApp.</div></>}
          {formError && <div className="error" role="alert">{formError}</div>}
          <div className="step-actions">{step > 0 ? <button className="btn btn-outline" onClick={() => { setStep(s => (s - 1) as Stage); setFormError(''); }}><ArrowLeft size={17}/> Voltar</button> : <span/>}{step < 4 ? <button className="btn btn-primary" onClick={next}>Continuar <ArrowRight size={17}/></button> : <button className="btn btn-primary" onClick={finalize}><MessageCircle size={18}/> Finalizar pelo WhatsApp</button>}</div>
        </div></div></div></section>
        <section className="closing" id="contato"><div className="container closing-inner"><div className="closing-icon">
  
<img src="/fairy-white.png" alt="Fadinha branca" className="fairy-icon-large" />

</div><div className="eyebrow justify-center">CUIDADO EM CADA DETALHE</div><h2>O próximo olhar incrível <i>pode ser o seu.</i></h2><p>Uma experiência delicada e personalizada, do início ao fim.</p><button className="btn btn-light" onClick={contact}><MessageCircle size={18}/> Conversar no WhatsApp <ArrowRight size={17}/></button></div></section>
      </main><footer className="footer"><div className="container footer-inner"><a href="#inicio" className="footer-brand">
  <img src="/fairy.png" alt="Fadinha decorativa" className="fairy-icon-small" />
  &nbsp; {cfg.studioName}
</a><span>Feito com carinho para realçar sua beleza.</span><a href="#privacidade">Privacidade</a></div></footer><section id="privacidade" className="privacy-text container"><h3>Privacidade e proteção de dados</h3><p>Este site utiliza os dados digitados (nome, telefone e observações) exclusivamente para compor a mensagem que você decide enviar pelo WhatsApp. O site não armazena essas informações no servidor. Ao abrir o WhatsApp, o tratamento das informações também estará sujeito às políticas da plataforma. Entre em contato com o estúdio pelo WhatsApp para solicitar informações sobre o tratamento dos dados.</p></section>
      <button className="whatsapp-float" title="Fale pelo WhatsApp" aria-label="Fale pelo WhatsApp" onClick={contact}><MessageCircle size={25}/></button>
    </>}
  </>
}
function Admin({ cfg, update }: { cfg: Config; update: (v: Config) => void }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [draft, setDraft] = useState<Config>(structuredClone(cfg));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, File>>({});
  useEffect(() => { api<{authenticated:boolean}>('/api/admin/session').then(x => setAuthenticated(x.authenticated)).catch(() => {}); }, []);
  useEffect(() => { setDraft(structuredClone(cfg)); }, [cfg]);
  const login = async (e: React.FormEvent) => { e.preventDefault(); setStatus(''); setBusy(true); try { await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); setPassword(''); setAuthenticated(true); } catch (e) { setStatus((e as Error).message); } finally { setBusy(false); } };
  const save = async () => { setBusy(true); setStatus(''); try { const result = await api<Config>('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }); update(result); setStatus('Alterações salvas com sucesso.'); } catch (e) { setStatus((e as Error).message); } finally { setBusy(false); } };
  const selectPhoto = (serviceId: string, file?: File) => { if (!file) return; setStatus(''); if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setStatus('Selecione uma imagem JPEG, PNG ou WebP de até 5 MB.'); return; } const url = URL.createObjectURL(file); setPreview(p => { if (p[serviceId]) URL.revokeObjectURL(p[serviceId]); return { ...p, [serviceId]: url }; }); setPending(p => ({ ...p, [serviceId]: file })); };
  // Reduz fotografias antes de enviar: D1 Free aceita BLOB menor que 2 MB.
  const optimizePhoto = async (source: File): Promise<File> => {
    const image = await createImageBitmap(source);
    try {
      const maxSide = 1000;
      const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * ratio);
      canvas.height = Math.round(image.height * ratio);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível preparar a fotografia.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.78));
      if (!blob || blob.type !== 'image/webp' || blob.size > 1500000) throw new Error('A foto ainda ficou muito grande. Escolha outra imagem.');
      return new File([blob], 'foto.webp', { type: 'image/webp' });
    } finally { image.close(); }
  };
  const upload = async (serviceId: string) => { const file = pending[serviceId]; if (!file) return; setStatus(''); setBusy(true); try { const form = new FormData(); form.append('image', await optimizePhoto(file)); await api(`/api/admin/services/${serviceId}/image`, { method: 'POST', body: form }); const latest = await api<Config>('/api/public'); update(latest); setStatus('Foto salva com sucesso.'); URL.revokeObjectURL(preview[serviceId]); setPreview(p => { const q = { ...p }; delete q[serviceId]; return q; }); setPending(p => { const q = { ...p }; delete q[serviceId]; return q; }); } catch (e) { setStatus((e as Error).message); } finally { setBusy(false); } };
  const remove = async (serviceId: string) => { if (!window.confirm('Excluir esta fotografia?')) return; setBusy(true); setStatus(''); try { await api(`/api/admin/services/${serviceId}/image`, { method: 'DELETE' }); update(await api<Config>('/api/public')); setStatus('Foto removida.'); } catch(e) { setStatus((e as Error).message); } finally { setBusy(false); } };
  const logout = async () => { try { await api('/api/admin/logout', { method: 'POST' }); } finally { setAuthenticated(false); } };
  if (!authenticated) return <main className="admin-login"><div className="login-card"><div className="login-icon"><LockKeyhole size={30}/></div><h1>Área administrativa</h1><p>Entre com a senha da proprietária para gerenciar o estúdio.</p><form onSubmit={login}><label>Senha administrativa<input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="Digite sua senha"/></label>{status && <div className="error">{status}</div>}<button className="btn btn-primary" disabled={busy} type="submit">{busy ? 'Entrando...' : 'Entrar no painel'} <ArrowRight size={17}/></button></form></div></main>;
  return <main className="admin-main"><div className="container"><div className="admin-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> PAINEL DA PROPRIETÁRIA</div><h1>Seu estúdio, <i>do seu jeito.</i></h1><p>Configure os detalhes que suas clientes vão visualizar.</p></div><button className="btn btn-outline" onClick={logout}>Sair do painel</button></div>
    {status && <div className={status.includes('sucesso') || status.includes('removida') ? 'success' : 'error'} role="status">{status}</div>}
    <section className="admin-panel"><div className="panel-heading"><ImagePlus size={21}/><div><h2>Gerenciar imagens</h2><p>Escolha uma fotografia para cada um dos sete modelos. Até 5 MB por foto.</p></div></div><div className="admin-photos">{draft.services.map(s => <div className="admin-photo-row" key={s.id}><div className="admin-thumb">{preview[s.id] ? <img src={preview[s.id]} alt="Prévia"/> : <Photo service={s}/>}</div><div className="admin-photo-label"><strong>{s.name}</strong><small>{s.image ? 'Fotografia cadastrada' : 'Sem fotografia'}</small></div><label className="upload-btn"><UploadCloud size={17}/> {s.image ? 'Alterar foto' : 'Adicionar foto'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { selectPhoto(s.id, e.target.files?.[0]); e.target.value = ''; }}/></label>{pending[s.id] && <button className="upload-btn save-photo" disabled={busy} onClick={() => void upload(s.id)}><Check size={16}/> Salvar foto</button>}{s.image && <button className="delete-photo" aria-label={`Remover foto de ${s.name}`} disabled={busy} onClick={() => remove(s.id)}><Trash2 size={17}/></button>}</div>)}</div></section>
    <section className="admin-panel"><div className="panel-heading"><Sparkles size={21}/><div><h2>Identidade e contato</h2><p>Personalize o nome do estúdio e o contato de agendamento.</p></div></div><div className="settings-grid"><label>Nome do estúdio<input maxLength={80} value={draft.studioName} onChange={e => setDraft({ ...draft, studioName: e.target.value })}/></label><label>Subtítulo<input maxLength={160} value={draft.tagline} onChange={e => setDraft({ ...draft, tagline: e.target.value })}/></label><label>WhatsApp do estúdio (somente números, com DDI + DDD)<input placeholder="5583999999999" inputMode="numeric" value={draft.whatsapp} onChange={e => setDraft({ ...draft, whatsapp: e.target.value.replace(/\D/g, '') })}/></label></div></section>
    <section className="admin-panel"><div className="panel-heading"><CalendarDays size={21}/><div><h2>Dias e horários</h2><p>Defina em quais dias e horários as clientes podem fazer solicitações.</p></div></div><div className="day-selector">{weekdays.map((label, i) => <label key={i}><input type="checkbox" checked={draft.days.includes(i)} onChange={e => setDraft({ ...draft, days: e.target.checked ? [...draft.days, i].sort() : draft.days.filter(x => x !== i) })}/><span>{label}</span></label>)}</div><div className="settings-grid"><label>Abertura<input type="time" value={draft.startTime} onChange={e => setDraft({ ...draft, startTime: e.target.value })}/></label><label>Encerramento<input type="time" value={draft.endTime} onChange={e => setDraft({ ...draft, endTime: e.target.value })}/></label><label>Intervalo entre opções (minutos)<select value={draft.interval} onChange={e => setDraft({ ...draft, interval: Number(e.target.value) })}>{[15,30,45,60,90,120,180,240].map(v => <option key={v} value={v}>{v} minutos</option>)}</select></label></div><label className="wide-label">Bloquear datas específicas (uma data por linha, formato AAAA-MM-DD)<textarea rows={3} placeholder="2026-12-25" value={draft.blockedDates.join('\n')} onChange={e => setDraft({ ...draft, blockedDates: e.target.value.split(/\s+/).filter(Boolean) })}/></label><p className="admin-help">Importante: os horários representam preferências. A disponibilidade real deve ser confirmada pelo WhatsApp.</p></section>
    <section className="admin-panel"><div className="panel-heading"><Heart size={21}/><div><h2>Preços dos procedimentos</h2><p>Edite os valores e nomes. As alterações aparecem no catálogo e agendamento.</p></div></div><div className="prices-admin">{draft.services.map((s, i) => <div className="price-admin-row" key={s.id}><label>Modelo<input maxLength={80} value={s.name} onChange={e => setDraft({ ...draft, services: draft.services.map((x, j) => i === j ? { ...x, name: e.target.value } : x) })}/></label><label>Aplicação (R$)<input type="number" min="0" max="100000" step="0.01" value={s.application} onChange={e => setDraft({ ...draft, services: draft.services.map((x, j) => i === j ? { ...x, application: Number(e.target.value) } : x) })}/></label><label>Manutenção (R$)<input type="number" min="0" max="100000" step="0.01" value={s.maintenance} onChange={e => setDraft({ ...draft, services: draft.services.map((x, j) => i === j ? { ...x, maintenance: Number(e.target.value) } : x) })}/></label></div>)}</div></section>
    <div className="save-bar"><span><ShieldCheck size={16}/> Modificações de fotos são salvas ao enviar. As demais precisam de "Salvar configurações".</span><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar configurações'} <Check size={18}/></button></div>
  </div></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
