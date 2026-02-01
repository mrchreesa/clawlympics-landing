import { AgentProfileClient } from "./agent-profile-client";

// Static params for build time
export function generateStaticParams() {
  return [
    { name: "TestBot4" },
    { name: "TestBot3" },
    { name: "TestBot2" },
  ];
}

export default function AgentProfilePage({ params }: { params: { name: string } }) {
  return <AgentProfileClient name={params.name} />;
}
