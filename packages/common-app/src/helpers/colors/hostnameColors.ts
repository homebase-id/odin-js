export type OdinIdColorValue = {
  readonly lightTheme: string;
  readonly darkTheme: string;
};

const OdinIdColorValues: OdinIdColorValue[] = [
  {
    lightTheme: '#006da3',
    darkTheme: '#00a7fa',
  },
  {
    lightTheme: '#007a3d',
    darkTheme: '#00b85c',
  },
  {
    lightTheme: '#c13215',
    darkTheme: '#ff6f52',
  },
  {
    lightTheme: '#b814b8',
    darkTheme: '#f65af6',
  },
  {
    lightTheme: '#5b6976',
    darkTheme: '#8ba1b6',
  },
  {
    lightTheme: '#3d7406',
    darkTheme: '#5eb309',
  },
  {
    lightTheme: '#cc0066',
    darkTheme: '#f76eb2',
  },
  {
    lightTheme: '#2e51ff',
    darkTheme: '#8599ff',
  },
  {
    lightTheme: '#9c5711',
    darkTheme: '#d5920b',
  },
  {
    lightTheme: '#007575',
    darkTheme: '#00b2b2',
  },
  {
    lightTheme: '#d00b4d',
    darkTheme: '#ff6b9c',
  },
  {
    lightTheme: '#8f2af4',
    darkTheme: '#bf80ff',
  },
  {
    lightTheme: '#d00b0b',
    darkTheme: '#ff7070',
  },
  {
    lightTheme: '#067906',
    darkTheme: '#0ab80a',
  },
  {
    lightTheme: '#5151f6',
    darkTheme: '#9494ff',
  },
  {
    lightTheme: '#866118',
    darkTheme: '#d68f00',
  },
  {
    lightTheme: '#067953',
    darkTheme: '#00b87a',
  },
  {
    lightTheme: '#a20ced',
    darkTheme: '#cf7cf8',
  },
  {
    lightTheme: '#4b7000',
    darkTheme: '#74ad00',
  },
  {
    lightTheme: '#c70a88',
    darkTheme: '#f76ec9',
  },
  {
    lightTheme: '#b34209',
    darkTheme: '#f57a3d',
  },
  {
    lightTheme: '#06792d',
    darkTheme: '#0ab844',
  },
  {
    lightTheme: '#7a3df5',
    darkTheme: '#af8af9',
  },
  {
    lightTheme: '#6b6b24',
    darkTheme: '#a4a437',
  },
  {
    lightTheme: '#d00b2c',
    darkTheme: '#f77389',
  },
  {
    lightTheme: '#2d7906',
    darkTheme: '#42b309',
  },
  {
    lightTheme: '#af0bd0',
    darkTheme: '#e06ef7',
  },
  {
    lightTheme: '#32763e',
    darkTheme: '#4baf5c',
  },
  {
    lightTheme: '#2662d9',
    darkTheme: '#7da1e8',
  },
  {
    lightTheme: '#76681e',
    darkTheme: '#b89b0a',
  },
  {
    lightTheme: '#067462',
    darkTheme: '#09b397',
  },
  {
    lightTheme: '#6447f5',
    darkTheme: '#a18ff9',
  },
  {
    lightTheme: '#5e6e0c',
    darkTheme: '#8faa09',
  },
  {
    lightTheme: '#077288',
    darkTheme: '#00aed1',
  },
  {
    lightTheme: '#c20aa3',
    darkTheme: '#f75fdd',
  },
  {
    lightTheme: '#2d761e',
    darkTheme: '#43b42d',
  },
];

export const getOdinIdColor = (odinId: string): OdinIdColorValue => {
  let c = 0;
  for (let i = 0; i < odinId.length; i++) {
    c = c ^ odinId.charCodeAt(i);
  }
  return OdinIdColorValues[c % OdinIdColorValues.length];
};
