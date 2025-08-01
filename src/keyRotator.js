class KeyRotator {
  constructor(apiKeys, apiType = 'unknown') {
    this.apiKeys = [...apiKeys];
    this.apiType = apiType;
    this.currentIndex = 0;
    this.failedKeys = new Set();
    console.log(`[${apiType.toUpperCase()}-ROTATOR] Initialized with ${this.apiKeys.length} API keys`);
  }

  getCurrentKey() {
    if (this.allKeysFailed()) {
      console.log(`[${this.apiType.toUpperCase()}-ROTATOR] All keys have failed - no available keys`);
      return null;
    }
    const key = this.apiKeys[this.currentIndex];
    const maskedKey = this.maskApiKey(key);
    console.log(`[${this.apiType.toUpperCase()}::${maskedKey}] Currently active API key (${this.currentIndex + 1}/${this.apiKeys.length})`);
    return key;
  }

  markCurrentKeyAsFailed() {
    const currentKey = this.apiKeys[this.currentIndex];
    const maskedKey = this.maskApiKey(currentKey);
    this.failedKeys.add(currentKey);
    console.log(`[${this.apiType.toUpperCase()}::${maskedKey}] Key marked as failed (${this.failedKeys.size}/${this.apiKeys.length} failed)`);
    this.rotateToNextKey();
  }

  rotateToNextKey() {
    let attempts = 0;
    const maxAttempts = this.apiKeys.length;
    const oldIndex = this.currentIndex;

    do {
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
      attempts++;
      
      if (attempts >= maxAttempts) {
        console.log(`[${this.apiType.toUpperCase()}-ROTATOR] All keys exhausted during rotation`);
        break;
      }
    } while (this.isCurrentKeyFailed());

    if (!this.allKeysFailed()) {
      const newKey = this.maskApiKey(this.apiKeys[this.currentIndex]);
      console.log(`[${this.apiType.toUpperCase()}-ROTATOR] Rotated from index ${oldIndex} to ${this.currentIndex} -> [${this.apiType.toUpperCase()}::${newKey}]`);
    }
  }

  isCurrentKeyFailed() {
    return this.failedKeys.has(this.apiKeys[this.currentIndex]);
  }

  allKeysFailed() {
    return this.failedKeys.size >= this.apiKeys.length;
  }

  resetFailedKeys() {
    const previousFailedCount = this.failedKeys.size;
    this.failedKeys.clear();
    this.currentIndex = 0;
    console.log(`[${this.apiType.toUpperCase()}-ROTATOR] Reset ${previousFailedCount} failed keys, starting fresh`);
  }

  getFailedKeysCount() {
    return this.failedKeys.size;
  }

  getTotalKeysCount() {
    return this.apiKeys.length;
  }

  maskApiKey(key) {
    if (!key || key.length < 8) return '***';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  }
}

module.exports = KeyRotator;