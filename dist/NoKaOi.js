"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const amazon_cognito_identity_js_1 = __importDefault(require("amazon-cognito-identity-js"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const jsdom_1 = __importDefault(require("jsdom"));
const { JSDOM } = jsdom_1.default;
const jquery_1 = __importDefault(require("jquery"));
const tough_cookie_1 = __importDefault(require("tough-cookie"));
const { Cookie, CookieJar } = tough_cookie_1.default;
const promises_1 = __importDefault(require("fs/promises"));
const handlebars_1 = __importDefault(require("handlebars"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const path_1 = __importDefault(require("path"));
const qs_1 = __importDefault(require("qs"));
const jsonpath_1 = __importDefault(require("jsonpath"));
const dateformat_1 = __importDefault(require("dateformat"));
__dirname = __dirname; // || path.dirname((new URL(import.meta.url)).pathname);
handlebars_1.default.registerHelper('jp', function (root, path, context) {
    if (Array.isArray(root)) {
        root = { __temp: root };
        path = path.replace('$', "$['__temp']");
    }
    try {
        return jsonpath_1.default.query(root, path);
    }
    catch (err) {
        console.error(err);
    }
});
handlebars_1.default.registerHelper('jp-single', function (root, path, context) {
    if (Array.isArray(root)) {
        root = { __temp: root };
        path = path.replace('$', "$['__temp']");
    }
    try {
        return jsonpath_1.default.query(root, path)[0];
    }
    catch (err) {
        console.error(err);
    }
});
handlebars_1.default.registerHelper('as-date', function (dateString, formatString) {
    try {
        const date = new Date(dateString);
        return dateformat_1.default(date, formatString);
    }
    catch (err) {
        console.warn(err);
        return dateString;
    }
});
const jar = new CookieJar();
axios_1.default.defaults.withCredentials = true;
// axios.defaults.xsrfCookieName = '__cfduid';
axios_1.default.defaults.maxRedirects = 0;
axios_1.default.defaults.validateStatus = (status) => status >= 200 && status < 303;
axios_1.default.defaults.paramsSerializer = params => qs_1.default.stringify(params, { arrayFormat: 'comma' }); //.replace(/%2C/g, ',');
// Add cookies to requests
axios_1.default.interceptors.request.use((config) => __awaiter(void 0, void 0, void 0, function* () {
    const cookieStr = yield jar.getCookieString(config.url, { allPaths: true });
    config.headers['cookie'] = cookieStr;
    console.log('\t\tADDING COOKIE STRING: ' + cookieStr);
    return config;
}));
// Store cookies from response
axios_1.default.interceptors.response.use(response => {
    const urlObj = new URL(response.config.url);
    const cookieSource = response.headers['set-cookie'];
    if (cookieSource) {
        (Array.isArray(cookieSource) ? cookieSource : cookieSource.split(',')).forEach((cookie) => {
            jar.setCookie(cookie.indexOf('domain=') > -1 ? cookie : `${cookie}; domain=${urlObj.hostname}`, response.config.url, (err, cookie) => {
                if (err) {
                    console.warn(err);
                }
                else {
                    console.log(`\t\tcookie stored: ${cookie.key}`);
                }
            });
        });
    }
    return response;
});
// Manually handle redirects (to support adding cookies)
axios_1.default.interceptors.response.use(response => {
    if ([301, 302].includes(response.status)) {
        console.log(`\t${response.status} -> ${response.headers['location']}`);
        return axios_1.default.get(response.headers['location'], response.config);
    }
    return response;
});
// Log requests
axios_1.default.interceptors.request.use(config => {
    var _a;
    console.log(`${(_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${config.url}`);
    console.log(`   HEADERS:
        ${JSON.stringify(config.headers)}`);
    if (config.data) {
        console.log(`   DATA: ${config.data instanceof form_data_1.default ? config.data.toString() : JSON.stringify(config.data)}`);
    }
    return config;
});
// Log responses
axios_1.default.interceptors.response.use(response => {
    console.log(`\nRESPONSE ${response.status} (${response.request.protocol}//${response.request.host}${response.request.path})`);
    console.log(`   HEADERS:
        ${JSON.stringify(response.headers)}`);
    if (response.data) {
        // console.log(`   DATA: ${response.data}`);
    }
    return response;
});
class AuthenticationError extends Error {
    constructor(...args) {
        super(...args);
    }
}
const searchParams = {
    checkinDate: '2021-08-07',
    numOfNights: 7,
    unitSizes: 'ALL',
    properties: ['19', '25', '44'],
    ada: false,
    combine: true,
    showAll: false,
    flex: true
};
const USER = `${process.env.VSE_USER}`, PW = `${process.env.VSE_PW}`, REGION = 'us-east-1', SEARCH_URL = 'https://api.vistana.com/exp/v1/bookable-segments', AUTH_URL = 'https://login.vistana.com/sso/authenticate';
class NoKaOi {
    constructor() {
        this.resultCache = { bookableResults: [] };
        this.searchParams = searchParams;
        this.credentials = { vse: { user: USER, password: PW }, email: { host: 'smtp.gmail.com', port: 465, user: process.env.EMAIL_USER, password: process.env.EMAIL_PW } };
        // this.mailer = nodemailer.createTransport({sendmail: true});
        this.mailer = nodemailer_1.default.createTransport({
            port: this.credentials.email.port,
            secure: true,
            host: this.credentials.email.host,
            auth: {
                user: this.credentials.email.user,
                pass: this.credentials.email.password
            }
        });
    }
    setTemplate() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.emailTemplate = handlebars_1.default.compile((yield promises_1.default.readFile(path_1.default.resolve(__dirname, './templates/email.tmpl'))).toString('utf8'));
            }
            catch (err) {
                console.error(err);
            }
        });
    }
    setState({ request }) {
        const state = (new URL(request.protocol + request.host + request.path)).searchParams.get('state');
        this.state = state;
        console.log('\t-> state retrieved from page!');
    }
    authenticate(redirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("***AUTHENTICATE***");
            // const form = new FormData();
            // form.append('access_token', this.token);
            // form.append('state', this.state);
            const form = {
                'access_token': this.token,
                'state': this.state
            };
            return this.post(AUTH_URL, form, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                    //     ...form.getHeaders()
                }
            }).then(response => {
                if (!redirPath || response.request.path == redirPath) {
                    this.setPageKeys(response);
                }
                else {
                    throw new AuthenticationError(`Unexpected redirect path - expected: ${redirPath}; received: ${response.request.path}`);
                }
                return response;
            });
        });
    }
    handleResponse(response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (response.request._redirectable && response.request._redirectable._redirectCount) {
                console.log(`\tredirect count: ${response.request._redirectable._redirectCount}`);
                console.log(`\tredirected to: ${response.request.protocol}//${response.request.host}${response.request.path}`);
            }
            if (response.status === 200 && response.headers['content-type'].startsWith('text/html')) {
                const { window } = new JSDOM(response.data);
                const $ = jquery_1.default(window, true);
                const form = $('form');
                const formId = form.attr('name') || form.attr('id') || '';
                if (form.length && (formId == 'frm' || formId == '')) {
                    return this.submitForm(form);
                }
                const refresh = $('meta[http-equiv="refresh"]');
                if (refresh.length) {
                    let url = `${response.request.protocol}//${response.request.host}/`;
                    console.log(`\tRefresh Redirecting to: ${url}`);
                    const content = refresh.attr('content') || '';
                    url += content.length ? content.split(';')[1].match(/url=(.*)/)[1] : '';
                    return this.get(url);
                }
            }
            return response;
        });
    }
    catchResopnse(error) {
        return __awaiter(this, void 0, void 0, function* () {
            if (error.response && error.response.request._redirectable && error.response.request._redirectable._redirectCount) {
                console.log(`\tredirect count: ${error.response.request._redirectable._redirectCount}`);
                if (error.request) {
                    console.log(`\tredirected to: ${error.request.protocol}//${error.request.host}${error.request.path}`);
                }
            }
            if (error.response && error.response.status == 404) {
                this.setState(error);
                if (this.token && this.state && this.token == 'bogus') {
                    return this.authenticate();
                }
                else {
                    throw new AuthenticationError('Cannot authenticate as token or state are missing.');
                }
            }
            else {
                throw (error);
            }
        });
    }
    get(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log(`GET ${url}`);
            return axios_1.default(Object.assign({ url, method: 'get' }, options))
                .then(response => this.handleResponse(response))
                .catch(err => this.catchResopnse(err));
        });
    }
    post(url, data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log(`POST ${url}`);
            return axios_1.default.post(url, (new URLSearchParams(data)).toString(), options)
                .then(response => this.handleResponse(response))
                .catch(err => this.catchResopnse(err));
        });
    }
    submitForm(form) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const url = form.attr('action'), method = (_a = form.attr('method')) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            console.log(`\tForm Redirecting to: ${url}`);
            if (method === 'post') {
                const formData = {};
                form.find('input').each((_idx, input) => {
                    formData[input.name] = input.value;
                });
                return this.post(url, formData);
            }
            else if (method === 'get') {
                const urlObj = new URL(url);
                form.find('input').each((_idx, input) => {
                    urlObj.searchParams.append(input.name, input.value);
                });
                return this.get(urlObj.toString());
            }
            throw new Error(`Unhandled form method: ${method}`);
        });
    }
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("***GET TOKEN***");
            return new Promise((resolve, reject) => {
                var authenticationData = {
                    Username: this.credentials.vse.user,
                    Password: this.credentials.vse.password,
                };
                var authenticationDetails = new amazon_cognito_identity_js_1.default.AuthenticationDetails(authenticationData);
                var poolData = {
                    UserPoolId: 'us-east-1_ouXO2QPTS',
                    ClientId: '348gerdh2j08b71kfjqdva812a',
                };
                var userPool = new amazon_cognito_identity_js_1.default.CognitoUserPool(poolData);
                var userData = {
                    Username: this.credentials.vse.user,
                    Pool: userPool,
                };
                var cognitoUser = new amazon_cognito_identity_js_1.default.CognitoUser(userData);
                cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: (result) => {
                        var accessToken = result.getAccessToken().getJwtToken();
                        this.token = accessToken;
                        resolve(accessToken);
                        return;
                    },
                    onFailure: (err) => {
                        console.error(err.message || JSON.stringify(err));
                        reject(err);
                    },
                });
            });
        });
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("***LOGIN***");
            return this.get('https://www.vistana.com/login', {});
        });
    }
    setPageKeys(response) {
        return __awaiter(this, void 0, void 0, function* () {
            const { window } = new JSDOM(response.data);
            const $ = jquery_1.default(window, true);
            // Check for user obj element
            const userObj = $('#userObject');
            if (userObj.length) {
                this.apiKey = userObj.data('user')['masheryKey'];
                console.log(`\t-> API Key set from user object element: ${JSON.stringify(userObj.data('user'))}`);
            }
            // Check for mashery key element
            const keyElem = $('#data-store-mashery-key');
            if (keyElem.length) {
                this.apiKey = keyElem.data('mashery-key');
                console.log('\t-> API Key set from key element!');
            }
            // Check for token element
            const tokenElem = $('#data-store-jwt');
            if (tokenElem.length) {
                this.token = tokenElem.data('jwt');
                console.log('\t -> Token set from token element!');
            }
            return response;
        });
    }
    searchLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("***SEARCH LOGIN***");
            return this.get('https://villafinder.vistana.com/', {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    state: `Bearer ${this.state}`
                }
            })
                .then(response => {
                this.setPageKeys(response);
                return response;
            });
        });
    }
    search() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("***SEARCH***");
            return this.get(SEARCH_URL, {
                params: this.searchParams,
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    api_key: this.apiKey
                }
            });
        });
    }
    checkAndCache(bookableResult) {
        /*
        const cachedResults = jsonpath.query(this.resultCache, `$.bookableResults[?(@.property.propertyNumber == ${bookableResult.property.propertyNumber} && @.stayDetails[?(@.label == 'Check In:')].value == ${bookableResult!.stayDetails!.find(det => det.label == 'Check In:')?.value || 'bogus'} && @.stayDetails[?(@.label == 'Villa Type:')].value == ${bookableResult!.stayDetails.find(det => det.label == 'Villa Type:')
        ?.value || 'bogus'})]`) as BookableResult[];
        */
        const cachedResult = this.resultCache.bookableResults.find(cached => {
            let match = cached.property.propertyNumber === bookableResult.property.propertyNumber;
            return match ? cached.stayDetails.reduce((_match, det) => {
                var _a, _b;
                return _match === false ? _match :
                    det.label === 'Check In:' ? det.value === ((_a = bookableResult.stayDetails.find(det => det.label === 'Check In:')) === null || _a === void 0 ? void 0 : _a.value) :
                        det.label === 'Villa Type:' ? det.value === ((_b = bookableResult.stayDetails.find(det => det.label === 'Villa Type:')) === null || _b === void 0 ? void 0 : _b.value) :
                            _match;
            }, match) : false;
        });
        if (cachedResult) {
            cachedResult.active = true;
            return Object.assign(Object.assign({}, bookableResult), { new: false });
        }
        else {
            this.resultCache.bookableResults.push(Object.assign(Object.assign({}, bookableResult), { active: true }));
            return Object.assign(Object.assign({}, bookableResult), { new: true });
        }
    }
    refreshCache() {
        this.resultCache.bookableResults = this.resultCache.bookableResults.filter(res => res.active).map(res => {
            delete res.active;
            return res;
        });
    }
    handleResults(results, { recipients: { newResults, always } }) {
        return __awaiter(this, void 0, void 0, function* () {
            // build result view from template and send email.
            // console.log(JSON.stringify(data,null, 2));
            // logging (temporary)
            jar.removeAllCookies().then(() => {
                console.log('Cookies cleared!');
            }).catch(err => {
                console.error(err);
            });
            always = always || [];
            newResults = newResults || [];
            promises_1.default.writeFile(path_1.default.resolve(__dirname, '../results.json'), JSON.stringify(results, null, 2), { flag: 'w+' });
            if (!this.emailTemplate) {
                yield this.setTemplate();
            }
            const data = { searchLink: '', resultCounts: { total: 0, new: 0 }, resorts: [] };
            results = Array.isArray(results) ? results : [results];
            results.forEach((result) => {
                data.resultCounts.total += result.numberOfResults;
                result.bookableResults.forEach((bResult) => {
                    const resortId = bResult.property.propertyNumber;
                    let resortData = data.resorts.find(res => res.propertyNumber === resortId);
                    if (!resortData) {
                        const resortIdx = data.resorts.push(JSON.parse(JSON.stringify(bResult.property))) - 1;
                        resortData = data.resorts[resortIdx];
                        resortData.stays = [];
                    }
                    if (bResult.stayDetails.length) {
                        bResult = this.checkAndCache(bResult);
                    }
                    if (bResult.new) {
                        data.resultCounts.new++;
                    }
                    resortData.stays.push(bResult);
                });
            });
            const searchUrl = new URL(SEARCH_URL);
            searchUrl.search = qs_1.default.stringify(this.searchParams);
            data.searchLink = searchUrl.toString();
            const html = this.emailTemplate(data);
            always.forEach(recip => newResults.includes(recip) ? '' : newResults.push(recip));
            this.mailer.sendMail({
                from: 'No Ka Oi <nokaoi.app@gmail.com>',
                to: (data.resultCounts.new > 0 ? newResults : always).join(', '),
                subject: data.resultCounts.new === 0 ? 'No new availability 😔' : `${data.resultCounts.new} new options available 😎`,
                html
            }, (err, info) => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.info(info);
            });
        });
    }
    getIt({ search, recipients }, credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            /*
            GET vistana.com/login
            -> form redir /sso
            -> redir /sso/authenticate
            -> redir /sso/authorize
            -> 404 -> set state
    
    
            AUTH cognito
            -> set token
    
            POST /sso/authenticate
            -> redir /sso
            -> form redir /acs
            -> redir /
            -> LOGGED IN
            -> set masheryKey
    
            NAVIGATE villafinder.vistana.com/
            -> form2 redir /load
            -> form2 redir /search
            -> redir login.vistana.com/sso
            -> redir villafinder.vistana.com/acs
            -> redir /search
            -> LOGGED IN set masheryKey
    
            API /bookableSegments
            */
            if (credentials) {
                this.credentials = Object.assign(Object.assign({}, this.credentials), credentials);
            }
            this.searchParams = Object.assign(Object.assign({}, this.searchParams), search);
            this.get('https://villafinder.vistana.com')
                // this.login()
                .catch(err => {
                if (err instanceof AuthenticationError) {
                    return;
                }
                throw err;
            })
                .then(() => this.getToken())
                .then(() => this.authenticate('/search'))
                // .then(() => this.login())
                // .then(() => this.searchLogin())
                .then(() => this.search())
                .then(response => {
                this.handleResults(response.data, { recipients });
            })
                .catch(err => {
                if (err.request) {
                    err.message = `Failed (${err.response.status}) on request to ${err.request.protocol}//${err.request.host}${err.request.path}`;
                }
                throw err;
            });
        });
    }
}
exports.default = new NoKaOi();
//# sourceMappingURL=NoKaOi.js.map