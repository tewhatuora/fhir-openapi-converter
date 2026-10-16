import { main } from './main';
import { getArgs } from './args';

const cli = async () => {
  const config = getArgs();
  try {
    await main(config);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

cli();
