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
    existingNote?.category || "personal"
  );
  const [isSaved, setIsSaved] = useState(true);
  const [isChanged, setIsChanged] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const tagInputRef = useRef<TextInput>(null);

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
    console.log("Saving note...", { title, hasContent: !!content, isNewNote });

    // Only save if we have at least a title or content
    if (!title && !content) {
      return; // Don't save empty notes
    }

    try {
      if (isNewNote) {
        const newNote = {
          title: title || "Untitled",
          content,
          category,
          isPinned: false,
          isDeleted: false,
        };

        console.log("Creating new note:", newNote.title);
        addNote(newNote);

        // Navigate back to the home screen without alert
        router.back();
      } else if (existingNote) {
        console.log("Updating existing note:", existingNote.id);

        updateNote(noteId, {
          title: title || "Untitled",
          content,
          category,
        });

        setIsSaved(true);
        setIsChanged(false);
      }
    } catch (error) {
      console.error("Error saving note:", error);
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
    try {
      console.log('Starting image picker flow');
      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission result:', permissionResult);
      
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required", 
          "You need to grant access to your photo library to add images."
        );
        return;
      }
      
      // Launch the image picker
      console.log('Launching image picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true, // Request base64 data
      });
      console.log('Image picker result:', result.canceled ? 'Canceled' : 'Image selected');
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        console.log('Selected image URI:', selectedImage.uri.substring(0, 30) + '...');
        
        // Use base64 encoding which works better in WebView
        if (selectedImage.base64) {
          console.log('Base64 data available, length:', selectedImage.base64.length);
          
          // Get the correct MIME type or default to jpeg
          const type = selectedImage.uri.endsWith('.png') ? 'png' : 
                      selectedImage.uri.endsWith('.gif') ? 'gif' : 'jpeg';
          
          // Create a data URL from the base64 string
          const dataUrl = `data:image/${type};base64,${selectedImage.base64}`;
          
          // Get the current rich text editor instance
          const editor = richText.current;
          if (editor) {
            console.log('Editor found, inserting image as data URL');
            // Insert the image with proper HTML using data URL
            editor.insertHTML(`<img src="${dataUrl}" style="max-width: 90%; height: auto; margin: 10px auto; display: block;" />`);
            console.log('Image HTML inserted');
            
            // Mark the note as changed
            setIsChanged(true);
            setIsSaved(false);
          } else {
            console.error('Editor not found');
            Alert.alert("Error", "Could not insert image. Editor not ready.");
          }
        } else {
          console.error('No base64 data available');
          Alert.alert("Error", "Could not process the selected image.");
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
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
          showsVerticalScrollIndicator={false}
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
                console.log('Editor initialized');
              }}
              useContainer={true}
              initialHeight={400}
              disabled={false}
              pasteAsPlainText={true}
              onPaste={(data) => {
                console.log('Paste event detected');
              }}
              onKeyUp={() => setIsChanged(true)}
              onFocus={() => console.log('Editor focused')}
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
                    max-width: 100%;
                    margin: 8px auto;
                    display: block;
                    height: auto;
                    border-radius: 4px;
                  }
                  p {
                    margin: 0 0 16px 0;
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
            actions.checkboxList,
            actions.undo,
            actions.redo,
            actions.insertImage
          ]}
          iconMap={{
            [actions.insertImage]: ({ tintColor }: { tintColor: string | undefined }) => (
              <Ionicons name="image-outline" size={18} color={tintColor} />
            ),
          }}
          onPressAddImage={handleImagePick}
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
  },
  contentContainer: {
    flex: 1,
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
  },
  editor: {
    flex: 1,
    minHeight: 250,
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
