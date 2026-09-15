import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, MapPin, AlertTriangle, ArrowRight } from 'lucide-react';
import { LandslideApi } from '../services/api';
import { OperationalModule, HazardZone } from '../types';
import { HillsRegion } from '../data/hillsData';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  action?: {
    type: string;
    module?: OperationalModule;
    region_id?: string;
    zone_id?: string;
    coordinates?: { lat: number; lon: number };
  };
  timestamp: string;
}

interface ChatWidgetProps {
  theme?: 'dark' | 'light';
  onNavigate?: (module: OperationalModule) => void;
  onSelectZone?: (zone: HazardZone) => void;
  onSelectRegion?: (region: HillsRegion) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  theme = 'dark',
  onNavigate,
  onSelectZone,
  onSelectRegion,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: '👋 Hi! I am **TerraGuard Assistant**, your AI geotechnical and landslide risk guide.\n\nAsk me about real-time risk scores, 3-day rainfall, soil types, seismic conditions, or emergency protocols.',
      source: 'terraguard-engine',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-msg')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await LandslideApi.sendChatMessage(messageText, historyPayload);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        source: response.source,
        action: response.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Failed to connect to TerraGuard AI Assistant. Please check your network.',
          source: 'error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: NonNullable<ChatMessage['action']>) => {
    if (action.type === 'NAVIGATE' && action.module && onNavigate) {
      onNavigate(action.module);
    } else if (action.type === 'SELECT_REGION') {
      if (action.module && onNavigate) {
        onNavigate(action.module);
      } else if (onNavigate) {
        onNavigate('hills-regions');
      }
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl border transition-all duration-300 hover:scale-105 ${
            isDark
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/30 shadow-emerald-950/50'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-200'
          }`}
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
            </span>
          </div>
          <span className="font-medium text-sm tracking-wide">TerraGuard AI Chat</span>
        </button>
      )}

      {isOpen && (
        <div
          className={`flex flex-col w-[380px] sm:w-[420px] h-[550px] rounded-2xl shadow-2xl border overflow-hidden backdrop-blur-xl transition-all duration-300 ${
            isDark
              ? 'bg-slate-900/95 border-slate-700/80 text-slate-100 shadow-black/80'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3.5 border-b ${
              isDark
                ? 'bg-slate-800/90 border-slate-700/80'
                : 'bg-emerald-700 text-white border-emerald-600'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/20 text-white'
                }`}
              >
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-snug flex items-center gap-1.5">
                  TerraGuard AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </h3>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-emerald-100'}`}>
                  Grounded Geotechnical Intelligence
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                  : 'hover:bg-emerald-600 text-white/80 hover:text-white'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Suggestions */}
          <div
            className={`px-3 py-2 border-b flex gap-1.5 overflow-x-auto text-[11px] no-scrollbar ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <button
              onClick={() => handleSend('What is the landslide risk at Teesta Basin?')}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap border transition-colors ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-emerald-950/60 border-slate-700 text-slate-300 hover:border-emerald-500/50'
                  : 'bg-white hover:bg-emerald-50 border-slate-200 text-slate-700 hover:border-emerald-300'
              }`}
            >
              📍 Teesta Basin Risk
            </button>
            <button
              onClick={() => handleSend('What is the risk at Sohra?')}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap border transition-colors ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-emerald-950/60 border-slate-700 text-slate-300 hover:border-emerald-500/50'
                  : 'bg-white hover:bg-emerald-50 border-slate-200 text-slate-700 hover:border-emerald-300'
              }`}
            >
              🌧️ Sohra Rainfall
            </button>
            <button
              onClick={() => handleSend('Show me the risk map.')}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap border transition-colors ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-emerald-950/60 border-slate-700 text-slate-300 hover:border-emerald-500/50'
                  : 'bg-white hover:bg-emerald-50 border-slate-200 text-slate-700 hover:border-emerald-300'
              }`}
            >
              🗺️ Open Risk Map
            </button>
          </div>

          {/* Message History */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs leading-relaxed">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isDark ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`p-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                        : isDark
                        ? 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                        : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                    {msg.source && msg.role === 'assistant' && (
                      <div className="mt-2 pt-1.5 border-t border-slate-700/40 flex items-center justify-between text-[10px] opacity-70">
                        <span>Source: {msg.source}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Action Card */}
                  {msg.action && (
                    <button
                      onClick={() => handleActionClick(msg.action!)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left border text-xs transition-all hover:scale-[1.02] ${
                        isDark
                          ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-600/40 text-emerald-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {msg.action.type === 'NAVIGATE' ? (
                          <ArrowRight className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                        {msg.action.type === 'NAVIGATE'
                          ? `Navigate to ${msg.action.module?.toUpperCase()}`
                          : 'Explore Region Details'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-900/60 text-emerald-400 flex items-center justify-center animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className={`p-3 border-t flex items-center gap-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask TerraGuard Assistant..."
              className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-emerald-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`p-2.5 rounded-xl border transition-all ${
                input.trim() && !isLoading
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md'
                  : isDark
                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
