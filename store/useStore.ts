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
            isInitialized: true
          });
          
          return {
            notes: [],
            isDarkMode: false,
            customCategories: [],
            storageError: true,
            errorMessage: 'Your notes data exceeded the storage limit. The app has been reset. Please avoid storing large images directly in notes.'
          };
        }
        
        // Set the basic state
        set({ 
          notes: result.notes,
          isDarkMode: result.isDarkMode,
          customCategories: result.customCategories,
          isInitialized: true
        });
        
        // Filter and sort the notes
        const filteredAndSortedNotes = get().filterNotes(result.notes);
        set({ filteredNotes: filteredAndSortedNotes });
        
        return result;
      } catch (loadError) {
        // Critical recovery - if any error happens during load, clear everything
        logger.error('Critical error loading data:', loadError);
        logger.warn('Forcing complete app reset due to critical error');
        
        await emergencyClearStorage();
        
        set({ 
          notes: [],
          filteredNotes: [],
          customCategories: [],
          isDarkMode: false,
          isInitialized: true
        });
        
        return {
          notes: [],
          isDarkMode: false,
          customCategories: [],
          storageError: true,
          errorMessage: 'A critical error occurred. All app data has been reset to recover functionality.'
        };
      }
    } catch (error) {
      logger.error('Unrecoverable error in initialization:', error);
      // Last resort - just mark as initialized with empty data
      set({ 
        notes: [],
        filteredNotes: [],
        customCategories: [],
        isInitialized: true 
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

  // Note management - with async operations and better error handling
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    logger.log('Adding new note:', note.title);
    
    set(state => {
      const newNote: Note = {
        ...note,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Add new note at the beginning of the array instead of the end
      const updatedNotes = [newNote, ...state.notes];
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after adding');
        }
      });
      
      // If this is a custom category not in the standard ones,
      // add it to the custom categories list
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
      
      const filtered = get().filterNotes(updatedNotes);
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
        return state; // Return unchanged state if note not found
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
      
      // If a custom category is being set, add it to the list
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
      
      const filtered = get().filterNotes(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  deleteNote: (id) => {
    logger.log('Deleting note (moving to trash):', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isDeleted: true } : note
      );
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after deleting');
        }
      });
      
      const filtered = get().filterNotes(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  restoreNote: (id) => {
    logger.log('Restoring note from trash:', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isDeleted: false } : note
      );
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after restoring');
        }
      });
      
      const filtered = get().filterNotes(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  permanentlyDeleteNote: (id) => {
    logger.log('Permanently deleting note:', id);
    
    set(state => {
      const updatedNotes = state.notes.filter(note => note.id !== id);
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after permanent deletion');
        }
      });
      
      const filtered = get().filterNotes(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  pinNote: (id) => {
    logger.log('Pinning note:', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isPinned: true } : note
      );
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after pinning');
        }
      });
      
      const filtered = get().filterNotes(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  unpinNote: (id) => {
    logger.log('Unpinning note:', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isPinned: false } : note
      );
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          logger.error('Failed to save notes after unpinning');
        }
      });
      
      const filtered = get().filterNotes(updatedNotes);
      return { 
        notes: updatedNotes,
        filteredNotes: filtered
      };
    });
  },

  setActiveCategory: (category) => {
    set({ activeCategory: category });
    const filtered = get().filterNotes();
    set({ filteredNotes: filtered });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    const filtered = get().filterNotes();
    set({ filteredNotes: filtered });
  },

  filterNotes: (notesArray?: Note[]) => {
    const { notes: storeNotes, activeCategory, searchQuery } = get();
    const notes = notesArray || storeNotes;
    
    // First filter by active category and deleted status
    let filtered = notes.filter(note => !note.isDeleted);
    
    if (activeCategory !== 'all') {
      filtered = filtered.filter(note => note.category === activeCategory);
    }
    
    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        note => 
          note.title.toLowerCase().includes(query) || 
          note.content.toLowerCase().includes(query)
      );
    }
    
    // Sort: pinned notes first, then by createdAt (newest first)
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // For notes with the same pinned status, sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return filtered;
  }
})); 