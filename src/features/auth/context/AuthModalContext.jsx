import React, { createContext, useContext, useState } from 'react';
import { AuthRequiredModal } from '../components/AuthRequiredModal/AuthRequiredModal';

// Create context
const AuthModalContext = createContext({
  showAuthModal: () => {},
  hideAuthModal: () => {},
});

/**
 * Provider component that manages the authentication modal state
 * and provides methods to show/hide the modal
 */
export const AuthModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  // Function to show the auth modal with a custom message
  const showAuthModal = (customMessage) => {
    setMessage(customMessage || 'You need to be signed in to access this feature.');
    setIsOpen(true);
  };

  // Function to hide the auth modal
  const hideAuthModal = () => {
    setIsOpen(false);
  };

  return (
    <AuthModalContext.Provider
      value={{
        showAuthModal,
        hideAuthModal,
      }}
    >
      {children}
      <AuthRequiredModal
        open={isOpen}
        onClose={hideAuthModal}
        message={message}
      />
    </AuthModalContext.Provider>
  );
};

// Custom hook to use the auth modal context
export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};

export default AuthModalContext;
