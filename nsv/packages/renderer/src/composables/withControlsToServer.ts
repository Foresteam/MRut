import type { SpecialKeys, MouseButton } from '$types/IPCTypes';
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

const normalizePosition = (el: HTMLElement, event: MouseEvent) => {
	const rect = el.getBoundingClientRect();
	const x = (event.clientX - rect.left) / rect.width;
	const y = (event.clientY - rect.top) / rect.height;
	return {
		x: Math.min(Math.max(x, 0), 1),
		y: Math.min(Math.max(y, 0), 1),
	};
};
const getButton = (button: number): MouseButton | null => {
	switch (button) {
	case 0: return 'LEFT';
	case 1: return 'MIDDLE';
	case 2: return 'RIGHT';
	default: return null;
	}
};

const keyMap: Record<string, typeof SpecialKeys[keyof typeof SpecialKeys]> = {
	Enter: 'ENTER',
	Escape: 'ESCAPE',
	Backspace: 'BACKSPACE',
	Tab: 'TAB',
	ArrowUp: 'ARROW_UP',
	ArrowDown: 'ARROW_DOWN',
	ArrowLeft: 'ARROW_LEFT',
	ArrowRight: 'ARROW_RIGHT',
	Delete: 'DELETE',
	Shift: 'SHIFT',
	Control: 'CONTROL',
	Alt: 'ALT',
	Meta: 'META',
	Pause: 'PAUSE',
	CapsLock: 'CAPS_LOCK',
	ContextMenu: 'CONTEXT_MENU',
	PageUp: 'PAGE_UP',
	PageDown: 'PAGE_DOWN',
	End: 'END',
	Home: 'HOME',
	Insert: 'INSERT',
	F1: 'F1',
	F2: 'F2',
	F3: 'F3',
	F4: 'F4',
	F5: 'F5',
	F6: 'F6',
	F7: 'F7',
	F8: 'F8',
	F9: 'F9',
	F10: 'F10',
	F11: 'F11',
	F12: 'F12',
	NumLock: 'NUM_LOCK',
	ScrollLock: 'SCROLL_LOCK',
	PrintScreen: 'PRINT_SCREEN',
	VolumeMute: 'VOLUME_MUTE',
	VolumeDown: 'VOLUME_DOWN',
	VolumeUp: 'VOLUME_UP',
	MediaTrackNext: 'MEDIA_TRACK_NEXT',
	MediaTrackPrevious: 'MEDIA_TRACK_PREVIOUS',
	MediaStop: 'MEDIA_STOP',
	MediaPlayPause: 'MEDIA_PLAY_PAUSE',
};
const isPrintableChar = (event: KeyboardEvent): boolean => {
	return event.key.length === 1 && !event.ctrlKey && !event.metaKey;
};
const getKeyInput = (event: KeyboardEvent): string | null => {
	if (isPrintableChar(event)) {
		return event.key;
	}
	const mapped = keyMap[event.key];
	if (mapped) {
		return mapped;
	}
	return null;
};

export default function ({ el, applyToAll = ref(false), send }: { el: Readonly<Ref<HTMLElement | null>>; applyToAll?: Readonly<Ref<boolean>>; send: Readonly<Ref<boolean>> }) {
	const handleMouseMove = async (event: MouseEvent) => {
		if (!send.value)
			return;
		if (!el.value)
			return;
		event.preventDefault();
		const { x, y } = normalizePosition(el.value, event);
		await window.backend.sendMousePosition({ xNormalized: x, yNormalized: y, applyToAll: applyToAll.value });
	};

	const handleMouseDown = async (event: MouseEvent) => {
		if (!send.value)
			return;
		event.preventDefault();
		const button = getButton(event.button);
		if (button)
			await window.backend.sendMouseButton({ button, state: true, applyToAll: applyToAll.value });
	};

	const handleMouseUp = async (event: MouseEvent) => {
		if (!send.value)
			return;
		event.preventDefault();
		const button = getButton(event.button);
		if (button)
			await window.backend.sendMouseButton({ button, state: false, applyToAll: applyToAll.value });
	};

	const handleWheel = async (event: WheelEvent) => {
		if (!send.value)
			return;
		event.preventDefault();
		await window.backend.sendMouseScroll({ pixels: event.deltaY, applyToAll: applyToAll.value });
	};

	const handleKeyDown = async (event: KeyboardEvent) => {
		if (!send.value)
			return;
		const key = getKeyInput(event);
		if (!key)
			return;
		event.preventDefault();
		await window.backend.sendKey({ key, state: true, applyToAll: applyToAll.value });
	};

	const handleKeyUp = async (event: KeyboardEvent) => {
		if (!send.value)
			return;
		const key = getKeyInput(event);
		if (!key)
			return;
		event.preventDefault();
		await window.backend.sendKey({ key, state: false, applyToAll: applyToAll.value });
	};

	onMounted(() => {
		el.value?.addEventListener('mousemove', handleMouseMove);
		el.value?.addEventListener('mousedown', handleMouseDown);
		el.value?.addEventListener('mouseup', handleMouseUp);
		el.value?.addEventListener('wheel', handleWheel, { passive: false });
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
	});

	onBeforeUnmount(() => {
		el.value?.removeEventListener('mousemove', handleMouseMove);
		el.value?.removeEventListener('mousedown', handleMouseDown);
		el.value?.removeEventListener('mouseup', handleMouseUp);
		el.value?.removeEventListener('wheel', handleWheel);
		window.removeEventListener('keydown', handleKeyDown);
		window.removeEventListener('keyup', handleKeyUp);
	});
}