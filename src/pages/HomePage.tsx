import { useNavigate } from "react-router-dom";
import { clearGameState, clearRoomId } from "@/persistence/sessionPersistence";
import { HomeTopBar } from "./home/HomeTopBar";
import { HomeHero } from "./home/HomeHero";
import { HomeActions } from "./home/HomeActions";
import { HomeSteps } from "./home/HomeSteps";
import { useHomeSession } from "./home/useHomeSession";
import styles from "./HomePage.module.css";

export function HomePage() {
  const session = useHomeSession();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <HomeTopBar />
      <main className={styles.main}>
        <HomeHero />
        <HomeActions
          session={session}
          onStartNew={() => navigate("/setup")}
          onResume={(roomId) => navigate(`/play?room=${roomId}`)}
          onJoin={() => navigate("/play")}
          onClearAndStartNew={() => {
            clearGameState();
            clearRoomId();
            navigate("/setup");
          }}
          onConstructor={() => navigate("/constructor")}
          onRules={() => navigate("/rules")}
        />
      </main>
      <HomeSteps />
    </div>
  );
}
