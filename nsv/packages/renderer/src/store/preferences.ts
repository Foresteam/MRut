import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import { activeLanguage } from '$types/Locales';
import { computed, ref, watch } from 'vue';

export const usePreferencesStore = defineStore('preferences', () => {
	const _config = ref(window.backend.getConfig());
	const getConfig = () => _config.value.then(config => Object.freeze(config));

	const _languageRussian = ref(false);
	watch(_config, config => config.then(({ language }) => _languageRussian.value = language === 'ru'), { immediate: true });
	const languageRussian = computed({
		get: () => _languageRussian.value,
		set: async (russian) => {
			_config.value = window.backend.updateConfig({ language: russian ? 'ru' : 'en' });
		}
	});

	const themeLight = useLocalStorage<boolean>('themeLight', false);
	return {
		languageRussian,
		themeLight,
		l: () => activeLanguage(languageRussian.value)
	};
});