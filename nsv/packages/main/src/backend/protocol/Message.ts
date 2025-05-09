import { Action } from '../common-types';

export class Message {
  readonly data?: Buffer;
  readonly action?: Action;
  constructor(data?: Buffer, action?: Action) {
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
export class ActionMessage extends Message {
  declare readonly data: Buffer;
  declare readonly action: Exclude<Action, Action.FILE>;
  constructor(data: Buffer, action: Exclude<Action, Action.FILE>) {
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