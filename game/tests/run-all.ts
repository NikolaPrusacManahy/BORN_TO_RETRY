// Runs every test-*.ts. Add new feature tests to this list.
import { summary } from './harness';
import './test-core';
import './test-tuning';
import './test-bindings';
import './test-movement';
import './test-dash';
import './test-slide';
import './test-walljump';
import './test-wallrun';
import './test-slam';
import './test-physics';
import './test-camera';
import './test-fists';
import './test-combat';
import './test-arms';
import './test-menu';

process.exit(summary() > 0 ? 1 : 0);
