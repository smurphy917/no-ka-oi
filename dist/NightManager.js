"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Run = void 0;
const NoKaOi_js_1 = __importDefault(require("./NoKaOi.js"));
const node_cron_1 = __importDefault(require("node-cron"));
const keyMap = {
    checkIn: 'checkinDate',
    nights: 'numOfNights',
    disabledRooms: 'ada'
};
class NightManager {
    constructor() {
        this.NoKaOi = NoKaOi_js_1.default;
        this.schedules = {};
    }
    run(params, credentials, cacheCallback) {
        const result = Run(params, credentials, cacheCallback);
        if (params.schedule) {
            this.schedules[params.id] = result;
        }
        return result;
    }
    pause(id) {
        if (id in this.schedules) {
            return this.schedules[id].stop();
        }
    }
    clear(id) {
        if (id in this.schedules) {
            const dest = this.schedules[id].destroy();
            delete this.schedules[id];
            return dest;
        }
    }
    restart(id) {
        if (id in this.schedules) {
            return this.schedules[id].start();
        }
    }
}
exports.default = new NightManager();
function Run(params, credentials, cacheCallback) {
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
    const getItOpts = { name: params.name, search: Object.assign({}, Object.fromEntries(Object.entries(params.search).filter(([key, val]) => key !== 'id' && Array.isArray(val) ? val.length : val))), recipients: Object.assign({}, params.recipients) };
    if (params.search.allSizes) {
        getItOpts.search.unitSizes = 'ALL';
    }
    ['id', 'schedule'].forEach(field => {
        if (field in getItOpts) {
            delete getItOpts[field];
        }
    });
    if (params.schedule) {
        console.log('Starting schedule...');
        return node_cron_1.default.schedule(params.schedule, () => {
            console.log('Running!');
            NoKaOi_js_1.default.getIt(getItOpts, credentials, cacheCallback);
        });
    }
    else {
        console.log('Running once...');
        return NoKaOi_js_1.default.getIt(getItOpts, credentials, cacheCallback);
    }
}
exports.Run = Run;
;
//# sourceMappingURL=NightManager.js.map