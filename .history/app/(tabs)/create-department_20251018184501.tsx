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

// Helper function to get random item from array
const getRandomItem = <T,>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

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
  const [existingDepartments, setExistingDepartments] = useState<Department[]>([]);

  const styles = getStyles(isDarkMode);

  // Load existing departments and set random icon/color
  useEffect(() => {
    const loadExistingDepartments = async () => {
      try {
        const departments = await departmentService.getDepartments();
        setExistingDepartments(departments);
        
        // Set random icon and color from all available options
        setFormData(prev => ({
          ...prev,
          icon: getRandomItem(ALL_ICONS),
          color: getRandomItem(ALL_COLORS),
        }));
      } catch (error) {
        console.error('Error loading departments:', error);
        // Still set random values even if loading fails
        setFormData(prev => ({
          ...prev,
          icon: getRandomItem(ALL_ICONS),
          color: getRandomItem(ALL_COLORS),
        }));
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
    // Set form to new random icon and color
    setFormData({
      name: '',
      description: '',
      icon: getRandomItem(ALL_ICONS),
      color: getRandomItem(ALL_COLORS),
    });
  };

  // Function to get a new random combination
  const getRandomCombination = () => {
    setFormData(prev => ({
      ...prev,
      icon: getRandomItem(ALL_ICONS),
      color: getRandomItem(ALL_COLORS),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter department name');
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
        // Reset form automatically with new random values
        resetForm();
        
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback>
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
            {/* Department Preview with Randomize Button */}
            <View style={styles.section}>
              <View style={styles.previewHeader}>
                <Text style={styles.sectionTitle}>Preview</Text>
                <TouchableOpacity 
                  style={styles.randomizeButton}
                  onPress={getRandomCombination}
                >
                  <Ionicons name="shuffle" size={16} color="#6366f1" />
                  <Text style={styles.randomizeButtonText}>Randomize</Text>
                </TouchableOpacity>
              </View>
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
              <Text style={styles.previewNote}>
                Icon and color are automatically selected. Use "Randomize" to change them.
              </Text>
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
  // Preview Header with Randomize Button
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  randomizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  randomizeButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Department Preview
  departmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
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
  previewNote: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontStyle: 'italic',
    textAlign: 'center',
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