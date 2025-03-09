import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Note } from '../types';
import { lightTheme, darkTheme } from '../constants/theme';

// Component for deleted note card
const DeletedNoteCard = ({
  note,
  onRestore,
  onDelete,
  theme
}: {
  note: Note;
  onRestore: () => void;
  onDelete: () => void;
  theme: typeof lightTheme;
}) => {
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
    <View
      style={[styles.noteCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.noteContent}>
        <Text style={[styles.noteTitle, { color: theme.text }]}>
          {note.title || 'Untitled'}
        </Text>
        <Text style={[styles.noteDate, { color: theme.cardText }]}>
          {formatDate(note.createdAt)}
        </Text>
      </View>
      <View style={styles.noteActions}>
        <TouchableOpacity onPress={onRestore} style={styles.actionButton}>
          <Ionicons name="arrow-undo" size={22} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
          <Ionicons name="trash" size={22} color={theme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
const statusBarHeight = Platform.OS === "android" ? RNStatusBar.currentHeight : 44;
export default function TrashScreen() {
  const router = useRouter();
  
  const {
    notes,
    isDarkMode,
    restoreNote,
    permanentlyDeleteNote,
    initialize
  } = useStore();

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Get only deleted notes
  const trashedNotes = notes.filter(note => note.isDeleted);

  // Initialize the store
  useEffect(() => {
    if (initialize) {
      initialize();
    }
  }, []);

  // Handle restore note
  const handleRestore = (noteId: string) => {
    restoreNote(noteId);
  };

  // Handle permanent delete note
  const handlePermanentDelete = (noteId: string) => {
    Alert.alert(
      'Delete Permanently',
      'This note will be permanently deleted and cannot be recovered. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => permanentlyDeleteNote(noteId)
        }
      ]
    );
  };

  // Handle empty all trash
  const handleEmptyTrash = () => {
    if (trashedNotes.length === 0) return;

    Alert.alert(
      'Empty Trash',
      'All notes in the trash will be permanently deleted. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: () => {
            trashedNotes.forEach(note => {
              permanentlyDeleteNote(note.id);
            });
          }
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Trash</Text>
        </View>
        
        {trashedNotes.length > 0 && (
          <TouchableOpacity onPress={handleEmptyTrash} style={styles.emptyButton}>
            <Text style={[styles.emptyButtonText, { color: theme.error }]}>
              Empty Trash
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Trashed Notes List */}
      <FlatList
        data={trashedNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DeletedNoteCard
            note={item}
            onRestore={() => handleRestore(item.id)}
            onDelete={() => handlePermanentDelete(item.id)}
            theme={theme}
          />
        )}
        contentContainerStyle={styles.notesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trash-outline" size={60} color={theme.cardText} />
            <Text style={[styles.emptyText, { color: theme.cardText }]}>
              Trash is empty
            </Text>
          </View>
        }
      />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  emptyButton: {
    padding: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  notesList: {
    paddingBottom: 100,
  },
  noteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 14,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
}); 