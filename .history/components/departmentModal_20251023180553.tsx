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
import { departmentService } from '../services/departmentService';
import { Department } from "../types/department";

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

  const handleViewDepartment = (department: Department) => {
    onClose();
    router.push({
      pathname: "/departments/department-details",
      params: { 
        id: department.id,
        name: department.name,
        description: department.description,
        icon: department.icon,
        color: department.color
      }
    });
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
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleSaveEdit}
                  disabled={!editName.trim()}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.departmentInfo}
                onPress={() => handleViewDepartment(item)}
                onLongPress={() => handleEditDepartment(item)}
              >
                <View>
                  <Text style={[styles.departmentName, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.departmentDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
                    {item.description || 'No description available'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={isDarkMode ? "#CBD5E1" : "#475569"} />
              </TouchableOpacity>
              
              <View style={styles.departmentActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEditDepartment(item)}
                >
                  <Ionicons name="create-outline" size={16} color="#3B82F6" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteDepartment(item)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
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
      <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? "#0F172A" : "#F8FAFC" }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View>
            <Text style={[styles.modalTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
              All Departments
            </Text>
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
              {departments.length} department{departments.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.addButton]}
              onPress={() => {
                onClose();
                router.push('/details/create-department');
              }}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: isDarkMode ? "#334155" : "#E2E8F0" }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={isDarkMode ? "#CBD5E1" : "#475569"} />
            </TouchableOpacity>
          </View>
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
              <Ionicons name="business-outline" size={64} color={isDarkMode ? "#334155" : "#CBD5E1"} />
              <Text style={[styles.emptyTitle, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>
                No Departments Found
              </Text>
              <Text style={[styles.emptyDescription, { color: isDarkMode ? "#94A3B8" : "#64748B" }]}>
                {searchQuery ? 'Try a different search term' : 'Create your first department to get started'}
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#E2E8F0",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  headerActions: {
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    alignItems: 'center',
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
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? "#334155" : "#F1F5F9",
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: isDarkMode ? "#1E3A8A" : "#DBEAFE",
  },
  deleteButton: {
    backgroundColor: isDarkMode ? "#7F1D1D" : "#FEE2E2",
  },
  editButtonText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: '600',
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
  editButton: {
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
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