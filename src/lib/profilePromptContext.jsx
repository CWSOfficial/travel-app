import React, { createContext, useState, useContext, useCallback } from 'react';
import ProfilePromptSheet from '@/components/auth/ProfilePromptSheet';

// App-wide provider that owns the "Personalize Your Travel Experience"
// bottom-sheet state. Any component (GuestBanner, BottomNav, value-gated
// interceptors) can call openPrompt() to surface the sheet for a guest
// without forcing a navigation or blocking page access.
const ProfilePromptContext = createContext(null);

export function ProfilePromptProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const openPrompt = useCallback(() => setIsOpen(true), []);
  const closePrompt = useCallback(() => setIsOpen(false), []);

  return (
    <ProfilePromptContext.Provider value={{ openPrompt, closePrompt }}>
      {children}
      <ProfilePromptSheet open={isOpen} onClose={closePrompt} />
    </ProfilePromptContext.Provider>
  );
}

export function useProfilePrompt() {
  const ctx = useContext(ProfilePromptContext);
  if (!ctx) return { openPrompt: () => {}, closePrompt: () => {} };
  return ctx;
}