// app/departments/create-department.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useColorScheme,
    View,
} from 'react-native';
import { departmentService } from '../../services/departmentService';
import { Department } from '../types/department';

// Available icons and colors for departments
const ALL_ICONS = [
  '🥐', '🍞', '🧹', '👔', '🔧', '🚚', '🏪', '📦', '🛒', '🏭',
  '🍕', '☕', '🍔', '🥗', '🍣', '🍩', '🍪', '🥤', '🧋', '🍜',
  '📊', '💼', '🖥️', '📱', '💻', '🖨️', '📞', '✏️', '📎', '📅',
  '🚗', '✈️', '🚢', '🚛', '🏗️', '🔨', '⚡', '💧', '🔥', '❄️',
  '🎨', '🎭', '🎬', '🎵', '🎸', '🎮', '🏀', '⚽', '🎾', '🏊',
  '🏥', '💊', '🩺', '🚑', '👶', '👴', '🎓', '📚', '✂️', '🔍'
];

const ALL_COLORS = [
  '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6', '#ef4444',
  '#10b981', '#3b82f6', '#f97316', '#6366f1', '#ec4899',
  '#f472b6', '#a855f7', '#d946ef', '#f43f5e', '#e11d48',
  '#ea580c', '#dc2626', '#65a30d', '#16a34a', '#0d9488',
  '#0891b2', '#2563eb', '#4338ca', '#7c3aed', '#c026d3'
];

export default function CreateDepartmentScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🥐',
    color: '#f59e0b',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [existingDepartments, setExistingDepartments] = useState<Department[]>([]);
  const [availableIcons, setAvailableIcons] = useState<string[]>(ALL_ICONS);
  const [availableColors, setAvailableColors] = useState<string[]>(ALL_COLORS);

  const styles = getStyles(isDarkMode);

  // Load existing departments to filter used icons and colors
  useEffect(() => {
    const loadExistingDepartments = async () => {
      try {
        const departments = await departmentService.getDepartments();
        setExistingDepartments(departments);
        
        // Filter out used icons
        const usedIcons = departments.map(dept => dept.icon);
        const filteredIcons = ALL_ICONS.filter(icon => !usedIcons.includes(icon));
        setAvailableIcons(filteredIcons.length > 0 ? filteredIcons : ALL_ICONS);
        
        // Filter out used colors
        const usedColors = departments.map(dept => dept.color);
        const filteredColors = ALL_COLORS.filter(color => !usedColors.includes(color));
        setAvailableColors(filteredColors.length > 0 ? filteredColors : ALL_COLORS);
        
        // Set default icon and color from available options
        if (filteredIcons.length > 0 && !filteredIcons.includes(formData.icon)) {
          setFormData(prev => ({ ...prev, icon: filteredIcons[0] }));
        }
        if (filteredColors.length > 0 && !filteredColors.includes(formData.color)) {
          setFormData(prev => ({ ...prev, color: filteredColors[0] }));
        }
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };

    loadExistingDepartments();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    // Set form to first available icon and color
    setFormData({
      name: '',
      description: '',
      icon: availableIcons[0] || '🥐',
      color: availableColors[0] || '#f59e0b',
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter department name');
      return;
    }

    if (!formData.icon) {
      Alert.alert('Error', 'Please select an icon');
      return;
    }

    if (!formData.color) {
      Alert.alert('Error', 'Please select a color');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await departmentService.createDepartment({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        icon: formData.icon,
        color: formData.color,
      });

      if (result.success) {
        // Reset form automatically
        resetForm();
        
        // Update available icons and colors
        const updatedIcons = availableIcons.filter(icon => icon !== formData.icon);
        const updatedColors = availableColors.filter(color => color !== formData.color);
        setAvailableIcons(updatedIcons.length > 0 ? updatedIcons : ALL_ICONS);
        setAvailableColors(updatedColors.length > 0 ? updatedColors : ALL_COLORS);
        
        Alert.alert(
          'Success',
          `Department "${formData.name}" created successfully!`,
          [
            {
              text: 'Create Another',
              style: 'default'
            },
            {
              text: 'Back to List',
              onPress: () => router.back(),
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create department');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const IconPickerModal = () => (
    <View style={styles.pickerModal}>
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerTitle}>Select Icon</Text>
        <TouchableOpacity onPress={() => setShowIconPicker(false)}>
          <Ionicons name="close" size={24} color={isDarkMode ? "#f1f5f9" : "#1e293b"} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search icons..."
          placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
        />
      </View>

      <ScrollView style={styles.iconScrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.iconGrid}>
          {availableIcons.map((icon, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.iconOption,
                formData.icon === icon && styles.iconOptionSelected
              ]}
              onPress={() => {
                handleInputChange('icon', icon);
                setShowIconPicker(false);
              }}
            >
              <Text style={styles.iconText}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {availableIcons.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No available icons</Text>
            <Text style={styles.emptyStateSubtext}>All icons are currently in use</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const ColorPickerModal = () => (
    <View style={styles.pickerModal}>
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerTitle}>Select Color</Text>
        <TouchableOpacity onPress={() => setShowColorPicker(false)}>
          <Ionicons name="close" size={24} color={isDarkMode ? "#f1f5f9" : "#1e293b"} />
        </TouchableOpacity>
      </View>
      <View style={styles.colorGrid}>
        {availableColors.map((color, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              formData.color === color && styles.colorOptionSelected
            ]}
            onPress={() => {
              handleInputChange('color', color);
              setShowColorPicker(false);
            }}
          >
            {formData.color === color && (
              <Ionicons name="checkmark" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        ))}
      </View>
      {availableColors.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No available colors</Text>
          <Text style={styles.emptyStateSubtext}>All colors are currently in use</Text>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={() => {
        setShowIconPicker(false);
        setShowColorPicker(false);
      }}>
        <ScrollView 
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Department</Text>
            <Text style={styles.headerSubtitle}>Add a new department to your organization</Text>
          </View>

          <View style={styles.content}>
            {/* Department Preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <View style={[styles.departmentPreview, { backgroundColor: formData.color }]}>
                <Text style={styles.previewIcon}>{formData.icon}</Text>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>
                    {formData.name || 'Department Name'}
                  </Text>
                  <Text style={styles.previewDescription}>
                    {formData.description || 'Department description'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Department Name */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Department Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter department name"
                placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                maxLength={50}
              />
            </View>

            {/* Department Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter department description (optional)"
                placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* Icon Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Icon</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowIconPicker(true)}
              >
                <View style={styles.pickerTriggerContent}>
                  <Text style={styles.selectedIcon}>{formData.icon}</Text>
                  <View style={styles.pickerTriggerInfo}>
                    <Text style={styles.pickerTriggerLabel}>Select Icon</Text>
                    <Text style={styles.pickerTriggerDescription}>
                      Choose an icon that represents this department
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              </TouchableOpacity>
            </View>

            {/* Color Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowColorPicker(true)}
              >
                <View style={styles.pickerTriggerContent}>
                  <View 
                    style={[styles.colorPreview, { backgroundColor: formData.color }]} 
                  />
                  <View style={styles.pickerTriggerInfo}>
                    <Text style={styles.pickerTriggerLabel}>Select Color</Text>
                    <Text style={styles.pickerTriggerDescription}>
                      Choose a color for this department
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
                !formData.name.trim() && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Create Department
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Pickers */}
          {showIconPicker && <IconPickerModal />}
          {showColorPicker && <ColorPickerModal />}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  section: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 16,
  },
  // Department Preview
  departmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  previewIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Form Inputs
  textInput: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Picker Styles
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
  },
  pickerTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
  },
  pickerTriggerInfo: {
    flex: 1,
  },
  pickerTriggerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  pickerTriggerDescription: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  // Picker Modals
  pickerModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  // Icon Grid
  iconScrollView: {
    maxHeight: 300,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  iconOption: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: isDarkMode ? "#3730a3" : "#e0e7ff",
    transform: [{ scale: 1.1 }],
  },
  iconText: {
    fontSize: 24,
  },
  // Color Grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#ffffff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ scale: 1.1 }],
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  // Submit Button
  submitButton: {
    backgroundColor: '#6366f1',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});