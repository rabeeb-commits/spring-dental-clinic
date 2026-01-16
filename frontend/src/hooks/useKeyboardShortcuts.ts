import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

/**
 * Custom hook for keyboard shortcuts
 * Supports Ctrl/Cmd combinations
 */
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const ctrlOrCmd = shortcut.ctrlKey || shortcut.metaKey;
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : true;
        const metaMatch = shortcut.metaKey ? event.metaKey : true;
        const shiftMatch = shortcut.shiftKey === undefined ? true : event.shiftKey === shortcut.shiftKey;
        const altMatch = shortcut.altKey === undefined ? true : event.altKey === shortcut.altKey;

        if (
          event.key === shortcut.key &&
          (ctrlOrCmd ? (ctrlMatch || metaMatch) : true) &&
          shiftMatch &&
          altMatch
        ) {
          // Don't trigger if user is typing in an input/textarea
          const target = event.target as HTMLElement;
          if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          ) {
            return;
          }

          event.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

/**
 * Hook for context-aware keyboard shortcuts based on current route
 */
export const useContextualShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrlKey: true,
      metaKey: true,
      action: () => {
        // Global search - focus search box if available
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search',
    },
    {
      key: 'n',
      ctrlKey: true,
      metaKey: true,
      action: () => {
        // Context-aware new item
        if (location.pathname.includes('/patients')) {
          navigate('/patients?action=new');
        } else if (location.pathname.includes('/appointments')) {
          navigate('/appointments?action=new');
        } else if (location.pathname.includes('/billing')) {
          navigate('/billing?action=new');
        } else if (location.pathname.includes('/treatments')) {
          navigate('/treatments?action=new');
        } else {
          navigate('/patients?action=new');
        }
      },
      description: 'New item (context-aware)',
    },
    {
      key: '/',
      ctrlKey: true,
      metaKey: true,
      action: () => {
        // Show shortcuts help - can be implemented with a dialog
        console.log('Keyboard shortcuts help');
      },
      description: 'Show shortcuts help',
    },
    {
      key: 'Escape',
      action: () => {
        // Close dialogs/modals
        const dialogs = document.querySelectorAll('[role="dialog"]');
        if (dialogs.length > 0) {
          const lastDialog = dialogs[dialogs.length - 1] as HTMLElement;
          const closeButton = lastDialog.querySelector('[aria-label*="close" i], button[aria-label*="close" i]') as HTMLElement;
          if (closeButton) {
            closeButton.click();
          }
        }
      },
      description: 'Close dialog/modal',
    },
    {
      key: 'f',
      ctrlKey: true,
      metaKey: true,
      action: () => {
        // Focus search box
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search',
    },
  ];

  useKeyboardShortcuts(shortcuts);
};
