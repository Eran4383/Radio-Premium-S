import React from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: string | null;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, error }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-bg-secondary p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold text-red-500 mb-4">שגיאה בנגן</h2>
        <p className="text-text-primary mb-6">{error}</p>
        <button onClick={onClose} className="w-full bg-accent text-white py-2 rounded-md hover:bg-accent-dark transition-colors">
          סגור
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
