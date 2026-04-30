import { useState, useRef, useEffect } from 'react';
import {
  Send, Paperclip, Mic, MicOff, MapPin, X,
  Image, FileText, Video, Smile
} from 'lucide-react';

export default function MessageInput({ conversationId, socket, replyTo, onCancelReply, onSend }) {
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [recording, setRecording] = useState(false);
  const [recTime,   setRecTime]   = useState(0);
  const [showAttach, setShowAttach] = useState(false);

  const fileRef    = useRef(null);
  const imageRef   = useRef(null);
  const videoRef   = useRef(null);
  const mediaRef   = useRef(null);  // MediaRecorder
  const chunksRef  = useRef([]);
  const timerRef   = useRef(null);
  const textareaRef = useRef(null);
  const typingTimer = useRef(null);

  // ── Typing indicator ──────────────────────────────────────
  const handleType = (val) => {
    setText(val);
    if (!socket) return;
    socket.emit('typing:start', { conversationId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
    }, 2000);
  };

  useEffect(() => () => {
    clearTimeout(typingTimer.current);
    socket?.emit('typing:stop', { conversationId });
  }, [conversationId]);

  // ── Auto-resize textarea ──────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  // ── Send text ─────────────────────────────────────────────
  const handleSendText = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    socket?.emit('typing:stop', { conversationId });
    setSending(true);
    try {
      await onSend({ type: 'text', content, replyToId: replyTo?.id });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // ── Send file (image/video/document) ─────────────────────
  const handleFile = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttach(false);
    setSending(true);
    try {
      await onSend({ type, file, content: '', replyToId: replyTo?.id });
    } finally {
      setSending(false);
      e.target.value = '';
    }
  };

  // ── Voice recording ───────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        setSending(true);
        try {
          await onSend({ type: 'audio', file, content: '', replyToId: replyTo?.id });
        } finally {
          setSending(false);
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch (err) {
      alert('Microphone permission denied');
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && recording) {
      mediaRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
      setRecTime(0);
    }
  };

  const cancelRecording = () => {
    if (mediaRef.current) {
      mediaRef.current.onstop = () => {};
      mediaRef.current.stop();
      mediaRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    setRecording(false);
    clearInterval(timerRef.current);
    setRecTime(0);
  };

  // ── Location share ────────────────────────────────────────
  const handleLocation = () => {
    setShowAttach(false);
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setSending(true);
        try {
          await onSend({
            type: 'location',
            latitude:  coords.latitude,
            longitude: coords.longitude,
            location_name: 'Shared Location',
            replyToId: replyTo?.id
          });
        } finally {
          setSending(false);
        }
      },
      () => alert('Location permission denied')
    );
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Recording UI ──────────────────────────────────────────
  if (recording) return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-[#2a2a2a] bg-[#111]">
      <button onClick={cancelRecording} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
        <X className="w-5 h-5" />
      </button>
      <div className="flex-1 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-red-400 font-mono text-sm">{fmtTime(recTime)}</span>
        <div className="flex-1 flex items-end gap-0.5 h-7">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="wave-bar flex-1 bg-red-400 rounded-sm"
              style={{
                height: `${15 + Math.sin(Date.now() / 200 + i) * 10}px`,
                animationDelay: `${i * 0.05}s`
              }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={stopRecording}
        className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
      >
        <Send className="w-4 h-4 text-white" />
      </button>
    </div>
  );

  // ── Normal UI ─────────────────────────────────────────────
  return (
    <div className="border-t border-[#2a2a2a] bg-[#111]">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-1">
          <div className="flex-1 border-l-2 border-purple-500 pl-2 py-0.5 bg-[#1a1a1a] rounded-r">
            <p className="text-xs text-purple-400 font-medium">{replyTo.sender?.name || 'You'}</p>
            <p className="text-xs text-gray-400 truncate">
              {replyTo.type === 'text' ? replyTo.content : `[${replyTo.type}]`}
            </p>
          </div>
          <button onClick={onCancelReply} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2">
        {/* Attach button */}
        <div className="relative">
          <button
            onClick={() => setShowAttach(!showAttach)}
            className={`p-2 rounded-lg transition-colors ${showAttach ? 'text-purple-400 bg-purple-900/30' : 'text-gray-400 hover:text-gray-200 hover:bg-[#222]'}`}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attach menu */}
          {showAttach && (
            <div className="absolute bottom-12 left-0 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-xl z-20 overflow-hidden">
              {[
                { icon: Image,    label: 'Image',    action: () => imageRef.current?.click(),  color: 'text-blue-400' },
                { icon: Video,    label: 'Video',    action: () => videoRef.current?.click(),  color: 'text-green-400' },
                { icon: FileText, label: 'Document', action: () => fileRef.current?.click(),   color: 'text-yellow-400' },
                { icon: MapPin,   label: 'Location', action: handleLocation,                   color: 'text-red-400' },
              ].map(item => (
                <button key={item.label}
                  onClick={item.action}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#2a2a2a] w-full text-left transition-colors"
                >
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm text-gray-300">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Hidden file inputs */}
          <input ref={imageRef}    type="file" accept="image/*"       className="hidden" onChange={e => handleFile(e, 'image')} />
          <input ref={videoRef}    type="file" accept="video/*"       className="hidden" onChange={e => handleFile(e, 'video')} />
          <input ref={fileRef}     type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" className="hidden" onChange={e => handleFile(e, 'document')} />
        </div>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => handleType(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={sending}
          className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 resize-none max-h-28 leading-5 disabled:opacity-50"
          style={{ minHeight: '40px' }}
          onClick={() => setShowAttach(false)}
        />

        {/* Send or Mic */}
        {text.trim() ? (
          <button
            onClick={handleSendText}
            disabled={sending}
            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        ) : (
          <button
            onMouseDown={startRecording}
            onTouchStart={startRecording}
            className="w-10 h-10 rounded-full bg-[#1a1a1a] hover:bg-purple-700 border border-[#333] hover:border-purple-500 flex items-center justify-center transition-all flex-shrink-0"
            title="Hold to record voice"
          >
            <Mic className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
