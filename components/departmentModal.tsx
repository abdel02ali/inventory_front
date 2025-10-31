import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from "react-native";
import { Department } from "../app/types/department";
import { departmentService } from '../services/departmentService';

interface DepartmentModalProps {
  visible: boolean;
  onClose: () => void;
  departments: Department[];
  onDepartmentsUpdate: () => void;
}

export default function DepartmentModal({ 
  visible, 
  onClose, 
  departments, 
  onDepartmentsUpdate 
}: DepartmentModalProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteDepartment = (department: Department) => {
    Alert.alert(
      "Delete Department",
      `Are you sure you want to delete "${department.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await departmentService.deleteDepartment(department.id);
              Alert.alert("Success", "Department deleted successfully");
              onDepartmentsUpdate();
            } catch (error) {
              Alert.alert("Error", "Failed to delete department");
              console.error('Error deleting department:', error);
            }
          }
        }
      ]
    );
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setEditName(department.name);
    setEditDescription(department.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingDepartment || !editName.trim()) return;

    try {
      await departmentService.updateDepartment(editingDepartment.id, {
        name: editName.trim(),
        description: editDescription.trim()
      });
      
      Alert.alert("Success", "Department updated successfully");
      setEditingDepartment(null);
      setEditName('');
      setEditDescription('');
      onDepartmentsUpdate();
    } catch (error) {
      Alert.alert("Error", "Failed to update department");
      console.error('Error updating department:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingDepartment(null);
    setEditName('');
    setEditDescription('');
  };

  const renderDepartmentItem = ({ item }: { item: Department }) => (
    <View style={[styles.departmentItem, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}>
      <View style={styles.departmentMain}>
        <View style={[styles.departmentIcon, { backgroundColor: item.color }]}>
          <Text style={styles.departmentEmoji}>{item.icon}</Text>
        </View>
        <View style={styles.departmentContent}>
          {editingDepartment?.id === item.id ? (
            <View style={styles.editForm}>
              <TextInput
                style={[styles.editInput, { 
                  color: isDarkMode ? "#FFFFFF" : "#1E293B",
                  backgroundColor: isDarkMode ? "#334155" : "#F1F5F9"
                }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Department name"
                placeholderTextColor={isDarkMode ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                style={[styles.editInput, styles.editTextArea, { 
                  color: isDarkMode ? "#FFFFFF" : "#1E293B",
                  backgroundColor: isDarkMode ? "#334155" : "#F1F5F9"
                }]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description (optional)"
                placeholderTextColor={isDarkMode ? "#94A3B8" : "#64748B"}
                multiline
                numberOfLines={2}
              />
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSaveEdit}
                  disabled={!editName.trim()}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.departmentInfo}>
                <View style={styles.departmentText}>
                  <Text style={[styles.departmentName, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.departmentDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
                    {item.description || 'No description available'}
                  </Text>
                </View>
                <View style={styles.departmentActions}>
                  <TouchableOpacity 
                    style={[styles.iconButton, styles.editButton]}
                    onPress={() => handleEditDepartment(item)}
                  >
                    <Ionicons name="create-outline" size={18} color="#3B82F6" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.iconButton, styles.deleteButton]}
                    onPress={() => handleDeleteDepartment(item)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const styles = getStyles(isDarkMode);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? "#040811ff" : "#F8FAFC" }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: isDarkMode ? "#334155" : "#E2E8F0" }]}
              onPress={onClose}
            >
              <Ionicons name="chevron-down" size={20} color={isDarkMode ? "#CBD5E1" : "#475569"} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.modalTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
                Departments
              </Text>
              <Text style={[styles.modalSubtitle, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
                {departments.length} department{departments.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: "#3B82F6" }]}
            onPress={() => {
              onClose();
              router.push('/details/create-department');
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF" }]}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#94A3B8" : "#64748B"} />
          <TextInput
            style={[styles.searchInput, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}
            placeholder="Search departments..."
            placeholderTextColor={isDarkMode ? "#64748B" : "#94A3B8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={isDarkMode ? "#94A3B8" : "#64748B"} />
            </TouchableOpacity>
          )}
        </View>

        {/* Departments List */}
        <FlatList
          data={filteredDepartments}
          renderItem={renderDepartmentItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDarkMode ? "#334155" : "#F1F5F9" }]}>
                <Ionicons name="business-outline" size={32} color={isDarkMode ? "#64748B" : "#94A3B8"} />
              </View>
              <Text style={[styles.emptyTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
                No Departments Found
              </Text>
              <Text style={[styles.emptyDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
                {searchQuery ? 'Try a different search term' : 'Create your first department to organize products'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity 
                  style={[styles.emptyButton, { backgroundColor: "#3B82F6" }]}
                  onPress={() => {
                    onClose();
                    router.push('/details/create-department');
                  }}
                >
                  <Text style={styles.emptyButtonText}>Create Department</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#E2E8F0",
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  departmentItem: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#E2E8F0",
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  departmentMain: {
    padding: 16,
  },
  departmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  departmentEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  departmentContent: {
    flex: 1,
  },
  departmentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  departmentText: {
    flex: 1,
    marginRight: 12,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  departmentDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  departmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: isDarkMode ? "#1E3A8A" : "#DBEAFE",
  },
  deleteButton: {
    backgroundColor: isDarkMode ? "#7F1D1D" : "#FEE2E2",
  },
  editForm: {
    gap: 12,
  },
  editInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#CBD5E1",
  },
  editTextArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: isDarkMode ? "#374151" : "#F3F4F6",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  cancelButtonText: {
    color: isDarkMode ? "#D1D5DB" : "#374151",
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});