import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// 错误边界组件
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errorDetails = this.state.error;
      return (
        <div style={{ padding: 20, fontFamily: 'monospace', background: '#1a1a1a', color: '#fff', height: '100vh', overflow: 'auto' }}>
          <h2 style={{ color: '#ff6b6b' }}>应用发生错误</h2>
          <div style={{ margin: '10px 0', padding: 10, background: '#2a2a2a', borderRadius: 4 }}>
            <strong>错误信息:</strong>
            <pre style={{ color: '#ff6b6b', whiteSpace: 'pre-wrap', marginTop: 5 }}>
              {errorDetails?.message || 'Unknown error'}
            </pre>
          </div>
          {errorDetails?.stack && (
            <div style={{ margin: '10px 0', padding: 10, background: '#2a2a2a', borderRadius: 4 }}>
              <strong>堆栈跟踪:</strong>
              <pre style={{ color: '#aaa', whiteSpace: 'pre-wrap', marginTop: 5, fontSize: 11 }}>
                {errorDetails.stack}
              </pre>
            </div>
          )}
          <div style={{ marginTop: 15 }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{ padding: '8px 16px', background: '#4a9eff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 10 }}
            >
              重新加载
            </button>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })} 
              style={{ padding: '8px 16px', background: '#666', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              尝试继续
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 全局错误处理
window.onerror = (message, source, lineno, colno) => {
  console.error('Global error:', message, 'at', source, lineno, colno);
};

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
