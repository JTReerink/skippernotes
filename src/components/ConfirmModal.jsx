import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onCancel}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="card" 
        style={{ width: '90%', maxWidth: '400px', margin: '0 1rem', padding: '1.5rem', boxShadow: 'var(--shadow-lg)' }}
      >
        <h3 style={{ marginTop: 0, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '8px' }}>
           ⚠️ {title}
        </h3>
        <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} className="btn btn-outline" style={{ flex: 1 }}>Annuleer</button>
          <button onClick={onConfirm} style={{ flex: 1, backgroundColor: 'var(--color-error)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
