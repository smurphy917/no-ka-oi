import NoKaOi, { VillaSearchParams } from './NoKaOi.js';
import cron from 'node-cron';

const keyMap: {[key:string]: string} = {
    checkIn: 'checkinDate',
    nights: 'numOfNights',
    disabledRooms: 'ada'
}



/*
const searchParams = {
    checkinDate: '2021-08-07',
    numOfNights: 7,
    unitSizes: 'ALL',
    properties: ['19', '25', '44'],
    ada: false,
    combine: true,
    showAll: false,
    flex: true
}
*/

type NightManagerOptions = {
    schedule: string;
    recipients: string[];
    allResultRecipients: string[];
    checkIn: string;
    nights: number;
    unitSizes: 'ALL' | string[];
    disabledRooms: boolean;
    flex: boolean;
};

export function Run(params: NightManagerOptions) {

    const searchParams:any = {};
    Object.keys(params).forEach((key: string) => {
        if(['recipients', 'allResultRecipients', 'schedule'].includes(key)){
            return;
        }
        searchParams[keyMap[key] || key] = (params as any)[key];
    });

    const resultsPresent = params.recipients; // || process.env['SCHED_RESULT_RECIPS']?.split(',').map(each => each.trim());
    const always = params.allResultRecipients; // || process.env['SCHED_ALWAYS_RECIPS']?.split(',').map(each => each.trim());
    const getItOpts = {
        searchParams, recipients: { always: always || [], resultsPresent: resultsPresent || [] }
    };
    
    if(params.schedule) {
        console.log('Starting schedule...');
        cron.schedule(params.schedule, () => {
            console.log('Running!');
            NoKaOi.getIt(getItOpts);
        });
    } else {
        console.log('Running once...');
        NoKaOi.getIt(getItOpts);
    }
}