# Main entry point for running the PMBOK 6 agent workflow
import asyncio
from server.src.modules.pmbok6.workflow import PMBOKWorkflowGraph

async def main():
    workflow = PMBOKWorkflowGraph()
    initial_data = {}  # Replace with real project charter or input data
    results = await workflow.run(initial_data)
    for code, output in results.items():
        print(f"Process {code}: {output}")

if __name__ == "__main__":
    asyncio.run(main())
