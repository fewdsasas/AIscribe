import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

window.onerror = (message, source, lineno, colno, error) => {
  console.error('Uncaught error:', { message, source, lineno, colno, error })
}

window.onunhandledrejection = event => {
  console.error('Unhandled promise rejection:', event.reason)
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('AIscribe: 找不到 #root 元素。请检查 index.html 中是否包含 <div id="root"></div>。')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
