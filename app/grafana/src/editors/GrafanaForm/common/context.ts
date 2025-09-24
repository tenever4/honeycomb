import { createContext, useContext } from "react";

export const CategoryContext = createContext<string[] | null>(null);
export function useCategory() {
    return useContext(CategoryContext);
}
