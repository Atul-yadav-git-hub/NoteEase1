import * as QuickActions from 'expo-quick-actions';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { useStore } from '../store/useStore';
import { isExpoGo } from './environment';

// Quick action types
export type QuickActionType = 'new_note' | 'personal_note' | 'work_note' | 'search';

// Quick action data interface based on expo-quick-actions API
type QuickActionData = QuickActions.Action;

// Available quick actions
export const quickActions: QuickActionData[] = [
  {
    id: 'new_note',
    title: 'New Note',
    subtitle: 'Create a new note',
    icon: 'compose',
  },
  {
    id: 'personal_note',
    title: 'Personal Note',
    subtitle: 'Create a personal note',
    icon: 'contact',
  },
  {
    id: 'work_note',
    title: 'Work Note',
    subtitle: 'Create a work note',
    icon: 'task',
  },
  {
    id: 'search',
    title: 'Search Notes',
    subtitle: 'Search through your notes',
    icon: 'search',
  },
];

// Initialize quick actions
export const initializeQuickActions = async () => {
  if (Platform.OS === 'web' || isExpoGo()) return;

  try {
    // Check if quick actions are supported
    const isSupported = await QuickActions.isSupported();
    if (!isSupported) return;

    // Set up quick actions
    await QuickActions.setItems(quickActions);
  } catch (error) {
    // Silent error in production
  }
};

// Handle quick action
export const handleQuickAction = (action: QuickActions.Action) => {
  if (!action?.id) return;

  const { setInitialNoteCategory, setSearchQuery } = useStore.getState();
  const type = action.id as QuickActionType;

  switch (type) {
    case 'new_note':
      setInitialNoteCategory(null);
      router.push('/note/new');
      break;
    case 'personal_note':
      setInitialNoteCategory('personal');
      router.push('/note/new');
      break;
    case 'work_note':
      setInitialNoteCategory('work');
      router.push('/note/new');
      break;
    case 'search':
      router.push('/');
      // Focus search input after a short delay to ensure the screen is mounted
      setTimeout(() => {
        setSearchQuery('');
      }, 100);
      break;
    default:
      // No debug in production
  }
}; 