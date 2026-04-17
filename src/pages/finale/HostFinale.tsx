import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import { NominationCarousel } from "@/components/NominationCarousel/NominationCarousel";
import { getAllNominations } from "@/logic/nominations";
import { HostLayout } from "@/pages/blocks/HostLayout";
import { SidebarBlock } from "@/pages/blocks/SidebarBlock";
import { HostMainContainer } from "@/pages/blocks/HostMainContainer";

export function HostFinale() {
  const history = useGameStore((s) => s.history);
  const players = useGameStore((s) => s.players);
  const topics = useGameStore((s) => s.topics);

  const nominations = useMemo(
    () => getAllNominations(history, players, topics),
    [history, players, topics],
  );

  return (
    <HostLayout>
      <HostMainContainer>
        <NominationCarousel nominations={nominations} />
      </HostMainContainer>
      <SidebarBlock/>
    </HostLayout>
  );
}
