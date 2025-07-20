import { toast } from "sonner";

/**
 * Secure API Key Manager
 * Encrypts keys before storage and decrypts them only in memory
 */
class SecureKeyManager {
  private static instance: SecureKeyManager;
  private encryptionKey: CryptoKey | null = null;
  private decryptedKeys: Map<string, string> = new Map();
  private readonly STORAGE_PREFIX = 'opencut_encrypted_';
  private readonly KEY_DERIVATION_SALT = 'OpenCut_Key_Salt_v1';

  private constructor() {}

  static getInstance(): SecureKeyManager {
    if (!SecureKeyManager.instance) {
      SecureKeyManager.instance = new SecureKeyManager();
    }
    return SecureKeyManager.instance;
  }

  /**
   * Initialize the encryption system
   */
  async initialize(): Promise<void> {
    try {
      // Generate or retrieve encryption key
      await this.generateEncryptionKey();
      
      // Clear any existing decrypted keys on initialization
      this.decryptedKeys.clear();
      
      console.log('SecureKeyManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SecureKeyManager:', error);
      throw new Error('Security initialization failed');
    }
  }

  /**
   * Generate or retrieve encryption key from secure storage
   */
  private async generateEncryptionKey(): Promise<void> {
    try {
      // For client-side, we'll use a key derived from a combination of factors
      // In a production environment, you might want to use hardware security modules
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.KEY_DERIVATION_SALT + navigator.userAgent.slice(0, 50)),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('OpenCut_Salt_2025'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      throw error;
    }
  }

  /**
   * Encrypt data using AES-GCM
   */
  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        dataBuffer
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-GCM
   */
  private async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Store API key securely
   */
  async storeApiKey(keyName: string, apiKey: string): Promise<void> {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key cannot be empty');
    }

    try {
      console.log('Starting to store API key securely...');
      
      // Check if encryption key is ready
      if (!this.encryptionKey) {
        console.log('Encryption key not ready, reinitializing...');
        await this.generateEncryptionKey();
      }
      
      // Encrypt the API key
      console.log('Encrypting API key...');
      const encryptedKey = await this.encrypt(apiKey);
      console.log('API key encrypted successfully');
      
      // Store encrypted key in localStorage
      console.log('Storing encrypted key in localStorage...');
      localStorage.setItem(this.STORAGE_PREFIX + keyName, encryptedKey);
      console.log('API key stored in localStorage');
      
      // Store decrypted key in memory for immediate use
      this.decryptedKeys.set(keyName, apiKey);
      
      // Log security event
      this.logSecurityEvent('api_key_stored', keyName);
      
      console.log('API key storage completed successfully');
      // Don't show toast here - let the calling component handle it
    } catch (error) {
      console.error('Failed to store API key:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error; // Re-throw for the calling component to handle
    }
  }

  /**
   * Retrieve API key (decrypted in memory only)
   */
  async getApiKey(keyName: string): Promise<string | null> {
    try {
      // First check if key is already decrypted in memory
      if (this.decryptedKeys.has(keyName)) {
        return this.decryptedKeys.get(keyName)!;
      }

      // Retrieve encrypted key from storage
      const encryptedKey = localStorage.getItem(this.STORAGE_PREFIX + keyName);
      if (!encryptedKey) {
        return null;
      }

      // Decrypt the key
      const decryptedKey = await this.decrypt(encryptedKey);
      
      // Store in memory for future use during this session
      this.decryptedKeys.set(keyName, decryptedKey);
      
      // Log security event
      this.logSecurityEvent('api_key_accessed', keyName);
      
      return decryptedKey;
    } catch (error) {
      console.error('Failed to retrieve API key:', error);
      // Remove corrupted key
      localStorage.removeItem(this.STORAGE_PREFIX + keyName);
      toast.error('API key corrupted, please re-enter');
      return null;
    }
  }

  /**
   * Check if API key exists
   */
  hasApiKey(keyName: string): boolean {
    return localStorage.getItem(this.STORAGE_PREFIX + keyName) !== null;
  }

  /**
   * Remove API key
   */
  async removeApiKey(keyName: string): Promise<void> {
    try {
      // Remove from storage
      localStorage.removeItem(this.STORAGE_PREFIX + keyName);
      
      // Remove from memory
      this.decryptedKeys.delete(keyName);
      
      // Log security event
      this.logSecurityEvent('api_key_removed', keyName);
      
      toast.success('API key removed');
    } catch (error) {
      console.error('Failed to remove API key:', error);
      toast.error('Failed to remove API key');
    }
  }

  /**
   * Clear all keys and reset
   */
  async clearAllKeys(): Promise<void> {
    try {
      // Clear memory
      this.decryptedKeys.clear();
      
      // Clear storage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      
      // Log security event
      this.logSecurityEvent('all_keys_cleared', 'system');
      
      toast.success('All API keys cleared');
    } catch (error) {
      console.error('Failed to clear keys:', error);
      toast.error('Failed to clear keys');
    }
  }

  /**
   * Validate API key format (basic validation)
   */
  validateApiKey(apiKey: string, keyType: 'google-ai' | 'openai' | 'anthropic' = 'google-ai'): boolean {
    if (!apiKey || apiKey.trim() === '') {
      return false;
    }

    // Basic format validation based on key type
    const trimmedKey = apiKey.trim();
    
    switch (keyType) {
      case 'google-ai':
        // Google AI Studio API keys can have various formats:
        // - AIzaSy... (most common format)
        // - Can be 39+ characters long
        // - Usually starts with AIzaSy but can have other patterns
        return trimmedKey.length >= 20 && 
               /^[A-Za-z0-9_-]+$/.test(trimmedKey) && 
               (trimmedKey.startsWith('AIzaSy') || 
                trimmedKey.startsWith('AI') || 
                trimmedKey.length >= 30); // Fallback for other formats
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 40;
      case 'anthropic':
        return apiKey.startsWith('sk-ant-') && apiKey.length > 40;
      default:
        return apiKey.length > 10;
    }
  }

  /**
   * Log security events for monitoring
   */
  private logSecurityEvent(event: string, keyName: string): void {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      event,
      keyName,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId()
    };

    // Store in a separate security log
    const logs = this.getSecurityLogs();
    logs.push(securityEvent);
    
    // Keep only last 100 events
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem('opencut_security_logs', JSON.stringify(logs));
    
    // In production, you might want to send this to your security monitoring service
    console.log('Security Event:', securityEvent);
  }

  /**
   * Get security logs for monitoring
   */
  getSecurityLogs(): any[] {
    try {
      const logs = localStorage.getItem('opencut_security_logs');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('opencut_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('opencut_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Clean up - clear all decrypted keys from memory
   */
  cleanup(): void {
    this.decryptedKeys.clear();
    console.log('SecureKeyManager cleaned up');
  }
}

export const secureKeyManager = SecureKeyManager.getInstance();
export { SecureKeyManager };
