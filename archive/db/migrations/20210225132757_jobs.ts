import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.withSchema('public')
        .createTable('search', (table) => {
            table.increments('id').primary();
            table.date('checkinDate');
            table.integer('numOfNights');
            table.boolean('allSizes');
            table.boolean('ada');
            table.boolean('combine');
            table.boolean('showAll');
            table.boolean('flex');
            table.timestamps();
        })
        .createTable('searchDetails', (table) => {
            table.increments('id').primary();
            table.integer('search').unsigned().notNullable();
            table.foreign('search').references('id').inTable('search');
            table.enu('key', ['property', 'unitSize']);
            table.string('value');
            table.timestamps();
        })
        .createTable('jobs', (table) => {
            table.increments('id').primary();
            table.string('name');
            table.integer('search').unsigned().notNullable();
            table.foreign('search').references('id').inTable('search');
            table.string('schedule');
            table.timestamps();
        })
        .createTable('recipients', (table) => {
            table.increments('id').primary();
            table.enu('type', ['always', 'newResults']);
            table.string('name');
            table.string('email');
            table.integer('job').unsigned().notNullable();
            table.foreign('job').references('id').inTable('jobs');
            table.timestamps();
        }).then();
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTableIfExists('recipients')
        .dropTableIfExists('jobs')
        .dropTableIfExists('searchDetails')
        .dropTableIfExists('search')
        .then();
}

