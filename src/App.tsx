/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { Mic, Paperclip, Square, PenLine, Send, Image as ImageIcon, X, MessageSquare, Edit2, Trash2, Volume2 } from "lucide-react";

const SYSTEM_PROMPT = `<sistema>
Eres AXIS — un analista de alto nivel en psicología relacional masculina, dinámica de atracción, 
conducta humana y selección de pareja. No eres un coach motivacional ni un consejero empático 
genérico. Eres un analista frío, preciso y estratégico, con formación profunda en:

- Psicología conductual y emocional
- Teoría del apego (Bowlby, Ainsworth, Levine)
- Biología evolutiva aplicada a la selección de pareja
- Comunicación no verbal y paralenguaje
- Dinámica de estatus, reciprocidad y percepción de valor
- Patrones observables de atracción, ambivalencia, prueba y rechazo

Tu misión no es hacer sentir bien al usuario. Tu misión es darle claridad, 
precisión y ventaja conductual.
</sistema>

<identidad_y_tono>
Responde como un analista sobrio e inteligente que ha visto miles de dinámicas relacionales.
- Tono: directo, seguro, sin adornos, sin condescendencia
- Lenguaje: claro, accesible, sin jerga innecesaria
- Postura: firme pero no arrogante; estratégico pero no manipulador
- Si el usuario está actuando desde el miedo, la ansiedad o la dependencia: nómbralo 
  sin rodeos y redirige.
</identidad_y_tono>

<proceso_de_razonamiento>
Antes de responder cualquier situación, razona internamente en este orden:
1. ¿Qué está describiendo el usuario — hechos, interpretaciones o emociones?
2. ¿Cuál es el patrón conductual más probable basado en la evidencia disponible?
3. ¿Qué marcos (apego, estatus, reciprocidad, biología) son más relevantes aquí?
4. ¿Hay señales contradictorias o ambigüedad real? Si sí, ¿cuál es la lectura más probable?
5. ¿Qué error está cometiendo el hombre, si existe?
6. ¿Cuál es la acción óptima dado el contexto específico?

No muestres este proceso al usuario a menos que lo pida. Úsalo para estructurar 
una respuesta precisa.
</proceso_de_razonamiento>

<formato_de_respuesta>
Cuando el usuario presente una situación, responde SIEMPRE en este orden:

**[DIAGNÓSTICO]** — Qué está pasando realmente (basado en hechos observables).
**[LECTURA PSICOLÓGICA]** — Qué revela esto sobre la dinámica, el estado emocional 
y la intención de cada parte.
**[SEÑALES CLAVE]** — Qué indica interés, ambivalencia, prueba o rechazo. 
Sé específico: cita elementos concretos de lo que describió el usuario.
**[ERRORES DETECTADOS]** — Qué está haciendo mal el hombre (si aplica). 
Sin suavizar. Sin justificar conductas que le perjudican.
**[CONDUCTA DE ALTO VALOR]** — Qué haría un hombre con estabilidad, seguridad 
y criterio claro en esta situación exacta.
**[ACCIÓN CONCRETA]** — Una frase, una acción o una estrategia específica para 
el siguiente paso. No teoría: qué hace o dice mañana.

Si la situación no requiere todos los bloques, omite los que no apliquen. 
Nunca rellenes con contenido vacío.
</formato_de_respuesta>

<reglas_de_precision>
1. Distingue siempre entre: HECHO observable / INFERENCIA razonable / HIPÓTESIS posible.
   Etiquétalos si el tema lo amerita.
2. Si no hay certeza, dilo. No inventes estudios, citas ni autoridades.
3. Si una tendencia es estadística, no la presentes como ley universal.
4. Si hay ambigüedad, ofrece la interpretación más probable + una alternativa, 
   y explica en qué evidencia se basa cada una.
5. No reduzcas situaciones complejas a una sola causa.
6. No confundas: atracción ≠ amor / interés inicial ≠ compromiso / prueba ≠ rechazo.
</reglas_de_precision>

<correcciones_prioritarias>
Si detectas en el usuario cualquiera de estos patrones, corrígelo PRIMERO, 
antes de dar estrategia:

- Ansiedad de apego o necesidad excesiva de validación
- Racionalización de conductas de la mujer que son señales claras de desinterés
- Obsesión o pensamiento rumiativo sobre una sola persona
- Pérdida de identidad o propósito en función de una relación
- Confusión entre manipulación y atracción

La corrección debe ser directa, sin crueldad, pero sin suavizar la verdad.
</correcciones_prioritarias>

<limites_eticos>
- Prioriza siempre: consentimiento, respeto mutuo y autenticidad.
- No proporciones estrategias de manipulación emocional, coerción ni engaño.
- Si una situación involucra conductas que dañan a terceros, nómbralo.
- El objetivo es que el usuario se vuelva más competente y consciente, 
  no que "gane" sobre otras personas.
</limites_eticos>

<mision>
Convertir al usuario en un hombre más masculino, más estable, más consciente y más capaz:
que lea mejor las dinámicas relacionales, se comunique con claridad y precisión, 
genere atracción real desde su identidad — no desde el miedo o la performance — 
y construya vínculos con criterio, sin dependencia ni debilidad innecesaria.
</mision>`;

function parseMarkdown(text) {
  return text
    .replace(/\*\*\[([A-ZÁÉÍÓÚÑ\s]+)\]\*\*/g, '<span class="block text-primary-container font-display font-bold text-[10px] tracking-[0.2em] uppercase mt-5 mb-2">[$1]</span>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-on-background">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-secondary">$1</em>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [savedChats, setSavedChats] = useState([]);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editChatName, setEditChatName] = useState("");
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    const loaded = localStorage.getItem("axis_chats");
    if (loaded) {
      try {
        setSavedChats(JSON.parse(loaded));
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      setSavedChats(prev => {
        const existingIdx = prev.findIndex(c => c.id === currentChatId);
        const chatName = existingIdx >= 0 && prev[existingIdx].name 
          ? prev[existingIdx].name 
          : (messages.find(m => m.role === "user")?._display?.substring(0, 30) || "Nuevo Chat");
        
        const updatedChat = {
          id: currentChatId,
          date: existingIdx >= 0 ? prev[existingIdx].date : new Date().toLocaleString(),
          name: chatName,
          messages: messages
        };

        let newSaved;
        if (existingIdx >= 0) {
          newSaved = [...prev];
          newSaved[existingIdx] = updatedChat;
        } else {
          newSaved = [updatedChat, ...prev];
        }
        localStorage.setItem("axis_chats", JSON.stringify(newSaved));
        return newSaved;
      });
    }
  }, [messages, currentChatId]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeak = (text: string, index: number) => {
    if (!window.speechSynthesis) {
      alert("Tu navegador no soporta la síntesis de voz.");
      return;
    }

    window.speechSynthesis.cancel();

    if (speakingIndex === index) {
      setSpeakingIndex(null);
      return;
    }

    const cleanText = text
      .replace(/\*\*\[(.*?)\]\*\*/g, '')
      .replace(/\[LABEL:(.*?)\]/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#/g, '');

    // Dividir el texto en oraciones para evitar que el motor de voz se congele con textos largos
    const chunks = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    let currentChunk = 0;

    const speakNextChunk = () => {
      if (currentChunk >= chunks.length) {
        setSpeakingIndex(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[currentChunk].trim());
      utterance.lang = 'es-ES';
      
      const voices = window.speechSynthesis.getVoices();
      const esVoices = voices.filter(v => v.lang.startsWith('es'));
      
      const maleKeywords = ['pablo', 'diego', 'jorge', 'carlos', 'antonio', 'male', 'hombre', 'david', 'jose'];
      let selectedVoice = esVoices.find(v => maleKeywords.some(keyword => v.name.toLowerCase().includes(keyword)));
      
      if (!selectedVoice && esVoices.length > 0) {
        selectedVoice = esVoices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.pitch = 0.7;
      utterance.rate = 0.95;

      utterance.onend = () => {
        currentChunk++;
        speakNextChunk();
      };
      
      utterance.onerror = (e) => {
        console.error("Error de síntesis de voz:", e);
        setSpeakingIndex(null);
      };

      window.speechSynthesis.speak(utterance);
    };

    setSpeakingIndex(index);
    speakNextChunk();
  };

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setVoiceSupported(true);
      const rec = new SR();
      rec.lang = "es-ES";
      rec.continuous = true;
      rec.interimResults = false;
      
      rec.onresult = (e) => {
        let newTranscript = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            newTranscript += e.results[i][0].transcript;
          }
        }
        if (newTranscript) {
          setInput(prev => prev ? prev + " " + newTranscript.trim() : newTranscript.trim());
        }
        setStatusMsg("");
      };
      
      rec.onerror = (e) => {
        if (e.error === "not-allowed") {
          isListeningRef.current = false;
          setIsListening(false);
          setStatusMsg("⚠ Permiso de micrófono denegado.");
          setTimeout(() => setStatusMsg(""), 3000);
        }
        // Se ignoran otros errores (como 'no-speech') para que no se detenga la grabación
      };
      
      rec.onend = () => {
        // Si el usuario no lo detuvo manualmente, reiniciamos el reconocimiento
        if (isListeningRef.current) {
          try {
            rec.start();
          } catch (err) {
            // Ignorar si ya está iniciado
          }
        } else {
          setIsListening(false);
        }
      };
      
      recognitionRef.current = rec;
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const startNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setStarted(false);
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  const loadChat = (chat) => {
    setMessages(chat.messages);
    setCurrentChatId(chat.id);
    setStarted(true);
    setShowSidebar(false);
  };

  const deleteChat = (id) => {
    const updated = savedChats.filter(c => c.id !== id);
    setSavedChats(updated);
    localStorage.setItem("axis_chats", JSON.stringify(updated));
    if (currentChatId === id) {
      startNewChat();
    }
  };

  const saveEditChatName = (id) => {
    if (!editChatName.trim()) {
      setEditingChatId(null);
      return;
    }
    setSavedChats(prev => {
      const newSaved = prev.map(c => c.id === id ? { ...c, name: editChatName } : c);
      localStorage.setItem("axis_chats", JSON.stringify(newSaved));
      return newSaved;
    });
    setEditingChatId(null);
  };

  const clearMemory = () => {
    setMessages([]);
    setSavedChats([]);
    setCurrentChatId(null);
    setStarted(false);
    localStorage.removeItem("axis_chats");
    setShowMemoryPanel(false);
    setShowConfirmClear(false);
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current.stop();
    } else {
      setStatusMsg("");
      try {
        isListeningRef.current = true;
        setIsListening(true);
        recognitionRef.current.start();
      } catch(e) {
        isListeningRef.current = false;
        setIsListening(false);
        setStatusMsg("⚠ No se pudo iniciar el micrófono.");
        setTimeout(() => setStatusMsg(""), 3000);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isText = file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md");

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const base64 = result.split(",")[1];
        setAttachedFile({ name: file.name, type: "image", base64, mediaType: file.type });
      };
      reader.readAsDataURL(file);
    } else if (isText) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedFile({ name: file.name, type: "text", content: ev.target.result });
      };
      reader.readAsText(file);
    } else {
      setStatusMsg("⚠ Solo se aceptan imágenes o archivos .txt");
      setTimeout(() => setStatusMsg(""), 3000);
    }
    e.target.value = "";
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || loading) return;
    if (!started) setStarted(true);

    const displayText = trimmed || `[Archivo: ${attachedFile?.name}]`;

    let geminiParts = [];
    if (attachedFile?.type === "image") {
      geminiParts.push({ text: trimmed || "Analiza esta imagen en el contexto de nuestra conversación." });
      geminiParts.push({
        inlineData: {
          data: attachedFile.base64,
          mimeType: attachedFile.mediaType
        }
      });
    } else if (attachedFile?.type === "text") {
      const textContent = trimmed
        ? `${trimmed}\n\n[Archivo adjunto: "${attachedFile.name}"]\n${attachedFile.content}`
        : `[Archivo adjunto: "${attachedFile.name}"]\n${attachedFile.content}`;
      geminiParts.push({ text: textContent });
    } else {
      geminiParts.push({ text: trimmed });
    }

    const newMessages = [
      ...messages,
      { role: "user", parts: geminiParts, _display: displayText, _file: attachedFile?.name || null }
    ];
    setMessages(newMessages);
    setInput("");
    setAttachedFile(null);
    setLoading(true);

    let chatId = currentChatId;
    if (!chatId) {
      chatId = Date.now();
      setCurrentChatId(chatId);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const contents = newMessages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: msg.parts || [{ text: msg.content }]
      }));

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-pro-preview",
        contents: contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        }
      });
      
      let fullReply = "";
      setMessages(prev => [...prev, { role: "assistant", content: "", _display: "" }]);
      
      for await (const chunk of responseStream) {
        fullReply += chunk.text;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: fullReply, _display: fullReply };
          return newMsgs;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[newMsgs.length - 1].role === "assistant" && newMsgs[newMsgs.length - 1].content === "") {
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: "Error de conexión.", _display: "Error de conexión." };
        } else {
          newMsgs.push({ role: "assistant", content: "Error de conexión.", _display: "Error de conexión." });
        }
        return newMsgs;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const getDisplayContent = (msg) => {
    if (msg._display) return msg._display;
    if (typeof msg.content === "string") return msg.content;
    return "[Mensaje]";
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-on-background font-sans wireframe-bg flex flex-col items-center selection:bg-primary-container selection:text-on-primary-container">
      {/* Header */}
      <header className="w-full max-w-5xl px-4 sm:px-6 py-3 sm:py-4 border-b border-secondary/15 flex items-center justify-between bg-background/60 backdrop-blur-[40px] sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-4">
          <svg className="drop-shadow-[0_0_8px_rgba(0,242,255,0.4)] w-[100px] sm:w-[140px] h-auto" viewBox="0 0 140 32">
            <g fill="none" stroke="#00f2ff" strokeWidth="1.2">
              <circle cx="12" cy="16" fill="#00f2ff" r="1.5"></circle>
              <path d="M12 16 L4 8 M12 16 L20 8 M12 16 L4 24 M12 16 L20 24 M12 16 H2 M12 16 H22 M12 16 V6 M12 16 V26"></path>
              <circle cx="4" cy="8" fill="#00f2ff" r="0.5"></circle>
              <circle cx="20" cy="8" fill="#00f2ff" r="0.5"></circle>
              <circle cx="4" cy="24" fill="#00f2ff" r="0.5"></circle>
              <circle cx="20" cy="24" fill="#00f2ff" r="0.5"></circle>
            </g>
            <g fill="none" stroke="#00f2ff" strokeWidth="1.2" transform="translate(35, 8)">
              <path d="M0 16 L8 0 L16 16 M4 9 H12"></path>
              <circle cx="0" cy="16" fill="#00f2ff" r="0.8"></circle>
              <circle cx="8" cy="0" fill="#00f2ff" r="0.8"></circle>
              <circle cx="16" cy="16" fill="#00f2ff" r="0.8"></circle>
              <g transform="translate(26, 0)">
                <path d="M0 0 L16 16 M0 16 L16 0"></path>
                <circle cx="0" cy="0" fill="#00f2ff" r="0.8"></circle>
                <circle cx="16" cy="16" fill="#00f2ff" r="0.8"></circle>
                <circle cx="0" cy="16" fill="#00f2ff" r="0.8"></circle>
                <circle cx="16" cy="0" fill="#00f2ff" r="0.8"></circle>
                <circle cx="8" cy="8" fill="#00f2ff" r="0.8"></circle>
              </g>
              <g transform="translate(52, 0)">
                <path d="M8 0 V16"></path>
                <circle cx="8" cy="0" fill="#00f2ff" r="0.8"></circle>
                <circle cx="8" cy="16" fill="#00f2ff" r="0.8"></circle>
              </g>
              <g transform="translate(70, 0)">
                <path d="M16 0 H0 V8 H16 V16 H0"></path>
                <circle cx="16" cy="0" fill="#00f2ff" r="0.8"></circle>
                <circle cx="0" cy="0" fill="#00f2ff" r="0.8"></circle>
                <circle cx="0" cy="8" fill="#00f2ff" r="0.8"></circle>
                <circle cx="16" cy="8" fill="#00f2ff" r="0.8"></circle>
                <circle cx="16" cy="16" fill="#00f2ff" r="0.8"></circle>
                <circle cx="0" cy="16" fill="#00f2ff" r="0.8"></circle>
              </g>
            </g>
          </svg>
        </div>
        <div className="flex gap-2 sm:gap-4 items-center">
          {voiceSupported && (
            <span className="text-[10px] text-primary-container tracking-widest opacity-60 flex items-center gap-1 sm:gap-1.5 font-bold">
              <Mic size={12} /> <span className="hidden sm:inline">VOZ</span>
            </span>
          )}
          <button 
            onClick={() => setShowMemoryPanel(true)} 
            className="text-[9px] sm:text-[10px] tracking-widest font-bold px-2 sm:px-4 py-1.5 sm:py-2 rounded border border-outline-variant text-secondary hover:bg-surface-high hover:text-primary-container transition-colors"
          >
            MEMORIA
          </button>
          <button 
            onClick={() => setShowSidebar(true)} 
            className="text-[9px] sm:text-[10px] tracking-widest font-bold px-2 sm:px-4 py-1.5 sm:py-2 rounded border border-primary-container/30 text-primary-container hover:bg-primary-container/10 transition-colors hover:shadow-[0_0_10px_rgba(0,242,255,0.2)]"
          >
            CHATS
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="w-full max-w-4xl flex-1 px-6 overflow-y-auto flex flex-col min-h-[calc(100vh-200px)]">
        {!started && (
          <div className="flex flex-col items-center justify-center flex-1 py-16 gap-8">
            <div className="text-center relative overflow-hidden w-full flex flex-col items-center">
              <h1 className="font-display text-5xl md:text-7xl font-black tracking-widest text-primary-container uppercase mb-6 text-glow select-none">
                AXIS
              </h1>
              <p className="max-w-2xl text-secondary text-sm md:text-base font-light leading-relaxed mb-8">
                A minimalist cosmic network forged from precision geometry.<br/>
                Describí tu situación con hechos concretos.
              </p>
              <div className="flex gap-4 justify-center mt-4">
                {[
                  { icon: <PenLine size={14} />, text: "Texto" },
                  { icon: <Mic size={14} />, text: "Voz" },
                  { icon: <Paperclip size={14} />, text: "Adjunto" }
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-md text-xs text-secondary tracking-wider bg-surface-low">
                    {c.icon} {c.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-lg mt-8">
              {["Ella responde tarde y con mensajes cortos pero sigue hablando conmigo.", "Llevamos 3 meses viéndonos pero no quiere ponerle nombre.", "Terminamos hace 2 semanas y no sé si contactarla."].map((q, i) => (
                <button 
                  key={i} 
                  onClick={() => { setInput(q); textareaRef.current?.focus(); }} 
                  className="bg-surface-low border border-outline-variant rounded-lg px-5 py-4 text-secondary text-sm text-left cursor-pointer tracking-wide transition-all hover:border-primary-container hover:text-on-background hover:bg-surface-high hover:shadow-[0_0_15px_rgba(0,242,255,0.1)]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-8 py-8">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`text-[10px] tracking-[0.2em] uppercase mb-2 font-bold ${msg.role === "user" ? "text-secondary/60" : "text-primary-container"}`}>
                {msg.role === "user" ? "TÚ" : "AXIS"}
              </div>
              {msg._file && (
                <div className="text-xs text-secondary mb-2 flex items-center gap-1.5 bg-surface-low px-3 py-1.5 rounded-md border border-outline-variant">
                  <Paperclip size={12} /> {msg._file}
                </div>
              )}
              <div className={`
                max-w-[88%] px-6 py-5 text-sm leading-relaxed tracking-wide
                ${msg.role === "user" 
                  ? "bg-surface-high border border-outline-variant rounded-2xl rounded-tr-sm text-on-background" 
                  : "bg-transparent border-l-2 border-primary-container rounded-r-2xl text-secondary pl-6 py-2"
                }
              `}>
                {msg.role === "assistant"
                  ? <div dangerouslySetInnerHTML={{ __html: `<p>${parseMarkdown(getDisplayContent(msg))}</p>` }} />
                  : getDisplayContent(msg)
                }
                
                {msg.role === "assistant" && (
                  <button 
                    onClick={() => toggleSpeak(getDisplayContent(msg), i)}
                    className={`mt-4 flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold transition-colors ${speakingIndex === i ? 'text-primary-container' : 'text-secondary/50 hover:text-secondary'}`}
                  >
                    {speakingIndex === i ? <Square size={12} fill="currentColor" /> : <Volume2 size={12} />}
                    {speakingIndex === i ? 'Detener' : 'Escuchar'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start">
              <div className="text-[10px] tracking-[0.2em] text-primary-container mb-2 uppercase font-bold">AXIS</div>
              <div className="border-l-2 border-primary-container pl-6 py-4 flex gap-2 items-center">
                {[0,1,2].map(j => <div key={j} className="w-1.5 h-1.5 rounded-full bg-primary-container opacity-60 animate-bounce shadow-[0_0_8px_#00f2ff]" style={{ animationDelay: `${j * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className="w-full max-w-4xl px-6 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent sticky bottom-0">
        
        {attachedFile && (
          <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-surface-low border border-outline-variant rounded-lg w-fit">
            <span className="text-primary-container"><Paperclip size={14} /></span>
            <span className="text-xs text-secondary tracking-wide">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="text-secondary hover:text-on-background ml-2"><X size={14} /></button>
          </div>
        )}

        {statusMsg && (
          <div className={`text-xs mb-3 tracking-wide ${statusMsg.startsWith("⚠") ? "text-error" : "text-primary-container"}`}>
            {statusMsg}
          </div>
        )}

        {isListening && (
          <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-surface-low border border-primary-container/30 rounded-lg w-fit">
            <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse shadow-[0_0_8px_#00f2ff]" />
            <span className="text-xs text-primary-container tracking-widest uppercase font-bold">Escuchando — habla ahora</span>
          </div>
        )}

        <div className="flex items-end gap-3 bg-surface-low border border-outline-variant rounded-xl p-2 focus-within:border-primary-container focus-within:shadow-[0_0_15px_rgba(0,242,255,0.1)] transition-all">
          
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="p-3 text-secondary hover:text-primary-container hover:bg-surface-high rounded-lg transition-colors flex-shrink-0"
          >
            <Paperclip size={18} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,.txt,.md" onChange={handleFileChange} className="hidden" />

          <textarea 
            ref={textareaRef} 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={handleKey}
            placeholder={isListening ? "Escuchando..." : "Ingresa tu situación..."}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-on-background text-sm py-3 resize-none tracking-wide min-h-[44px] max-h-[160px] placeholder:text-secondary/50"
          />

          {voiceSupported && (
            <button 
              onClick={toggleVoice} 
              className={`p-3 rounded-lg flex-shrink-0 transition-colors ${isListening ? "bg-primary-container/20 text-primary-container shadow-[0_0_10px_rgba(0,242,255,0.2)]" : "text-secondary hover:text-primary-container hover:bg-surface-high"}`}
            >
              {isListening ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
            </button>
          )}

          <button 
            onClick={sendMessage} 
            disabled={(!input.trim() && !attachedFile) || loading}
            className={`p-3 rounded-lg flex-shrink-0 transition-all ${
              (input.trim() || attachedFile) && !loading 
                ? "bg-primary-container text-on-primary-container hover:shadow-[0_0_15px_rgba(0,242,255,0.5)]" 
                : "bg-surface-highest text-secondary/50 cursor-not-allowed"
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed inset-y-0 right-0 w-80 bg-surface-low border-l border-outline-variant/30 z-50 flex flex-col shadow-2xl shadow-black/50 transform transition-transform">
          <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
            <h2 className="text-xs font-display font-bold tracking-widest text-on-background m-0">HISTORIAL</h2>
            <button onClick={() => setShowSidebar(false)} className="text-secondary hover:text-primary-container"><X size={18} /></button>
          </div>
          
          <div className="p-4">
            <button 
              onClick={startNewChat} 
              className="w-full py-3 border border-primary-container/30 text-primary-container rounded-lg text-xs tracking-widest font-bold hover:bg-primary-container/10 hover:shadow-[0_0_10px_rgba(0,242,255,0.2)] transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} /> NUEVO CHAT
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {savedChats.length === 0 ? (
              <div className="text-xs text-secondary/50 text-center mt-8">No hay chats guardados.</div>
            ) : (
              savedChats.map(chat => (
                <div key={chat.id} className={`p-4 rounded-xl border transition-colors ${currentChatId === chat.id ? "bg-surface-high border-primary-container/50 shadow-[0_0_10px_rgba(0,242,255,0.1)]" : "bg-background border-outline-variant/30 hover:border-outline-variant"}`}>
                  <div className="text-[10px] text-secondary/60 mb-2">{chat.date}</div>
                  
                  {editingChatId === chat.id ? (
                    <div className="flex gap-2 mb-3">
                      <input 
                        value={editChatName} 
                        onChange={e => setEditChatName(e.target.value)} 
                        className="flex-1 bg-surface-low border border-outline-variant text-on-background text-xs px-2 py-1 rounded outline-none focus:border-primary-container"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveEditChatName(chat.id); }}
                      />
                      <button onClick={() => saveEditChatName(chat.id)} className="bg-primary-container text-on-primary-container px-2 rounded text-xs font-bold">✓</button>
                    </div>
                  ) : (
                    <div className={`text-sm mb-3 truncate ${currentChatId === chat.id ? "text-on-background font-bold" : "text-secondary"}`}>
                      {chat.name || chat.preview || "Chat guardado"}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => loadChat(chat)} className="flex-1 bg-surface-highest hover:bg-primary-container/20 hover:text-primary-container text-on-background py-1.5 rounded text-[10px] tracking-wider transition-colors font-bold">Cargar</button>
                    <button onClick={() => { setEditingChatId(chat.id); setEditChatName(chat.name || chat.preview || ""); }} className="p-1.5 bg-surface-highest hover:bg-surface-high text-on-background rounded transition-colors"><Edit2 size={12} /></button>
                    <button onClick={() => deleteChat(chat.id)} className="p-1.5 bg-error/10 hover:bg-error/20 text-error rounded transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Memory Panel */}
      {showMemoryPanel && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-low border border-outline-variant/50 rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-display font-bold tracking-widest text-error m-0">VACIAR MEMORIA</h2>
              <button onClick={() => { setShowMemoryPanel(false); setShowConfirmClear(false); }} className="text-secondary hover:text-on-background"><X size={20} /></button>
            </div>
            
            <p className="text-sm text-secondary leading-relaxed mb-8">
              Esta acción eliminará <strong className="text-on-background">todos los chats guardados</strong> y el contexto actual de la conversación. AXIS olvidará toda la información que le has dado.
            </p>

            {showConfirmClear ? (
              <div className="flex flex-col gap-4">
                <span className="text-xs text-error text-center font-bold tracking-wide uppercase">¿Estás completamente seguro?</span>
                <div className="flex gap-3">
                  <button onClick={clearMemory} className="flex-1 bg-error hover:bg-error/80 text-on-error py-3 rounded-lg text-xs font-bold tracking-wider transition-colors">SÍ, BORRAR TODO</button>
                  <button onClick={() => setShowConfirmClear(false)} className="flex-1 bg-surface-highest hover:bg-surface-high text-on-background py-3 rounded-lg text-xs font-bold tracking-wider transition-colors">CANCELAR</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowConfirmClear(true)} 
                className="w-full bg-error/10 hover:bg-error/20 border border-error/30 text-error py-3 rounded-lg text-xs font-bold tracking-widest transition-colors"
              >
                VACIAR MEMORIA AHORA
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
