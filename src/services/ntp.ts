import ntpClient from 'ntp-client';
import { attemptAsync } from 'ts-utils/check';
import fs from 'fs/promises';
import path from 'path';

type TimeResponse = {
	time: number; // NTP-corrected timestamp (ms)
	date: number; // Local system timestamp (ms)
};

type CachedState = {
	systemTime: number;
	syncedAt: number;
};

const STATE_FILE = path.resolve(process.cwd(), '.latest-state');
const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

export const getTime = () => {
	return attemptAsync(async () => {
		// 1. Try to read cached state
		const cached = await readValidState();

		if (cached) {
            const offset = Date.now() - cached.syncedAt;
            return {
                time: cached.systemTime + offset,
                date: cached.syncedAt
            }
		}

		// 2. Fallback to NTP query
		const ntpDate = await queryNTP();

		const systemNow = Date.now();
		const ntpNow = ntpDate.getTime();
		const offset = ntpNow - systemNow;

		const newState: CachedState = {
			systemTime: systemNow,
			syncedAt: Date.now()
		};

		await fs.writeFile(STATE_FILE, JSON.stringify(newState), 'utf8');

		return {
			time: ntpNow,
			date: systemNow
		};
	});
};

// Query NTP server
const queryNTP = (): Promise<Date> => {
	return new Promise((res, rej) => {
		ntpClient.getNetworkTime('time.cloudflare.com', 123, (err, data) => {
			if (err) return rej(err);
			if (!data) return rej(new Error('No data received from NTP server'));
			res(data);
		});
	});
};

// Try to read a valid and recent cached state
const readValidState = async (): Promise<CachedState | null> => {
	try {
		const raw = await fs.readFile(STATE_FILE, 'utf8');
		const state = JSON.parse(raw) as CachedState;

		if (
			typeof state.systemTime !== 'number' ||
			typeof state.syncedAt !== 'number'
		) {
			return null;
		}

		const age = Date.now() - state.syncedAt;
		if (age > MAX_AGE_MS) return null;

		return state;
	} catch {
		return null;
	}
};
