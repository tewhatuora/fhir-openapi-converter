const { buildPaths } = require('../src/oas/paths');
const { getMinimalCapabilityStatement } = require('./utils');
const { getTestConfig } = require('./utils');
const config = getTestConfig();

describe('CapabilityStatement rest interactions to OpenAPI paths', () => {
  test('read interaction on a resource should create a GET /{resourceType}/{rid} path', async () => {
    const capabilities = getMinimalCapabilityStatement('Patient', ['read']);
    const { paths } = await buildPaths(config, capabilities);
    expect(paths['/Patient/{rid}']).toHaveProperty('get');
  });

  test('vread interaction on a resource should create a GET /{resourceType}/{rid}/_history/{vid} path', async () => {
    const capabilities = getMinimalCapabilityStatement('Observation', [
      'vread',
    ]);
    const { paths } = await buildPaths(config, capabilities);
    expect(paths['/Observation/{rid}/_history/{vid}']).toHaveProperty('get');
  });

  test('vread interaction on a resource should create a GET /{resourceType}/{rid}/_history/{vid} path', async () => {
    const capabilities = getMinimalCapabilityStatement('Observation', [
      'vread',
    ]);
    const { paths } = await buildPaths(config, capabilities);
    expect(paths['/Observation/{rid}/_history/{vid}']).toHaveProperty('get');
  });

  test('create interaction on a resource should create a POST /{resourceType} path', async () => {
    const capabilities = getMinimalCapabilityStatement('AuditEvent', [
      'create',
    ]);
    const { paths } = await buildPaths(config, capabilities);
    expect(paths['/AuditEvent']).toHaveProperty('post');
  });

  test('update interaction on a resource should create a PUT /{resourceType}/{rid} path', async () => {
    const capabilities = getMinimalCapabilityStatement('Consent', ['update']);
    const { paths } = await buildPaths(config, capabilities);
    expect(paths['/Consent/{rid}']).toHaveProperty('put');
  });

  test('delete interaction on a resource should create a DELETE /{resourceType}/{rid} path', async () => {
    const capabilities = getMinimalCapabilityStatement('Immunization', [
      'delete',
    ]);
    const { paths } = await buildPaths(config, capabilities);
    expect(paths['/Immunization/{rid}']).toHaveProperty('delete');
  });

  test('search interaction on a resource should create a GET /{resourceType} path', async () => {
    const capabilities = getMinimalCapabilityStatement('Medication', [
      'search-type',
    ]);
    const { paths } = await buildPaths(config, capabilities);
    expect(paths['/Medication']).toHaveProperty('get');
  });

  test('transaction interaction on a system should create a POST / path', async () => {
    const capabilities = getMinimalCapabilityStatement(undefined, undefined, [
      'transaction',
    ]);
    const { paths } = await buildPaths(config, capabilities);
    expect(paths['/']).toHaveProperty('post');
    const { schema } = paths['/'].post.requestBody.content['application/json'];
    expect(schema.properties.type.enum).toContain('transaction');
  });

  test('batch interaction on a system should create a POST / path', async () => {
    const capabilities = getMinimalCapabilityStatement(undefined, undefined, [
      'batch',
    ]);
    const { paths } = await buildPaths(config, capabilities);
    expect(paths['/']).toHaveProperty('post');
    const { schema } = paths['/'].post.requestBody.content['application/json'];
    expect(schema.properties.type.enum).toContain('batch');
  });
});
