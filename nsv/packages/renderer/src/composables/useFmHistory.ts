import { Commands, fileSchema, IFile } from '$types/Common';
import { useGeneralStore } from '@/store/general';
import { computed, Ref, ref } from 'vue';
import { z } from 'zod';

export interface FmCore {
	path: Ref<string>;
	loading: Ref<boolean>;
	files: Ref<IFile[]>;
	selectedFiles: Ref<IFile[]>;
}

export const useFmHistory = ({ path, loading, files, selectedFiles }: FmCore) => {
	const history = ref<string[]>([]);
	const historyPointer = ref<number>(0);
	let lastPathSet: string | undefined;

	const store = useGeneralStore();

	const checkPath = (p: string) => {
		if (!p)
			throw new Error('Invalid path');
		if (lastPathSet === p)
			return false;
		return true;
	};
	const gotoPath = async (target: Exclude<typeof store.targetUser, null>, p: string) => {
		loading.value = true;

		path.value = p.replaceAll('\\', '/').replaceAll('//', '/');
		lastPathSet = path.value;
		selectedFiles.value = [];
		const json = (await window.backend.exec(`${'listdir' satisfies keyof Commands} "${path.value}"`, [target.id], true))[target.id];
		files.value = fileSchema.or(z.literal(false)).array().parse(json.map(v => JSON.parse(v))).filter(v => !!v);

		loading.value = false;
	};
	const pushPath = (p: string) => {
		historyPointer.value++;
		history.value[historyPointer.value] = p;
	};

	const clear = () => {
		historyPointer.value = -1;
		history.value = [];
	};

	return {
		push: async (p: string) => {
			const target = store.targetUser;
			if (!target || !checkPath(p))
				return;

			pushPath(p);

			await gotoPath(target, p);
		},
		clear,
		onPathUpdate: (path: string) => lastPathSet = path,
		back: async () => {
			historyPointer.value = Math.max(0, historyPointer.value - 1);
			const p = history.value[historyPointer.value];
			console.log(historyPointer.value, JSON.stringify(history.value));
			if (lastPathSet === p)
				return;

			const target = store.targetUser;
			if (!target || !checkPath(p))
				return;
			lastPathSet = p;
			await gotoPath(target, p);
		},
		forward: async () => {
			historyPointer.value = Math.min(history.value.length - 1, historyPointer.value + 1);
			const p = history.value[historyPointer.value];
			if (lastPathSet === p)
				return;

			const target = store.targetUser;
			if (!target || !checkPath(p))
				return;
			lastPathSet = p;
			await gotoPath(target, p);
		},
		refresh: async () => {
			const target = store.targetUser;
			if (!target || !lastPathSet)
				return;
			await gotoPath(target, lastPathSet);
		},
		init: (path: string) => pushPath(path),
		canGoBack: computed(() => historyPointer.value > 0 && history.value.length > 0),
		canGoForward: computed(() => historyPointer.value < history.value.length - 1)
	};
};