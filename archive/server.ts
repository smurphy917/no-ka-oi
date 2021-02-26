import Koa from 'koa';
import Router from 'koa-router';
import pg from 'pg';
const { Pool, Client } = pg;
import Knex from 'knex';
import bodyparser from 'koa-bodyparser';
import NightManager from './NightManager';

const client = new Client();
const knex = Knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    searchPath: ['knex', 'public'],
});

// knex.schema.withSchema('public');

class NotFoundError extends Error {
    constructor(){
        super();
    }
}


const app = new Koa();
const router = new Router();

router.use()

router.post('/jobs', async (ctx, next) => {
    // create the search, add details, add recipients, create job
    return knex.transaction((trx) => {
        return trx('search').insert(ctx.request.body.search, ['id'])
            .then(rows => {
                const details = [...(ctx.request.body['properties'] || []).map((prop: string) => ({ key: 'property', value: prop, search: rows[0].id })),
                ...(ctx.request.body['unitSizes'] && Array.isArray(ctx.request.body['unitSizes']) ? ctx.request.body['unitSizes'].map((size: string) => ({ key: 'unitSize', value: size, search: rows[0].id })) : [])];
                trx('searchDetails').insert(details)
                return trx('jobs').insert({
                    name: ctx.request.body.name,
                    search: rows[0].id,
                    schedule: ctx.request.body.schedule
                }, ['id']);
            }).then(rows => {
                return trx('recipients').insert([
                    ...(ctx.request.body.recipients.always || []).map((recip: any) => ({ ...recip, type: 'always', job: rows[0].id })),
                    ...(ctx.request.body.recipients.newResults || []).map((recip: any) => ({ ...recip, type: 'newResults', job: rows[0].id })),
                ]).then(() => {
                    return rows[0].id;
                })
            })
    }).then(jobId => {
        NightManager.run(ctx.body);
        ctx.body = { id: jobId };
        ctx.status = 200;
    });
});

router.get('/jobs/:id', async (ctx) => {
    const jobId = ctx.params.id;
    /*
    knex.select('*').from('jobs').join('search', 'jobs.search','search.id').join('searchDetails', 'searchDetails.search', 'search.id').join('recipients', 'recipients.job', 'jobs.id').where({'jobs.id': jobId})
        .then((results) => {
 
        })
    */
    return Promise.all([
        knex.select('*').from('jobs').where({ id: jobId })
            .then(jobs => {
                if(jobs.length == 0) {
                    throw new NotFoundError();
                }
                ctx.body = { ...ctx.body, ...jobs[0] };
                return knex.select('*').from('search').where({ id: jobs[0].search })
            })
            .then(searches => {
                ctx.body.search = searches[0];
                return knex.select('*').from('searchDetails').where({ search: searches[0].id })
            })
            .then(details => {
                details.forEach(det => {
                    let key = '';
                    if (det.key == 'property') {
                        key = 'properties';
                    } else if (det.key == 'unitSize') {
                        key = 'unitSizes';
                    }
                    if (!ctx.body.search[key]) {
                        ctx.body.search[key] = [];
                    }
                    ctx.body.search[key].push(det.value);
                });
            })
        ,
        knex.select('*').from('recipients').where({ job: jobId })
            .then((recips) => {
                ctx.body.recipients = {
                    always: [],
                    newResults: []
                };
                recips.forEach(recip => {
                    ctx.body.recipients[recip.type].push({
                        name: recip.name,
                        email: recip.email
                    });
                });
            })
    ])
    .catch(err => {
        if(err instanceof NotFoundError) {
            ctx.status = 404;
            ctx.body = 'Not Found';
            return;
        }
    });
})

app.use(bodyparser());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);

export default app;