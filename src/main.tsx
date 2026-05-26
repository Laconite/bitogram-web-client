import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./styles/color_variables.css";
import "./styles/outher_variables.css";
import './index.css'
import { SocketProvider } from '@contexts/SocketProvider.tsx';
import { ProtocolProvider } from "@contexts/ProtocolProvider.tsx";
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SocketProvider>
      <ProtocolProvider>
        <App />
      </ProtocolProvider>
    </SocketProvider>
  </StrictMode>,
)
