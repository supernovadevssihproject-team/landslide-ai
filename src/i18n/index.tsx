import React, { createContext, useContext, useEffect, useState } from 'react';
import enTranslations from './en/common.json';
import hiTranslations from './hi/common.json';

export type AppLanguage = 'en' | 'hi';
export type ChatbotLanguage = 'en' | 'hi' | 'as' | 'bn' | 'brx' | 'ks' | 'mni' | 'lus' | 'ne';

export const APP_LANGUAGE_STORAGE_KEY = 'terraguard_language';
export const CHATBOT_LANGUAGE_STORAGE_KEY = 'terraguard_chatbot_language';
export const CHATBOT_LANGUAGE_EXPLICIT_STORAGE_KEY = 'terraguard_chatbot_language_explicit';

export const appLanguageOptions: Array<{ id: AppLanguage; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
];

export const chatbotLanguageOptions: Array<{ id: ChatbotLanguage; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'as', label: 'অসমীয়া' },
  { id: 'bn', label: 'বাংলা' },
  { id: 'brx', label: 'बड़ो' },
  { id: 'ks', label: 'Khasi' },
  { id: 'mni', label: 'মৈতৈলোন্' },
  { id: 'lus', label: 'Mizo' },
  { id: 'ne', label: 'नेपाली' },
];

const translations = {
  en: enTranslations,
  hi: hiTranslations,
} as const;

const safeRead = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeWrite = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
};

const safeRemove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
};

export const resolveAppLanguage = (): AppLanguage => {
  const saved = safeRead(APP_LANGUAGE_STORAGE_KEY);
  return saved === 'hi' ? 'hi' : 'en';
};

export const resolveChatbotLanguage = (appLanguage: AppLanguage = 'en'): ChatbotLanguage => {
  const saved = safeRead(CHATBOT_LANGUAGE_STORAGE_KEY);
  const valid = ['en', 'hi', 'as', 'bn', 'brx', 'ks', 'mni', 'lus', 'ne'];
  const isExplicit = safeRead(CHATBOT_LANGUAGE_EXPLICIT_STORAGE_KEY) === 'true';
  if (isExplicit) {
    return saved && valid.includes(saved) ? saved as ChatbotLanguage : 'en';
  }
  return appLanguage;
};

export const getTranslationValue = (language: AppLanguage, key: string, fallback?: string): string => {
  const segments = key.split('.');
  let value: unknown = translations[language];

  for (const segment of segments) {
    if (value && typeof value === 'object' && segment in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[segment];
    } else {
      value = undefined;
      break;
    }
  }

  if (typeof value === 'string') {
    return value;
  }

  if (language !== 'en') {
    const englishValue = getTranslationValue('en', key, fallback);
    if (englishValue && englishValue !== key) return englishValue;
  }

  return fallback ?? key;
};

interface I18nContextValue {
  language: AppLanguage;
  setLanguage: React.Dispatch<React.SetStateAction<AppLanguage>>;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<AppLanguage>(resolveAppLanguage);

  useEffect(() => {
    safeWrite(APP_LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: (key: string, fallback?: string) => getTranslationValue(language, key, fallback),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    const fallbackLanguage = resolveAppLanguage();
    return {
      language: fallbackLanguage,
      setLanguage: () => undefined,
      t: (key: string, fallback?: string) => getTranslationValue(fallbackLanguage, key, fallback),
    };
  }
  return context;
};

export const useChatbotLanguage = (appLanguage: AppLanguage = 'en') => {
  const [isExplicit, setIsExplicit] = useState(
    () => safeRead(CHATBOT_LANGUAGE_EXPLICIT_STORAGE_KEY) === 'true'
  );
  const [language, setLanguageState] = useState<ChatbotLanguage>(() => resolveChatbotLanguage(appLanguage));

  useEffect(() => {
    if (!isExplicit) {
      setLanguageState(appLanguage);
    }
  }, [appLanguage, isExplicit]);

  useEffect(() => {
    if (isExplicit) {
      safeWrite(CHATBOT_LANGUAGE_STORAGE_KEY, language);
      safeWrite(CHATBOT_LANGUAGE_EXPLICIT_STORAGE_KEY, 'true');
    } else {
      safeRemove(CHATBOT_LANGUAGE_STORAGE_KEY);
      safeRemove(CHATBOT_LANGUAGE_EXPLICIT_STORAGE_KEY);
    }
  }, [isExplicit, language]);

  const setLanguage: React.Dispatch<React.SetStateAction<ChatbotLanguage>> = (nextLanguage) => {
    setIsExplicit(true);
    setLanguageState(nextLanguage);
  };

  return { language, isExplicit, setLanguage };
};

export type TranslationKey = keyof typeof enTranslations;
