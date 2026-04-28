import { Command } from 'commander';
import { install } from './commands/install';
import { uninstall } from './commands/uninstall';
import { trigger } from './commands/trigger';
import { status } from './commands/status';
import { setConfig } from './commands/config';
import { testCelebration } from './commands/test';

const program = new Command();

program
  .name('commitconfetti')
  .description('Celebrate git commits with sound and notifications')
  .version('1.0.0');

program
  .command('install')
  .description('Set up global git hooks for commit celebrations')
  .action(install);

program
  .command('uninstall')
  .description('Remove git hooks and restore previous configuration')
  .action(uninstall);

program
  .command('trigger')
  .description('Internal: called by the post-commit hook')
  .action(trigger);

program
  .command('status')
  .description('Show install state and configuration')
  .action(status);

program
  .command('config <key> <value>')
  .description('Set configuration (enabled, sound-pack, notifications)')
  .action(setConfig);

program
  .command('test')
  .description('Fire a sample celebration to verify install')
  .action(testCelebration);

program.parse();
