import React, { useState, useEffect } from 'react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    // Use the transitionend event instead of setTimeout
    const modalContent = document.querySelector('.modal-content');
    const handleTransitionEnd = () => {
      onClose();
      modalContent.removeEventListener('transitionend', handleTransitionEnd);
    };
    modalContent.addEventListener('transitionend', handleTransitionEnd);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div 
      className={`modal-overlay ${isClosing ? 'closing' : ''}`} 
      onClick={handleClose}
    >
      <div 
        className={`modal-content ${isClosing ? 'closing' : ''}`} 
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={handleClose}>×</button>
        <h2>{title}</h2>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 