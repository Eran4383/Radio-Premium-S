import React, { useState, useEffect, useRef } from 'react';
import { logService, LogEntry, LogLevel } from '../../services/logService';
import { Trash2, Download, Search, X, ChevronDown, ChevronUp, AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react';

export const LogPanel: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs(logService.getLogs());
    const unsubscribe = logService.subscribe((newLogs) => {
      setLogs([...newLogs]);
    });
    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = log.message.toLowerCase().includes(filter.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesFilter && matchesLevel;
  });

  const clearLogs = () => {
    logService.clearLogs();
  };

  const downloadLogs = () => {
    const content = logs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radio-premium-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'debug': return <Bug className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLevelClass = (level: LogLevel) => {
    switch (level) {
      case 'error': return 'bg-red-500/10 border-red-500/20';
      case 'warn': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'info': return 'bg-blue-500/10 border-blue-500/20';
      case 'debug': return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="bg-bg-secondary rounded-xl border border-white/10 overflow-hidden flex flex-col h-full max-h-[600px]">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-accent" />
          <h3 className="font-bold text-lg">לוגים ואבחון</h3>
          <span className="bg-accent/20 text-accent text-xs px-2 py-0.5 rounded-full">
            {filteredLogs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={downloadLogs}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-text-secondary hover:text-text-primary"
            title="הורד לוגים"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={clearLogs}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
            title="נקה לוגים"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-text-secondary"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="p-4 border-b border-white/10 bg-white/5 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input 
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="חיפוש בלוגים..."
                className="w-full bg-bg-primary border border-white/10 rounded-lg py-2 pr-10 pl-4 text-sm focus:outline-none focus:border-accent"
              />
              {filter && (
                <button 
                  onClick={() => setFilter('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select 
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="bg-bg-primary border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            >
              <option value="all">כל הרמות</option>
              <option value="info">מידע (Info)</option>
              <option value="warn">אזהרות (Warn)</option>
              <option value="error">שגיאות (Error)</option>
              <option value="debug">ניפוי שגיאות (Debug)</option>
            </select>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 bg-black/20"
          >
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-text-secondary">
                <Bug className="w-10 h-10 mb-2 opacity-20" />
                <p>אין לוגים להצגה</p>
              </div>
            ) : (
              filteredLogs.map((log, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded border flex flex-col gap-1 ${getLevelClass(log.level)}`}
                >
                  <div className="flex items-center justify-between opacity-70">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      <span className="font-bold uppercase">{log.level}</span>
                    </div>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="break-words whitespace-pre-wrap ltr text-left">
                    {log.message}
                  </div>
                  {log.data && (
                    <details className="mt-1">
                      <summary className="cursor-pointer hover:underline text-accent">מידע נוסף</summary>
                      <pre className="mt-1 p-2 bg-black/40 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
