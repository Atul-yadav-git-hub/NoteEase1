import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  StatusBar as RNStatusBar,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  actions,
  RichEditor,
  RichToolbar,
} from "react-native-pell-rich-editor";
import { useStore } from "../../store/useStore";
import { NoteCategory } from "../../types";
import { lightTheme, darkTheme } from "../../constants/theme";
import * as ImagePicker from 'expo-image-picker';

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

// Component for category selection
const CategorySelector = ({
  selectedCategory,
  onCategoryChange,
  theme,
  onAddCustomTag,
  onRemoveCustomTag,
  customCategories,
}: {
  selectedCategory: NoteCategory;
  onCategoryChange: (category: NoteCategory) => void;
  theme: typeof lightTheme;
  onAddCustomTag: () => void;
  onRemoveCustomTag: (category: string) => void;
  customCategories: string[];
}) => {
  const defaultCategories: { value: NoteCategory; label: string }[] = [
    { value: "personal", label: "Personal" },
    { value: "work", label: "Work" },
    { value: "family", label: "Family" },
  ];

  // Convert custom categories to the same format
  const customCategoryObjects = customCategories.map((cat) => ({
    value: cat as NoteCategory,
    label: cat,
    isCustom: true,
  }));

  // Combine both arrays + add the "Custom" button
  const allCategories = [
    ...defaultCategories,
    ...customCategoryObjects,
    { value: "custom", label: "+ Custom", isCustom: false },
  ] as Array<{ value: NoteCategory; label: string; isCustom?: boolean }>;

  return (
    <View style={styles.categorySelector}>
      <FlatList
        data={allCategories}
        keyExtractor={(item) => item.value}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.value === "custom") {
            // Custom tag creation button
            return (
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  { borderColor: theme.border, borderStyle: "dashed" },
                ]}
                onPress={onAddCustomTag}
              >
                <Text style={[styles.categoryLabel, { color: theme.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <View style={styles.categoryItemContainer}>
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  {
                    backgroundColor:
                      selectedCategory === item.value
                        ? theme.getTagColor(item.value)
                        : "transparent",
                    borderColor:
                      selectedCategory === item.value
                        ? "transparent"
                        : theme.border,
                  },
                ]}
                onPress={() => onCategoryChange(item.value)}
              >
                <Text
                  style={[
                    styles.categoryLabel,
                    {
                      color:
                        selectedCategory === item.value ? "#FFFFFF" : theme.text,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
              
              {/* Delete button for custom tags */}
              {item.isCustom && (
                <TouchableOpacity
                  style={[
                    styles.removeTagButton,
                    { backgroundColor: theme.background }
                  ]}
                  onPress={() => onRemoveCustomTag(item.value)}
                  hitSlop={10}
                >
                  <Ionicons name="close-circle" size={16} color={theme.error} />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

export default function NoteEditorScreen() {
  const richText = useRef<RichEditor>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const noteId = params.id as string;
  const isNewNote = noteId === "new";

  const {
    notes,
    isDarkMode,
    addNote,
    updateNote,
    deleteNote,
    customCategories,
    addCustomCategory,
    removeCustomCategory,
    initialNoteCategory,
    setInitialNoteCategory,
  } = useStore();

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Find the note if editing an existing one
  const existingNote = !isNewNote
    ? notes.find((note) => note.id === noteId)
    : null;

  // State for the note being edited
  const [title, setTitle] = useState(existingNote?.title || "");
  const [content, setContent] = useState(existingNote?.content || "");
  const [category, setCategory] = useState<NoteCategory>(
    existingNote?.category || initialNoteCategory || "personal"
  );
  const [isSaved, setIsSaved] = useState(true);
  const [isChanged, setIsChanged] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const tagInputRef = useRef<TextInput>(null);

  // Clear initial category when component unmounts
  useEffect(() => {
    return () => {
      if (setInitialNoteCategory) {
        setInitialNoteCategory(null);
      }
    };
  }, []);

  // Focus the tag input when the modal becomes visible
  useEffect(() => {
    if (showTagModal) {
      // Small delay to ensure modal is fully visible before focusing
      const timer = setTimeout(() => {
        tagInputRef.current?.focus();
        // On Android, sometimes we need extra help to show the keyboard
        if (Platform.OS === 'android') {
          tagInputRef.current?.blur();
          setTimeout(() => tagInputRef.current?.focus(), 50);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showTagModal]);

  // Ensure we capture content changes from the rich text editor
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsChanged(true);
    setIsSaved(false);
  };

  // Handle title changes
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsChanged(true);
    setIsSaved(false);
  };

  // Handle category changes
  const handleCategoryChange = (newCategory: NoteCategory) => {
    setCategory(newCategory);
    setIsChanged(true);
    setIsSaved(false);
  };

  // Handle adding a custom tag
  const handleAddCustomTag = () => {
    setNewTagName("");  // Clear the input field
    setShowTagModal(true);
  };

  // Handle creating a new custom tag
  const handleCreateTag = () => {
    if (newTagName.trim()) {
      // Add to custom categories
      addCustomCategory(newTagName.trim());
      setCategory(newTagName.trim() as NoteCategory);
      setShowTagModal(false);
      setNewTagName("");
      setIsChanged(true);
      setIsSaved(false);
    }
  };

  // Handle removing a custom tag
  const handleRemoveCustomTag = (tagToRemove: string) => {
    Alert.alert(
      "Remove Tag",
      `Are you sure you want to remove the "${tagToRemove}" tag?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            // If current note has this category, change to "personal"
            if (category === tagToRemove) {
              setCategory("personal");
              setIsChanged(true);
              setIsSaved(false);
            }
            // Remove from store
            removeCustomCategory(tagToRemove);
          },
        },
      ]
    );
  };

  // Manual save function
  const saveNote = () => {
    logger.log("Saving note...", { title, hasContent: !!content, isNewNote });

    if (!title.trim() && !content.trim()) {
      // Skip saving empty notes
      handleBack();
      return;
    }

    try {
      if (isNewNote) {
        const newNote = {
          title: title.trim() || "Untitled Note",
          content: content,
          category: category,
          isPinned: false,
          isDeleted: false,
        };

        logger.log("Creating new note:", newNote.title);
        addNote(newNote);
      } else if (existingNote) {
        logger.log("Updating existing note:", existingNote.id);
        
        updateNote(existingNote.id, {
          title: title.trim() || "Untitled Note",
          content: content,
          category: category,
          // Don't update isPinned or isDeleted state
        });
      }

      // Set isSaved to true and isChanged to false to prevent the confirmation alert
      setIsSaved(true);
      setIsChanged(false);
      
      // Go back to the home screen without going through the unsaved changes check
      router.back();
      return; // Return early to prevent handleBack from running
      
    } catch (error) {
      logger.error("Error saving note:", error);
      Alert.alert(
        "Error",
        "Could not save your note. Please try again."
      );
    }
  };

  // Track changes to mark note as unsaved when editing existing note
  useEffect(() => {
    if (existingNote) {
      const hasChanges =
        title !== existingNote.title ||
        content !== existingNote.content ||
        category !== existingNote.category;

      if (hasChanges) {
        setIsChanged(true);
        setIsSaved(false);
      }
    } else if (title || content) {
      setIsChanged(true);
      setIsSaved(false);
    }
  }, []);

  // Handle back button with confirmation if there are unsaved changes
  const handleBack = () => {
    if (!isSaved && isChanged) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save before leaving?",
        [
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
          {
            text: "Save",
            onPress: () => {
              saveNote();
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // Handle deleting a note
  const handleDelete = () => {
    // Implementation of note deletion
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteNote(noteId);
            router.back();
          },
        },
      ]
    );
  };
  
  // Handle picking an image and inserting it into the editor
  const handleImagePick = async () => {
    logger.log('Starting image picker flow');
    
    try {
      // Check permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        logger.error("Error picking image:", "Permission denied");
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to make this work!'
        );
        return;
      }
      
      continueImagePick();
    } catch (error) {
      logger.error("Error in image picker:", error);
    }
  };
  
  // Continue with image picking after warning
  const continueImagePick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      logger.log('Permission result:', permissionResult);

      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to make this work!'
        );
        return;
      }

      logger.log('Launching image picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      logger.log('Image picker result:', result.canceled ? 'Canceled' : 'Image selected');
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        const sizeInMB = selectedImage.fileSize ? selectedImage.fileSize / (1024 * 1024) : 0;
        
        logger.log(`Selected image size: ~${sizeInMB.toFixed(2)} MB`);
        
        insertImageToEditor(selectedImage);
      }
    } catch (error) {
      logger.error("Error in image picker flow:", error);
      Alert.alert('Error', 'Could not select the image. Please try again.');
    }
  };
  
  // Insert image into editor
  const insertImageToEditor = (selectedImage: any) => {
    if (!selectedImage.base64) {
      Alert.alert('Error', 'Could not process the image. Please try a different one.');
      return;
    }

    logger.log('Base64 data available, length:', selectedImage.base64.length);

    // Construct the data URL
    const dataUrl = `data:image/${selectedImage.uri.split('.').pop()};base64,${selectedImage.base64}`;
    
    // Insert to the editor
    if (richText.current) {
      // Get the current cursor position
      const currentPosition = richText.current?.getContentHtml() || '';
      
      logger.log('Editor found, inserting image as data URL');
      
      // Create the image HTML
      const imageHtml = `<img src="${dataUrl}" style="max-width: 100%; height: auto;" />`;
      
      // Insert the image
      richText.current.insertHTML(imageHtml);
      
      // Focus back to editor
      richText.current.focusContentEditor();
      
      logger.log('Image HTML inserted');
      
      // Mark content as changed
      setIsChanged(true);
    } else {
      logger.error('Editor not found');
      Alert.alert('Error', 'Could not insert the image. Please try again.');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {/* Save Button */}
          <TouchableOpacity
            onPress={saveNote}
            style={[
              styles.saveButton,
              {
                backgroundColor:
                  !isSaved && isChanged ? theme.primary : theme.secondary,
                opacity: !isSaved && isChanged ? 1 : 0.7,
              },
            ]}
            disabled={isSaved || !isChanged}
          >
            <Text
              style={[
                styles.saveButtonText,
                {
                  color: isDarkMode
                    ? "#FFFFFF"
                    : !isSaved && isChanged
                    ? "#FFFFFF"
                    : theme.text,
                },
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>

          {/* Delete Button */}
          {!isNewNote && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={24} color={theme.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Selector */}
      <CategorySelector
        selectedCategory={category}
        onCategoryChange={handleCategoryChange}
        theme={theme}
        onAddCustomTag={handleAddCustomTag}
        onRemoveCustomTag={handleRemoveCustomTag}
        customCategories={customCategories}
      />

      <KeyboardAvoidingView
        style={styles.editorContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          contentContainerStyle={{ flexGrow: 1 }}
          scrollEventThrottle={16}
          bounces={false}
          overScrollMode="never"
        >
          {/* Title Input */}
          <TextInput
            style={[styles.titleInput, { color: theme.text }]}
            placeholder="Title"
            placeholderTextColor={theme.cardText}
            value={title}
            onChangeText={handleTitleChange}
          />

          {/* Rich Text Editor */}
          <View
            style={[
              styles.editorWrapper,
              {
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}
          >
            <RichEditor
              ref={richText}
              initialContentHTML={content}
              onChange={handleContentChange}
              style={styles.editor}
              placeholder="Start writing here..."
              editorInitializedCallback={() => {
                logger.log('Editor initialized');
              }}
              useContainer={true}
              initialHeight={400}
              disabled={false}
              pasteAsPlainText={true}
              onPaste={(data) => {
                logger.log('Paste event detected');
              }}
              scrollEnabled={true}
              containerStyle={{ 
                minHeight: 400,
                flexGrow: 1,
              }}
              onKeyUp={() => setIsChanged(true)}
              onFocus={() => logger.log('Editor focused')}
              onBlur={() => logger.log('Editor blurred')}
              onHeightChange={(height) => {
                logger.log('Editor height changed', height);
                // Force scroll update when height changes
                if (height > 400) {
                  // Small timeout to ensure the UI has updated
                  setTimeout(() => {
                    const editor = richText.current;
                    if (editor) {
                      // Force WebView to recalculate its size
                      editor.focusContentEditor();
                    }
                  }, 100);
                }
              }}
              editorStyle={{
                backgroundColor: theme.card,
                color: theme.text,
                placeholderColor: theme.cardText,
                contentCSSText: `
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  font-size: 16px;
                  padding: 8px;
                  color: ${theme.text};
                  min-height: 200px;
                  img {
                    max-width: 98%;
                    margin: 8px auto;
                    display: block;
                    height: auto;
                    border-radius: 4px;
                  }
                  p {
                    margin: 0 0 16px 0;
                  }
                  li {
                    margin-bottom: 8px;
                    position: relative;
                  }
                  input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    margin-right: 8px;
                    cursor: pointer;
                    pointer-events: auto;
                    vertical-align: middle;
                  }
                  ul, ol {
                    padding-left: 24px;
                    margin-bottom: 16px;
                  }
                  .checkbox-list-item {
                    padding-left: 4px;
                    min-height: 28px;
                  }
                `,
              }}
            />
          </View>
        </ScrollView>

        {/* Rich Text Toolbar */}
        <RichToolbar
          editor={richText}
          selectedIconTint={theme.primary}
          iconTint={theme.cardText}
          style={[styles.toolbar, { backgroundColor: theme.secondary }]}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.heading1,
            actions.heading2,
            actions.insertBulletsList,
            actions.insertOrderedList,
            actions.undo,
            actions.redo,
            actions.insertImage,
            actions.code,
            actions.fontSize,
          ]}
          iconMap={{
            [actions.insertImage]: ({ tintColor }: { tintColor: string | undefined }) => (
              <Ionicons name="image-outline" size={18} color={tintColor} />
            ),
          }}
          onPressAddImage={handleImagePick}
          iconSize={18}
        />
      </KeyboardAvoidingView>

      {/* Custom Tag Modal */}
      <Modal
        visible={showTagModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTagModal(false)}
        onShow={() => {
          setTimeout(() => tagInputRef.current?.focus(), 0);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Add Custom Tag
            </Text>

            <TextInput
              ref={tagInputRef}
              style={[
                styles.tagInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
              placeholder="Enter tag name"
              placeholderTextColor={theme.cardText}
              value={newTagName}
              onChangeText={setNewTagName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: theme.border }]}
                onPress={() => setShowTagModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleCreateTag}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 44,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  saveButtonText: {
    fontWeight: "600",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  categorySelector: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  categoryOption: {
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  editorContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  contentContainer: {
    flexGrow: 1,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "bold",
    paddingVertical: 12,
  },
  editorWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
    minHeight: 400,
    flex: 1,
    position: 'relative',
  },
  editor: {
    minHeight: 400,
    flex: 1,
    overflow: 'visible',
  },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  tagInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    width: "45%",
    alignItems: "center",
  },
  modalButtonText: {
    fontWeight: "500",
  },
  categoryItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  removeTagButton: {
    position: 'absolute',
    top: -2,
    right: 2,
    borderRadius: 10,
    padding: 1,
  },
  noteCategory: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noteCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});
