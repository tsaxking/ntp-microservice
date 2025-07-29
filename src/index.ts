import { getTime } from './services/ntp';
import { Redis } from './services/redis';
import { Loop } from 'ts-utils/loop';

Redis.connect().unwrap().then(() => {
    const l = new Loop(async () => {
        const time = await getTime();
        if (time.isErr()) {
            console.error('Error fetching time:', time.error);
        } else {
            Redis.emit('time', time.value);
        }
    }, 15 * 60 * 1000);

    l.start();
});