# Migration Task: Integrate Intelligence Tier

## Overview
The Python Intelligence Tier (previously located in `AI-Foundry-Projects/services/intelligence`) needs to be fully migrated into the ADPA ecosystem. This tier serves as the core reasoning engine for our document generation pipeline.

**Source Repository**: [https://github.com/mdresch/AI-Foundry-Projects.git](https://github.com/mdresch/AI-Foundry-Projects.git)

## Requirements
The intelligence layer is responsible for orchestrating the generation of **97 deliverables** across **46 distinct processes**. This must be executed as a single, cohesive generation process, driven by the inputs from the ideation phase and the business case.

### Key Capabilities to Migrate
1. **Dependency Resolution**: Ensure the document sequence and output generation strictly adhere to the dependencies established by the business case and ideation basis.
2. **Process Orchestration**: Migrate the logic handling all 46 processes to run seamlessly within ADPA's architecture.
3. **Deliverable Generation**: Port the generative functions responsible for the 97 deliverables.
4. **Integration with Aspire**: Restore the `intelligence` node inside `Adpa.AppHost/Program.cs` once the codebase is successfully ported into the ADPA monorepo (or linked correctly via Git submodules/worktrees).

## Next Steps
- [ ] Clone the remote repository (`git clone https://github.com/mdresch/AI-Foundry-Projects.git`) into the correct structure.
- [ ] Determine the optimal strategy for integration (e.g., migrating the source directly into an `intelligence/` folder within the ADPA workspace vs. continuing to treat it as a sibling repository).
- [ ] Update `.NET Aspire` configuration (`Program.cs`) to point to the new location.
- [ ] Verify End-to-End document generation through the `apiservice` to ensure the 97 deliverables can be generated from the 46 processes as expected.
