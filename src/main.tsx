import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./styles/color_variables.css";
import "./styles/outher_variables.css";
import './index.css'
import { SocketProvider } from '@contexts/SocketContext.tsx';
import { PacketManagerProvider } from '@contexts/PacketManagerContext.tsx';
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SocketProvider>
      <PacketManagerProvider>
        <App />
      </PacketManagerProvider>
    </SocketProvider>
  </StrictMode>,
)
