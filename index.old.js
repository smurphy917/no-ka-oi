// import * as AmazonCognitoIdentity from 'amazon-cognito-identity-js';
var AmazonCognitoIdentity = require('amazon-cognito-identity-js');
var axios = require('axios');
var FormData = require('form-data');
var { JSDOM } = require('jsdom');
const jQuery = require('jquery');

var USER = 'kantex8888',
    PW = 'Bktw04220422!',
    REGION = 'us-east-1',
    SEARCH_URL = 'https://api.vistana.com/exp/v1/bookable-segments?checkinDate=2021-08-07&numOfNights=7&unitSizes=ALL&properties=19,25,44&ada=false&combine=true&showAll=false&flex=true',
    AUTH_URL = 'https://login.vistana.com/sso/authenticate';


function NoKaOi () {
    async function authenticate (request){
        const state = (new URL(request.protocol + request.host + request.path)).searchParams.get('state');
        return 
    }
}

async function authenticate(request) {
    const state = (new URL(request.protocol + request.host + request.path)).searchParams.get('state');

}

Promise.all([
    axios.get('https://villafinder.vistana.com/search', {})
        .then(response => {
            var page = response.data;
            const { window } = new JSDOM(page);
            const $ = jQuery(window);
            var redirForm = $('form');
            var url = new URL(redirForm.attr('action'));
            redirForm.find('input').each((idx, input) => {
                url.searchParams.append(input.name, input.value);
            });
            return axios[redirForm.attr('method').toLowerCase()](url.toString())
        })
        .then(response => {
            debugger;
        })
        .catch(err => {
            if (err.response.status != 404) {
                throw err;
            }
            const state = (new URL(err.request.protocol + err.request.host + err.request.path)).searchParams.get('state');
            return state;
        }),
    new Promise((resolve, reject) => {
        var authenticationData = {
            Username: USER,
            Password: PW,
        };
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(
            authenticationData
        );
        var poolData = {
            UserPoolId: 'us-east-1_ouXO2QPTS', // Your user pool id here
            ClientId: '348gerdh2j08b71kfjqdva812a', // Your client id here
        };
        var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        var userData = {
            Username: USER,
            Pool: userPool,
        };
        var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (result) {
                var accessToken = result.getAccessToken().getJwtToken();
                resolve(accessToken);
                return;

            },

            onFailure: function (err) {
                console.error(err.message || JSON.stringify(err));
                reject(err);
            },
        });
    })]).then(([state, token]) => {
        var form = new FormData();
        form.append('access_token', token);
        form.append('state', state);


        axios.post(AUTH_URL, form, {
            headers: {
                ...form.getHeaders()
                // Authorization: `Bearer ${accessToken}`,
                // api_key: '5wnxmxrdhyzpjfhmzkcrzgm2'
            }
        }).then((response) => {
            return axios.get('https://villafinder.vistana.com/search',{
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
        })
        .then((response) => {
            console.log('auth successful');
            const { window } = new JSDOM(response.data);
            const $ = jQuery(window);
            // const apiKey = $('#userObject').data('user')['masheryKey'];
            const apiKey = $('#data-store-mashery-key').data('mashery-key');
            return axios.get(SEARCH_URL, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    api_key: apiKey
                }
            });
            // console.log(response);
        }).then((response) => {
            console.log(response);
        }).catch(err => {
            console.error(err);
        });

        // console.log('TOKEN: ' + accessToken);
        return;

        //POTENTIAL: Region needs to be set if not already set previously elsewhere.
        AWS.config.region = '<region>';

        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: '...', // your identity pool id here
            Logins: {
                // Change the key below according to the specific region your user pool is in.
                'cognito-idp.us-east-1.amazonaws.com/<YOUR_USER_POOL_ID>': result
                    .getIdToken()
                    .getJwtToken(),
            },
        });

        //refreshes credentials using AWS.CognitoIdentity.getCredentialsForIdentity()
        AWS.config.credentials.refresh(error => {
            if (error) {
                console.error(error);
            } else {
                // Instantiate aws sdk service objects now that the credentials have been updated.
                // example: var s3 = new AWS.S3();
                console.log('Successfully logged!');
            }
        });
    })
    .catch(err => {
        console.error(err);
    })