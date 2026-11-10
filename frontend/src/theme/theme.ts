import { createTheme } from '@mui/material';

//adding export makes it public so other files can access it also
//this is a global theme as in main.tsx we use this only
export const theme = createTheme(
  {
    palette:
    {
      mode: 'light', //if you change this to dark we can make it dynamic but for now it is fixed 
      primary: 
      { 
       main: '#1565c0',
       light: '#e3f2fd',
       dark: '#0d47a1', 
       //these are are light and dark shades of blue
      }
    },
    spacing: 8,

    //global fonts for the whole website
    typography: 
    {
      fontFamily: ["Inter", "Segoe UI", "Roboto", "sans-serif"].join(','),
      //one common fontFamily

      button: 
      {
        textTransform: 'none', //by this we won;t have any uppercase letters in buttons by default
      }
    },

    shape : //this is for buttons cards textfields
    {
      borderRadius: 8,//good effect but not necesaary here
    }
  });
// Design-system colours from handbook 2.3
export const priorityColor = { P1: '#d32f2f', P2: '#ed6c02', P3: '#f9a825', P4: '#2e7d32' } as const;
export const priorityLabel =
  {
    P1: 'P1 Critical',
    P2: 'P2 High',
    P3: 'P3 Medium',
    P4: 'P4 Low'
  } as const; //adding as const  it will  not allow any other value other than these 4 values 

export const statusColor: Record<string, string> =
{
  NEW: '#9e9e9e', CLASSIFIED: '#78909c', ASSIGNED: '#3f51b5', ACKNOWLEDGED: '#1976d2',
  IN_PROGRESS: '#00acc1', PENDING_USER_INFO: '#8e24aa', RESOLVED: '#2e7d32',
  VERIFIED: '#00897b', CLOSED: '#424242', REOPENED: '#d32f2f',
};
