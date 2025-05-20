<script lang="ts" setup>
import '@/assets/common-styles.css';
import PListbox from 'primevue/listbox';
import PContextMenu from 'primevue/contextmenu';
import PBtn from 'primevue/button';
import PBtnToggle from 'primevue/togglebutton';
import PInputText from 'primevue/inputtext';
import UsersDropdown from '@/components/UsersDropdown.vue';
import InputDialog from '@/components/InputDialog.vue';
import { ComponentPublicInstance, computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { Commands, deviceSchema, fileSchema, placeSchema, type IDevice, type IFile, type IPlace } from '$types/Common';
import type { MenuItem } from 'primevue/menuitem';
import { useGeneralStore } from '@/store/general';
import * as _ from 'lodash';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { usePreferencesStore } from '@/store/preferences';
import { useFmHistory } from '@/composables/useFmHistory';
import nodePath from 'path-browserify-esm';
import useFsEchosCollector from '@/composables/useFsEchosCollector';
const { join, basename } = nodePath;

const toast = useToast();
const confirm = useConfirm();
const store = useGeneralStore();
const { l } = usePreferencesStore();
const { targetUser } = storeToRefs(store);
const loading = ref(false);

const filesCtxMenu = ref<ComponentPublicInstance<InstanceType<typeof PContextMenu>>>();
const filesRenameDialog = ref<ComponentPublicInstance<InstanceType<typeof InputDialog>>>();
const newFileDialog = ref<ComponentPublicInstance<InstanceType<typeof InputDialog>>>();
const newFolderDialog = ref<ComponentPublicInstance<InstanceType<typeof InputDialog>>>();
const moveFilesDialog = ref<ComponentPublicInstance<InstanceType<typeof InputDialog>>>();
const copyFilesDialog = ref<ComponentPublicInstance<InstanceType<typeof InputDialog>>>();

// const selectedUser = null;
const applyForAll = false;

const basePlaces = [
	{ name: 'Home', icon: 'pi-home', path: '' as string | undefined },
	{ name: 'Desktop', icon: 'pi-desktop', path: '' as string | undefined },
	{ name: 'Downloads', icon: 'pi-download', path: '' as string | undefined },
	{ name: 'Documents', icon: ['fi', 'fi-documents'], path: '' as string | undefined },
	{ name: 'Pictures', icon: 'pi-images', path: '' as string | undefined },
	{ name: 'Videos', icon: 'pi-video', path: '' as string | undefined },
] as const;
const selectedFiles = ref<IFile[]>([]);
const path = ref('');
const files = ref<IFile[]>([]);
const places = ref<typeof basePlaces[number][]>([]);
const devices = ref<IDevice[]>([]);
const history = useFmHistory({ path, files, selectedFiles, loading });
const onChangeTarget = async (target: typeof targetUser.value) => {
	history.clear();
	if (!target) {
		path.value = '';
		files.value = [];
		places.value = [];
		devices.value = [];
		selectedFiles.value = [];
		return;
	}

	loading.value = true;

	const [listPlacesResult, listDisksResult] = await Promise.all([
		window.backend.exec('listplaces' satisfies keyof Commands, [target.id], true),
		window.backend.exec('listdisks' satisfies keyof Commands, [target.id], true)
	]);
	const nPlaces: IPlace[] = placeSchema.array().parse(listPlacesResult[target.id].map(v => JSON.parse(v)));
	places.value = _.cloneDeep(basePlaces).map(place => ({ ...place, path: nPlaces.find(nPlace => nPlace.name === place.name)?.path }));
	devices.value = deviceSchema.array().parse(listDisksResult[target.id].map(v => JSON.parse(v))).filter(disk => disk.type === 'Fixed');
	path.value = places.value.find(place => place.name === 'Home')?.path || '';
	history.init(path.value);
	history.onPathUpdate(path.value);
	const _listDirOutput = (await window.backend.exec(`${'listdir' satisfies keyof Commands} "${path.value}"`, [target.id], true))[target.id];
	console.log(_listDirOutput);
	files.value = fileSchema.array().parse(_listDirOutput.map(v => JSON.parse(v)));
	console.log(JSON.parse(JSON.stringify(files.value)));
	loading.value = false;
};
watch(targetUser, onChangeTarget);
onMounted(() => onChangeTarget(targetUser.value));

const currentTop = computed(() => {
	const candidates = [...places.value.map(p => p.path), ...devices.value.map(d => d.path)];
	const top = candidates.find(p => path.value.startsWith(p || ''));
	return top;
});
const hasTop = computed(() => !!currentTop.value);
const goToTop = async () => {
	const top = currentTop.value;
	if (!top)
		return;
	await history.push(top);
};

const upload = async () => {
	const target = store.targetUser;
	if (!target)
		return;
	const files = await window.backend.openFilePicker(true);
	if (!files)
		return;
	loading.value = true;
	await Promise.all(
		files.map(file =>
			window.backend.exec(
				`${'upload' satisfies keyof Commands} "${file.replaceAll('\\', '/')}" "${join(path.value, basename(file.replaceAll('\\', '/')))}"`,
				[target.id],
				true
			)
		)
	);
	await history.refresh();
	loading.value = false;
};
const download = async () => {
	const target = store.targetUser;
	if (!target)
		return;
	const destination = await window.backend.openFilePicker(false, true);
	if (!destination || !selectedFiles.value.length)
		return;
	loading.value = true;
	await Promise.all(
		selectedFiles.value.map(file =>
			window.backend.exec(
				`${'download' satisfies keyof Commands} "${file.path.replaceAll('\\', '/')}" "${join(destination, basename(file.path.replaceAll('\\', '/')))}"`,
				[target.id],
				true
			)
		)
	);
	toast.add({
		severity: 'success',
		summary: l().success,
		detail: l().filesDownloaded,
		life: 3000,
	});
	loading.value = false;
};
const runAsScript = () => {
	for (const file of selectedFiles.value)
		window.backend.exec(`${'run' satisfies keyof Commands} RunFileAsScript('${file.path.replaceAll('\'', '\\\'')}')`);
};
const run = () => {
	for (const file of selectedFiles.value)
		window.backend.exec(`${'exec' satisfies keyof Commands} start "${file.path.replaceAll('"', '\\"')}"`);
};

const fileCtx: MenuItem[] = [
	{ label: () => l().fileContext.buttonRun, icon: 'pi pi-play', command: run },
	{ label: () => l().fileContext.buttonRunAsScript, icon: 'pi pi-code', command: runAsScript },
	{ label: () => l().fileContext.buttonDownload, icon: 'pi pi-download', command: download },
	{ label: () => l().fileContext.buttonMove, icon: 'pi fi fi-cut', command: () => moveFilesDialog.value?.show() },
	{ label: () => l().fileContext.buttonCopy, icon: 'pi pi-copy', command: () => copyFilesDialog.value?.show() },
	{ label: () => l().fileContext.buttonRename, icon: 'pi pi-pencil', command: () => askRenameFiles() },
	{ label: () => l().fileContext.buttonDelete, icon: 'pi pi-times', command: () => deleteFiles() },
];

const lastSelectedFile = computed(() => selectedFiles.value?.at(0));

const filesRightClick = (e: MouseEvent) => {
	// duplicate the event to select the file entry
	// but it makes even worse...
	// e.target.dispatchEvent(new MouseEvent('click', e));
	if (selectedFiles.value?.length > 0) {
		filesCtxMenu.value?.hide();
		filesCtxMenu.value?.show(e);
		return;
	}
	e.stopPropagation();
	e.preventDefault();
};
const getFileIcon = (type: string) => ({ 'dir': 'pi-folder', 'file': 'pi-file', 'drive': 'pi-drive' }[type]);
// const moveFiles = () => { alert('Move files!') };
// const copyFiles = () => { alert('Copy files!') };
const askRenameFiles = () => filesRenameDialog.value?.show();
const doRenameFiles = async (newNameTemplate: string) => {
	const target = store.targetUser;
	if (!target)
		return;
	loading.value = true;
	const files = selectedFiles.value;
	if (!files.length)
		return;
	loading.value = true;
	const { collect, commit: finish } = useFsEchosCollector();
	let j = 0;
	const _renameArray: [string, string][] = files.map((f, i) =>
		[
			f.path,
			f.path.substring(0, f.path.length - f.name.length) + newNameTemplate.replaceAll('#', i.toString())
		] as const
	);
	const renameArray: [string, string][] = [];
	for (const [newName, _renameArrayEntries] of Object.entries(_.groupBy(_renameArray, v => v[1]) as Record<string, [string, string][]>))
		if (_renameArrayEntries.length === 1)
			renameArray.push(_renameArrayEntries[0]);
		else {
			for (const [oldName] of _renameArrayEntries) {
				if (j === 0) {
					renameArray.push([oldName, newName]);
				}
				else {
					let name: string;
					let ext = newName.split('.').at(-1) || '';
					if (ext) {
						ext = `.${ext}`;
						name = newName.substring(0, newName.length - ext.length);
					}
					else
						name = newName;
					renameArray.push([oldName, `${name} (${j})${ext}`]);
				}
				j++;
			}
		}
	await Promise.all(
		renameArray.map(([source, destination]) =>
			window.backend.exec(
				`${'rename' satisfies keyof Commands} "${source.replaceAll('\\', '/').replaceAll('"', '\\"')}" "${destination.replaceAll('\\', '/').replaceAll('"', '\\"')}"`,
				[target.id],
				true
			).then(collect(source))
		)
	);
	const { failed } = finish();
	for (const [id, paths] of failed)
		toast.add({ severity: 'error', summary: l().error, detail: l().fileManager.failedToCopyFiles(paths, id), life: 3000 });
	await history.refresh();
	loading.value = false;
};
const deleteFiles = () => confirm.require({
	message: l().fileManager.deleteFilesQuery(selectedFiles.value.length || 0),
	header: l().confirmation,
	icon: 'pi pi-exclamation-triangle',
	accept: async () => {
		const target = store.targetUser;
		if (!target)
			return;
		const files = selectedFiles.value;
		if (!files.length)
			return;
		loading.value = true;
		const { collect, commit: finish } = useFsEchosCollector();
		await Promise.all(
			files.map(file =>
				window.backend.exec(
					`${'delete' satisfies keyof Commands} "${file.path.replaceAll('\\', '/')}"`,
					[target.id],
					true
				).then(collect(file.path))
			)
		);
		const { failed } = finish();
		for (const [id, paths] of failed)
			toast.add({ severity: 'error', summary: l().error, detail: l().fileManager.failedToDeleteFiles(paths, id), life: 3000 });
		await history.refresh();
		loading.value = false;
	},
});

const newFile = () => newFileDialog.value?.show();
const newFolder = () => newFolderDialog.value?.show();
const doNewFile = async (name: string) => {
	const target = store.targetUser;
	if (!target)
		return;
	loading.value = true;
	await window.backend.exec(
		`${'touch' satisfies keyof Commands} "${path.value}/${name.replaceAll('\\', '/')}"`,
		[target.id],
		true
	);
	await history.refresh();
	loading.value = false;
};
const doNewFolder = async (name: string) => {
	const target = store.targetUser;
	if (!target)
		return;
	loading.value = true;
	await window.backend.exec(
		`${'mkdir' satisfies keyof Commands} "${path.value}/${name.replaceAll('\\', '/')}"`,
		[target.id],
		true
	);
	await history.refresh();
	loading.value = false;
};
const doCopyFiles = async (destination: string) => {
	const target = store.targetUser;
	if (!target)
		return;
	loading.value = true;
	const files = selectedFiles.value;
	if (!files.length)
		return;
	loading.value = true;
	const { collect, commit: finish } = useFsEchosCollector();
	await Promise.all(
		files.map(file =>
			window.backend.exec(
				`${'copy' satisfies keyof Commands} "${file.path.replaceAll('\\', '/').replaceAll('"', '\\"')}" "${destination.replaceAll('\\', '/').replaceAll('"', '\\"')}"`,
				[target.id],
				true
			).then(collect(file.path))
		)
	);
	const { failed } = finish();
	for (const [id, paths] of failed)
		toast.add({ severity: 'error', summary: l().error, detail: l().fileManager.failedToCopyFiles(paths, id), life: 3000 });
	await history.refresh();
	loading.value = false;
};
const doMoveFiles = async (destination: string) => {
	const target = store.targetUser;
	if (!target)
		return;
	loading.value = true;
	const files = selectedFiles.value;
	if (!files.length)
		return;
	loading.value = true;
	const { collect, commit: finish } = useFsEchosCollector();
	await Promise.all(
		files.map(file =>
			window.backend.exec(
				`${'move' satisfies keyof Commands} "${file.path.replaceAll('\\', '/').replaceAll('"', '\\"')}" "${destination.replaceAll('\\', '/').replaceAll('"', '\\"')}"`,
				[target.id],
				true
			).then(collect(file.path))
		)
	);
	const { failed } = finish();
	for (const [id, paths] of failed)
		toast.add({ severity: 'error', summary: l().error, detail: l().fileManager.failedToMoveFiles(paths, id), life: 3000 });
	await history.refresh();
	loading.value = false;
};

const getIconClasses = (iconClasses: any) => {
	let t = { 'pi': true } as any;
	if (typeof (iconClasses) != 'object')
		iconClasses = [iconClasses];
	for (let ic of iconClasses)
		t[ic] = true;
	return t;
};
const getFileIconClasses = (type: any) => {
	let t = { 'pi': true } as any;
	t[getFileIcon(type) as any] = true;
	return t;
};

const formatDate = (date: Date) => {
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
	const year = date.getFullYear();
	return `${day}.${month}.${year}`;
};
const formatFileSize = (fileSize: number): string => {
	if (fileSize < 0) {
		throw new Error(l().fileSizePositive);
	}

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let size = fileSize;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	// Round to 2 decimal places and remove trailing .00 if present
	const roundedSize = Math.round(size * 100) / 100;
	const formattedSize = roundedSize % 1 === 0
		? roundedSize.toFixed(0)
		: roundedSize.toFixed(2);

	return `${formattedSize} ${units[unitIndex]}`;
};
</script>

<template>
  <div
    class="flex-col"
    style="height: 100%"
  >
    <div class="flex-row ui-block-b ui-block set-wrapper">
      <UsersDropdown
        v-model="store._targetUser"
        style="flex-grow: 1"
      />
      <p-btn-toggle
        v-model="applyForAll"
        :on-label="l().applyToAll"
        :off-label="l().applyToAll"
        on-icon="pi pi-check"
        off-icon="pi pi-times"
        style="width: 160px"
      />
    </div>
    <div class="flex-row ui-block-v set-wrapper ui-block-v ui-block">
      <p-btn
        icon="pi pi-arrow-left"
        :disabled="!history.canGoBack.value"
        :title="l().fileManager.topPanel.buttonBack"
        @click="history.back()"
      />
      <p-btn
        icon="pi pi-arrow-right"
        :disabled="!history.canGoForward.value"
        :title="l().fileManager.topPanel.buttonForward"
        @click="history.forward()"
      />
      <p-btn
        icon="pi pi-arrow-up"
        :disabled="!hasTop"
        :title="l().fileManager.topPanel.buttonToTop"
        @click="goToTop"
      />
      <p-btn
        icon="pi pi-refresh"
        :title="l().fileManager.topPanel.buttonRefresh"
        @click="history.refresh"
      />
      <p-btn
        icon="pi pi-upload"
        :title="l().fileManager.topPanel.buttonUpload"
        @click="upload"
      />
      <p-input-text
        v-model="path"
        style="flex-grow: 1"
        placeholder="Here must've been path..."
        @keyup.enter="history.push(path)"
        @focusout="history.push(path)"
      />
    </div>
    <div
      class="flex-row"
      style="flex-grow: 1; overflow: hidden;"
    >
      <div
        class="flex-col"
        style="min-width: 200px;"
      >
        <p-listbox
          id="files-places"
          :options="places"
          class="ui-block ui-block-v"
          :empty-message="l().emptyList"
        >
          <template #header>
            <div class="listbox-header">
              {{ l().places }}
            </div>
          </template>
          <template #option="slotProps">
            <div
              style="text-align: left"
              @click="history.push(slotProps.option.path)"
            >
              <i :class="getIconClasses(slotProps.option.icon)"></i>
              {{ slotProps.option.name }}
            </div>
          </template>
        </p-listbox>
        <p-listbox
          id="files-devices"
          :options="devices"
          class="ui-block ui-block-t"
          :empty-message="l().emptyList"
          style="flex-grow: 1"
        >
          <template #header>
            <div class="listbox-header">
              {{ l().devices }}
            </div>
          </template>
          <template #option="slotProps">
            <div
              style="text-align: left"
              @click="history.push(slotProps.option.path)"
            >
              <i class="pi fi fi-disk"></i>
              {{ slotProps.option.path }}
            </div>
          </template>
        </p-listbox>
      </div>
      <div
        id="file-manager"
        class="ui-block ui-block-t"
      >
        <p-listbox
          ref="fileManager"
          v-model="selectedFiles"
          :options="files"
          :empty-message="l().emptyList"
          multiple
          meta-key-selection
          style="height: 100%; overflow: auto;"
          @contextmenu="filesRightClick"
        >
          <template #option="slotProps">
            <div
              style="text-align: left"
              class="flex-row"
              @dblclick="slotProps.option.type === 'dir' && history.push(slotProps.option.path)"
            >
              <div style="width: 70%">
                <i :class="getFileIconClasses(slotProps.option.type)"></i>
                {{ slotProps.option.name }}
              </div>
              <div style="width: 15%">
                <template v-if="slotProps.option.type === 'file'">{{ formatFileSize(slotProps.option.size) }}</template>
              </div>
              <div style="width: 15%">{{ formatDate(slotProps.option.dateModified) }}</div>
            </div>
          </template>
        </p-listbox>
        <div id="file-manager-action-buttons">
          <p-btn
            icon="pi pi-folder"
            :title="l().fileManager.new.newFolder"
            @click="newFolder()"
          />
          <p-btn
            icon="pi pi-file"
            :title="l().fileManager.new.newFile"
            @click="newFile()"
          />
        </div>
      </div>
      <p-context-menu
        ref="filesCtxMenu"
        :model="fileCtx"
      />
      <InputDialog
        ref="filesRenameDialog"
        :query="l().newFileName"
        :title="l().fileManager.dialog.renameFilesTitle(selectedFiles?.length || 0)"
        :initial-value="lastSelectedFile?.name || ''"
        :help-text="l().newFileNameHelp"
        @submit="doRenameFiles"
      />
      <InputDialog
        ref="newFileDialog"
        :title="l().fileManager.new.newFile"
        :query="l().fileManager.new.dialog.newFileQuery"
        @submit="doNewFile"
      />
      <InputDialog
        ref="newFolderDialog"
        :title="l().fileManager.new.newFolder"
        :query="l().fileManager.new.dialog.newFolderQuery"
        @submit="doNewFolder"
      />

      <InputDialog
        ref="copyFilesDialog"
        :title="l().fileManager.dialog.copyFilesTitle"
        :initial-value="path"
        :query="l().fileManager.dialog.copyFilesQuery"
        @submit="doCopyFiles"
      />
      <InputDialog
        ref="moveFilesDialog"
        :title="l().fileManager.dialog.moveFilesTitle"
        :initial-value="path"
        :query="l().fileManager.dialog.moveFilesQuery"
        @submit="doMoveFiles"
      />
    </div>
  </div>
</template>

<style>
#file-manager {
	position: relative;
	flex-grow: 1;
	overflow: hidden;
}

#file-manager .p-listbox-item,
#files-places .p-listbox-item,
#files-devices .p-listbox-item {
	padding: 0;
}

#file-manager .p-listbox-item>*,
#files-places .p-listbox-item>*,
#files-devices .p-listbox-item>* {
	padding: 0.5rem 1rem;
}

#file-manager-action-buttons {
	position: absolute;
	right: 1rem;
	top: 0.5rem;
	display: flex;
	flex-flow: column;
	align-items: center;
	gap: 0.5rem;
}
</style>