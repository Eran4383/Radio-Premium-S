import React from 'react';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

const DiagnosticModal: React.FC<DiagnosticModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-bg-secondary p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-accent mb-4">נתוני אבחון</h2>
        <div className="relative">
          <button 
            onClick={() => {
              const pre = document.getElementById('diagnostic-data');
              if (pre) {
                const range = document.createRange();
                range.selectNode(pre);
                window.getSelection()?.removeAllRanges();
                window.getSelection()?.addRange(range);
              }
            }}
            className="absolute top-2 right-2 bg-accent/20 hover:bg-accent/40 text-accent text-[10px] px-2 py-1 rounded border border-accent/30 transition-all"
          >
            בחר הכל
          </button>
          <pre id="diagnostic-data" className="text-text-primary text-xs bg-gray-900 p-4 rounded-md overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
        <button onClick={onClose} className="w-full mt-6 bg-accent text-white py-2 rounded-md hover:bg-accent-dark transition-colors">
          סגור
        </button>
      </div>
    </div>
  );
};

export default DiagnosticModal;
