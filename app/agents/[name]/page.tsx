import { AgentProfileClient } from "./agent-profile-client";

export default async function AgentProfilePage({ 
  params 
}: { 
  params: Promise<{ name: string }> 
}) {
  const { name } = await params;
  return <AgentProfileClient name={name} />;
}
