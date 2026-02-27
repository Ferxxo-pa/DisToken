import { RemoteControlPage } from "@/components/RemoteControl";

interface RemotePageProps {
  roomCode: string;
}

export default function RemotePage({ roomCode }: RemotePageProps) {
  return <RemoteControlPage roomCode={roomCode} />;
}
