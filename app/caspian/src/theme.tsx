import { createTheme } from '@material-ui/core/styles';

const appTheme = createTheme({
    // root: {
    //     color: '#fff',
    // },
    palette: {
        primary: { main: '#fff' },
        secondary: { main: '#52c7b8' },
        type: 'dark',
        background: {
            paper: '#2b373e', // color the popover and menu backgrounds
        },
        text: {
            primary: '#D3DAE2',
            secondary: '#999EA3',
        },
    },
    // color: '#fff',
    typography: {
        h1: {
            fontSize: '36px',
            fontStyle: 'Regular',
            lineHeight: '42.19px',
            letterSpacing: '-2%',
        },
        h2: {
            fontSize: '24px',
            fontStyle: 'Regular',
            lineHeight: '28.13px',
            letterSpacing: '-2%',
        },
        subtitle1: {
            fontSize: '24px',
            fontStyle: 'Regular',
            lineHeight: '28.13px',
            letterSpacing: '-2%',
        },
        body1: {
            fontSize: '16px',
            fontStyle: 'Regular',
            lineHeight: '18.75px',
            letterSpacing: '-2%',
            paragraphSpacing: '10px',
        },
    },
});

export { appTheme };
