"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
} from "@mui/material/styles";

type Theme = "light" | "dark";

interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
  theme: "light",
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

// custom colors for MUI
export const colors = {
  vuwGreen: "#0D4C38",
  primary: "#A5DBA3",
  secondary: "#aed5f7",
};

declare module "@mui/material/styles" {
  interface Palette {
    vuwGreen: string;
  }
  interface PaletteOptions {
    vuwGreen: string;
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    vuwGreen: true;
  }
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if(typeof window === "undefined") return "light";
    const localTheme = window.localStorage.getItem("theme") as Theme;
    return localTheme ?? "light";
  });

  const { palette } = createTheme();
  const muiTheme = createTheme({
    palette: {
      mode: theme,
      primary: {
        main: colors.primary,
      },
      vuwGreen: colors.vuwGreen,
      secondary: {
        main: colors.secondary,
      },
    },
  });

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
