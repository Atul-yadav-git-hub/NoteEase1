import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Image,
  useWindowDimensions,
  Linking,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SystemUI from 'expo-system-ui';
import { useStore } from '../store/useStore';
import { Note, NoteCategory } from '../types';
import { lightTheme, darkTheme } from '../constants/theme';
import { WebView } from 'react-native-webview';

// Only log in development mode
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
  const { width } = useWindowDimensions();
  
  // Process the HTML content for preview
  const processContent = () => {
    // Create a plain text version for checking if content exists
    const plainText = note.content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim();
    
    // Clean and prepare HTML content
    let cleanHtml = note.content;
    // Remove script and iframe tags for security
    cleanHtml = cleanHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    
    // Check if the content has images
    const hasImages = note.content.includes('<img');
    
    // Extract first image if there is one, and remove it from HTML preview
    let firstImageSrc = null;
    if (hasImages) {
      const imgMatch = note.content.match(/<img[^>]+src="([^"]+)"[^>]*>/);
      if (imgMatch && imgMatch[1]) {
        firstImageSrc = imgMatch[1];
        // Remove all images from the HTML to avoid displaying them twice
        cleanHtml = cleanHtml.replace(/<img[^>]*>/gi, '');
      }
    }
    
    // Determine if content is truncated - we'll consider anything with more than 3 lines as truncated
    const contentIsTruncated = plainText.length > 200;
    
    // Limit the content length, but make sure we're not cutting in the middle of tags
    if (contentIsTruncated) {
      // Try to find a good cutoff point that doesn't break HTML tags
      const maxLength = 1000; // Allow more HTML content to ensure proper formatting display
      if (cleanHtml.length > maxLength) {
        cleanHtml = cleanHtml.substring(0, maxLength);
        
        // Make sure we're not cutting in the middle of an HTML tag
        const lastOpenBracket = cleanHtml.lastIndexOf('<');
        const lastCloseBracket = cleanHtml.lastIndexOf('>');
        
        if (lastOpenBracket > lastCloseBracket) {
          // We're in the middle of a tag, cut before the tag
          cleanHtml = cleanHtml.substring(0, lastOpenBracket);
        }
        
        // Add closing tags for common elements to prevent broken HTML
        const openTags = [];
        const regex = /<(\w+)[^>]*>/g;
        const closingRegex = /<\/(\w+)>/g;
        let match;
        
        // Find all opening tags
        while ((match = regex.exec(cleanHtml)) !== null) {
          openTags.push(match[1]);
        }
        
        // Find all closing tags
        while ((match = closingRegex.exec(cleanHtml)) !== null) {
          const index = openTags.lastIndexOf(match[1]);
          if (index !== -1) {
            openTags.splice(index, 1);
          }
        }
        
        // Add closing tags in reverse order
        for (let i = openTags.length - 1; i >= 0; i--) {
          if (["p", "div", "span", "b", "i", "strong", "em", "li", "ul", "ol"].includes(openTags[i])) {
            cleanHtml += `</${openTags[i]}>`;
          }
        }
      }
    }
    
    // Enhance links in the HTML to open in a new window
    cleanHtml = cleanHtml.replace(
      /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["']([^>]*)>/gi, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" $2>'
    );

    // Create styled HTML with proper sizing
    // Increase the minimum height to prevent cutting text
    const contentHeight = plainText.length > 0 ? 
      Math.min(120, Math.max(60, Math.ceil(plainText.length / 3))) : 0;
    
    const styledHtml = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <style>
            html {
              background-color: ${theme.card};
            }
            body {
              font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 14px;
              line-height: 1.5;
              color: ${theme.cardText};
              margin: 0;
              padding: 0;
              overflow: hidden;
              background-color: ${theme.card};
            }
            p { margin: 0 0 8px 0; }
            h1, h2, h3 { margin: 0 0 8px 0; font-size: 16px; }
            ul, ol { padding-left: 20px; margin: 0 0 8px 0; }
            li { margin-bottom: 4px; }
            code { background-color: ${theme.secondary}; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            a { 
              color: ${theme.primary}; 
              text-decoration: underline; 
              padding: 0px 2px;
              border-radius: 2px;
              position: relative;
              background-color: rgba(0, 120, 255, 0.1);
              display: inline;
            }
            div { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${cleanHtml}
        </body>
      </html>
    `;
    
    return { plainText, styledHtml, hasImages, firstImageSrc, contentIsTruncated, contentHeight };
  };
  
  const { 
    plainText, 
    styledHtml, 
    hasImages, 
    firstImageSrc, 
    contentIsTruncated, 
    contentHeight 
  } = processContent();

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
        {/* Rich Text Preview - only show if content exists */}
        {plainText ? (
          <View style={[
            styles.richTextContainer, 
            { 
              height: contentHeight, 
              minHeight: 60,
              maxHeight: 120,
              backgroundColor: theme.card // Match the card background
            }
          ]}>
            <WebView
              source={{ html: styledHtml }}
              style={[
                styles.webView,
                { backgroundColor: 'transparent' }
              ]}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onNavigationStateChange={(event) => {
                // For any navigation event, just open the full note
                if (event.url !== 'about:blank') {
                  onPress();
                  return false;
                }
                return true;
              }}
              containerStyle={{ backgroundColor: theme.card }}
            />
            {/* Overlay to ensure taps go to the note */}
            <TouchableOpacity 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'transparent'
              }} 
              onPress={onPress}
              activeOpacity={0.7}
            />
          </View>
        ) : null}
        
        {/* Image Preview (if available) */}
        {hasImages && firstImageSrc && (
          <Image 
            source={{ uri: firstImageSrc }} 
            style={[
              styles.previewImage,
              !plainText && { marginTop: 0 }
            ]}
            resizeMode="cover"
          />
        )}
        
        {/* "...more" indicator at bottom right */}
        {contentIsTruncated && (
          <Text style={{
            fontSize: 14,
            color: theme.cardText,
            opacity: 0.8,
            alignSelf: 'flex-end',
            marginRight: 5,
            marginTop: 2,
          }}>
            ...more
          </Text>
        )}
      </View>
      
      <View style={styles.noteFooter}>
        <Text style={[styles.noteDate, { color: theme.cardText }]}>
          {formatDate(note.createdAt)}
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
  const [storageErrorShown, setStorageErrorShown] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
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
    unpinNote,
    resetAppData
  } = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  SystemUI.setBackgroundColorAsync(theme.background);

  // Count of deleted notes (for trash badge)
  const trashCount = notes.filter(note => note.isDeleted).length;

  // Initialize the store
  useEffect(() => {
    const attemptInitialize = async () => {
      try {
        if (initialize) {
          await initialize();
        }
      } catch (error) {
        logger.error("Critical initialization error:", error);
        
        Alert.alert(
          "Initialization Error",
          "There was a problem loading your data. Would you like to reset the app?",
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            {
              text: "Reset",
              style: "destructive",
              onPress: handleResetApp
            }
          ]
        );
      }
    };
    
    attemptInitialize();
  }, []);
  
  // Handle manual reset app data
  const handleResetApp = async () => {
    try {
      // Cast to any to avoid TypeScript errors with optional function
      await (resetAppData as any)?.();
      setStorageErrorShown(true);
      Alert.alert("App Reset", "All app data has been cleared.");
    } catch (err) {
      logger.error("Error resetting app:", err);
      Alert.alert("Reset Failed", "Could not reset the app data.");
    }
  };
  
  // Reset confirmation dialog
  useEffect(() => {
    if (showResetConfirm) {
      Alert.alert(
        "Reset App Data",
        "Are you sure you want to reset the app? This will delete ALL your notes and settings and cannot be undone.",
        [
          { text: "Cancel", style: "cancel", onPress: () => setShowResetConfirm(false) },
          { 
            text: "Reset", 
            style: "destructive", 
            onPress: async () => {
              const success = await resetAppData();
              setShowResetConfirm(false);
              if (success) {
                Alert.alert("Success", "App has been reset. All data has been cleared.");
              } else {
                Alert.alert("Error", "Failed to reset app data. Please try again.");
              }
            }
          }
        ]
      );
    }
  }, [showResetConfirm]);

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
          <TouchableOpacity onPress={handleResetApp} style={styles.themeToggle}>
            <Ionicons 
              name="refresh-circle-outline" 
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
    borderRadius: 20,
    marginRight: 8,
    height: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    marginBottom: 16,
    borderWidth: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  pinButton: {
    padding: 4,
  },
  previewContainer: {
    marginBottom: 10,
  },
  richTextContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  webView: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 6,
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