import NoKaOi from './NoKaOi.js';
import cron from 'node-cron';
const keyMap = {
    checkIn: 'checkinDate',
    nights: 'numOfNights',
    disabledRooms: 'ada'
};
export function Run(params) {
    const searchParams = {};
    Object.keys(params).forEach((key) => {
        if (['recipients', 'allResultRecipients', 'schedule'].includes(key)) {
            return;
        }
        searchParams[keyMap[key] || key] = params[key];
    });
    const resultsPresent = params.recipients; // || process.env['SCHED_RESULT_RECIPS']?.split(',').map(each => each.trim());
    const always = params.allResultRecipients; // || process.env['SCHED_ALWAYS_RECIPS']?.split(',').map(each => each.trim());
    const getItOpts = {
        searchParams, recipients: { always: always || [], resultsPresent: resultsPresent || [] }
    };
    if (params.schedule) {
        console.log('Starting schedule...');
        cron.schedule(params.schedule, () => {
            console.log('Running!');
            NoKaOi.getIt(getItOpts);
        });
    }
    else {
        console.log('Running once...');
        NoKaOi.getIt(getItOpts);
    }
}
//# sourceMappingURL=NightManager.js.map