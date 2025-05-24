import { Action } from '../common-types';

export class Message<Act extends Action = Action> {
  readonly data?: Buffer;
  readonly action?: Act;
  constructor(data?: Buffer, action?: Act) {
    this.data = data;
    this.action = action;
  }
}
export class FileMessage extends Message {
  declare readonly data: never;
  declare readonly action: Action.FILE;
  readonly path: string;
  constructor(path: string) {
    super();
    this.action = Action.FILE;
    this.path = path;
  }
}
export class ActionMessage<Act extends Exclude<Action, Action.FILE> = Exclude<Action, Action.FILE>> extends Message<Act> {
  declare readonly data: Buffer;
  declare readonly action: Act;
  constructor(data: Buffer, action: Act) {
    super(data, action);
  }
}
export class BinaryMessage extends Message {
  declare readonly data: Buffer;
  declare readonly action: undefined;
  constructor(data: Buffer) {
    super(data);
  }
}