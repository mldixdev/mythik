import type { ExpressionHandlerDefinition } from '../../types.js';
import { stateHandler } from './state.js';
import { condHandler } from './cond.js';
import { templateHandler } from './template.js';
import { computedHandler } from './computed.js';
import { letHandler, refHandler } from './let.js';
import { tokenHandler } from './token.js';
import { breakpointHandler } from './breakpoint.js';
import { bindStateHandler, bindItemHandler, itemHandler, indexHandler } from './bind.js';
import { i18nHandler } from './i18n.js';
import { propHandler } from './prop.js';
import { mathHandler } from './math.js';
import { arrayHandler } from './array.js';
import { dateHandler } from './date.js';
import { formatHandler } from './format.js';
import { andHandler, orHandler, notHandler } from './logic.js';
import { switchHandler } from './switch.js';
import { groupHandler } from './group.js';
import { selectionHandler } from './selection.js';
import { authHandler } from './auth.js';
import { platformHandler } from './platform.js';
import { uniqueIdHandler } from './unique-id.js';

/** All built-in expression handlers. Add new handlers here — they auto-register. */
export const builtinHandlers: ExpressionHandlerDefinition[] = [
  stateHandler,
  condHandler,
  templateHandler,
  computedHandler,
  letHandler,
  refHandler,
  tokenHandler,
  breakpointHandler,
  bindStateHandler,
  bindItemHandler,
  itemHandler,
  indexHandler,
  i18nHandler,
  propHandler,
  mathHandler,
  arrayHandler,
  dateHandler,
  formatHandler,
  andHandler,
  orHandler,
  notHandler,
  switchHandler,
  groupHandler,
  selectionHandler,
  authHandler,
  platformHandler,
  uniqueIdHandler,
];
