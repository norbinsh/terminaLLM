import React from 'react';
import { Terminal, Chrome, Folder, Mail, Calendar, Music, Settings } from 'lucide-react';
import { useTerminalStore } from '../store/terminalStore';

export const Dock: React.FC = () => {
  const { isOpen, setTerminalWindow } = useTerminalStore();

  const openTerminal = () => {
    setTerminalWindow({ isOpen: true });
  };

  const DockIcon: React.FC<{ 
    icon: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
  }> = ({ icon, active, onClick }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 hover:bg-white/10 ${
        active ? 'bg-white/20' : ''
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 mb-2 px-4 py-2 rounded-2xl bg-[rgba(28,28,28,0.7)] backdrop-blur-md">
      <div className="flex space-x-2">
        <DockIcon icon={<Folder className="w-10 h-10 text-blue-400" />} />
        <DockIcon 
          icon={<Terminal className="w-10 h-10 text-white" />} 
          active={isOpen}
          onClick={openTerminal}
        />
        <DockIcon icon={<Chrome className="w-10 h-10 text-blue-500" />} />
        <DockIcon icon={<Mail className="w-10 h-10 text-blue-300" />} />
        <DockIcon icon={<Calendar className="w-10 h-10 text-red-400" />} />
        <DockIcon icon={<Music className="w-10 h-10 text-pink-400" />} />
        <DockIcon icon={<Settings className="w-10 h-10 text-gray-400" />} />
      </div>
    </div>
  );
};