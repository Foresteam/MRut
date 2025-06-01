import type { ICmdLog, IUser } from '../types/Common';

export const formatLog = (log: ICmdLog, users: IUser[]): string[] => {
  let time = log.time.toTimeString();
  time = time.substring(0, time.indexOf(' GMT'));

  const { text } = log;
  switch (log.type) {
    case 'feedback': {
      const sender = users.find(user => user.id === log.senderId);
      return [`[${time}${` ${sender?.name || sender?.hostname}#${sender?.id}`}]`, text.split('\n').join('\n\t')];
    }
    case 'command': {
      return [`[${time}]->[${log.targetIds.join(', ')}]`, text.split('\n').join('\n\t')];
    }
    case 'system': {
      return [`[${time} SYSTEM]`, `${text.split('\n').join('\n\t')}`, `${log.targetIds ? `[${log.targetIds.join(', ')}]` : ''}`];
    }
    case 'error': {
      let json;
      try {
        json = JSON.stringify(log.err);
      }
      catch { json = 'could not transform'; }
      return [`[${time} ERROR]`, `${text.split('\n').join('\n\t')}`, json];
    }
  }
  throw new Error('Not implemented');
};