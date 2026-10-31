import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  BookHeart,
  Check,
  ChevronDown,
  CloudOff,
  Flower2,
  Heart,
  ImagePlus,
  LockKeyhole,
  LoaderCircle,
  MessageCircle,
  MoonStar,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  clearMemories,
  deleteMemory,
  getAllMemories,
  saveMemory,
} from './lib/storage.js';

const EMPTY_DRAFT = {
  name: '',
  relationship: 'Family member',
  story: '',
  qualities: '',
  food: '',
  song: '',
  flower: 'Marigold',
  smallDetail: '',
  photo: '',
};

const SAMPLE_MEMORY = {
  name: 'Nani',
  relationship: 'Grandmother',
  story: 'Every Sunday, she made warm thepla for everyone. She always saved the first one for me and asked about my week while we sat near the window.',
  qualities: 'Patient, funny, and quietly strong',
  food: 'Thepla with homemade mango pickle',
  song: 'A soft old Gujarati bhajan',
  flower: 'Marigold',
  smallDetail: 'She folded newspaper into little covers for coriander seeds.',
  photo: '',
};

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  if (!value) return 'A memory to keep';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function makeFallbackLetter(memory) {
  const name = memory.name?.trim() || 'This person';
  const story = memory.story?.trim();
  const qualities = memory.qualities?.trim();
  const food = memory.food?.trim();
  const detail = memory.smallDetail?.trim();
  const parts = [`${name} is remembered in the small moments that still feel close.`];
  if (story) parts.push(story);
  if (qualities) parts.push(`The qualities you remember are ${qualities.toLowerCase()}.`);
  if (food) parts.push(`Even the memory of ${food.toLowerCase()} keeps a little warmth alive.`);
  if (detail) parts.push(detail);
  return parts.join(' ');
}

function answerFromArchive(memory, question) {
  const q = question.toLowerCase();
  if (/(food|eat|dish|cook|meal|snack|favourite food)/.test(q)) {
    return memory.food ? `The memory you saved says their favourite comfort was ${memory.food}.` : 'That detail has not been added to this lantern yet.';
  }
  if (/(song|music|sing|tune)/.test(q)) {
    return memory.song ? `The song you saved is ${memory.song}.` : 'That detail has not been added to this lantern yet.';
  }
  if (/(flower|plant|garden)/.test(q)) {
    return memory.flower ? `The flower saved in this lantern is ${memory.flower}.` : 'That detail has not been added to this lantern yet.';
  }
  if (/(quality|personality|kind|like|character)/.test(q)) {
    return memory.qualities ? `You described them as ${memory.qualities}.` : 'That detail has not been added to this lantern yet.';
  }
  if (/(story|memory|remember|happen|together|detail)/.test(q)) {
    return memory.story || memory.smallDetail || 'That detail has not been added to this lantern yet.';
  }
  if (/(who|name|relationship)/.test(q)) {
    return `${memory.name} is saved in this lantern as your ${(memory.relationship || 'loved one').toLowerCase()}.`;
  }
  return 'I can only answer from the details saved in this lantern. Try asking about a story, a favourite food, a song, or a flower.';
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('Please choose an image smaller than 12 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('This image could not be opened.'));
      image.onload = () => {
        const maxEdge = 1000;
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Image compression is not supported in this browser.'));
          return;
        }
        context.fillStyle = '#171f1b';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function App() {
  const [activeTab, setActiveTab] = useState('create');
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [memories, setMemories] = useState([]);
  const [latestMemory, setLatestMemory] = useState(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState('');
  const [modelStatus, setModelStatus] = useState('idle');
  const [modelProgress, setModelProgress] = useState(0);
  const [modelMessage, setModelMessage] = useState('Ready when you are');
  const [modelError, setModelError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState([]);
  const workerRef = useRef(null);
  const pendingRef = useRef(new Map());
  const requestCounter = useRef(0);
  const importRef = useRef(null);

  useEffect(() => {
    let alive = true;
    getAllMemories()
      .then((items) => {
        if (!alive) return;
        const sorted = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setMemories(sorted);
        if (sorted[0]) {
          setLatestMemory(sorted[0]);
          setSelectedMemoryId(sorted[0].id);
        }
      })
      .catch((error) => {
        if (alive) setFormError(error.message || 'Local memory storage is not available.');
      });
    return () => {
      alive = false;
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedMemory = useMemo(
    () => memories.find((item) => item.id === selectedMemoryId) || memories[0] || null,
    [memories, selectedMemoryId],
  );

  function ensureWorker() {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL('./lib/ai.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      const message = event.data || {};
      if (message.type === 'progress') {
        const progress = message.progress || {};
        const amount = Number(progress.progress);
        if (Number.isFinite(amount)) setModelProgress(Math.max(0, Math.min(100, amount)));
        if (progress.status === 'progress_total') {
          setModelMessage('Downloading and preparing the local model');
        } else if (progress.status === 'progress') {
          const fileName = progress.file ? String(progress.file).split('/').pop() : '';
          setModelMessage(fileName ? `Downloading ${fileName}` : 'Preparing the local model');
        } else if (progress.status === 'done') {
          setModelMessage('Preparing model files');
        }
      }
      if (message.type === 'ready') {
        setModelStatus('ready');
        setModelProgress(100);
        setModelMessage('Private AI is ready on this device');
        setModelError('');
      }
      if (message.type === 'result') {
        const pending = pendingRef.current.get(message.requestId);
        if (pending) {
          pending.resolve(message.text);
          pendingRef.current.delete(message.requestId);
        }
      }
      if (message.type === 'error') {
        setModelStatus('error');
        setModelError(message.message || 'The model could not be loaded.');
        setModelMessage('Local AI needs attention');
        const pending = pendingRef.current.get(message.requestId);
        if (pending) {
          pending.reject(new Error(message.message || 'Local AI generation failed.'));
          pendingRef.current.delete(message.requestId);
        }
      }
    };
    worker.onerror = (event) => {
      const errorMessage = event?.message || 'The AI worker stopped unexpectedly.';
      setModelStatus('error');
      setModelError(errorMessage);
      setModelMessage('Local AI needs attention');
      for (const [, pending] of pendingRef.current) {
        pending.reject(new Error(errorMessage));
      }
      pendingRef.current.clear();
      try {
        worker.terminate();
      } catch {}
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };
    workerRef.current = worker;
    return worker;
  }

  function loadLocalAI() {
    if (workerRef.current && modelStatus === 'error') {
      try {
        workerRef.current.terminate();
      } catch {}
      workerRef.current = null;
    }
    setModelStatus('loading');
    setModelProgress(0);
    setModelError('');
    setModelMessage('Starting local model download');
    ensureWorker().postMessage({ type: 'load' });
  }

  function generateWithAI(task, memory, userQuestion = '') {
    return new Promise((resolve, reject) => {
      const worker = ensureWorker();
      const requestId = `request-${++requestCounter.current}`;
      pendingRef.current.set(requestId, { resolve, reject });
      worker.postMessage({ type: 'generate', requestId, task, memory, question: userQuestion });
    });
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError('');
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const photo = await compressImage(file);
      updateDraft('photo', photo);
      setToast('Photo added. It stays on this device.');
    } catch (error) {
      setFormError(error.message);
    }
    event.target.value = '';
  }

  function startEditing(memory) {
    if (!memory) return;
    setEditingId(memory.id);
    setDraft({
      name: memory.name || '',
      relationship: memory.relationship || 'Family member',
      story: memory.story || '',
      qualities: memory.qualities || '',
      food: memory.food || '',
      song: memory.song || '',
      flower: memory.flower || 'Marigold',
      smallDetail: memory.smallDetail || '',
      photo: memory.photo || '',
    });
    setFormError('');
    setActiveTab('create');
    document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
    setToast(`Editing memory for ${memory.name}.`);
  }

  function cancelEditing() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormError('');
    setToast('Editing cancelled.');
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.story.trim()) {
      setFormError('Please add a name and one memory or story.');
      return;
    }

    setBusy(true);
    setFormError('');
    let reflection = '';
    let aiUsed = false;
    const existing = editingId ? memories.find((m) => m.id === editingId) : null;
    const memoryId = existing ? existing.id : makeId();
    const createdAt = existing ? existing.createdAt : new Date().toISOString();

    try {
      if (modelStatus === 'ready') {
        reflection = await generateWithAI('letter', draft);
        aiUsed = true;
      } else {
        reflection = makeFallbackLetter(draft);
      }

      const saved = {
        ...draft,
        id: memoryId,
        createdAt,
        updatedAt: editingId ? new Date().toISOString() : undefined,
        reflection,
        aiUsed,
      };
      await saveMemory(saved);
      if (editingId) {
        setMemories((current) => current.map((item) => (item.id === memoryId ? saved : item)));
      } else {
        setMemories((current) => [saved, ...current]);
      }
      setLatestMemory(saved);
      setSelectedMemoryId(saved.id);
      setDraft(EMPTY_DRAFT);
      setEditingId(null);
      setActiveTab('archive');
      setChat([]);
      setToast(
        editingId
          ? 'Memory updated successfully.'
          : aiUsed
            ? 'Memory woven with on-device AI and saved privately.'
            : 'Memory saved on this device. Load local AI for an AI-written reflection next time.'
      );
    } catch (error) {
      const fallback = makeFallbackLetter(draft);
      const saved = {
        ...draft,
        id: memoryId,
        createdAt,
        updatedAt: editingId ? new Date().toISOString() : undefined,
        reflection: fallback,
        aiUsed: false,
      };
      try {
        await saveMemory(saved);
        if (editingId) {
          setMemories((current) => current.map((item) => (item.id === memoryId ? saved : item)));
        } else {
          setMemories((current) => [saved, ...current]);
        }
        setLatestMemory(saved);
        setSelectedMemoryId(saved.id);
        setDraft(EMPTY_DRAFT);
        setEditingId(null);
        setActiveTab('archive');
        setToast('Saved with a local text fallback. ' + (error.message || 'AI was unavailable.'));
      } catch (storageError) {
        setFormError(storageError.message || 'Could not save this memory locally.');
      }
    } finally {
      setBusy(false);
    }
  }

  function loadSample() {
    setEditingId(null);
    setDraft({ ...SAMPLE_MEMORY });
    setFormError('');
    setActiveTab('create');
    setToast('Example memory loaded. Edit it or create it as a demo.');
  }

  async function handleAsk(event) {
    event.preventDefault();
    if (!selectedMemory || !question.trim()) return;
    const asked = question.trim();
    setQuestion('');
    setChat((current) => [...current, { role: 'user', text: asked }]);
    setBusy(true);
    try {
      const answer = modelStatus === 'ready'
        ? await generateWithAI('echo', selectedMemory, asked)
        : answerFromArchive(selectedMemory, asked);
      setChat((current) => [...current, { role: 'assistant', text: answer, aiUsed: modelStatus === 'ready' }]);
    } catch (error) {
      setChat((current) => [...current, {
        role: 'assistant',
        text: `${answerFromArchive(selectedMemory, asked)} (Local AI was unavailable: ${error.message})`,
        aiUsed: false,
      }]);
    } finally {
      setBusy(false);
    }
  }

  async function removeMemory(memory) {
    if (!window.confirm(`Delete the memory for ${memory.name}? This cannot be undone.`)) return;
    try {
      await deleteMemory(memory.id);
      const remaining = memories.filter((item) => item.id !== memory.id);
      setMemories(remaining);
      if (selectedMemoryId === memory.id) setSelectedMemoryId(remaining[0]?.id || '');
      if (latestMemory?.id === memory.id) setLatestMemory(remaining[0] || null);
      if (editingId === memory.id) {
        setEditingId(null);
        setDraft(EMPTY_DRAFT);
      }
      setToast('Memory removed from this device.');
    } catch (error) {
      setToast(error.message || 'Could not delete this memory.');
    }
  }

  async function handleClearArchive() {
    if (memories.length === 0) return;
    if (
      !window.confirm(
        'Are you sure you want to clear your entire memory archive? This will permanently delete all memories and photographs stored in this browser. Please download a backup first.',
      )
    ) {
      return;
    }
    try {
      await clearMemories();
      setMemories([]);
      setLatestMemory(null);
      setSelectedMemoryId('');
      setEditingId(null);
      setChat([]);
      setToast('All memories have been removed from this browser.');
    } catch (error) {
      setToast(error.message || 'Could not clear the memory archive.');
    }
  }

  function exportArchive() {
    if (memories.length === 0) return;
    const blob = new Blob([JSON.stringify({ app: 'Echoes of the Lantern', version: 1, memories }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'echoes-memory-backup.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setToast('Your private archive backup was downloaded.');
  }

  async function importArchive(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      let text = '';
      try {
        text = await file.text();
      } catch {
        throw new Error('Unable to read this file. Please choose a valid JSON backup.');
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON format. Please select a valid Echoes backup file.');
      }

      const imported = Array.isArray(parsed) ? parsed : parsed?.memories;
      if (!Array.isArray(imported)) {
        throw new Error('Unrecognized backup format. The file must contain a memories archive.');
      }

      if (imported.length === 0) {
        throw new Error('The selected backup file contains no memories.');
      }

      const cleanItems = imported
        .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0 && typeof item.story === 'string' && item.story.trim().length > 0)
        .map((item) => ({ ...item, id: item.id || makeId(), createdAt: item.createdAt || new Date().toISOString() }));

      if (cleanItems.length === 0) {
        throw new Error('No valid memories found in this backup. Each memory requires a name and a story.');
      }

      for (const item of cleanItems) await saveMemory(item);
      const all = await getAllMemories();
      all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMemories(all);
      setLatestMemory(all[0] || null);
      setSelectedMemoryId(all[0]?.id || '');
      setToast(`Successfully imported ${cleanItems.length} ${cleanItems.length === 1 ? 'memory' : 'memories'} into this device.`);
    } catch (error) {
      setToast(error.message || 'Could not import this archive.');
    } finally {
      event.target.value = '';
    }
  }

  function downloadCurrentMemory() {
    if (!selectedMemory) return;
    const content = [
      `A memory for ${selectedMemory.name}`,
      `Relationship: ${selectedMemory.relationship}`,
      `Saved: ${formatDate(selectedMemory.createdAt)}`,
      selectedMemory.updatedAt ? `Updated: ${formatDate(selectedMemory.updatedAt)}` : '',
      '',
      selectedMemory.reflection || makeFallbackLetter(selectedMemory),
      '',
      'Original memory',
      selectedMemory.story,
      selectedMemory.qualities ? `Remembered qualities: ${selectedMemory.qualities}` : '',
      selectedMemory.food ? `Favourite comfort: ${selectedMemory.food}` : '',
      selectedMemory.song ? `Song: ${selectedMemory.song}` : '',
      selectedMemory.smallDetail ? `A small detail: ${selectedMemory.smallDetail}` : '',
      '',
      'Created with Echoes of the Lantern. AI reflections are generated from user-provided details and are not messages from the deceased.',
    ].filter(Boolean).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `memory-${selectedMemory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setToast('Memory note downloaded.');
  }

  function readAloud() {
    if (!selectedMemory) return;
    if (!('speechSynthesis' in window)) {
      setToast('Text-to-speech is not available in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(selectedMemory.reflection || makeFallbackLetter(selectedMemory));
    speech.rate = 0.92;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Copied to clipboard.');
    } catch {
      setToast('Clipboard access is blocked by this browser.');
    }
  }

  const previewMemory = latestMemory || {
    ...SAMPLE_MEMORY,
    name: 'Your loved one',
    story: 'Your story will be held here, in your own words.',
    reflection: 'A small light can hold a lifetime of memories. Add a story to create your own lantern.',
  };

  return (
    <div className="app-shell">
      <header className="topbar wrap">
        <a className="brand" href="#top" aria-label="Echoes of the Lantern home">
          <span className="brand-mark"><MoonStar size={20} /></span>
          <span className="brand-name">ECHOES<span> / </span>OF THE LANTERN</span>
        </a>
        <div className="topbar-right">
          <span className="privacy-pill"><LockKeyhole size={13} /> PRIVATE BY DESIGN</span>
          <button
            className={`ai-button ${modelStatus === 'ready' ? 'is-ready' : ''}`}
            onClick={loadLocalAI}
            disabled={modelStatus === 'loading' || modelStatus === 'ready'}
          >
            {modelStatus === 'loading' ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}
            {modelStatus === 'ready' ? 'LOCAL AI READY' : modelStatus === 'loading' ? 'LOADING MODEL' : 'LOAD LOCAL AI'}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero wrap">
          <div className="hero-art" aria-hidden="true" />
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> A LANTERN FOR THE STORIES WE KEEP</div>
            <h1>Some stories deserve a light that <em>never goes out.</em></h1>
            <p className="hero-subtitle">A quiet place to keep a voice, a favourite song, a small detail. Built with open AI. Kept on your device.</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}>
                Create a memory <ArrowRight size={16} />
              </button>
              <button className="button button-quiet" onClick={() => { setActiveTab('archive'); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}>
                Open the archive
              </button>
            </div>
            <div className="hero-note"><span className="tiny-star">✦</span> Not a séance. A living archive of what you choose to remember.</div>
          </div>
          <div className="hero-caption"><span>01 / REMEMBER</span><span>THE LIGHT STAYS HERE</span></div>
        </section>

        <section className="promise-strip wrap" aria-label="Privacy features">
          <div className="promise-item"><ShieldCheck size={17} /><span><strong>Your memories stay yours</strong><small>Saved in this browser only</small></span></div>
          <div className="promise-item"><CloudOff size={17} /><span><strong>No AI server calls</strong><small>Inference runs on your device</small></span></div>
          <div className="promise-item"><Heart size={17} /><span><strong>No account needed</strong><small>No sign-up or tracking profile</small></span></div>
        </section>

        <section className="workspace wrap" id="workspace">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR PRIVATE CORNER</div>
              <h2>Make room for <em>remembering.</em></h2>
            </div>
            <div className="archive-count"><span className="count-dot" /> {memories.length} {memories.length === 1 ? 'MEMORY' : 'MEMORIES'} SAVED</div>
          </div>

          <div className="tabbar" role="tablist" aria-label="Memory workspace">
            <button role="tab" aria-selected={activeTab === 'create'} className={activeTab === 'create' ? 'active' : ''} onClick={() => setActiveTab('create')}><Plus size={16} /> Create memory</button>
            <button role="tab" aria-selected={activeTab === 'echo'} className={activeTab === 'echo' ? 'active' : ''} onClick={() => setActiveTab('echo')}><MessageCircle size={16} /> Ask the Echo</button>
            <button role="tab" aria-selected={activeTab === 'archive'} className={activeTab === 'archive' ? 'active' : ''} onClick={() => setActiveTab('archive')}><BookHeart size={16} /> Memory archive <span className="tab-count">{memories.length}</span></button>
          </div>

          {activeTab === 'create' && (
            <div className="create-layout">
              <form className="form-panel" onSubmit={handleCreate}>
                <div className="panel-topline"><span>THE MEMORY BUILDER</span><span>01 — 03</span></div>
                {editingId && (
                  <div className="editing-banner">
                    <span><Pencil size={13} /> Editing memory for <strong>{draft.name || 'this entry'}</strong></span>
                    <button type="button" onClick={cancelEditing} className="cancel-edit-btn"><RotateCcw size={13} /> Cancel edit</button>
                  </div>
                )}
                <h3>{editingId ? 'Edit your saved memory.' : 'Start with a story.'}</h3>
                <p className="panel-intro">{editingId ? 'Update details, photograph, or stories. The original memory date and ID are preserved.' : 'A few details are enough. This space is yours, so write the way you speak.'}</p>

                <div className="field-grid two-columns">
                  <label className="field"><span>Their name <b>*</b></span><input value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} placeholder="e.g. Nani, Grandpa, Maya" maxLength={60} required /></label>
                  <label className="field"><span>Your connection</span><select value={draft.relationship} onChange={(e) => updateDraft('relationship', e.target.value)}>
                    {['Family member', 'Grandmother', 'Grandfather', 'Parent', 'Sibling', 'Friend', 'Partner', 'Pet', 'Mentor', 'Other'].map((item) => <option key={item}>{item}</option>)}
                  </select><ChevronDown className="select-chevron" size={14} /></label>
                </div>
                <label className="field"><span>A story you never want to lose <b>*</b></span><textarea value={draft.story} onChange={(e) => updateDraft('story', e.target.value)} placeholder="Tell us about a moment, a habit, or something they always did..." rows={4} maxLength={1000} required /></label>
                <label className="field"><span>What made them, them?</span><input value={draft.qualities} onChange={(e) => updateDraft('qualities', e.target.value)} placeholder="Funny, patient, always curious..." maxLength={180} /></label>
                <div className="field-grid two-columns">
                  <label className="field"><span>A favourite comfort</span><input value={draft.food} onChange={(e) => updateDraft('food', e.target.value)} placeholder="A meal, smell, or treat" maxLength={120} /></label>
                  <label className="field"><span>A song that brings them close</span><input value={draft.song} onChange={(e) => updateDraft('song', e.target.value)} placeholder="Song or artist" maxLength={120} /></label>
                </div>
                <div className="field-grid two-columns">
                  <label className="field"><span>Flower for the lantern</span><select value={draft.flower} onChange={(e) => updateDraft('flower', e.target.value)}>
                    {['Marigold', 'Rose', 'Jasmine', 'Sunflower', 'Lotus', 'Lily', 'White flowers', 'No flower'].map((item) => <option key={item}>{item}</option>)}
                  </select><ChevronDown className="select-chevron" size={14} /></label>
                  <label className="field"><span>A tiny detail worth keeping</span><input value={draft.smallDetail} onChange={(e) => updateDraft('smallDetail', e.target.value)} placeholder="A phrase, a routine, a little habit" maxLength={180} /></label>
                </div>

                <div className="photo-upload-row">
                  <div className="photo-picker-wrapper">
                    <label className="photo-picker">
                      <input type="file" accept="image/*" onChange={handlePhoto} />
                      {draft.photo ? <img src={draft.photo} alt="Selected memory" /> : <span className="photo-icon"><ImagePlus size={18} /></span>}
                      <span><strong>{draft.photo ? 'Photo added' : 'Add a photograph'}</strong><small>Optional · resized and stored locally</small></span>
                    </label>
                    {draft.photo && (
                      <button
                        type="button"
                        className="remove-photo"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          updateDraft('photo', '');
                        }}
                        aria-label="Remove photo"
                        title="Remove photo"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button type="button" className="sample-link" onClick={loadSample}>Try an example <ArrowRight size={13} /></button>
                </div>

                {formError && <div className="form-error" role="alert">{formError}</div>}
                <button type="submit" className="button button-primary create-submit" disabled={busy}>
                  {busy ? (
                    <><LoaderCircle size={16} className="spin" /> {editingId ? 'Updating memory...' : 'Keeping this memory...'}</>
                  ) : editingId ? (
                    <><Pencil size={16} /> Update memory <ArrowRight size={16} /></>
                  ) : (
                    <><WandSparkles size={16} /> Weave this memory <ArrowRight size={16} /></>
                  )}
                </button>
                <p className="form-footnote"><LockKeyhole size={12} /> Nothing is uploaded. Your memory is saved in this browser.</p>
              </form>

              <aside className="preview-column">
                <div className="preview-heading"><span>THE LANTERN PREVIEW</span><span>LIVE CANVAS</span></div>
                <MemoryCard memory={{ ...draft, name: draft.name || 'Your loved one', reflection: draft.name || draft.story ? makeFallbackLetter(draft) : 'A small light can hold a lifetime of memories. Add a story to create your own lantern.' }} preview />
                <div className="ai-status-card">
                  <div className="ai-status-icon"><Sparkles size={17} /></div>
                  <div className="ai-status-copy">
                    <strong>{modelStatus === 'ready' ? 'Open AI is awake' : modelStatus === 'loading' ? 'Waking the local model' : 'A small model. A private space.'}</strong>
                    <p>{modelStatus === 'ready' ? 'SmolLM2 is ready. Your next reflection will be generated on this device.' : modelStatus === 'loading' ? modelMessage : 'Load SmolLM2 135M Instruct to write reflections and answer from saved memories.'}</p>
                    {modelStatus === 'loading' && <div className="progress-track"><span style={{ width: `${modelProgress}%` }} /></div>}
                    {modelStatus === 'error' && <p className="model-error-text">{modelError}</p>}
                  </div>
                  {modelStatus === 'ready' ? <span className="status-ready"><Check size={13} /></span> : <button className="text-action" onClick={loadLocalAI} disabled={modelStatus === 'loading'}>{modelStatus === 'loading' ? `${Math.round(modelProgress)}%` : 'Load'}</button>}
                </div>
                <div className="model-fineprint">MODEL: SmolLM2-135M-Instruct · Q4 · ~181 MB · Best results in English</div>
              </aside>
            </div>
          )}

          {activeTab === 'echo' && (
            <div className="echo-layout">
              <div className="echo-panel">
                <div className="panel-topline"><span>THE MEMORY ECHO</span><span>02 — 03</span></div>
                <div className="echo-heading-icon"><MessageCircle size={20} /></div>
                <h3>Ask what you have saved.</h3>
                <p className="panel-intro">Memory Echo can help you find details in your archive. It only knows what you have chosen to save.</p>
                {memories.length === 0 ? (
                  <div className="empty-state compact-empty"><BookHeart size={26} /><strong>Your lantern is still waiting.</strong><span>Create a memory first, then ask the Echo about it.</span><button className="text-action" onClick={() => setActiveTab('create')}>Create a memory <ArrowRight size={14} /></button></div>
                ) : (
                  <>
                    <label className="field"><span>Choose a memory</span><select value={selectedMemory?.id || ''} onChange={(e) => { setSelectedMemoryId(e.target.value); setChat([]); }}>
                      {memories.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.relationship}</option>)}
                    </select><ChevronDown className="select-chevron" size={14} /></label>
                    <div className="suggested-questions">
                      <span>TRY ASKING</span>
                      <button onClick={() => setQuestion('What food did they love?')}>What food did they love?</button>
                      <button onClick={() => setQuestion('Tell me about a memory I saved.')}>What story did I save?</button>
                      <button onClick={() => setQuestion('What qualities did I remember?')}>What were they like?</button>
                    </div>
                  </>
                )}
                <div className="echo-privacy"><LockKeyhole size={14} /><span>Answers are generated on your device when local AI is loaded. The Echo is an archive assistant, not a spirit or a message from the deceased.</span></div>
              </div>
              <div className="chat-panel">
                <div className="chat-topbar"><span className="chat-live-dot" /><span>MEMORY ECHO</span><span className="chat-local-label">{modelStatus === 'ready' ? 'ON-DEVICE AI' : 'ARCHIVE MODE'}</span></div>
                <div className="chat-messages">
                  {chat.length === 0 ? (
                    <div className="chat-welcome"><div className="chat-orb"><MoonStar size={25} /></div><h4>A place to find the little things.</h4><p>Ask a question about one of your saved memories. The Echo will not make up an answer if a detail is missing.</p></div>
                  ) : chat.map((item, index) => (
                    <div className={`chat-message ${item.role}`} key={`${index}-${item.role}`}>
                      <div className="message-label">{item.role === 'user' ? 'YOU' : item.aiUsed ? 'LOCAL AI' : 'FROM YOUR ARCHIVE'}</div>
                      <div className="message-bubble">{item.text}</div>
                    </div>
                  ))}
                  {busy && <div className="typing-indicator"><span /><span /><span /> <small>Thinking on this device</small></div>}
                </div>
                <form className="chat-input-row" onSubmit={handleAsk}>
                  <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={selectedMemory ? 'Ask about a memory...' : 'Create a memory to begin'} disabled={!selectedMemory || busy} />
                  <button type="submit" aria-label="Send question" disabled={!selectedMemory || !question.trim() || busy}><Send size={17} /></button>
                </form>
                <div className="chat-footnote">{modelStatus === 'ready' ? 'Powered by SmolLM2 · Local inference' : 'Load local AI for open-weight model answers. Archive lookup works without the model.'}</div>
              </div>
            </div>
          )}

          {activeTab === 'archive' && (
            <div className="archive-panel">
              <div className="archive-toolbar">
                <div><div className="panel-topline"><span>YOUR MEMORY COLLECTION</span><span>03 — 03</span></div><h3>Every story is a small light.</h3><p className="panel-intro">Only memories saved in this browser appear here.</p></div>
                <div className="archive-actions">
                  <button className="outline-button" onClick={exportArchive} disabled={memories.length === 0}><ArrowDownToLine size={15} /> Backup</button>
                  <button className="outline-button" onClick={() => importRef.current?.click()}><Upload size={15} /> Restore</button>
                  <button className="outline-button danger-button" onClick={handleClearArchive} disabled={memories.length === 0}><Trash2 size={15} /> Clear archive</button>
                  <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importArchive} />
                </div>
              </div>
              {memories.length === 0 ? (
                <div className="empty-state"><div className="empty-ornament"><Flower2 size={28} /></div><h4>No stories here. Yet.</h4><p>Your archive begins with one moment you choose to keep.</p><button className="button button-primary" onClick={() => setActiveTab('create')}>Create your first memory <ArrowRight size={15} /></button><button className="sample-link centered-sample" onClick={loadSample}>Load a demo memory</button></div>
              ) : (
                <div className="archive-content-wrap">
                <div className="archive-grid">
                  {memories.map((memory) => (
                    <article className={`archive-card ${selectedMemoryId === memory.id ? 'selected' : ''}`} key={memory.id}>
                      <button className="archive-card-main" onClick={() => { setSelectedMemoryId(memory.id); setLatestMemory(memory); }}>
                        <div className="archive-card-image">
                          {memory.photo ? <img src={memory.photo} alt="" /> : <div className="no-photo"><Flower2 size={28} /></div>}
                          <span className="archive-flower">✦</span>
                        </div>
                        <div className="archive-card-content"><small>{memory.relationship} · {formatDate(memory.createdAt)}</small><h4>{memory.name}</h4><p>{memory.story}</p><span className="archive-open">Open this memory <ArrowRight size={13} /></span></div>
                      </button>
                      <div className="archive-card-footer">
                        <span className={memory.aiUsed ? 'ai-tag' : 'local-tag'}>{memory.aiUsed ? <><Sparkles size={11} /> OPEN AI REFLECTION</> : 'LOCAL MEMORY'}</span>
                        <div className="card-actions">
                          <button className="icon-button edit-button" onClick={(e) => { e.stopPropagation(); startEditing(memory); }} aria-label={`Edit ${memory.name}`} title="Edit memory"><Pencil size={13} /></button>
                          <button className="icon-button delete-button" onClick={(e) => { e.stopPropagation(); removeMemory(memory); }} aria-label={`Delete ${memory.name}`} title="Delete memory"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {selectedMemory && (
                  <div className="archive-detail">
                    <div className="archive-detail-copy">
                      <div className="eyebrow"><span className="eyebrow-line" /> SELECTED MEMORY</div>
                      <h3>{selectedMemory.name}</h3>
                      <div className="memory-relationship">{selectedMemory.relationship} · {formatDate(selectedMemory.createdAt)}</div>
                      <p>{selectedMemory.reflection || makeFallbackLetter(selectedMemory)}</p>
                      <div className="archive-detail-actions">
                        <button className="button button-primary" onClick={() => { setChat([]); setActiveTab('echo'); }}><MessageCircle size={15} /> Ask the Echo about this <ArrowRight size={14} /></button>
                        <button className="button button-quiet" onClick={() => startEditing(selectedMemory)}><Pencil size={15} /> Edit memory</button>
                      </div>
                    </div>
                    <div className="archive-detail-card"><MemoryCard memory={selectedMemory} /></div>
                  </div>
                )}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="open-story wrap">
          <div className="open-story-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> THE OPEN-SOURCE PROMISE</div>
            <h2>Built to remember.<br /><em>Not built to collect.</em></h2>
            <p>Echoes uses an open-weight language model and open-source browser inference. You can inspect the model, change it, or fork the whole project. No hosted AI endpoint sits between you and your memories.</p>
            <a href="https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX" target="_blank" rel="noreferrer" className="source-link">Explore the model <ArrowRight size={14} /></a>
          </div>
          <div className="open-facts">
            <div className="open-fact"><span>01</span><div><strong>Open weights</strong><p>SmolLM2 135M Instruct, Apache 2.0 family license.</p></div></div>
            <div className="open-fact"><span>02</span><div><strong>Local inference</strong><p>Transformers.js + ONNX Runtime in the browser. No inference API.</p></div></div>
            <div className="open-fact"><span>03</span><div><strong>Local storage</strong><p>IndexedDB keeps stories and compressed photos in this browser.</p></div></div>
            <div className="open-fact"><span>04</span><div><strong>Portable by design</strong><p>Export or restore a JSON backup. Fork, remix, and replace the model.</p></div></div>
          </div>
        </section>
      </main>

      <footer className="footer wrap">
        <div className="footer-brand"><MoonStar size={16} /> ECHOES OF THE LANTERN</div>
        <p>For the memories we carry. Made with care, not surveillance.</p>
        <span>OPEN SOURCE · LOCAL FIRST · 2026</span>
      </footer>

      {toast && <div className="toast" role="status"><Check size={15} /> {toast}</div>}

      {selectedMemory && activeTab === 'archive' && (
        <div className="selected-memory-tools" aria-label="Selected memory actions">
          <span><strong>{selectedMemory.name}</strong> · selected</span>
          <button onClick={() => startEditing(selectedMemory)}><Pencil size={14} /> Edit</button>
          <button onClick={downloadCurrentMemory}><ArrowDownToLine size={14} /> Download note</button>
          <button onClick={readAloud}><Volume2 size={14} /> Read aloud</button>
          <button onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>
          <button onClick={() => copyText(selectedMemory.reflection || makeFallbackLetter(selectedMemory))}><span className="copy-mark">↗</span> Copy note</button>
        </div>
      )}

      <div className="print-area" aria-hidden="true">
        {selectedMemory && <MemoryCard memory={selectedMemory} printable />}
      </div>
    </div>
  );
}

function MemoryCard({ memory, preview = false, printable = false }) {
  return (
    <article className={`memory-card ${preview ? 'preview-card' : ''} ${printable ? 'printable-card' : ''}`}>
      <div className="memory-card-top"><span>✦ A LIGHT WE KEEP ✦</span><span>NO. {String((memory.name || '01').length).padStart(2, '0')}</span></div>
      <div className="memory-photo-frame">
        {memory.photo ? <img src={memory.photo} alt={`Memory of ${memory.name}`} /> : <div className="memory-photo-empty"><Flower2 size={34} /><span>HELD IN MEMORY</span></div>}
      </div>
      <div className="memory-card-body">
        <div className="memory-card-label">IN LOVING REMEMBRANCE</div>
        <h3>{memory.name || 'A loved one'}</h3>
        <div className="memory-relationship">{memory.relationship || 'A special connection'}</div>
        <div className="memory-divider"><span>✦</span></div>
        <p className="memory-reflection">{memory.reflection || (preview ? 'A small light can hold a lifetime of memories. Add a story to create your own lantern.' : memory.story)}</p>
        <div className="memory-card-bottom"><span>{memory.flower || 'Marigold'} · ALWAYS REMEMBERED</span><span>✧</span></div>
      </div>
    </article>
  );
}

export default App;
