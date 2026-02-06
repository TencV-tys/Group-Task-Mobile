// src/components/AvatarPicker.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface AvatarPickerProps {
  avatarImage: string | null;
  onAvatarSelect: (base64Image: string) => void;
  onAvatarRemove: () => void;
  uploading?: boolean;
  size?: number;
  editable?: boolean;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  avatarImage,
  onAvatarSelect,
  onAvatarRemove,
  uploading = false,
  size = 120,
  editable = true
}) => {
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' && libraryStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need camera and gallery permissions to upload photos.'
      );
      return false;
    }
    return true;
  };

  const handleAvatarPress = () => {
    if (!editable) return;

    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handleChoosePhoto },
        avatarImage && { 
          text: 'Remove Photo', 
          style: 'destructive', 
          onPress: handleRemovePhoto 
        },
      ].filter(Boolean) as any
    );
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      onAvatarSelect(base64Image);
    }
  };

  const handleChoosePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      onAvatarSelect(base64Image);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onAvatarRemove }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleAvatarPress}
        disabled={!editable || uploading}
        style={[
          styles.avatarButton,
          { width: size, height: size, borderRadius: size / 2 }
        ]}
      >
        {uploading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Uploading...</Text>
          </View>
        ) : avatarImage ? (
          <Image
            source={{ uri: avatarImage }}
            style={[
              styles.avatarImage,
              { width: size, height: size, borderRadius: size / 2 }
            ]}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <MaterialCommunityIcons 
              name="camera-plus" 
              size={size * 0.3} 
              color="#666" 
            />
            <Text style={styles.placeholderText}>
              Add Photo
            </Text>
          </View>
        )}

        {editable && !uploading && (
          <View style={styles.editIcon}>
            <MaterialCommunityIcons 
              name="pencil" 
              size={16} 
              color="white" 
            />
          </View>
        )}
      </TouchableOpacity>

      {avatarImage && editable && !uploading && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemovePhoto}
        >
          <MaterialCommunityIcons name="close" size={18} color="#FF3B30" />
        </TouchableOpacity>
      )}

      <Text style={styles.helperText}>
        Optional - You can add it later
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  avatarImage: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  editIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#007AFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: '35%',
    backgroundColor: 'white',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
    fontStyle: 'italic',
  },
});