const NoKaOi = require('./dist/NoKaOi.js').default;

const successRecipients = process.argv[0].split(',').map(each => each.trim());
const alwaysRecipients = process.argv[1].split(',').map(each => each.trim());

NoKaOi.getIt({recipients: {
    resultsPresent: successRecipients,
    always: alwaysRecipients
}});