// Enhanced Local Storage System for Journal Entries (unchanged API for backend compatibility)
export class JournalStorage {
  constructor() {
    this.storageKey = 'murmur-journal-data';
    this.userKey = 'murmur-user-id';
    this.userId = this.getUserId();
    this.initializeStorage();
  }

  getUserId() {
    let userId = localStorage.getItem(this.userKey);
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(this.userKey, userId);
    }
    return userId;
  }

  initializeStorage() {
    const existingData = this.getAllData();
    if (!existingData[this.userId]) {
      existingData[this.userId] = {
        entries: {},
        moods: {},
        settings: {
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
        },
      };
      this.saveAllData(existingData);
    } else {
      existingData[this.userId].settings.lastAccessed = new Date().toISOString();
      this.saveAllData(existingData);
    }
  }

  getAllData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {};
    }
  }

  saveAllData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  getUserData() {
    const allData = this.getAllData();
    return allData[this.userId] || { entries: {}, moods: {}, settings: {} };
  }

  saveJournalEntry(date, entry) {
    const allData = this.getAllData();
    if (!allData[this.userId]) {
      this.initializeStorage();
    }

    const userData = allData[this.userId];
    userData.entries[date] = {
      ...entry,
      savedAt: new Date().toISOString(),
      userId: this.userId,
    };

    if (entry.mood) {
      userData.moods[date] = entry.mood;
    }

    userData.settings.lastModified = new Date().toISOString();
    allData[this.userId] = userData;

    return this.saveAllData(allData);
  }

  getJournalEntry(date) {
    const userData = this.getUserData();
    return userData.entries[date] || null;
  }

  getAllJournalEntries() {
    const userData = this.getUserData();
    return userData.entries || {};
  }

  deleteJournalEntry(date) {
    const allData = this.getAllData();
    const userData = allData[this.userId];

    if (userData && userData.entries[date]) {
      delete userData.entries[date];
      if (userData.moods[date]) {
        delete userData.moods[date];
      }
      userData.settings.lastModified = new Date().toISOString();
      allData[this.userId] = userData;
      return this.saveAllData(allData);
    }
    return false;
  }

  saveMoodEntry(date, mood) {
    const allData = this.getAllData();
    const userData = allData[this.userId];

    userData.moods[date] = {
      ...mood,
      savedAt: new Date().toISOString(),
    };

    userData.settings.lastModified = new Date().toISOString();
    allData[this.userId] = userData;

    return this.saveAllData(allData);
  }

  getMoodData() {
    const userData = this.getUserData();
    return userData.moods || {};
  }

  getMoodEntriesInRange(startDate, endDate) {
    const moods = this.getMoodData();
    const result = [];

    for (const [dateStr, mood] of Object.entries(moods)) {
      const date = new Date(dateStr);
      if (date >= startDate && date <= endDate) {
        result.push({
          date: dateStr,
          ...mood,
        });
      }
    }

    return result.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  getJournalEntriesInRange(startDate, endDate) {
    const entries = this.getAllJournalEntries();
    const result = [];

    for (const [dateStr, entry] of Object.entries(entries)) {
      const date = new Date(dateStr);
      if (date >= startDate && date <= endDate) {
        result.push({
          date: dateStr,
          ...entry,
        });
      }
    }

    return result.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  exportUserData() {
    const userData = this.getUserData();
    const exportData = {
      userId: this.userId,
      exportedAt: new Date().toISOString(),
      data: userData,
    };

    return JSON.stringify(exportData, null, 2);
  }

  importUserData(jsonData) {
    try {
      const importData = JSON.parse(jsonData);
      if (importData.data && importData.userId) {
        const allData = this.getAllData();
        allData[this.userId] = {
          ...importData.data,
          settings: {
            ...importData.data.settings,
            importedAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          },
        };
        return this.saveAllData(allData);
      }
      return false;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  getStorageStats() {
    const userData = this.getUserData();
    const entries = userData.entries || {};
    const moods = userData.moods || {};

    return {
      userId: this.userId,
      totalEntries: Object.keys(entries).length,
      totalMoods: Object.keys(moods).length,
      createdAt: userData.settings?.createdAt,
      lastModified: userData.settings?.lastModified,
      lastAccessed: userData.settings?.lastAccessed,
      storageSize: this.getStorageSize(),
    };
  }

  getStorageSize() {
    const data = localStorage.getItem(this.storageKey);
    return data ? new Blob([data]).size : 0;
  }

  clearUserData() {
    const allData = this.getAllData();
    if (allData[this.userId]) {
      delete allData[this.userId];
      return this.saveAllData(allData);
    }
    return true;
  }

  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  getAvailableStorage() {
    if (!this.isStorageAvailable()) return 0;

    let used = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        used += localStorage[key].length + key.length;
      }
    }

    const estimatedLimit = 5 * 1024 * 1024;
    return Math.max(0, estimatedLimit - used);
  }
}
