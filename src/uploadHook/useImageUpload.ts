// src/hooks/useImageUpload.ts
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { UploadService } from '../uploadService/UploadService';

interface UseImageUploadProps {
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

export const useImageUpload = ({ onSuccess, onError }: UseImageUploadProps = {}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Request permissions
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return true;
    }

    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Sorry, we need camera and gallery permissions to upload images.'
      );
      return false;
    }

    return true;
  };

  // Pick image from gallery
  const pickImageFromGallery = async (options: ImagePicker.ImagePickerOptions = {}) => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0];
      }

      return null;
    } catch (error: any) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
      return null;
    }
  };

  // Take photo with camera
  const takePhotoWithCamera = async (options: ImagePicker.ImagePickerOptions = {}) => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0];
      }

      return null;
    } catch (error: any) {
      console.error('❌ Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
      return null;
    }
  };

  // Upload avatar from image picker result
  const uploadAvatarFromPicker = async (image: ImagePicker.ImagePickerAsset) => {
    try {
      setUploading(true);
      setProgress(0);

      let result;
      
      // Use base64 for smaller images or file upload for larger ones
      if (image.base64 && image.base64.length < 2000000) { // 2MB limit for base64
        console.log('📤 Using base64 upload (small image)');
        result = await UploadService.uploadAvatarBase64(image.base64);
      } else {
        console.log('📤 Using file upload (larger image)');
        result = await UploadService.uploadAvatar(image.uri);
      }

      setProgress(100);

      if (result.success) {
        onSuccess?.(result);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      onError?.(error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image');
      return { success: false, message: error.message };
    } finally {
      setUploading(false);
    }
  };

  // Upload task photo
  const uploadTaskPhoto = async (taskId: string, imageUri: string) => {
    try {
      setUploading(true);
      setProgress(0);

      const result = await UploadService.uploadTaskPhoto(taskId, imageUri);
      
      setProgress(100);

      if (result.success) {
        onSuccess?.(result);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('❌ Task photo upload error:', error);
      onError?.(error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload task photo');
      return { success: false, message: error.message };
    } finally {
      setUploading(false);
    }
  };

  // Delete avatar
  const deleteAvatar = async () => {
    try {
      setUploading(true);
      
      const result = await UploadService.deleteAvatar();

      if (result.success) {
        onSuccess?.(result);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('❌ Delete avatar error:', error);
      onError?.(error);
      Alert.alert('Delete Failed', error.message || 'Failed to delete avatar');
      return { success: false, message: error.message };
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    progress,
    pickImageFromGallery,
    takePhotoWithCamera,
    uploadAvatarFromPicker,
    uploadTaskPhoto,
    deleteAvatar,
    requestPermissions,
  };
};