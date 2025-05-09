import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import { activeLanguage } from '$types/Locales';

export const usePreferencesStore = defineStore('preferences', () => {
	const languageRussian = useLocalStorage<boolean>('languageRussian', false);
	return {
		languageRussian,
		l: () => activeLanguage(languageRussian.value)
	};
});