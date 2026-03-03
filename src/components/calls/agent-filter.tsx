"use client";

import { useRouter } from "next/navigation";

type Agent = {
  id: string;
  name: string;
};

type AgentFilterProps = {
  agents: Agent[];
  value: string;
};

export function AgentFilter({ agents, value }: AgentFilterProps) {
  const router = useRouter();

  const handleChange = (nextValue: string) => {
    if (nextValue) {
      router.push(`/calls?agent=${nextValue}`);
      return;
    }

    router.push("/calls");
  };

  return (
    <select
      name="agent"
      className="rounded-md border border-gray-700 bg-gray-900/50 text-white px-3 py-2 text-sm focus:border-cyan-500/50 focus:ring-cyan-500/20"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    >
      <option value="">All Agents</option>
      {agents.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.name}
        </option>
      ))}
    </select>
  );
}
