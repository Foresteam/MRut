import { z } from 'zod';

export type { Commands } from '../packages/main/src/backend/common-types';

export interface IUserMetadata {
	hwid: string;
	uuid: string;
	username: string;
	hostname: string;
	startTimeMs: number;
}
export interface IUserHandshake extends Omit<IUserMetadata, 'startTimeMs'> {
	timestampMs: number;
}
export interface IUser extends Partial<IUserMetadata> {
	[index: string]: any;
	id: number;
	name?: string;
	address: string;
	connected: boolean;
	online: boolean;
	processing: boolean;
	diffTimeMs?: number;
	streaming: boolean;
	verified?: boolean;
	pendingVerification?: boolean;
}
export type { Log as ICmdLog } from '../packages/main/src/backend/Logger';

const fileCommonSchema = z.object({
	dateModified: z.number().transform(timeMs => new Date(timeMs)),
	name: z.string(),
	path: z.string(),
});
export const fileSchema = z.union([
	fileCommonSchema.extend({
		type: z.literal('file'),
		size: z.number(),
	}),
	fileCommonSchema.extend({
		type: z.literal('dir'),
	}),
]);
export type IFile = z.infer<typeof fileSchema>;
export const deviceSchema = z.object({ path: z.string(), type: z.enum(['Unknown', 'Fixed', 'Removable', 'Network', 'CD-ROM', 'RAM Disk']), totalSpace: z.number(), freeSpace: z.number() });
export type IDevice = z.infer<typeof deviceSchema>;
export const placeSchema = z.object({ name: z.enum(['Home', 'Desktop', 'Downloads', 'Documents', 'Pictures', 'Videos']), path: z.string() });
export type IPlace = z.infer<typeof placeSchema>;