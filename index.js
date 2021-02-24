import NoKaOi, { VillaSearchParams } from './NoKaOi.js';
import Commander from 'commander';
const { Command, InvalidOptionArgumentError } = Commander;

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
    .option('-f --flex')

program.parse()
const opts = program.opts();
if (opts) {
    Run(opts);
}