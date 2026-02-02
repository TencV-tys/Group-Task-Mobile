// src/screens/CreateTaskScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useCreateTask } from '../taskHook/useCreateTask';

export default function CreateTaskScreen({ navigation, route }: any) {
  const { groupId, groupName } = route.params || {};
  const { loading, error, success, createTask, reset } = useCreateTask();

  const [form, setForm] = useState({
    title: '',
    description: '',
    points: '1',
    frequency: 'ONCE',
    category: ''
  });

  const handleSubmit = async () => {
    if (!groupId) {
      Alert.alert('Error', 'Group ID is missing');
      return;
    }

    if (!form.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const points = parseInt(form.points, 10);
    if (isNaN(points) || points < 1) {
      Alert.alert('Error', 'Points must be at least 1');
      return;
    }

    const result = await createTask(groupId, {
      title: form.title,
      description: form.description || undefined,
      points: points,
      frequency: form.frequency,
      category: form.category || undefined
    });

    if (result.success) {
      Alert.alert(
        'Success!',
        'Task created successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              reset();
              setForm({
                title: '',
                description: '',
                points: '1',
                frequency: 'ONCE',
                category: ''
              });
              // Navigate back or to task list
              if (route.params?.onTaskCreated) {
                route.params.onTaskCreated(result.task);
              }
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Task</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {groupName && (
          <View style={styles.groupInfo}>
            <Text style={styles.groupLabel}>Group:</Text>
            <Text style={styles.groupName}>{groupName}</Text>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Task Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              value={form.title}
              onChangeText={(text) => setForm({ ...form, title: text })}
              maxLength={100}
              editable={!loading}
            />
            <Text style={styles.helperText}>
              {form.title.length}/100 characters
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add more details about this task..."
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
              editable={!loading}
            />
            <Text style={styles.helperText}>
              {form.description.length}/500 characters
            </Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Points</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={form.points}
                onChangeText={(text) => setForm({ ...form, points: text })}
                keyboardType="number-pad"
                maxLength={3}
                editable={!loading}
              />
              <Text style={styles.helperText}>Reward points</Text>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Chores, Work, Study"
                value={form.category}
                onChangeText={(text) => setForm({ ...form, category: text })}
                maxLength={50}
                editable={!loading}
              />
              <Text style={styles.helperText}>Optional</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyButtons}>
              {['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    form.frequency === freq && styles.frequencyButtonActive
                  ]}
                  onPress={() => setForm({ ...form, frequency: freq })}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      form.frequency === freq && styles.frequencyButtonTextActive
                    ]}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelButton, loading && styles.buttonDisabled]}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!form.title.trim() || loading) && styles.buttonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!form.title.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Create Task</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Tips</Text>
          <Text style={styles.infoText}>
            • Be specific with task titles{'\n'}
            • Add clear descriptions for better understanding{'\n'}
            • Assign appropriate points based on difficulty{'\n'}
            • Only group admins can create tasks
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 20,
    color: '#495057',
    fontWeight: '300'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
  },
  headerSpacer: {
    width: 36
  },
  content: {
    flex: 1,
    padding: 20
  },
  groupInfo: {
    backgroundColor: '#e7f5ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  groupLabel: {
    fontSize: 12,
    color: '#1864ab',
    marginBottom: 4
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529'
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212529'
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12
  },
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    marginLeft: 4
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  halfWidth: {
    width: '48%'
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  frequencyButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057'
  },
  frequencyButtonTextActive: {
    color: 'white'
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffc9c9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  errorText: {
    color: '#fa5252',
    fontSize: 14
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057'
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center'
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 20
  }
});