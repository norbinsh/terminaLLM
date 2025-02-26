import React, { useState, useEffect } from 'react';
import { Apple, Wifi, Battery, Search } from 'lucide-react';

export const MenuBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="fixed top-0 left-0 right-0 h-7 bg-[rgba(28,28,28,0.7)] backdrop-blur-md text-white flex items-center px-2 justify-between z-50 text-sm">
      <div className="flex items-center space-x-4">
        <Apple size={16} className="hover:opacity-70 cursor-pointer" />
        <span className="font-semibold">Finder</span>
        <span className="hover:opacity-70 cursor-pointer">File</span>
        <span className="hover:opacity-70 cursor-pointer">Edit</span>
        <span className="hover:opacity-70 cursor-pointer">View</span>
        <span className="hover:opacity-70 cursor-pointer">Go</span>
        <span className="hover:opacity-70 cursor-pointer">Window</span>
        <span className="hover:opacity-70 cursor-pointer">Help</span>
      </div>
      <div className="flex items-center space-x-3">
        <Wifi size={16} className="hover:opacity-70 cursor-pointer" />
        <Battery size={16} className="hover:opacity-70 cursor-pointer" />
        <Search size={16} className="hover:opacity-70 cursor-pointer" />
        <span className="hover:opacity-70 cursor-pointer">{formattedDate}</span>
        <span className="hover:opacity-70 cursor-pointer">{formattedTime}</span>
      </div>
    </div>
  );
};