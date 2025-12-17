# PMBOK 6 Workflow Orchestrator
from typing import Dict, Any
from .agents import create_pmbok_agents, PMBOK_DEPENDENCIES
import subprocess
import json

class WorkflowNode:
    def __init__(self, agent, code: str):
        self.agent = agent
        self.code = code
        self.children = []
        self.parents = []

class PMBOKWorkflowGraph:
    def __init__(self):
        self.agents = create_pmbok_agents()
        self.nodes: Dict[str, WorkflowNode] = {code: WorkflowNode(agent, code) for code, agent in self.agents.items()}
        self._build_graph()

    def _build_graph(self):
        for dep in PMBOK_DEPENDENCIES:
            src = self.nodes.get(dep.source)
            tgt = self.nodes.get(dep.target)
            if src and tgt:
                src.children.append(tgt)
                tgt.parents.append(src)

    def get_start_nodes(self):
        return [node for node in self.nodes.values() if not node.parents]

    async def run(self, initial_data: Any):
        # Simple BFS for demo: run all start nodes, then their children, etc.
        from collections import deque
        queue = deque(self.get_start_nodes())
        results = {}
        while queue:
            node = queue.popleft()
            # Gather parent outputs if any
            parent_outputs = [results[parent.code] for parent in node.parents if parent.code in results]
            input_data = parent_outputs if parent_outputs else initial_data
                # Call the Node.js/TypeScript agent via subprocess
                agent_result = await self.run_ts_agent(
                    node.agent.code,
                    node.agent.name,
                    node.agent.description,
                    node.agent.inputs,
                    node.agent.tools,
                    node.agent.outputs,
                    input_data,
                    user_id,
                    project_id,
                    document_id
                )
                results[node.code] = agent_result
            for child in node.children:
                if child not in queue:
                    queue.append(child)
        return results

        async def run_ts_agent(self, code, name, description, inputs, tools, outputs, data, user_id, project_id, document_id):
            # This function calls a Node.js script that instantiates and runs the PMBOKProcessAgent
            # The Node.js script should be created to accept JSON input and return JSON output
            agent_input = {
                'code': code,
                'name': name,
                'description': description,
                'inputs': inputs,
                'tools': tools,
                'outputs': outputs,
                'data': data,
                'userId': user_id,
                'projectId': project_id,
                'documentId': document_id
            }
            process = await asyncio.create_subprocess_exec(
                'node', 'server/src/modules/pmbok6/run_ts_agent.js',
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            stdout, stderr = await process.communicate(json.dumps(agent_input).encode())
            if process.returncode != 0:
                raise RuntimeError(f"Agent execution failed: {stderr.decode()}")
            return json.loads(stdout.decode())
