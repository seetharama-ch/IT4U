import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme.css'
import './styles/forms.css'
import './styles/buttons.css'
import './styles/components.css'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
