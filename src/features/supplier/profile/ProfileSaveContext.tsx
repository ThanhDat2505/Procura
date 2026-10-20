import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Lets the active profile tab drive the header "Lưu thay đổi" button in `ProfileLayout`.
 * A tab registers `{ save, dirty, saving }`; the layout disables the button when nothing is dirty.
 */
export interface ProfileSaveHandle {
  save: () => void | Promise<void>;
  dirty: boolean;
  saving: boolean;
}

type Setter = (handle: ProfileSaveHandle | null) => void;

const SetterContext = createContext<Setter | null>(null);
const HandleContext = createContext<ProfileSaveHandle | null>(null);

export function ProfileSaveProvider({ children }: { children: ReactNode }) {
  const [handle, setHandle] = useState<ProfileSaveHandle | null>(null);
  return (
    <SetterContext.Provider value={setHandle}>
      <HandleContext.Provider value={handle}>{children}</HandleContext.Provider>
    </SetterContext.Provider>
  );
}

/** The handle registered by the active tab (null when the tab has nothing to save). */
export function useProfileSaveHandle(): ProfileSaveHandle | null {
  return useContext(HandleContext);
}

/** Registers the current tab's save action with the layout header for as long as the tab is mounted. */
export function useRegisterProfileSave({ save, dirty, saving }: ProfileSaveHandle): void {
  const setHandle = useContext(SetterContext);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    setHandle?.({ dirty, saving, save: () => saveRef.current() });
  }, [setHandle, dirty, saving]);
  useEffect(() => () => setHandle?.(null), [setHandle]);
}
