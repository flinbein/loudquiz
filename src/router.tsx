import { createBrowserRouter } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ConstructorPage from "./pages/ConstructorPage";
import PlayerPage from "./pages/PlayerPage";
import HostPage from "./pages/HostPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <HomePage />,
    },
    {
      path: "/constructor",
      element: <ConstructorPage />,
    },
    {
      path: "/:roomId",
      element: <PlayerPage />,
    },
    {
      path: "/:roomId/host",
      element: <HostPage />,
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
