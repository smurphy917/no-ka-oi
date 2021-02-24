import NoKaOi from './NoKaOi.js';
import cron from 'node-cron';
import Commander from 'commander';
const { Command, InvalidOptionArgumentError } = Commander;
const keyMap = {
    checkIn: 'checkinDate',
    nights: 'numOfNights',
    disabledRooms: 'ada'
};
const program = new Command();
function asInt(value) {
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        throw new InvalidOptionArgumentError('Not a number.');
    }
    return parsedValue;
}
program
    .option('-s --schedule [schedule string]', 'Provide shcedule cron string.')
    .option('-r --recipients [emails...]', 'Provide list of recipients for new results.')
    .option('-a --all-result-recipients [emails...]', 'Provide list of recipients for all results.')
    .option('-c --check-in [date]')
    .option('-n --nights [number]', 'Number of nights for stay', asInt)
    .option('-u --unit-sizes [sizes...]', 'Sizes for rooms to search for', 'ALL')
    .option('-ada --disabled-rooms')
    .option('-f --flex');
program.parse();
const opts = program.opts();
if (opts) {
    Run(opts);
}
export function Run(params) {
    const schedule = params.schedule || '0 0 * * * *';
    const searchParams = {};
    Object.keys(params).forEach((key) => {
        if (['recipients', 'allResultRecipients', 'schedule'].includes(key)) {
            return;
        }
        searchParams[keyMap[key] || key] = params[key];
    });
    const resultsPresent = params.recipients || process.env['SCHED_RESULT_RECIPS']?.split(',').map(each => each.trim());
    const always = params.allResultRecipients || process.env['SCHED_ALWAYS_RECIPS']?.split(',').map(each => each.trim());
    console.log('Starting schedule...');
    cron.schedule(schedule, () => {
        console.log('Running!');
        NoKaOi.getIt({
            searchParams, recipients: { always: always || [], resultsPresent: resultsPresent || [] }
        });
    });
}
//# sourceMappingURL=NightManager.js.map