import { create } from 'zustand';
import { Note, NoteCategory, AppState } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'noteease-data';
const THEME_KEY = 'noteease-theme';
const CUSTOM_CATEGORIES_KEY = 'noteease-categories';

// Simple logger for development only
const logger = {
  log: (...args: any[]) => {
    if (__DEV__) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (__DEV__) console.error(...args);
  }
};

// Generate a unique ID compatible with React Native
const generateId = () => {
  // Generate a timestamp-based ID with some randomness
  return 'note_' + 
    Date.now().toString(36) + 
    Math.random().toString(36).substring(2, 10);
};

// Enhanced AsyncStorage operations with better error handling
const loadInitialState = async () => {
  try {
    logger.log('Loading data from AsyncStorage...');
    
    const savedNotesString = await AsyncStorage.getItem(STORAGE_KEY);
    const savedThemeString = await AsyncStorage.getItem(THEME_KEY);
    const savedCategoriesString = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
    
    logger.log('Notes loaded:', savedNotesString ? 'Yes' : 'No');
    
    let notesData = [];
    let themeData = false;
    let categoriesData = [];
    
    try {
      if (savedNotesString) {
        notesData = JSON.parse(savedNotesString);
      }
      if (savedThemeString) {
        themeData = JSON.parse(savedThemeString);
      }
      if (savedCategoriesString) {
        categoriesData = JSON.parse(savedCategoriesString);
      }
    } catch (parseError: unknown) {
      logger.error('Error parsing stored data:', parseError);
      
      // If we hit the "Row too big" error, clear the storage and start fresh
      if (parseError instanceof Error && 
         (parseError.message.includes('Row too big') || 
          parseError.message.includes('CursorWindow'))) {
        logger.warn('Storage size limit reached. Resetting app data...');
        await clearStorage();
        
        // Show a warning to the user via Alert (will be handled in the UI)
        return { 
          notes: [], 
          isDarkMode: false, 
          customCategories: [],
          storageError: true,
          errorMessage: 'Your notes data exceeded the storage limit. The app has been reset. Please avoid storing very large images directly in notes.'
        };
      }
    }
    
    return {
      notes: notesData,
      isDarkMode: themeData,
      customCategories: categoriesData,
    };
  } catch (error) {
    logger.error('Error loading data from AsyncStorage:', error);
    return { 
      notes: [], 
      isDarkMode: false, 
      customCategories: [],
      storageError: true,
      errorMessage: 'There was an error loading your notes. The app data has been reset.'
    };
  }
};

// Save state to AsyncStorage with async/await pattern
const saveNotes = async (notes: Note[]) => {
  try {
    logger.log('Saving notes to AsyncStorage...', notes.length);
    const jsonValue = JSON.stringify(notes);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    logger.log('Notes saved successfully');
    return true;
  } catch (error) {
    logger.error('Error saving notes to AsyncStorage:', error);
    return false;
  }
};

const saveTheme = async (isDarkMode: boolean) => {
  try {
    await AsyncStorage.setItem(THEME_KEY, JSON.stringify(isDarkMode));
    return true;
  } catch (error) {
    logger.error('Error saving theme to AsyncStorage:', error);
    return false;
  }
};

const saveCategories = async (categories: string[]) => {
  try {
    await AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
    return true;
  } catch (error) {
    logger.error('Error saving categories to AsyncStorage:', error);
    return false;
  }
};

// For debugging purposes
const clearStorage = async () => {
  try {
    await AsyncStorage.clear();
    logger.log('Storage cleared successfully');
    return true;
  } catch (e) {
    logger.error('Failed to clear storage:', e);
    return false;
  }
};

// Improved clearStorage for emergency recovery
const emergencyClearStorage = async () => {
  try {
    logger.warn('EMERGENCY: Clearing all app storage due to data corruption');
    
    // Clear specific keys first
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(THEME_KEY);
    await AsyncStorage.removeItem(CUSTOM_CATEGORIES_KEY);
    
    // Then try the full clear
    await AsyncStorage.clear();
    
    // Verify the clear worked
    const testRead = await AsyncStorage.getItem(STORAGE_KEY);
    if (testRead !== null) {
      logger.warn('AsyncStorage.clear() did not work, manually cleared keys');
    } else {
      logger.log('Storage cleared completely');
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to clear storage:', error);
    
    // Last resort - try one more time with just key removal
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      logger.log('Cleared notes data as last resort');
      return true;
    } catch (e) {
      logger.error('Complete failure to clear storage:', e);
      return false;
    }
  }
};

// Create the store
export const useStore = create<AppState>((set, get) => ({
  notes: [],
  filteredNotes: [],
  activeCategory: 'all',
  searchQuery: '',
  isDarkMode: false,
  isInitialized: false,
  customCategories: [],
  initialNoteCategory: null as NoteCategory | null,

  // Set initial category for new note
  setInitialNoteCategory: (category: NoteCategory | null) => {
    set({ initialNoteCategory: category });
  },

  // Reset all app data
  resetAppData: async () => {
    try {
      const success = await emergencyClearStorage();
      if (success) {
        set({
          notes: [],
          filteredNotes: [],
          activeCategory: 'all',
          searchQuery: '',
          isDarkMode: false,
          customCategories: [],
          isInitialized: true
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error in resetAppData:', error);
      return false;
    }
  },

  // Initialize with emergency recovery option
  initialize: async () => {
    if (get().isInitialized) return;
    
    try {
      logger.log('Attempting to load app data...');
      const result = await loadInitialState();
      logger.log('Store initialized with', result.notes.length, 'notes');
      
      // Check if there was a storage error
      if (result.storageError) {
        logger.warn('Storage error detected, resetting app data');
        await emergencyClearStorage();
        
        set({ 
          notes: [],
          filteredNotes: [],
          customCategories: [],
          isDarkMode: false,
          isInitialized: true,
          activeCategory: 'all',
          searchQuery: ''
        });
        
        return {
          notes: [],
          isDarkMode: false,
          customCategories: [],
          storageError: true,
          errorMessage: 'Your notes data exceeded the storage limit. The app has been reset. Please avoid storing large images directly in notes.'
        };
      }
      
      // Filter and sort the notes before setting state
      const filteredAndSortedNotes = result.notes.filter((note: Note) => !note.isDeleted);
      
      // Set all state at once to prevent multiple updates
      set({ 
        notes: result.notes,
        filteredNotes: filteredAndSortedNotes,
        isDarkMode: result.isDarkMode,
        customCategories: result.customCategories,
        isInitialized: true,
        activeCategory: 'all',
        searchQuery: ''
      });
      
      return result;
    } catch (error) {
      logger.error('Unrecoverable error in initialization:', error);
      // Last resort - just mark as initialized with empty data
      set({ 
        notes: [],
        filteredNotes: [],
        customCategories: [],
        isDarkMode: false,
        isInitialized: true,
        activeCategory: 'all',
        searchQuery: ''
      });
      
      return {
        notes: [],
        isDarkMode: false,
        customCategories: [],
        storageError: true,
        errorMessage: 'Failed to initialize the app. The data has been reset.'
      };
    }
  },

  // Theme toggle
  toggleTheme: () => {
    set(state => {
      const newIsDarkMode = !state.isDarkMode;
      saveTheme(newIsDarkMode);
      return { isDarkMode: newIsDarkMode };
    });
  },

  // Add custom category
  addCustomCategory: (category: string) => {
    if (!category.trim()) return;
    
    set(state => {
      // Check if category already exists
      if (state.customCategories.includes(category)) {
        return state; // No changes if category already exists
      }
      
      const updatedCategories = [...state.customCategories, category];
      saveCategories(updatedCategories);
      
      return { 
        customCategories: updatedCategories 
      };
    });
  },

  // Remove custom category
  removeCustomCategory: (category: string) => {
    set(state => {
      const updatedCategories = state.customCategories.filter(cat => cat !== category);
      saveCategories(updatedCategories);
      
      return {
        customCategories: updatedCategories
      };
    });
  },

  // Filter notes without triggering state updates
  filterNotesSync: (notesArray?: Note[], category?: NoteCategory, query?: string) => {
    const { notes: storeNotes, activeCategory, searchQuery } = get();
    const notesToFilter = notesArray || storeNotes;
    const categoryToUse = category !== undefined ? category : activeCategory;
    const queryToUse = query !== undefined ? query : searchQuery;
    
    // First filter by active category and deleted status
    let filtered = notesToFilter.filter(note => !note.isDeleted);
    
    if (categoryToUse !== 'all') {
      filtered = filtered.filter(note => note.category === categoryToUse);
    }
    
    // Then filter by search query
    if (queryToUse.trim()) {
      const queryLower = queryToUse.toLowerCase();
      filtered = filtered.filter(
        note => 
          note.title.toLowerCase().includes(queryLower) || 
          note.content.toLowerCase().includes(queryLower)
      );
    }
    
    // Sort: pinned notes first, then by createdAt (newest first)
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return filtered;
  },

  // Public filter method that updates state
  filterNotes: (notesArray?: Note[]) => {
    const filtered = get().filterNotesSync(notesArray);
    set({ filteredNotes: filtered });
    return filtered;
  },

  setActiveCategory: (category: NoteCategory) => {
    const filtered = get().filterNotesSync(undefined, category);
    set({ 
      activeCategory: category,
      filteredNotes: filtered
    });
  },

  setSearchQuery: (query: string) => {
    const filtered = get().filterNotesSync(undefined, undefined, query);
    set({ 
      searchQuery: query,
      filteredNotes: filtered
    });
  },

  // Note management with optimized updates
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    logger.log('Adding new note:', note.title);
    
    set(state => {
      const newNote: Note = {
        ...note,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedNotes = [newNote, ...state.notes];
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after adding');
        }
      });
      
      // Handle custom category
      if (
        typeof note.category === 'string' && 
        note.category !== 'all' && 
        note.category !== 'personal' && 
        note.category !== 'work' && 
        note.category !== 'family' && 
        !state.customCategories.includes(note.category)
      ) {
        get().addCustomCategory(note.category);
      }
      
      const filtered = get().filterNotesSync(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  updateNote: (id: string, noteUpdates: Partial<Note>) => {
    logger.log('Updating note:', id);
    
    set(state => {
      const noteToUpdate = state.notes.find(note => note.id === id);
      if (!noteToUpdate) {
        logger.error('Note not found for update:', id);
        return state;
      }
      
      const updatedNotes = state.notes.map(note => 
        note.id === id 
          ? { ...note, ...noteUpdates, updatedAt: new Date().toISOString() } 
          : note
      );
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after updating');
        }
      });
      
      // Handle custom category
      if (
        noteUpdates.category && 
        typeof noteUpdates.category === 'string' && 
        noteUpdates.category !== 'all' && 
        noteUpdates.category !== 'personal' && 
        noteUpdates.category !== 'work' && 
        noteUpdates.category !== 'family' && 
        !state.customCategories.includes(noteUpdates.category)
      ) {
        get().addCustomCategory(noteUpdates.category);
      }
      
      const filtered = get().filterNotesSync(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  deleteNote: (id: string) => {
    logger.log('Deleting note (moving to trash):', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isDeleted: true } : note
      );
      
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after deleting');
        }
      });
      
      const filtered = get().filterNotesSync(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  permanentlyDeleteNote: (id: string) => {
    logger.log('Permanently deleting note:', id);
    
    set(state => {
      const updatedNotes = state.notes.filter(note => note.id !== id);
      
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after permanent deletion');
        }
      });
      
      const filtered = get().filterNotesSync(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  restoreNote: (id: string) => {
    logger.log('Restoring note from trash:', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isDeleted: false } : note
      );
      
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after restoring');
        }
      });
      
      const filtered = get().filterNotesSync(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  pinNote: (id: string) => {
    logger.log('Pinning note:', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isPinned: true } : note
      );
      
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after pinning');
        }
      });
      
      const filtered = get().filterNotesSync(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  unpinNote: (id: string) => {
    logger.log('Unpinning note:', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isPinned: false } : note
      );
      
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after unpinning');
        }
      });
      
      const filtered = get().filterNotesSync(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },
})); 