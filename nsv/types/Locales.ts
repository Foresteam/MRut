import type { IUser } from './Common';

const en = {
  language: 'English',
  main: 'Main',
  ok: 'Ok',
  error: 'Error',
  cancel: 'Cancel',
  tabs: {
    main: 'Main',
    files: 'Files',
    screenView: 'Screen view',
    settings: 'Settings',
  },
  enterACommand: 'Enter a command',
  users: 'Users',
  logs: 'Logs',
  emptyPath: 'Here must\'ve been path...',
  places: 'Places',
  devices: 'Devices',
  emptyList: 'No available options',
  emptyUser: [
    'No user',
    'selected',
  ],
  applyToAll: 'Apply to all',
  fileContext: {
    buttonRun: 'Run',
    buttonRunAsScript: 'Run as script',
    buttonDownload: 'Download',
    buttonMove: 'Move',
    buttonCopy: 'Copy',
    buttonRename: 'Rename',
    buttonDelete: 'Delete',
  },
  mainView: {
    userContext: {
      rename: {
        label: 'Rename',
        prompt: {
          text: 'Enter new name',
          title: (user: IUser) => `User#${user.id} ${user.name || user.hostname} (${user.address})`,
        },
      },
    },
  },
  fileManager: {
    topPanel: {
      buttonBack: 'Back',
      buttonForward: 'Forward',
      buttonToTop: 'To top',
      buttonRefresh: 'Refresh',
      buttonUpload: 'Upload',
    },
    new: {
      newFolder: 'New folder',
      newFile: 'New file',
      dialog: {
        newFileQuery: 'Enter name of the new file',
        newFolderQuery: 'Enter name of the new folder',
      },
    },
    deleteFilesQuery: (files: number) => `Delete ${files} file(s)? It can't be undone`,
    failedToDeleteFiles: (files: string[], userId: number | string) => `Couldn't delete ${files.join(', ')} for user #${userId}`,
    failedToCopyFiles: (files: string[], userId: number | string) => `Couldn't copy ${files.join(', ')} for user #${userId}`,
    failedToMoveFiles: (files: string[], userId: number | string) => `Couldn't move ${files.join(', ')} for user #${userId}`,
    dialog: {
      copyFilesTitle: 'Copy files',
      copyFilesQuery: 'Enter destination',
      moveFilesTitle: 'Move files',
      moveFilesQuery: 'Enter destination',
      renameFilesTitle: (count: number) => `Rename ${count} file(s)`,
    },
  },
  screenView: {
    captureControls: 'Capture controls',
    takeoverControls: 'Takeover controls',
    misc: {
      messageBox: 'Send Message box',
      textInput: 'Request text input',
    },
  },
  textInputResults: {
    successFeedback: (reply: string) => `The user sent: ${reply}`,
  },
  messageBoxDialog: {
    title: 'Send message box',
    typesLabel: 'Dialog type',
    types: ['Ok', 'Confirm'],
    titlePlaceholder: 'Title',
    textPlaceholder: 'Text',
    iconsLabel: 'Icon',
    icons: ['Blank', 'Info', 'Question', 'Warning', 'Error'],
    results: {
      error: 'Unknown error has occured',
      success: (value: boolean) => `User responded ${value ? 'YES' : 'NO'}`,
    },
  },
  placeSelected: 'Place selected',
  deviceSelected: 'Device selected',
  confirmation: 'Confirmation',
  success: 'Success',
  filesDownloaded: 'Files downloaded',
  fileSizePositive: 'File size cannot be negative',
  newFileName: 'Enter new filename',
  newFileNameHelp: '\'#\' will be replaced with number, if multiple files are selected',
  settingsTab: {
    resetDb: 'Clear cache',
    resetDbTooltip: 'Clears the DB (if something is glitchy or whatever)',
  },
};
const ru = {
  language: 'Русский',
  main: 'Основные',
  ok: 'Ок',
  error: 'Ошибка',
  cancel: 'Отмена',
  tabs: {
    main: 'Главная',
    files: 'Файлы',
    screenView: 'Просмотр экрана',
    settings: 'Настройки',
  },
  enterACommand: 'Введите команду',
  users: 'Пользователи',
  logs: 'Логи',
  emptyPath: 'Здесь должен был быть путь...',
  places: 'Места',
  devices: 'Устройства',
  emptyList: 'Здесь пусто',
  emptyUser: [
    'Пользователь',
    'не выбран',
  ],
  applyToAll: 'Применить ко всем',
  fileContext: {
    buttonRun: 'Запустить',
    buttonRunAsScript: 'Запустить как скрипт',
    buttonDownload: 'Скачать',
    buttonMove: 'Переместить',
    buttonCopy: 'Скопировать',
    buttonRename: 'Переименовать',
    buttonDelete: 'Удалить',
  },
  mainView: {
    userContext: {
      rename: {
        label: 'Переименовать',
        prompt: {
          text: 'Введите новое имя',
          title: (user: IUser) => `Пользователь#${user.id} ${user.name || user.hostname} (${user.address})`,
        },
      },
    },
  },
  fileManager: {
    topPanel: {
      buttonBack: 'Назад',
      buttonForward: 'Вперед',
      buttonToTop: 'Наверх',
      buttonRefresh: 'Обновить',
      buttonUpload: 'Загрузить',
    },
    new: {
      newFolder: 'Новая папка',
      newFile: 'Новый файл',
      dialog: {
        newFileQuery: 'Введите имя нового файла',
        newFolderQuery: 'Введите имя новой папки',
      },
    },
    deleteFilesQuery: (files: number) => `Удалить ${files} файл(ов)? Это действие необратимо`,
    failedToDeleteFiles: (files: string[], userId: number | string) => `Не удалось удалить ${files.join(', ')} у пользователя #${userId}`,
    failedToCopyFiles: (files: string[], userId: number | string) => `Не удалось скопировать ${files.join(', ')} у пользователя #${userId}`,
    failedToMoveFiles: (files: string[], userId: number | string) => `Не удалось переместить ${files.join(', ')} у пользователя #${userId}`,
    dialog: {
      copyFilesTitle: 'Скопировать файлы',
      copyFilesQuery: 'Введите путь к целевой директории',
      moveFilesTitle: 'Переместить файлы',
      moveFilesQuery: 'Введите путь к целевой директории',
      renameFilesTitle: (count: number) => `Переименование ${count} файла(ов)`,
    },
  },
  screenView: {
    captureControls: 'Передача управления',
    takeoverControls: 'Захват управления',
    misc: {
      messageBox: 'Отправить Message box',
      textInput: 'Запросить текстовый ввод',
    },
  },
  textInputResults: {
    successFeedback: (reply: string) => `Пользователь ответил: ${reply}`,
  },
  messageBoxDialog: {
    title: 'Отправить окно с сообщением',
    typesLabel: 'Тип окна',
    types: ['Ок', 'Подтверждение'],
    titlePlaceholder: 'Заголовок',
    textPlaceholder: 'Текст',
    iconsLabel: 'Иконка',
    icons: ['Нет', 'Информация', 'Вопрос', 'Предупреждение', 'Ошибка'],
    results: {
      error: 'Произошла непредвиденная ошибка',
      success: (value: boolean) => `Пользователь выбрал ${value ? 'ДА' : 'НЕТ'}`,
    },
  },
  placeSelected: 'Место выбрано',
  deviceSelected: 'Устройство выбрано',
  confirmation: 'Подтверждение',
  success: 'Успех',
  filesDownloaded: 'Файлы скачаны',
  fileSizePositive: 'Размер файла не может быть отрицательным',
  newFileName: 'Введите новое имя файла',
  newFileNameHelp: '\'#\' будет заменено числом, если выбрано несколько файлов',
  settingsTab: {
    resetDb: 'Очистить кеш',
    resetDbTooltip: 'Очистить базу данных (например, если что-то глючит)',
  },
} satisfies typeof en;

export const activeLanguage = (russian: boolean) => russian ? ru : en;