import NoKaOi from './NoKaOi.js';
import cron from 'node-cron';

export function Run() {

    const schedule = '0 0 * * * *';

    const resultsPresent = process.env['SCHED_RESULT_RECIPS']?.split(',').map(each => each.trim());
    const always = process.env['SCHED_ALWAYS_RECIPS']?.split(',').map(each => each.trim());

    console.log('Starting schedule...');
    cron.schedule(schedule, () => {
        console.log('Running!');
        NoKaOi.getIt({recipients: {always: always || [], resultsPresent: resultsPresent || []}});
    });

}