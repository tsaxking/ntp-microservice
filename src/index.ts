import { getTime } from './services/ntp';
import { Redis } from './services/redis';
import { Loop } from 'ts-utils/loop';

Redis.connect().unwrap().then(() => {
    const fn = async () => {
        const time = await getTime();
        if (time.isErr()) {
            console.error('Error fetching time:', time.error);
        } else {
            Redis.emit('time', time.value);
        }
    };
    fn();
    setInterval(fn, 1000 * 60 * 15); // Every 15 minutes
});