import NoKaOi, { VillaSearchParams } from './NoKaOi.js';
import cron from 'node-cron';

const keyMap: { [key: string]: string } = {
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

export type NightManagerOptions = {
    id?: string;
    schedule: string;
    search: {
        checkinDate: string;
        numOfNights: number;
        unitSizes: 'ALL' | string[];
        ada?: boolean;
        flex?: boolean;
        properties: string[];
        combine?: boolean;
        showAll?: boolean;
    },
    recipients: {
        newResults: string[];
        always: string[];
    }
};

const schedules: { [key: string]: cron.ScheduledTask } = {};

class NightManager {
    NoKaOi = NoKaOi;
    schedules: { [key: string]: cron.ScheduledTask } = {};

    run(params: NightManagerOptions) {
        const result = Run(params);
        if (params.schedule) {
            this.schedules[params.id!] = result as cron.ScheduledTask;
        }
        return result;
    }

    pause(id: string) {
        return schedules[id].stop();
    }

    clear(id: string) {
        const dest = schedules[id].destroy();
        delete schedules[id];
        return dest;
    }

    restart(id: string) {
        return schedules[id].start();
    }
}

export default new NightManager();

export function Run(params: NightManagerOptions, credentials?: { vse: { user: string, password: string }, email: { user: string, password: string, host: string, port: number } }) {
    /*
    const searchParams: any = {};
    Object.keys(params).forEach((key: string) => {
        if (['recipients', 'allResultRecipients', 'schedule'].includes(key)) {
            return;
        }
        searchParams[keyMap[key] || key] = (params as any)[key];
    });

    const resultsPresent = params.recipients; // || process.env['SCHED_RESULT_RECIPS']?.split(',').map(each => each.trim());
    const always = params.allResultRecipients; // || process.env['SCHED_ALWAYS_RECIPS']?.split(',').map(each => each.trim());
    const getItOpts = {
        searchParams, recipients: { always: always || [], newResults: resultsPresent || [] }
    };
    */
    const getItOpts = { ...params } as { search: VillaSearchParams, recipients: { always: string[], newResults: string[] } };
    ['id', 'schedule'].forEach(field => {
        if (field in getItOpts) {
            delete (getItOpts as NightManagerOptions)[field as 'id' | 'schedule'];
        }
    })

    if (params.schedule) {
        console.log('Starting schedule...');
        return cron.schedule(params.schedule, () => {
            console.log('Running!');
            NoKaOi.getIt(getItOpts, credentials);
        });
    } else {
        console.log('Running once...');
        return NoKaOi.getIt(getItOpts, credentials);
    }
};