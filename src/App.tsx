import React from 'react';
import { MenuBar } from './components/MenuBar';
import { Dock } from './components/Dock';
import { Terminal } from './components/Terminal';

function App() {
  return (
    <div 
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1541873676-a18131494184?auto=format&fit=crop&q=80&w=3840)'
      }}
    >
      <MenuBar />
      <Terminal />
      <Dock />
    </div>
  );
}

export default App;