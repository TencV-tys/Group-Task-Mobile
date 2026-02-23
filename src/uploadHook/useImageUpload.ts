// src/hooks/useImageUpload.ts - UPDATED WITH TOKEN CHECK
import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { UploadService } from '../uploadService/UploadService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UseImageUploadProps {
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

export const useImageUpload = ({ onSuccess, onError }: UseImageUploadProps = {}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [authError, setAuthError] = useState(false);

  // Check token before making requests
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('useImageUpload: No auth token available');
        setAuthError(true);
        Alert.alert('Authentication Error', 'Please log in again');
        return false;
      }
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('useImageUpload: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

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
      const hasToken = await checkToken();
      if (!hasToken) {
        return { success: false, message: 'Authentication required' };
      }

      setUploading(true);
      setProgress(0);
      setAuthError(false);

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
      const hasToken = await checkToken();
      if (!hasToken) {
        return { success: false, message: 'Authentication required' };
      }

      setUploading(true);
      setProgress(0);
      setAuthError(false);

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
      const hasToken = await checkToken();
      if (!hasToken) {
        return { success: false, message: 'Authentication required' };
      }

      setUploading(true);
      setAuthError(false);
      
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

  // Upload group avatar
  const uploadGroupAvatar = async (groupId: string, image: ImagePicker.ImagePickerAsset) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) {
        return { success: false, message: 'Authentication required' };
      }

      setUploading(true);
      setProgress(0);
      setAuthError(false);

      let result;
      
      // Use base64 for smaller images or file upload for larger ones
      if (image.base64 && image.base64.length < 2000000) {
        console.log('📤 Using base64 upload for group avatar');
        result = await UploadService.uploadGroupAvatarBase64(groupId, image.base64);
      } else {
        console.log('📤 Using file upload for group avatar');
        result = await UploadService.uploadGroupAvatar(groupId, image.uri);
      }

      setProgress(100);

      if (result.success) {
        onSuccess?.(result);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('❌ Group avatar upload error:', error);
      onError?.(error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload group avatar');
      return { success: false, message: error.message };
    } finally {
      setUploading(false);
    }
  };

  // Delete group avatar
  const deleteGroupAvatar = async (groupId: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) {
        return { success: false, message: 'Authentication required' };
      }

      setUploading(true);
      setAuthError(false);
      
      const result = await UploadService.deleteGroupAvatar(groupId);

      if (result.success) {
        onSuccess?.(result);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('❌ Delete group avatar error:', error);
      onError?.(error);
      Alert.alert('Delete Failed', error.message || 'Failed to delete group avatar');
      return { success: false, message: error.message };
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    progress,
    authError,
    pickImageFromGallery,
    takePhotoWithCamera,
    uploadAvatarFromPicker,
    uploadTaskPhoto,
    deleteAvatar,
    requestPermissions,
    uploadGroupAvatar,
    deleteGroupAvatar
  };
};