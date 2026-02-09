// src/screens/CompleteAssignmentScreen.tsx - UPDATED WITH YOUR UPLOAD SYSTEM
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UploadService } from '../uploadService/UploadService'; // Your upload service
import { AssignmentService } from '../AssignmentServices/AssignmentService'; // New assignment service

export default function CompleteAssignmentScreen({ navigation, route }: any) {
  const { assignmentId, taskTitle, dueDate } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null); // Store uploaded URL
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{notes?: string}>({});

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload proof.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
        setPhotoUrl(null); // Reset uploaded URL when new photo is selected
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
        setPhotoUrl(null); // Reset uploaded URL when new photo is selected
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Use your existing UploadService
      const result = await UploadService.uploadTaskPhoto(assignmentId, uri); // Use assignmentId as taskId
      
      if (result.success && result.data?.photoUrl) {
        return result.data.photoUrl;
      } else {
        throw new Error(result.message || 'Failed to upload photo');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    const newErrors: {notes?: string} = {};
    
    if (notes.length > 500) {
      newErrors.notes = 'Notes must be less than 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      let finalPhotoUrl = photoUrl;
      
      // If we have a new photo URI but no uploaded URL yet, upload it
      if (photoUri && !photoUrl) {
        finalPhotoUrl = await uploadImage(photoUri);
        if (!finalPhotoUrl) {
          throw new Error('Failed to upload photo');
        }
        setPhotoUrl(finalPhotoUrl);
      }

      // Call AssignmentService to complete the assignment
      const result = await AssignmentService.completeAssignment(assignmentId, {
        photoUrl: finalPhotoUrl || undefined,
        notes: notes.trim() || undefined
      });

      if (result.success) {
        Alert.alert(
          'Success',
          'Task completed successfully! Waiting for admin verification.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
                if (route.params?.onCompleted) {
                  route.params.onCompleted();
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to complete task');
      }
    } catch (error: any) {
      console.error('Error completing assignment:', error);
      Alert.alert('Error', error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Remove photo handler
  const removePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPhotoUri(null);
            setPhotoUrl(null);
          }
        }
      ]
    );
  };

  // Preview existing photo (if already uploaded)
  const previewPhoto = async () => {
    if (photoUrl) {
      // You can use Linking to open the URL or show in a modal
      Alert.alert('Photo URL', photoUrl);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Complete Task</Text>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.taskTitle}>{taskTitle}</Text>
          {dueDate && (
            <Text style={styles.dueDate}>
              Due: {new Date(dueDate).toLocaleDateString()}
            </Text>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Upload Proof (Optional)
            </Text>
            <Text style={styles.sectionSubtitle}>
              Take a photo or upload from gallery to show task completion
            </Text>

            {(photoUri || photoUrl) ? (
              <View style={styles.photoPreview}>
                <TouchableOpacity onPress={previewPhoto}>
                  <Image 
                    source={{ uri: photoUri || photoUrl || '' }} 
                    style={styles.photo} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={removePhoto}
                >
                  <MaterialCommunityIcons name="close-circle" size={24} color="#fa5252" />
                </TouchableOpacity>
                {photoUrl && (
                  <Text style={styles.uploadedText}>✓ Photo uploaded successfully</Text>
                )}
              </View>
            ) : (
              <View style={styles.photoOptions}>
                <TouchableOpacity
                  style={styles.photoOption}
                  onPress={takePhoto}
                >
                  <MaterialCommunityIcons name="camera" size={32} color="#007AFF" />
                  <Text style={styles.photoOptionText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoOption}
                  onPress={pickImage}
                >
                  <MaterialCommunityIcons name="image" size={32} color="#007AFF" />
                  <Text style={styles.photoOptionText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Notes (Optional)
            </Text>
            <Text style={styles.sectionSubtitle}>
              Add any additional information about task completion
            </Text>

            <TextInput
              style={[styles.notesInput, errors.notes && styles.inputError]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter any notes about the task completion..."
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            {errors.notes && (
              <Text style={styles.errorText}>{errors.notes}</Text>
            )}
            <Text style={styles.charCount}>
              {notes.length}/500 characters
            </Text>
          </View>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={20} color="#6c757d" />
            <Text style={styles.infoText}>
              After submission, an admin will verify your completion before points are awarded.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (loading || uploading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || uploading}
          >
            {(loading || uploading) ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-circle" size={20} color="white" />
                <Text style={styles.submitButtonText}>
                  Mark as Complete
                </Text>
              </>
            )}
          </TouchableOpacity>

          {uploading && (
            <Text style={styles.uploadingText}>Uploading photo...</Text>
          )}
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF'
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
  },
  headerSpacer: {
    width: 40
  },
  content: {
    flex: 1,
    padding: 16
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8
  },
  dueDate: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16
  },
  photoOption: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e7f5ff',
    borderRadius: 12,
    width: '45%'
  },
  photoOptionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#1864ab',
    textAlign: 'center'
  },
  photoPreview: {
    position: 'relative',
    marginVertical: 16,
    alignItems: 'center'
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4
  },
  uploadedText: {
    marginTop: 8,
    color: '#2b8a3e',
    fontSize: 14
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top'
  },
  inputError: {
    borderColor: '#fa5252'
  },
  errorText: {
    color: '#fa5252',
    fontSize: 14,
    marginTop: 4
  },
  charCount: {
    textAlign: 'right',
    color: '#868e96',
    fontSize: 12,
    marginTop: 4
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 12
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6c757d', 
    lineHeight: 20
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2b8a3e',
    padding: 16,
    borderRadius: 8
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  uploadingText: {
    textAlign: 'center', 
    color: '#868e96',
    marginTop: 8
  }
});