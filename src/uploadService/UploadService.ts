// src/services/UploadService.ts
import { API_BASE_URL } from '../config/api';

const API_URL = `${API_BASE_URL}/api/uploads`;

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    avatarUrl?: string;
    photoUrl?: string;
    user?: any;
    assignment?: any;
  };
}

export class UploadService {
  // Upload avatar from file (Expo Image Picker)
  static async uploadAvatar(fileUri: string): Promise<UploadResponse> {
    try {
      console.log('📤 Uploading avatar from URI:', fileUri);
      
      const formData = new FormData();
      
      // Extract filename from URI
      const filename = fileUri.split('/').pop() || 'avatar.jpg';
      
      // Determine mime type from file extension
      const getMimeType = (uri: string): string => {
        const extension = uri.split('.').pop()?.toLowerCase();
        switch (extension) {
          case 'jpg':
          case 'jpeg':
            return 'image/jpeg';
          case 'png':
            return 'image/png';
          case 'gif':
            return 'image/gif';
          case 'webp':
            return 'image/webp';
          default:
            return 'image/jpeg';
        }
      };

      const mimeType = getMimeType(fileUri);
      
      // Create file object for FormData
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: filename,
      } as any);

      formData.append('uploadType', 'avatar');

      console.log('📦 Sending request to:', `${API_URL}/avatar`);
      
      const response = await fetch(`${API_URL}/avatar`, {
        method: 'POST',
        headers: {
          // Don't set Content-Type - let FormData set it automatically
        },
        body: formData,
        credentials: 'include', // Important for cookies/sessions
      });

      const result = await response.json();
      console.log('📥 Upload response:', result);
      
      return result;

    } catch (error: any) {
      console.error('❌ Avatar upload error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload avatar'
      };
    }
  }

  // Upload avatar from base64 (for camera or direct capture)
   static async uploadAvatarBase64(base64Image: string): Promise<UploadResponse> {
    try {
      console.log('📤 Uploading avatar from base64');
       
      // Ensure base64 string has the proper format
      let processedBase64 = base64Image;
      if (!base64Image.startsWith('data:')) {
        processedBase64 = `data:image/jpeg;base64,${base64Image}`;
      }

      const response = await fetch(`${API_URL}/avatar/base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarBase64: processedBase64 }),
        credentials: 'include',
      });

      const result = await response.json();
      console.log('📥 Base64 upload response:', result);
      
      return result;

    } catch (error: any) {
      console.error('❌ Base64 avatar upload error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload avatar'
      };
    }
  }

  // Upload task photo
  static async uploadTaskPhoto(taskId: string, fileUri: string): Promise<UploadResponse> {
    try {
      console.log('📤 Uploading task photo for task:', taskId);
      
      const formData = new FormData();
      
      const filename = fileUri.split('/').pop() || 'task-photo.jpg';
      
      // Determine mime type
      const getMimeType = (uri: string): string => {
        const extension = uri.split('.').pop()?.toLowerCase();
        return extension === 'png' ? 'image/png' : 'image/jpeg';
      };

      const mimeType = getMimeType(fileUri);
      
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: filename,
      } as any);

      formData.append('uploadType', 'task_photo');

      const response = await fetch(`${API_URL}/task/${taskId}/photo`, {
        method: 'POST',
        headers: {
          // Don't set Content-Type
        },
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();
      console.log('📥 Task photo upload response:', result);
      
      return result;

    } catch (error: any) {
      console.error('❌ Task photo upload error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload task photo'
      };
    }
  }

  // Delete avatar
  static async deleteAvatar(): Promise<UploadResponse> {
    try {
      console.log('🗑️ Deleting avatar');
      
      const response = await fetch(`${API_URL}/avatar`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();
      console.log('📥 Delete avatar response:', result);
      
      return result;

    } catch (error: any) {
      console.error('❌ Delete avatar error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete avatar'
      };
    }
  }

  

// Upload group avatar from base64
static async uploadGroupAvatarBase64(groupId: string, base64Image: string): Promise<UploadResponse> {
  try {
    console.log('📤 Uploading group avatar from base64 for group:', groupId);
    
    let processedBase64 = base64Image;
    if (!base64Image.startsWith('data:')) {
      processedBase64 = `data:image/jpeg;base64,${base64Image}`;
    }

    const response = await fetch(`${API_URL}/group/${groupId}/avatar/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ avatarBase64: processedBase64 }),
      credentials: 'include',
    });

    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('❌ Base64 group avatar upload error:', error);
    return {
      success: false,
      message: error.message || 'Failed to upload group avatar'
    };
  }
}

static async uploadGroupAvatar(groupId: string, fileUri: string): Promise<UploadResponse> {
  try {
    console.log('📤 Uploading group avatar for group:', groupId);
    
    const formData = new FormData();
    
    const filename = fileUri.split('/').pop() || 'group-avatar.jpg';
    
    const getMimeType = (uri: string): string => {
      const extension = uri.split('.').pop()?.toLowerCase();
      return extension === 'png' ? 'image/png' : 'image/jpeg';
    };

    const mimeType = getMimeType(fileUri);
    
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: filename,
    } as any);

    formData.append('uploadType', 'group_avatar'); // Changed from 'avatar'

    const response = await fetch(`${API_URL}/group/${groupId}/avatar`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('❌ Group avatar upload error:', error);
    return {
      success: false,
      message: error.message || 'Failed to upload group avatar'
    };
  }
}

// Add deleteGroupAvatar method
static async deleteGroupAvatar(groupId: string): Promise<UploadResponse> {
  try {
    console.log('🗑️ Deleting group avatar for group:', groupId);
    
    const response = await fetch(`${API_URL}/group/${groupId}/avatar`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const result = await response.json();
    console.log('📥 Delete group avatar response:', result);
    
    return result;

  } catch (error: any) {
    console.error('❌ Delete group avatar error:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete group avatar'
    };
  }
}


}