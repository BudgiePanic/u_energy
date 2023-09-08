"use client";

import * as React from "react";
import { styled } from "@mui/material/styles";
import { Grid, Theme, Typography } from "@mui/material";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import { ThemeContext } from "../contexts/theme-context";
import { useContext } from "react";

// Styled component for the header text
const Header = styled("div")<{ theme?: Theme | string }>(({ theme }) => ({
  fontStyle: "normal",
  fontWeight: "bold",
  fontSize: "96px",
  color: theme && (theme === "dark" ? "rgba(255, 255, 255, 255)" : "#0D4C38"),
  textAlign: "center",
  padding: "20px",
  margin: "0px",
  width: "100%",
  height: "40%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
}));

// Styled component for the capabilities text box
const CapabilitiesSection = styled("section")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  padding: "20px",
  marginTop: "1rem",
  fontWeight: "bold",
  backgroundColor: "#A5DBA3",
  borderRadius: "10px",
  textAlign: "center",
  fontSize: "17px",
  color: "#0D4C38",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
  maxWidth: "269px"
}));

// Styled component for the capabilities header
const Capabilities = styled(Typography)<{ theme?: Theme | string }>(({ theme }) => ({
  fontStyle: "normal",
  fontSize: "36px",
  textAlign: "center",
  padding: "20px",
  margin: "0px",
  color: theme && (theme === "dark" ? "rgba(255, 255, 255, 255)" : "#0D4C38"),
}));

const LightningIconWrapper = styled("div")({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginTop: "1rem",
});

const Root = styled("div")<{ theme?: Theme | string }>(({ theme }) => ({
  backgroundColor: theme && (theme === "dark" ? "rgba(232, 246, 232, 0)" : "#E8F6E8"),
}));

// Component for splash page content
export default function SplashPage({}: {}) {
  const { theme } = useContext(ThemeContext);
  return (
    // @ts-ignore
    <Root className="w-full h-screen" theme={theme}>
       {/* @ts-ignore */}
      <Header theme={theme}>U.eNergy</Header>
        <LightningIconWrapper>
            <FlashOnIcon sx={{ fontSize: 48, color: "#f0c919" }} />
        </LightningIconWrapper>
        {/* @ts-ignore */}
        <Capabilities theme={theme} variant="h2">Capabilities</Capabilities>
        <Grid container direction="column" spacing={3}>
          <Grid item>
            <CapabilitiesSection>
                <Typography variant="body1">Visualise the quantities of energy a country produces</Typography>
            </CapabilitiesSection>
          </Grid>
          <Grid item>
            <CapabilitiesSection>
                <Typography variant="body1">Visualise the quantities of energy a country consumes</Typography>
            </CapabilitiesSection>
          </Grid>
          <Grid item>
            <CapabilitiesSection>
                <Typography variant="body1">Visualise the different sources of energy a country utilises</Typography>
            </CapabilitiesSection>
          </Grid>
        </Grid>
    </Root>
  );
}
