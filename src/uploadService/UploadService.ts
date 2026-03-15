// src/services/UploadService.ts - UPDATED with TokenUtils
import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

const API_URL = `${API_BASE_URL}/api/uploads`;

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    avatarUrl?: string;
    photoUrl?: string;
    user?: any;
    assignment?: any;
    group?: any;
  };
}

export class UploadService {
  
  // ========== UPLOAD AVATAR FROM FILE ==========
  static async uploadAvatar(fileUri: string): Promise<UploadResponse> {
    try {
      console.log('📤 Uploading avatar from URI:', fileUri);
      
      // ✅ Use TokenUtils.getAccessToken()
      const token = await TokenUtils.getAccessToken();
      const formData = new FormData();
      
      const filename = fileUri.split('/').pop() || 'avatar.jpg';
      
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
      
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: filename,
      } as any);

      formData.append('uploadType', 'avatar');

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('📦 Sending request to:', `${API_URL}/avatar`);
      
      const response = await fetch(`${API_URL}/avatar`, {
        method: 'POST',
        headers,
        body: formData,
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

  // ========== UPLOAD AVATAR FROM BASE64 ==========
  static async uploadAvatarBase64(base64Image: string): Promise<UploadResponse> {
    try {
      console.log('📤 Uploading avatar from base64');
      
      let processedBase64 = base64Image;
      if (!base64Image.startsWith('data:')) {
        processedBase64 = `data:image/jpeg;base64,${base64Image}`;
      }

      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();

      const response = await fetch(`${API_URL}/avatar/base64`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ avatarBase64: processedBase64 }),
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

  // ========== UPLOAD TASK PHOTO ==========
  static async uploadTaskPhoto(taskId: string, fileUri: string): Promise<UploadResponse> {
    try {
      console.log('📤 Uploading task photo for task:', taskId);
      
      // ✅ Use TokenUtils.getAccessToken()
      const token = await TokenUtils.getAccessToken();
      const formData = new FormData();
      
      const filename = fileUri.split('/').pop() || 'task-photo.jpg';
      
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

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/task/${taskId}/photo`, {
        method: 'POST',
        headers,
        body: formData,
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

  // ========== DELETE AVATAR ==========
  static async deleteAvatar(): Promise<UploadResponse> {
    try {
      console.log('🗑️ Deleting avatar');
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/avatar`, {
        method: 'DELETE',
        headers,
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

  // ========== UPLOAD GROUP AVATAR FROM BASE64 ==========
  static async uploadGroupAvatarBase64(groupId: string, base64Image: string): Promise<UploadResponse> {
    try {
      console.log('📤 Uploading group avatar from base64 for group:', groupId);
      
      let processedBase64 = base64Image;
      if (!base64Image.startsWith('data:')) {
        processedBase64 = `data:image/jpeg;base64,${base64Image}`;
      }

      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();

      const response = await fetch(`${API_URL}/group/${groupId}/avatar/base64`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ avatarBase64: processedBase64 }),
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

  // ========== UPLOAD GROUP AVATAR FROM FILE ==========
  static async uploadGroupAvatar(groupId: string, fileUri: string): Promise<UploadResponse> {
    try {
      console.log('📤 Uploading group avatar for group:', groupId);
      
      // ✅ Use TokenUtils.getAccessToken()
      const token = await TokenUtils.getAccessToken();
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

      formData.append('uploadType', 'group_avatar');

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/group/${groupId}/avatar`, {
        method: 'POST',
        headers,
        body: formData,
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

  // ========== DELETE GROUP AVATAR ==========
  static async deleteGroupAvatar(groupId: string): Promise<UploadResponse> {
    try {
      console.log('🗑️ Deleting group avatar for group:', groupId);
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/group/${groupId}/avatar`, {
        method: 'DELETE',
        headers,
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