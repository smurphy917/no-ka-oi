import AmazonCognitoIdentity from 'amazon-cognito-identity-js';
import axios from 'axios';
import FormData from 'form-data';
import pkg from 'jsdom';
const { JSDOM } = pkg;
import jQuery from 'jquery';
import Tough from 'tough-cookie';
const { Cookie, CookieJar } = Tough;
import fs from 'fs/promises';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import path from 'path';
import qs from 'qs';
import jsonpath from 'jsonpath';
import dateformat from 'dateformat';
Handlebars.registerHelper('jp', function (root, path, context) {
    if (Array.isArray(root)) {
        root = { __temp: root };
        path = path.replace('$', "$['__temp']");
    }
    try {
        return jsonpath.query(root, path);
    }
    catch (err) {
        console.error(err);
    }
});
Handlebars.registerHelper('jp-single', function (root, path, context) {
    if (Array.isArray(root)) {
        root = { __temp: root };
        path = path.replace('$', "$['__temp']");
    }
    try {
        return jsonpath.query(root, path)[0];
    }
    catch (err) {
        console.error(err);
    }
});
Handlebars.registerHelper('as-date', function (dateString, formatString) {
    const date = new Date(dateString);
    return dateformat(date, formatString);
});
const jar = new CookieJar();
axios.defaults.withCredentials = true;
// axios.defaults.xsrfCookieName = '__cfduid';
axios.defaults.maxRedirects = 0;
axios.defaults.validateStatus = (status) => status >= 200 && status < 303;
axios.defaults.paramsSerializer = params => qs.stringify(params, { arrayFormat: 'comma' });
// Add cookies to requests
axios.interceptors.request.use(async (config) => {
    const cookieStr = await jar.getCookieString(config.url, { allPaths: true });
    config.headers['cookie'] = cookieStr;
    console.log('\t\tADDING COOKIE STRING: ' + cookieStr);
    return config;
});
// Store cookies from response
axios.interceptors.response.use(response => {
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
axios.interceptors.response.use(response => {
    if ([301, 302].includes(response.status)) {
        console.log(`\t${response.status} -> ${response.headers['location']}`);
        return axios.get(response.headers['location'], response.config);
    }
    return response;
});
// Log requests
axios.interceptors.request.use(config => {
    console.log(`${config.method?.toUpperCase()} ${config.url}`);
    console.log(`   HEADERS:
        ${JSON.stringify(config.headers)}`);
    if (config.data) {
        console.log(`   DATA: ${config.data instanceof FormData ? config.data.toString() : JSON.stringify(config.data)}`);
    }
    return config;
});
// Log responses
axios.interceptors.response.use(response => {
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
        // this.mailer = nodemailer.createTransport({sendmail: true});
        this.mailer = nodemailer.createTransport({
            port: 465,
            secure: true,
            host: 'smtp.gmail.com',
            auth: {
                user: 'nokaoi.app@gmail.com',
                pass: 'ik%afunJwKc&8y@Uu8W58L9mi#Ea'
            }
        });
    }
    async setTemplate() {
        try {
            const fileUrl = import.meta.url;
            this.emailTemplate = Handlebars.compile((await fs.readFile(path.resolve(path.dirname((new URL(import.meta.url).pathname)), './templates/email.tmpl'))).toString('utf8'));
        }
        catch (err) {
            console.error(err);
        }
    }
    setState({ request }) {
        const state = (new URL(request.protocol + request.host + request.path)).searchParams.get('state');
        this.state = state;
        console.log('\t-> state retrieved from page!');
    }
    async authenticate(redirPath) {
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
    }
    async handleResponse(response) {
        if (response.request._redirectable && response.request._redirectable._redirectCount) {
            console.log(`\tredirect count: ${response.request._redirectable._redirectCount}`);
            console.log(`\tredirected to: ${response.request.protocol}//${response.request.host}${response.request.path}`);
        }
        if (response.status === 200 && response.headers['content-type'].startsWith('text/html')) {
            const { window } = new JSDOM(response.data);
            const $ = jQuery(window, true);
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
    }
    async catchResopnse(error) {
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
    }
    async get(url, options) {
        // console.log(`GET ${url}`);
        return axios({
            url,
            method: 'get',
            ...options
        })
            .then(response => this.handleResponse(response))
            .catch(err => this.catchResopnse(err));
    }
    async post(url, data, options) {
        // console.log(`POST ${url}`);
        return axios.post(url, (new URLSearchParams(data)).toString(), options)
            .then(response => this.handleResponse(response))
            .catch(err => this.catchResopnse(err));
    }
    async submitForm(form) {
        const url = form.attr('action'), method = form.attr('method')?.toLowerCase();
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
    }
    async getToken() {
        console.log("***GET TOKEN***");
        return new Promise((resolve, reject) => {
            var authenticationData = {
                Username: USER,
                Password: PW,
            };
            var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
            var poolData = {
                UserPoolId: 'us-east-1_ouXO2QPTS',
                ClientId: '348gerdh2j08b71kfjqdva812a',
            };
            var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
            var userData = {
                Username: USER,
                Pool: userPool,
            };
            var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
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
    }
    async login() {
        console.log("***LOGIN***");
        return this.get('https://www.vistana.com/login', {});
    }
    async setPageKeys(response) {
        const { window } = new JSDOM(response.data);
        const $ = jQuery(window, true);
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
    }
    async searchLogin() {
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
    }
    async search() {
        console.log("***SEARCH***");
        return this.get(SEARCH_URL, {
            params: searchParams,
            headers: {
                Authorization: `Bearer ${this.token}`,
                api_key: this.apiKey
            }
        });
    }
    async handleResults(results) {
        // build result view from template and send email.
        // console.log(JSON.stringify(data,null, 2));
        // logging (temporary)
        fs.writeFile(path.resolve(path.dirname((new URL(import.meta.url)).pathname), '../results.json'), JSON.stringify(results, null, 2), { flag: 'w+' });
        if (!this.emailTemplate) {
            await this.setTemplate();
        }
        const data = { searchLink: '', resultCount: 0, resorts: [] };
        results = Array.isArray(results) ? results : [results];
        results.forEach((result) => {
            data.resultCount += result.numberOfResults;
            result.bookableResults.forEach((bResult) => {
                const resortId = bResult.property.propertyNumber;
                let resortData = data.resorts.find(res => res.propertyNumber === resortId);
                if (!resortData) {
                    const resortIdx = data.resorts.push(JSON.parse(JSON.stringify(bResult.property))) - 1;
                    resortData = data.resorts[resortIdx];
                    resortData.stays = [];
                }
                resortData.stays.push(bResult);
            });
        });
        const searchUrl = new URL(SEARCH_URL);
        searchUrl.search = qs.stringify(searchParams);
        data.searchLink = searchUrl.toString();
        const html = this.emailTemplate(data);
        this.mailer.sendMail({
            from: 'No Ka Oi <nokaoi.app@gmail.com>',
            to: 'smurphy917@gmail.com',
            subject: data.resultCount === 0 ? 'No availability 😔' : `${data.resultCount} options available 😎`,
            html
        }, (err, info) => {
            if (err) {
                console.error(err);
                return;
            }
            console.info(info);
        });
    }
    async getIt() {
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
            this.handleResults(response.data);
        })
            .catch(err => {
            if (err.request) {
                err.message = `Failed (${err.response.status}) on request to ${err.request.protocol}//${err.request.host}${err.request.path}`;
            }
            throw err;
        });
    }
}
export default new NoKaOi();
//# sourceMappingURL=NoKaOi.js.map