import { createContext, useContext } from 'react';

export const PlayerBarHoverContext = createContext<boolean>(false);

export function usePlayerBarHover() {
    return useContext(PlayerBarHoverContext);
}
