import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  TextInput, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SystemUI from 'expo-system-ui';
import { useStore } from '../store/useStore';
import { Note, NoteCategory } from '../types';
import { lightTheme, darkTheme } from '../constants/theme';

// Component for category buttons
const CategoryButton = ({ 
  category,
  active,
  onPress,
  theme
}: { 
  category: NoteCategory, 
  active: boolean, 
  onPress: () => void,
  theme: typeof lightTheme 
}) => {
  const getLabel = () => {
    switch(category) {
      case 'all': return 'All';
      case 'personal': return 'Personal';
      case 'work': return 'Work';
      case 'family': return 'Family';
      default: return '';
    }
  };

  const backgroundColor = active 
    ? theme.tagBackground[category] 
    : 'transparent';
  
  const textColor = active 
    ? '#FFFFFF' 
    : theme.text;

  return (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        { backgroundColor, borderColor: active ? 'transparent' : theme.border }
      ]}
      onPress={onPress}
    >
      <Text style={[styles.categoryText, { color: textColor }]}>
        {getLabel()}
      </Text>
    </TouchableOpacity>
  );
};

// Component for note card
const NoteCard = ({ 
  note, 
  onPress,
  onPin,
  theme
}: { 
  note: Note, 
  onPress: () => void,
  onPin: () => void,
  theme: typeof lightTheme 
}) => {
  // Process the HTML content for preview
  const processContent = () => {
    // Check if the content has images
    const hasImages = note.content.includes('<img');
    
    // Remove HTML tags for text preview
    const plainText = note.content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim();
    
    // Extract first image if there is one
    let firstImageSrc = null;
    if (hasImages) {
      const imgMatch = note.content.match(/<img[^>]+src="([^"]+)"[^>]*>/);
      if (imgMatch && imgMatch[1]) {
        firstImageSrc = imgMatch[1];
      }
    }
    
    // Create a short preview of the text content
    const shortText = plainText.slice(0, 100) + (plainText.length > 100 ? '...' : '');
    
    return { plainText, shortText, hasImages, firstImageSrc };
  };
  
  const { shortText, hasImages, firstImageSrc } = processContent();

  // Format date to display in a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <TouchableOpacity 
      style={[styles.noteCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
      onPress={onPress}
    >
      <View style={styles.noteHeader}>
        <Text style={[styles.noteTitle, { color: theme.text }]}>{note.title || 'Untitled'}</Text>
        <TouchableOpacity onPress={onPin} style={styles.pinButton} hitSlop={10}>
          <Ionicons 
            name={note.isPinned ? "heart" : "heart-outline"} 
            size={20} 
            color={theme.getTagColor(note.category)} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.previewContainer}>
        {/* Text Preview */}
        <Text style={[styles.notePreview, { color: theme.cardText }]}>
          {shortText || 'No content'}
        </Text>
        
        {/* Image Preview (if available) */}
        {hasImages && firstImageSrc && (
          <Image 
            source={{ uri: firstImageSrc }} 
            style={styles.previewImage}
            resizeMode="cover"
          />
        )}
      </View>
      
      <View style={styles.noteFooter}>
        <Text style={[styles.noteDate, { color: theme.cardText }]}>
          {formatDate(note.updatedAt)}
        </Text>
        
        {note.category !== 'all' && (
          <View 
            style={[
              styles.noteCategory, 
              { backgroundColor: theme.getTagColor(note.category) }
            ]}
          >
            <Text style={styles.noteCategoryText}>
              {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const statusBarHeight = Platform.OS === "android" ? RNStatusBar.currentHeight : 44;
export default function HomeScreen() {
  const router = useRouter();
  
  const { 
    notes,
    filteredNotes,
    activeCategory,
    searchQuery,
    isDarkMode,
    initialize,
    toggleTheme,
    setActiveCategory,
    setSearchQuery,
    filterNotes,
    pinNote,
    unpinNote
  } = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  SystemUI.setBackgroundColorAsync(theme.background);

  // Count of deleted notes (for trash badge)
  const trashCount = notes.filter(note => note.isDeleted).length;

  // Initialize the store
  useEffect(() => {
    if (initialize) {
      initialize();
    }
    filterNotes();
  }, []);

  // Navigate to note editor
  const goToNoteEditor = (noteId?: string) => {
    if (noteId) {
      router.push(`/note/${noteId}`);
    } else {
      router.push('/note/new');
    }
  };

  // Handle pin/unpin
  const handlePinPress = (note: Note) => {
    if (note.isPinned) {
      unpinNote(note.id);
    } else {
      pinNote(note.id);
    }
  };

  // Navigate to trash
  const goToTrash = () => {
    router.push('/trash');
  };

  // Categories
  const categories: NoteCategory[] = ['all', 'personal', 'work', 'family',];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Notes</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={goToTrash} style={styles.trashButton}>
            <Ionicons name="trash-outline" size={24} color={theme.text} />
            {trashCount > 0 && (
              <View style={styles.trashBadge}>
                <Text style={styles.trashBadgeText}>
                  {trashCount > 9 ? '9+' : trashCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons 
              name={isDarkMode ? "sunny-outline" : "moon-outline"} 
              size={24} 
              color={theme.text} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={20} color={theme.cardText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search notes"
          placeholderTextColor={theme.cardText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
            <Ionicons name="close-circle" size={20} color={theme.cardText} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Categories */}
      <View style={styles.categoriesContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
      >
        {categories.map(category => (
          <CategoryButton
            key={category}
            category={category}
            active={activeCategory === category}
            onPress={() => setActiveCategory(category)}
            theme={theme}
          />
        ))}
      </ScrollView>
      </View>
      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard 
            note={item} 
            onPress={() => goToNoteEditor(item.id)}
            onPin={() => handlePinPress(item)}
            theme={theme}
          />
        )}
        contentContainerStyle={styles.notesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.cardText }]}>
              No notes found. Create a new note to get started!
            </Text>
          </View>
        }
      />
      
      {/* Add New Note Button */}
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => goToNoteEditor()}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: statusBarHeight,  
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggle: {
    padding: 8,
  },
  trashButton: {
    padding: 8,
    marginRight: 8,
    position: 'relative',
  },
  trashBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearSearch: {
    padding: 4,
  },
  categoriesContainer: {
    height: 42,
    justifyContent:'center',
    alignItems:'center',
  },
  categories: {
    height: 42,
    paddingRight: 16,
    backgroundColor:'blue'
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  categoryText: {
    fontWeight: '500',
    fontSize: 14,
  },
  notesList: {
    paddingBottom: 100,
  },
  noteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  pinButton: {
    padding: 4,
  },
  previewContainer: {
    marginBottom: 8,
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  noteDate: {
    fontSize: 12,
  },
  noteCategory: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  noteCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 