import NoKaOi, { VillaSearchParams } from './NoKaOi.js';
import cron from 'node-cron';

const keyMap: { [key: string]: string } = {
    checkIn: 'checkinDate',
    nights: 'numOfNights',
    disabledRooms: 'ada'
}

type NightManagerCredentials = {
    vse?: {
        user: string;
        password: string;
    };
    email?: {
        user: string;
        password: string;
        host: string;
        port: number;
    }
};



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
    id: string;
    name: string;
    schedule: string;
    search: {
        checkinDate: string;
        numOfNights: number;
        allSizes: boolean;
        unitSizes: 'ALL' | string[];
        ada?: boolean;
        flex?: boolean;
        properties: string[];
        combine?: boolean;
        showAll?: boolean;
    },
    recipients: {
        newResults: {
            name?: string;
            email: string;
        }[];
        always: {
            name?: string;
            email: string;
        }[];
    }
};

class NightManager {
    NoKaOi = NoKaOi;
    schedules: { [key: string]: cron.ScheduledTask } = {};

    run(params: NightManagerOptions, credentials: NightManagerCredentials, cacheCallback?:(arg0:any) => boolean) {
        const result = Run(params, credentials, cacheCallback);
        if (params.schedule) {
            this.schedules[params.id!] = result as cron.ScheduledTask;
        }
        return result;
    }

    pause(id: string) {
        if(id in this.schedules) {
            return this.schedules[id].stop();
        }
    }

    clear(id: string) {
        if(id in this.schedules) {
            const dest = this.schedules[id].destroy();
            delete this.schedules[id];
            return dest;
        }
    }

    restart(id: string) {
        if(id in this.schedules) {
            return this.schedules[id].start();
        }
    }
}

export default new NightManager();

export function Run(params: NightManagerOptions, credentials?: NightManagerCredentials, cacheCallback?:(arg0:any) => boolean) {
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
    const getItOpts = { name: params.name, search: { ...Object.fromEntries(Object.entries(params.search).filter(([key, val]) => key !== 'id' && Array.isArray(val) ? val.length : val)) }, recipients: { ...params.recipients } };
    if(params.search.allSizes) {
        getItOpts.search.unitSizes = 'ALL';
    }
    ['id', 'schedule'].forEach(field => {
        if (field in getItOpts) {
            delete (getItOpts as NightManagerOptions)[field as 'id' | 'schedule'];
        }
    })

    if (params.schedule) {
        console.log('Starting schedule...');
        return cron.schedule(params.schedule, () => {
            console.log('Running!');
            NoKaOi.getIt(getItOpts, credentials, cacheCallback);
        });
    } else {
        console.log('Running once...');
        return NoKaOi.getIt(getItOpts, credentials, cacheCallback);
    }
};