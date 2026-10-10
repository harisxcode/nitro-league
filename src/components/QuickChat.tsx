import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Team } from '../game/types';

interface QuickChatProps {
  onSendChat: (text: string) => void;
  team: Team;
}

const CHAT_CATEGORIES = [
  {
    title: 'Compliments',
    options: ['Nice shot!', 'Great pass!', 'Thanks!', 'Calculated.'],
  },
  {
    title: 'Reactions',
    options: ['What a save!', 'Close one!', 'OMG!', 'No way!'],
  },
  {
    title: 'Tactics',
    options: ['Defending...', 'I got it!', 'Take the shot!', 'Need boost!'],
  },
  {
    title: 'Post-play',
    options: ['GG!', 'Rematch?', 'Sorry!', 'No problem.'],
  },
];

export const QuickChat: React.FC<QuickChatProps> = ({ onSendChat, team }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // 1-4 opens category or selects phrase
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const num = parseInt(e.code.replace('Digit', '')) - 1;
        if (!isOpen) {
          setIsOpen(true);
          setSelectedCategory(num);
        } else if (selectedCategory !== null) {
          const phrase = CHAT_CATEGORIES[selectedCategory]?.options[num];
          if (phrase) {
            onSendChat(phrase);
            setIsOpen(false);
            setSelectedCategory(null);
          }
        } else {
          setSelectedCategory(num);
        }
      } else if (e.code === 'Escape' && isOpen) {
        setIsOpen(false);
        setSelectedCategory(null);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, selectedCategory, onSendChat]);

  return (
    <div className="absolute top-24 left-6 z-30 font-sans pointer-events-auto">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-md hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quick Chat (1-4)</span>
        </button>
      ) : (
        <div className="p-3 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 rounded-lg shadow-2xl min-w-56 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
              {selectedCategory !== null ? CHAT_CATEGORIES[selectedCategory].title : 'Quick Chat Menu'}
            </span>
            <button
              onClick={() => { setIsOpen(false); setSelectedCategory(null); }}
              className="text-slate-400 hover:text-white px-1 font-mono text-[10px]"
            >
              [ESC]
            </button>
          </div>

          {selectedCategory === null ? (
            <div className="flex flex-col gap-1.5">
              {CHAT_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.title}
                  onClick={() => setSelectedCategory(idx)}
                  className="flex items-center justify-between px-2.5 py-1.5 text-left rounded bg-slate-900/60 hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-slate-200"
                >
                  <span>{cat.title}</span>
                  <span className="font-mono text-cyan-400/80 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">[{idx + 1}]</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {CHAT_CATEGORIES[selectedCategory].options.map((opt, idx) => (
                <button
                  key={opt}
                  onClick={() => {
                    onSendChat(opt);
                    setIsOpen(false);
                    setSelectedCategory(null);
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 text-left rounded bg-slate-900/60 hover:bg-cyan-950/60 hover:text-cyan-300 transition-colors text-slate-200"
                >
                  <span className="font-medium">{opt}</span>
                  <span className="font-mono text-cyan-400/80 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">[{idx + 1}]</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
