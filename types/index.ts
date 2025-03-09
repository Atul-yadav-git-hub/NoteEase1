export type NoteCategory = 'all' | 'personal' | 'work' | 'family' | string;

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  category: NoteCategory;
  isPinned: boolean;
  isDeleted: boolean;
}

export interface InitResult {
  notes: Note[];
  isDarkMode: boolean;
  customCategories: string[];
  storageError?: boolean;
  errorMessage?: string;
}

export interface AppState {
  notes: Note[];
  filteredNotes: Note[];
  activeCategory: NoteCategory;
  searchQuery: string;
  isDarkMode: boolean;
  isInitialized: boolean;
  customCategories: string[];
  initialNoteCategory: NoteCategory | null;
  resetAppData?: () => Promise<boolean>;
  initialize?: () => Promise<InitResult | void>;
  toggleTheme: () => void;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, noteUpdates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  permanentlyDeleteNote: (id: string) => void;
  pinNote: (id: string) => void;
  unpinNote: (id: string) => void;
  setActiveCategory: (category: NoteCategory) => void;
  setSearchQuery: (query: string) => void;
  filterNotes: (notesArray?: Note[]) => Note[];
  addCustomCategory: (category: string) => void;
  removeCustomCategory: (category: string) => void;
  setInitialNoteCategory: (category: NoteCategory | null) => void;
} 