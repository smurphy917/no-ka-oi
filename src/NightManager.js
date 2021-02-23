import NoKaOi from './NoKaOi.js';
import cron from 'node-cron';
export function Run() {
    const schedule = '0 0 * * * *';
    console.log('Starting schedule...');
    cron.schedule(schedule, () => {
        console.log('Running!');
        NoKaOi.getIt();
    });
}
//# sourceMappingURL=NightManager.js.map