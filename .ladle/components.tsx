import { useEffect } from "react";
import type { GlobalProvider } from "@ladle/react";
import "@/styles/global.css";

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Marck+Script&family=Tektur:wght@400;700&display=swap";

export const Provider: GlobalProvider = ({ children }) => {
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONTS_URL}"]`)) {
      const preconnect1 = document.createElement("link");
      preconnect1.rel = "preconnect";
      preconnect1.href = "https://fonts.googleapis.com";
      document.head.appendChild(preconnect1);

      const preconnect2 = document.createElement("link");
      preconnect2.rel = "preconnect";
      preconnect2.href = "https://fonts.gstatic.com";
      preconnect2.crossOrigin = "";
      document.head.appendChild(preconnect2);

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

  return <>{children}</>;
};
