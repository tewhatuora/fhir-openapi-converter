#!/usr/bin/env node
const { main } = require('./main');
const { getArgs } = require('./args');

const cli = async () => {
  // Get configuration from command line arguments
  const config = getArgs();
  try {
    await main(config);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

cli();
