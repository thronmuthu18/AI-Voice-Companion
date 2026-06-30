import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 tracking-tight">AI Operating System</h1>
          <p className="text-muted-foreground text-lg">Phase 1: Foundation successfully set up.</p>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
