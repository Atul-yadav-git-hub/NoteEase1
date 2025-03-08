interface TagBackground {
  all: string;
  personal: string;
  work: string;
  family: string;
  [key: string]: string;
}

export const lightTheme = {
  background: '#FFFFFF',
  text: '#000000',
  primary: '#3B51F0',
  secondary: '#E8E8E8',
  accent: '#FF9500',
  border: '#E0E0E0',
  card: '#FFFFFF',
  error: '#FF3B30',
  success: '#34C759',
  cardText: '#757575',
  tagBackground: {
    all: '#3B51F0',
    personal: '#FF9500',
    work: '#8B5CF6',
    family: '#EF4444'
  } as TagBackground,
  getTagColor: function(category: string) {
    if (this.tagBackground[category]) {
      return this.tagBackground[category];
    }
    // Generate a consistent color based on the category name
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  }
};

export const darkTheme = {
  background: '#1C1C1E',
  text: '#FFFFFF',
  primary: '#5767F1',
  secondary: '#2C2C2E',
  accent: '#FF9F0A',
  border: '#3A3A3C',
  card: '#2C2C2E',
  error: '#FF453A',
  success: '#30D158',
  cardText: '#ABABAB',
  tagBackground: {
    all: '#5767F1',
    personal: '#FF9F0A',
    work: '#A78BFA',
    family: '#F87171'
  } as TagBackground,
  getTagColor: function(category: string) {
    if (this.tagBackground[category]) {
      return this.tagBackground[category];
    }
    // Generate a consistent color based on the category name
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  }
};

export type Theme = typeof lightTheme; 