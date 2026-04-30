import { useState, useRef } from 'react';
import { format } from 'date-fns';
import {
  FileText, MapPin, Play, Pause, Download,
  CornerUpLeft, Trash2, MoreVertical, Check, CheckCheck
} from 'lucide-react';

// ── Audio Player ─────────────────────────────────────────────
const AudioPlayer = ({ url }) => {
  const audioRef  = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else         { audioRef.current.play();  setPlaying(true);  }
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (a) setProgress((a.currentTime / a.duration) * 100 || 0);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(Math.round(audioRef.current.duration));
  };

  const onEnded = () => { setPlaying(false); setProgress(0); };

  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} src={url}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />
      <button onClick={toggle}
        className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center flex-shrink-0 transition-colors">
        {playing
          ? <Pause className="w-4 h-4 text-white" />
          : <Play  className="w-4 h-4 text-white ml-0.5" />
        }
      </button>
      <div className="flex-1">
        {/* Waveform bars */}
        <div className="flex items-end gap-0.5 h-6 mb-1">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i}
              className={`w-1 rounded-sm transition-all ${
                (i / 20) * 100 < progress ? 'bg-purple-400' : 'bg-gray-500'
              }`}
              style={{ height: `${20 + Math.sin(i * 0.8) * 14}px` }}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400">{fmt(duration)}</span>
      </div>
    </div>
  );
};

// ── Location Preview ─────────────────────────────────────────
const LocationBubble = ({ lat, lng, name }) => (
  <a
    href={`https://maps.google.com/?q=${lat},${lng}`}
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
  >
    <div className="w-10 h-10 rounded-lg bg-green-900/40 flex items-center justify-center flex-shrink-0">
      <MapPin className="w-5 h-5 text-green-400" />
    </div>
    <div>
      <p className="text-sm font-medium text-white">{name || 'Shared Location'}</p>
      <p className="text-xs text-gray-400">{lat?.toFixed(4)}, {lng?.toFixed(4)}</p>
      <p className="text-xs text-blue-400 mt-0.5">Tap to open maps →</p>
    </div>
  </a>
);

// ── Document Preview ─────────────────────────────────────────
const DocumentBubble = ({ url, name, size }) => {
  const kb = size ? (size / 1024).toFixed(1) : null;
  const ext = name?.split('.').pop()?.toUpperCase() || 'FILE';
  return (
    <a href={url} target="_blank" rel="noreferrer" download={name}
      className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-[200px]">
      <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name || 'Document'}</p>
        <p className="text-xs text-gray-400">{ext}{kb ? ` · ${kb} KB` : ''}</p>
      </div>
      <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </a>
  );
};

// ── Main MessageBubble ────────────────────────────────────────
export default function MessageBubble({ message, isOwn, showAvatar, onReply, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-gray-500 bg-[#1a1a1a] px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const isDeleted = message.deleted_for_everyone;
  const time      = message.created_at ? format(new Date(message.created_at), 'HH:mm') : '';

  const renderContent = () => {
    if (isDeleted) {
      return <p className="text-sm text-gray-500 italic">This message was deleted</p>;
    }

    switch (message.type) {
      case 'text':
        return <p className="text-sm text-white leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>;

      case 'image':
        return (
          <div className="relative max-w-[260px]">
            {!imgLoaded && (
              <div className="w-48 h-32 bg-[#222] rounded-lg animate-pulse" />
            )}
            <img
              src={message.file_url}
              alt={message.file_name || 'Image'}
              className={`rounded-lg max-w-[260px] max-h-64 object-cover cursor-pointer ${imgLoaded ? '' : 'hidden'}`}
              onLoad={() => setImgLoaded(true)}
              onClick={() => window.open(message.file_url, '_blank')}
            />
            {message.content && (
              <p className="text-sm text-white mt-1.5">{message.content}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="max-w-[260px]">
            <video
              src={message.file_url}
              controls
              className="rounded-lg max-w-[260px] max-h-48"
              poster={message.thumbnail_url}
            />
            {message.content && <p className="text-sm text-white mt-1.5">{message.content}</p>}
          </div>
        );

      case 'audio':
        return <AudioPlayer url={message.file_url} />;

      case 'document':
        return <DocumentBubble url={message.file_url} name={message.file_name} size={message.file_size} />;

      case 'location':
        return (
          <LocationBubble
            lat={message.latitude}
            lng={message.longitude}
            name={message.location_name}
          />
        );

      default:
        return <p className="text-sm text-gray-400 italic">[Unsupported message type]</p>;
    }
  };

  return (
    <div className={`flex msg-enter ${isOwn ? 'justify-end' : 'justify-start'} group relative`}>
      {/* Other user avatar */}
      {!isOwn && showAvatar && (
        <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 self-end mb-1 overflow-hidden">
          {message.sender?.avatar_url
            ? <img src={message.sender.avatar_url} className="w-full h-full object-cover" alt="" />
            : message.sender?.name?.charAt(0)
          }
        </div>
      )}
      {!isOwn && !showAvatar && <div className="w-9 flex-shrink-0" />}

      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender name in group */}
        {!isOwn && showAvatar && (
          <span className="text-xs text-purple-400 font-medium mb-1 ml-1">
            {message.sender?.name}
          </span>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div className={`text-xs px-2 py-1 rounded-t-lg border-l-2 border-purple-500 mb-0.5 max-w-full truncate ${
            isOwn ? 'bg-[#2a2040] text-gray-300' : 'bg-[#222] text-gray-300'
          }`}>
            <span className="font-medium text-purple-300">{message.reply_to.sender?.name}: </span>
            {message.reply_to.type === 'text'
              ? message.reply_to.content?.slice(0, 60)
              : `[${message.reply_to.type}]`
            }
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-3 py-2 rounded-2xl relative ${
            isOwn
              ? 'bg-purple-700 rounded-br-sm'
              : 'bg-[#1e1e1e] rounded-bl-sm'
          } ${message.type === 'image' || message.type === 'video' ? 'p-1' : ''}`}
        >
          {renderContent()}

          {/* Time + read receipt */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-end'}`}>
            <span className="text-[10px] text-gray-400">{time}</span>
            {isOwn && !isDeleted && (
              <CheckCheck className="w-3 h-3 text-blue-400" />
            )}
          </div>
        </div>

        {/* Context menu button */}
        <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <button
            onClick={() => onReply(message)}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            title="Reply"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
          </button>
          {isOwn && !isDeleted && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {showMenu && (
                <div className="absolute bottom-6 right-0 bg-[#1e1e1e] border border-[#333] rounded-lg shadow-xl z-10 overflow-hidden w-40">
                  <button
                    onClick={() => { onDelete(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-[#2a2a2a] text-sm transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete for everyone
                  </button>
                  <button
                    onClick={() => { onDelete(false); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:bg-[#2a2a2a] text-sm transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete for me
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
