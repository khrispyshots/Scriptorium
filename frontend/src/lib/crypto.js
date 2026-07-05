// Base64 helper utilities
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64ToUint8Array(base64) {
  return new Uint8Array(base64ToArrayBuffer(base64));
}

function uint8ArrayToBase64(arr) {
  return arrayBufferToBase64(arr.buffer);
}

// Derive AES key from PIN code using PBKDF2-SHA256
async function deriveKeyFromPin(pin, salt) {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt private key using user PIN
export async function encryptPrivateKey(privateKey, pin) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKeyFromPin(pin, salt);
  const encodedData = new TextEncoder().encode(privateKey);
  
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encodedData
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    kdf: 'PBKDF2-SHA256',
    kdfParams: {
      iterations: 600000,
      hash: 'SHA-256'
    },
    algorithm: 'AES-256-GCM'
  };
}

// Decrypt private key using user PIN
export async function decryptPrivateKey(ciphertext, salt, iv, pin) {
  const saltBytes = base64ToUint8Array(salt);
  const ivBytes = base64ToUint8Array(iv);
  const key = await deriveKeyFromPin(pin, saltBytes);
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    key,
    ciphertextBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}
