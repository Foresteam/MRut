import type { ICmdLog, IUser } from '../types/Common';
import * as Locales from '../types/Locales';

export const formatLog = (log: ICmdLog, users: IUser[], russian?: boolean): string[] => {
  let time = log.time.toTimeString();
  time = time.substring(0, time.indexOf(' GMT'));

  let text = log.text;
  const localeKey = Object.entries(Locales.en.serverLogs).find(([_, value]) => value === text)?.[0] as undefined | keyof typeof Locales.en.serverLogs;
  if (localeKey)
    text = Locales.activeLanguage(russian ?? false).serverLogs[localeKey];

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