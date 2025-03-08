import { create } from 'zustand';
import { Note, NoteCategory, AppState } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'noteease-data';
const THEME_KEY = 'noteease-theme';
const CUSTOM_CATEGORIES_KEY = 'noteease-categories';

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
    console.log('Loading data from AsyncStorage...');
    
    const savedNotesString = await AsyncStorage.getItem(STORAGE_KEY);
    const savedThemeString = await AsyncStorage.getItem(THEME_KEY);
    const savedCategoriesString = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
    
    console.log('Notes loaded:', savedNotesString ? 'Yes' : 'No');
    
    const notesData = savedNotesString ? JSON.parse(savedNotesString) : [];
    const themeData = savedThemeString ? JSON.parse(savedThemeString) : false;
    const categoriesData = savedCategoriesString ? JSON.parse(savedCategoriesString) : [];
    
    return {
      notes: notesData,
      isDarkMode: themeData,
      customCategories: categoriesData,
    };
  } catch (error) {
    console.error('Error loading data from AsyncStorage:', error);
    return { notes: [], isDarkMode: false, customCategories: [] };
  }
};

// Save state to AsyncStorage with async/await pattern
const saveNotes = async (notes: Note[]) => {
  try {
    console.log('Saving notes to AsyncStorage...', notes.length);
    const jsonValue = JSON.stringify(notes);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    console.log('Notes saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving notes to AsyncStorage:', error);
    return false;
  }
};

const saveTheme = async (isDarkMode: boolean) => {
  try {
    await AsyncStorage.setItem(THEME_KEY, JSON.stringify(isDarkMode));
    return true;
  } catch (error) {
    console.error('Error saving theme to AsyncStorage:', error);
    return false;
  }
};

const saveCategories = async (categories: string[]) => {
  try {
    await AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
    return true;
  } catch (error) {
    console.error('Error saving categories to AsyncStorage:', error);
    return false;
  }
};

// For debugging purposes
const clearStorage = async () => {
  try {
    await AsyncStorage.clear();
    console.log('Storage cleared successfully');
    return true;
  } catch (e) {
    console.error('Failed to clear storage:', e);
    return false;
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

  // Initialize the store with better error handling
  initialize: async () => {
    if (get().isInitialized) return;
    
    try {
      const { notes, isDarkMode, customCategories } = await loadInitialState();
      console.log('Store initialized with', notes.length, 'notes');
      
      set({ 
        notes,
        isDarkMode,
        customCategories,
        filteredNotes: notes.filter((note: Note) => !note.isDeleted),
        isInitialized: true
      });
    } catch (error) {
      console.error('Error initializing store:', error);
      // Ensure we don't get stuck in an uninitialized state
      set({ 
        notes: [],
        filteredNotes: [],
        customCategories: [],
        isInitialized: true 
      });
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
    console.log('Adding new note:', note.title);
    
    set(state => {
      const newNote: Note = {
        ...note,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedNotes = [...state.notes, newNote];
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          console.error('Failed to save notes after adding');
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
    console.log('Updating note:', id);
    
    set(state => {
      const noteToUpdate = state.notes.find(note => note.id === id);
      if (!noteToUpdate) {
        console.error('Note not found for update:', id);
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
          console.error('Failed to save notes after updating');
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
    console.log('Deleting note (moving to trash):', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isDeleted: true } : note
      );
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          console.error('Failed to save notes after deleting');
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
    console.log('Restoring note from trash:', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isDeleted: false } : note
      );
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          console.error('Failed to save notes after restoring');
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
    console.log('Permanently deleting note:', id);
    
    set(state => {
      const updatedNotes = state.notes.filter(note => note.id !== id);
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          console.error('Failed to save notes after permanent deletion');
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
    console.log('Pinning note:', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isPinned: true } : note
      );
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          console.error('Failed to save notes after pinning');
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
    console.log('Unpinning note:', id);
    
    set(state => {
      const updatedNotes = state.notes.map(note => 
        note.id === id ? { ...note, isPinned: false } : note
      );
      
      // Save notes asynchronously
      saveNotes(updatedNotes).then(success => {
        if (!success) {
          console.error('Failed to save notes after unpinning');
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
    
    // Sort: pinned notes first, then by updatedAt (newest first)
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    
    return filtered;
  }
})); 