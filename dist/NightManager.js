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
const schedules = {};
class NightManager {
    constructor() {
        this.NoKaOi = NoKaOi_js_1.default;
        this.schedules = {};
    }
    run(params) {
        const result = Run(params);
        if (params.schedule) {
            this.schedules[params.id] = result;
        }
        return result;
    }
    pause(id) {
        return schedules[id].stop();
    }
    clear(id) {
        const dest = schedules[id].destroy();
        delete schedules[id];
        return dest;
    }
    restart(id) {
        return schedules[id].start();
    }
}
exports.default = new NightManager();
function Run(params, credentials) {
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
    const getItOpts = Object.assign({}, params);
    ['id', 'schedule'].forEach(field => {
        if (field in getItOpts) {
            delete getItOpts[field];
        }
    });
    if (params.schedule) {
        console.log('Starting schedule...');
        return node_cron_1.default.schedule(params.schedule, () => {
            console.log('Running!');
            NoKaOi_js_1.default.getIt(getItOpts, credentials);
        });
    }
    else {
        console.log('Running once...');
        return NoKaOi_js_1.default.getIt(getItOpts, credentials);
    }
}
exports.Run = Run;
;
//# sourceMappingURL=NightManager.js.map